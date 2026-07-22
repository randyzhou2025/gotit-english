#!/usr/bin/env node
/**
 * Local API smoke test — run while `server` dev is up on :4000
 * Usage: node scripts/dev-api-smoke.mjs [baseUrl]
 */
const baseUrl = (process.argv[2] ?? process.env.API_BASE_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '')

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${data.error ?? JSON.stringify(data)}`)
  }
  return data
}

async function main() {
  console.log(`[smoke] baseUrl=${baseUrl}`)

  const health = await request('/api/health')
  console.log('[ok] health', health)

  const config = await request('/api/config/public')
  console.log('[ok] config/public', config)

  const session = await request('/api/weapp/session', {
    method: 'POST',
    body: { code: 'dev-local-code' },
  })
  console.log('[ok] weapp/session user=', session.user?.nickname)

  const token = session.token
  const auth = { Authorization: `Bearer ${token}` }

  const me = await request('/api/user/me', { headers: auth })
  console.log('[ok] user/me', me.user?.nickname)

  const progress = await request('/api/user/progress', {
    method: 'PUT',
    headers: auth,
    body: {
      masteredWordIds: ['shj:1:u1:cat'],
      savedWeakWordIds: ['shj:1:u1:dog'],
      selectedUnitId: 'shj:1:u1',
      courseSetupCompleted: true,
      updatedAt: new Date().toISOString(),
    },
  })
  console.log('[ok] progress mastered=', progress.progress?.masteredWordIds?.length)

  const study = await request('/api/study/event', {
    method: 'POST',
    headers: auth,
    body: { wordIds: ['shj:1:u1:cat'], durationSeconds: 60 },
  })
  console.log('[ok] study/event todayWords=', study.dashboard?.todayWords)

  const dashboard = await request('/api/study/dashboard', { headers: auth })
  console.log('[ok] study/dashboard streak=', dashboard.dashboard?.streakDays)

  const feedback = await request('/api/feedback', {
    method: 'POST',
    headers: auth,
    body: { category: 'experience', content: 'dev-api-smoke 本地联调' },
  })
  console.log('[ok] feedback id=', feedback.feedback?.id)

  const patched = await request('/api/user/me', {
    method: 'PATCH',
    headers: auth,
    body: { nickname: '联调同学' },
  })
  console.log('[ok] patch nickname=', patched.user?.nickname)

  const session2 = await request('/api/weapp/session', {
    method: 'POST',
    body: { code: 'dev-local-code' },
  })
  console.log('[ok] re-login progress mastered=', session2.progress?.masteredWordIds)
  console.log('[smoke] all passed')
}

main().catch((error) => {
  console.error('[smoke] failed:', error.message)
  process.exit(1)
})
