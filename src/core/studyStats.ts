import { getAuthToken, isApiEnabled, type DashboardSnapshot } from '@/core/userSession'

const pendingWordIds = new Set<string>()
let pendingDurationSeconds = 0
let flushTimer: ReturnType<typeof setTimeout> | null = null
let durationPingTimer: ReturnType<typeof setInterval> | null = null
let lastDurationTickAt = 0
let dashboardCache: DashboardSnapshot | null = null

async function postStudyEvent(body: { wordIds: string[]; durationSeconds: number }) {
  if (!isApiEnabled() || !getAuthToken()) return null

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl) return null

  try {
    const response = await uni.request({
      url: `${baseUrl}/api/study/event`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      data: body
    })

    if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
      return null
    }

    const payload = response.data as { dashboard?: DashboardSnapshot }
    if (payload.dashboard) {
      dashboardCache = payload.dashboard
    }
    return dashboardCache
  } catch (error) {
    console.warn('[studyStats] event failed', error)
    return null
  }
}

function scheduleFlush(delayMs = 2500) {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushStudyEvents()
  }, delayMs)
}

export function queueStudyWordIds(wordIds: string[]) {
  if (!isApiEnabled() || wordIds.length === 0) return
  for (const id of wordIds) {
    if (typeof id === 'string' && id.length > 0) pendingWordIds.add(id)
  }
  scheduleFlush()
}

export function queueStudyDuration(seconds: number) {
  if (!isApiEnabled() || seconds <= 0) return
  pendingDurationSeconds += Math.floor(seconds)
  scheduleFlush()
}

export async function flushStudyEvents(): Promise<DashboardSnapshot | null> {
  if (!isApiEnabled()) return dashboardCache

  const wordIds = Array.from(pendingWordIds)
  const durationSeconds = pendingDurationSeconds
  if (wordIds.length === 0 && durationSeconds <= 0) return dashboardCache

  pendingWordIds.clear()
  pendingDurationSeconds = 0

  return postStudyEvent({ wordIds, durationSeconds })
}

export async function refreshDashboard(): Promise<DashboardSnapshot | null> {
  if (!isApiEnabled() || !getAuthToken()) return dashboardCache

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl) return dashboardCache

  try {
    const response = await uni.request({
      url: `${baseUrl}/api/study/dashboard`,
      method: 'GET',
      header: { Authorization: `Bearer ${getAuthToken()}` }
    })

    if ((response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300) {
      const payload = response.data as { dashboard?: DashboardSnapshot }
      dashboardCache = payload.dashboard ?? dashboardCache
    }
  } catch (error) {
    console.warn('[studyStats] dashboard refresh failed', error)
  }

  return dashboardCache
}

export function getCachedDashboard(): DashboardSnapshot | null {
  return dashboardCache
}

export function setCachedDashboard(dashboard: DashboardSnapshot | null) {
  dashboardCache = dashboard
}

export function startStudyDurationPing() {
  if (!isApiEnabled() || durationPingTimer) return
  lastDurationTickAt = Date.now()
  durationPingTimer = setInterval(() => {
    const now = Date.now()
    const elapsed = Math.floor((now - lastDurationTickAt) / 1000)
    lastDurationTickAt = now
    if (elapsed > 0) queueStudyDuration(elapsed)
  }, 60_000)
}

export function stopStudyDurationPing() {
  if (!durationPingTimer) return
  clearInterval(durationPingTimer)
  durationPingTimer = null

  const elapsed = Math.floor((Date.now() - lastDurationTickAt) / 1000)
  lastDurationTickAt = Date.now()
  if (elapsed > 0) queueStudyDuration(elapsed)
}
