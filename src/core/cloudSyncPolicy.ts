import { flushProgressUpload } from '@/core/progressSync'
import { flushStudyEvents } from '@/core/studyStats'

const FOREGROUND_FLUSH_INTERVAL_MS = 30_000

let lastForegroundFlushAt = 0

export function flushCloudSyncOnForeground(force = false) {
  const now = Date.now()
  if (!force && now - lastForegroundFlushAt < FOREGROUND_FLUSH_INTERVAL_MS) {
    return
  }

  lastForegroundFlushAt = now
  void flushStudyEvents()
  void flushProgressUpload()
}

export function flushCloudSyncOnBackground() {
  lastForegroundFlushAt = Date.now()
  void flushStudyEvents()
  void flushProgressUpload()
}
