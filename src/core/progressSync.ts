import { readLocalProgressSnapshot } from '@/core/progressMerge'
import {
  clearAuthSession,
  ensureUserSession,
  getAuthToken,
  isApiEnabled,
  markProgressUpdatedAt,
  type ProgressSnapshot
} from '@/core/userSession'

const DEFAULT_UPLOAD_DEBOUNCE_MS = 3000
const UPDATED_AT_DEBOUNCE_MS = 800
const UPLOAD_RETRY_DELAYS_MS = [5_000, 30_000, 120_000]

let uploadTimer: ReturnType<typeof setTimeout> | null = null
let updatedAtTimer: ReturnType<typeof setTimeout> | null = null
let uploadDirty = false
let pendingSnapshot: ProgressSnapshot | null = null
let uploadInFlight: Promise<void> | null = null
let uploadRetryAttempt = 0
let uploadRetryScheduled = false

class ProgressUploadHttpError extends Error {
  constructor(readonly statusCode: number) {
    super(`Progress upload failed (${statusCode})`)
  }
}

async function requestProgressUpload(snapshot: ProgressSnapshot) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl) return null

  return uni.request({
    url: `${baseUrl}/api/user/progress`,
    method: 'PUT',
    header: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`
    },
    data: snapshot
  })
}

async function putProgress(snapshot: ProgressSnapshot): Promise<void> {
  if (!isApiEnabled() || !getAuthToken()) return

  let response = await requestProgressUpload(snapshot)
  if (!response) return

  if (response.statusCode === 401) {
    clearAuthSession()
    const refreshedSession = await ensureUserSession()
    if (refreshedSession?.token) {
      response = await requestProgressUpload(snapshot)
      if (!response) return
    }
  }

  const statusCode = response.statusCode ?? 0
  if (statusCode < 200 || statusCode >= 300) {
    throw new ProgressUploadHttpError(statusCode)
  }
}

function isRetryableUploadError(error: unknown): boolean {
  if (!(error instanceof ProgressUploadHttpError)) return true

  return error.statusCode === 0
    || error.statusCode === 408
    || error.statusCode === 429
    || error.statusCode >= 500
}

function resolvePendingSnapshot(): ProgressSnapshot {
  if (pendingSnapshot) return { ...pendingSnapshot }

  const snapshot = readLocalProgressSnapshot()
  snapshot.updatedAt = new Date().toISOString()
  return snapshot
}

function scheduleUpdatedAtPersist() {
  if (updatedAtTimer) clearTimeout(updatedAtTimer)
  updatedAtTimer = setTimeout(() => {
    updatedAtTimer = null
    try {
      uni.setStorageSync('gotit:progress:updatedAt', new Date().toISOString())
    } catch {
      // Storage can be unavailable in restricted preview contexts.
    }
  }, UPDATED_AT_DEBOUNCE_MS)
}

function queueUpload(debounceMs: number, retry = false) {
  if (uploadTimer) clearTimeout(uploadTimer)
  uploadRetryScheduled = retry
  uploadTimer = setTimeout(() => {
    uploadTimer = null
    uploadRetryScheduled = false
    void flushPendingUpload()
  }, debounceMs)
}

function scheduleUploadRetry() {
  const delayMs = UPLOAD_RETRY_DELAYS_MS[uploadRetryAttempt]
  if (delayMs === undefined) return

  uploadRetryAttempt += 1
  queueUpload(delayMs, true)
}

function flushPendingUpload(): Promise<void> {
  if (!uploadDirty && !pendingSnapshot) return Promise.resolve()

  if (uploadInFlight) {
    uploadDirty = true
    return uploadInFlight
  }

  uploadDirty = false
  const snapshot = resolvePendingSnapshot()
  pendingSnapshot = null
  let succeeded = false

  uploadInFlight = putProgress(snapshot)
    .then(() => {
      succeeded = true
      uploadRetryAttempt = 0
      markProgressUpdatedAt(snapshot.updatedAt)
    })
    .catch(error => {
      console.warn('[progressSync] upload failed', error)
      if (!uploadDirty && !pendingSnapshot) {
        pendingSnapshot = snapshot
      }
      uploadDirty = true
      if (isRetryableUploadError(error)) {
        scheduleUploadRetry()
      }
    })
    .finally(() => {
      uploadInFlight = null
      if (succeeded && (uploadDirty || pendingSnapshot)) {
        void flushPendingUpload()
      }
    })

  return uploadInFlight
}

/** Mark local progress dirty and schedule a debounced background upload. */
export function markProgressDirty(debounceMs = DEFAULT_UPLOAD_DEBOUNCE_MS) {
  if (!isApiEnabled()) return

  pendingSnapshot = null
  uploadDirty = true
  scheduleUpdatedAtPersist()
  if (!uploadRetryScheduled) queueUpload(debounceMs)
}

export function scheduleProgressUpload(snapshot: ProgressSnapshot, debounceMs = DEFAULT_UPLOAD_DEBOUNCE_MS) {
  if (!isApiEnabled()) return

  pendingSnapshot = snapshot
  uploadDirty = true
  if (!uploadRetryScheduled) queueUpload(debounceMs)
}

export function flushProgressUpload(): Promise<void> {
  uploadRetryAttempt = 0
  if (uploadTimer) {
    clearTimeout(uploadTimer)
    uploadTimer = null
    uploadRetryScheduled = false
  }
  if (updatedAtTimer) {
    clearTimeout(updatedAtTimer)
    updatedAtTimer = null
    try {
      uni.setStorageSync('gotit:progress:updatedAt', new Date().toISOString())
    } catch {
      // ignore
    }
  }
  return flushPendingUpload()
}

export async function pullRemoteProgress(): Promise<ProgressSnapshot | null> {
  if (!isApiEnabled() || !getAuthToken()) return null

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl) return null

  try {
    const response = await uni.request({
      url: `${baseUrl}/api/user/progress`,
      method: 'GET',
      header: { Authorization: `Bearer ${getAuthToken()}` }
    })

    if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
      return null
    }

    const payload = response.data as { progress?: ProgressSnapshot }
    return payload.progress ?? null
  } catch {
    return null
  }
}
