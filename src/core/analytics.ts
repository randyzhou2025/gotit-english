import { getAuthToken, isApiEnabled } from '@/core/userSession'

export type AnalyticsEventName =
  | 'theme_selected'
  | 'feature_announcement_view'
  | 'feature_announcement_dismiss'
  | 'feature_announcement_action'
  | 'home_export_click'
  | 'home_word_match_click'
  | 'wordlist_export_click'
  | 'weakbook_click'
  | 'dictation_start'
  | 'unit_wordlist_click'
  | 'meaning_self_test_click'
  | 'classmates_tab_view'
  | 'leaderboard_view'
  | 'classmate_invite_click'
  | 'share_created'
  | 'share_accepted'
  | 'cheer_toggle'
  | 'classmate_removed'
  | 'learning_power_awarded'

export type AnalyticsPropertyValue = string | number | boolean | null
export type AnalyticsProperties = Record<string, AnalyticsPropertyValue | undefined>

interface QueuedAnalyticsEvent {
  eventId: string
  name: AnalyticsEventName
  occurredAt: string
  properties: Record<string, AnalyticsPropertyValue>
}

const ANALYTICS_QUEUE_KEY = 'gotit:analytics:queue:v1'
const ANALYTICS_ENABLED_KEY = 'gotit:analytics:enabled:v1'
const MAX_QUEUE_SIZE = 100
const BATCH_SIZE = 20
const FLUSH_DELAY_MS = 1500
const RETRY_DELAY_MS = 15_000

let memoryQueue: QueuedAnalyticsEvent[] | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushPromise: Promise<void> | null = null
let networkFlushEnabled = false

function analyticsEnabled(): boolean {
  try {
    return uni.getStorageSync(ANALYTICS_ENABLED_KEY) !== false
  } catch {
    return true
  }
}

export function setAnalyticsEnabled(enabled: boolean): void {
  try {
    uni.setStorageSync(ANALYTICS_ENABLED_KEY, enabled)
  } catch {
    // The server-side switch remains authoritative when storage is restricted.
  }

  if (enabled) return
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  memoryQueue = []
  persistQueue()
}

function apiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  return typeof baseUrl === 'string' ? baseUrl.replace(/\/$/, '') : ''
}

function isQueuedEvent(value: unknown): value is QueuedAnalyticsEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<QueuedAnalyticsEvent>
  return typeof event.eventId === 'string'
    && typeof event.name === 'string'
    && typeof event.occurredAt === 'string'
    && Boolean(event.properties && typeof event.properties === 'object')
}

function queue(): QueuedAnalyticsEvent[] {
  if (memoryQueue) return memoryQueue

  try {
    const stored = uni.getStorageSync(ANALYTICS_QUEUE_KEY)
    memoryQueue = Array.isArray(stored) ? stored.filter(isQueuedEvent).slice(-MAX_QUEUE_SIZE) : []
  } catch {
    memoryQueue = []
  }
  return memoryQueue
}

function persistQueue() {
  try {
    uni.setStorageSync(ANALYTICS_QUEUE_KEY, queue())
  } catch {
    // In-memory delivery remains available when storage is restricted.
  }
}

function scheduleFlush(delayMs = FLUSH_DELAY_MS) {
  if (!networkFlushEnabled) return
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushAnalyticsEvents()
  }, delayMs)
}

function createEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function compactProperties(properties: AnalyticsProperties): Record<string, AnalyticsPropertyValue> {
  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, AnalyticsPropertyValue] => (
      entry[1] !== undefined
    ))
  )
}

export function trackAnalyticsEvent(name: AnalyticsEventName, properties: AnalyticsProperties = {}): void {
  if (!isApiEnabled() || !analyticsEnabled()) return

  const event: QueuedAnalyticsEvent = {
    eventId: createEventId(),
    name,
    occurredAt: new Date().toISOString(),
    properties: compactProperties(properties)
  }

  setTimeout(() => {
    const pending = queue()
    pending.push(event)
    if (pending.length > MAX_QUEUE_SIZE) {
      pending.splice(0, pending.length - MAX_QUEUE_SIZE)
    }
    persistQueue()
    scheduleFlush()
  }, 0)
}

async function performFlush(): Promise<void> {
  if (!networkFlushEnabled) return
  if (!analyticsEnabled()) return
  const token = getAuthToken()
  const baseUrl = apiBaseUrl()
  const pending = queue()
  if (!baseUrl || !token || pending.length === 0) return

  const batch = pending.slice(0, BATCH_SIZE)
  try {
    const response = await uni.request({
      url: `${baseUrl}/api/analytics/events`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      data: { events: batch }
    })

    const statusCode = response.statusCode ?? 0
    if (statusCode >= 200 && statusCode < 300) {
      const responseData = response.data as { disabled?: boolean } | undefined
      if (responseData?.disabled) {
        setAnalyticsEnabled(false)
        return
      }
      const sentIds = new Set(batch.map(event => event.eventId))
      memoryQueue = queue().filter(event => !sentIds.has(event.eventId))
      persistQueue()
      if (memoryQueue.length > 0) scheduleFlush(100)
      return
    }

    if (statusCode >= 400 && statusCode < 500 && statusCode !== 401 && statusCode !== 429) {
      const rejectedIds = new Set(batch.map(event => event.eventId))
      memoryQueue = queue().filter(event => !rejectedIds.has(event.eventId))
      persistQueue()
      return
    }
  } catch {
    // Keep the batch in local storage and retry later without surfacing UI errors.
  }

  scheduleFlush(RETRY_DELAY_MS)
}

export function flushAnalyticsEvents(): Promise<void> {
  if (flushPromise) return flushPromise
  flushPromise = performFlush().finally(() => {
    flushPromise = null
  })
  return flushPromise
}

export function enableAnalyticsNetworkFlush(): void {
  networkFlushEnabled = true
}
