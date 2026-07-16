import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const manifestPath = path.join(root, 'src', 'data', 'audio.generated.json')
const localBasePath = '/generated/audio'
const concurrency = Math.max(1, Number(process.env.AUDIO_VERIFY_CONCURRENCY || 12))
const limit = Math.max(0, Number(process.env.AUDIO_VERIFY_LIMIT || 0))
const timeoutMs = Math.max(1000, Number(process.env.AUDIO_VERIFY_TIMEOUT_MS || 8000))

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function resolveUrl(url, cdnBaseUrl) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  if (!cdnBaseUrl) return ''

  if (url.startsWith(`${localBasePath}/`)) {
    return `${cdnBaseUrl}/${url.slice(localBasePath.length + 1)}`
  }

  return url.startsWith('/') ? `${cdnBaseUrl}${url}` : `${cdnBaseUrl}/${url}`
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

async function checkUrl(url) {
  try {
    let response = await fetchWithTimeout(url, { method: 'HEAD' })

    if (response.status === 405 || response.status === 403) {
      response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-0'
        }
      })
    }

    return {
      ok: response.ok || response.status === 206,
      status: response.status,
      contentType: response.headers.get('content-type') || ''
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      contentType: '',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function runPool(items, worker) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index], index)
    }
  })

  await Promise.all(workers)
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const cdnBaseUrl = trimTrailingSlash(process.env.AUDIO_CDN_BASE_URL || manifest.cdnBaseUrl)

if (!cdnBaseUrl) {
  console.error('Missing AUDIO_CDN_BASE_URL. Example: AUDIO_CDN_BASE_URL=https://cdn.example.com/generated/audio pnpm audio:verify-cdn')
  process.exit(1)
}

const checks = []

for (const [cdnKey, item] of Object.entries(manifest.items || {})) {
  for (const variant of ['uk', 'us', 'zh']) {
    const sourceUrl = item[`${variant}Url`]
    const url = resolveUrl(sourceUrl, cdnBaseUrl)
    checks.push({ cdnKey, variant, url })
  }
}

const targetChecks = limit > 0 ? checks.slice(0, limit) : checks
const failures = []
const warnings = []

await runPool(targetChecks, async (item, index) => {
  const result = await checkUrl(item.url)

  if (!result.ok) {
    failures.push({ ...item, ...result })
  } else if (result.contentType && !/audio|mpeg|octet-stream/i.test(result.contentType)) {
    warnings.push({ ...item, ...result })
  }

  if ((index + 1) % 100 === 0 || index + 1 === targetChecks.length) {
    console.log(`Checked ${index + 1}/${targetChecks.length}`)
  }
})

if (warnings.length > 0) {
  console.warn(`Warnings: ${warnings.length} URLs returned non-audio content-type.`)
  for (const warning of warnings.slice(0, 10)) {
    console.warn(`${warning.status} ${warning.contentType} ${warning.url}`)
  }
}

if (failures.length > 0) {
  console.error(`Failed: ${failures.length}/${targetChecks.length}`)
  for (const failure of failures.slice(0, 20)) {
    console.error(`${failure.status} ${failure.variant} ${failure.cdnKey} ${failure.url}${failure.error ? ` ${failure.error}` : ''}`)
  }
  process.exit(1)
}

console.log(`Audio CDN verified: ${targetChecks.length}/${targetChecks.length}`)
