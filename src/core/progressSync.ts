import { readLocalProgressSnapshot } from '@/core/progressMerge'
import {
  getAuthToken,
  isApiEnabled,
  markProgressUpdatedAt,
  type ProgressSnapshot
} from '@/core/userSession'

const DEFAULT_UPLOAD_DEBOUNCE_MS = 3000
const UPDATED_AT_DEBOUNCE_MS = 800

let uploadTimer: ReturnType<typeof setTimeout> | null = null
let updatedAtTimer: ReturnType<typeof setTimeout> | null = null
let uploadDirty = false
let pendingSnapshot: ProgressSnapshot | null = null
let uploadInFlight: Promise<void> | null = null

async function putProgress(snapshot: ProgressSnapshot): Promise<void> {
  if (!isApiEnabled() || !getAuthToken()) return

  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl) return

  await uni.request({
    url: `${baseUrl}/api/user/progress`,
    method: 'PUT',
    header: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`
    },
    data: snapshot
  })
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

function queueUpload(debounceMs: number) {
  if (uploadTimer) clearTimeout(uploadTimer)
  uploadTimer = setTimeout(() => {
    uploadTimer = null
    void flushPendingUpload()
  }, debounceMs)
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

  uploadInFlight = putProgress(snapshot)
    .then(() => {
      markProgressUpdatedAt(snapshot.updatedAt)
    })
    .catch(error => {
      console.warn('[progressSync] upload failed', error)
      pendingSnapshot = snapshot
      uploadDirty = true
    })
    .finally(() => {
      uploadInFlight = null
      if (uploadDirty || pendingSnapshot) {
        void flushPendingUpload()
      }
    })

  return uploadInFlight
}

/** Mark local progress dirty and schedule a debounced background upload. */
export function markProgressDirty(debounceMs = DEFAULT_UPLOAD_DEBOUNCE_MS) {
  if (!isApiEnabled()) return

  uploadDirty = true
  scheduleUpdatedAtPersist()
  queueUpload(debounceMs)
}

export function scheduleProgressUpload(snapshot: ProgressSnapshot, debounceMs = DEFAULT_UPLOAD_DEBOUNCE_MS) {
  if (!isApiEnabled()) return

  pendingSnapshot = snapshot
  uploadDirty = true
  queueUpload(debounceMs)
}

export function flushProgressUpload(): Promise<void> {
  if (uploadTimer) {
    clearTimeout(uploadTimer)
    uploadTimer = null
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
  uploadDirty = true
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
