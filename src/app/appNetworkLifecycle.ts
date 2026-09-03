import {
  restorePracticeCloudProgress,
  refreshPracticeSessionIfWordbankUpdated
} from '@/app/usePracticeSession'
import { enableAnalyticsNetworkFlush, flushAnalyticsEvents, setAnalyticsEnabled } from '@/core/analytics'
import { submitAppOpen } from '@/core/classmates'
import { flushCloudSyncOnForeground } from '@/core/cloudSyncPolicy'
import { setCachedStreakDays } from '@/core/studyStats'
import { ensureUserSession, fetchPublicConfig } from '@/core/userSession'
import { setFeatureAnnouncementsEnabled } from '@/features/feature-announcements/remoteConfig'

const POST_READY_NETWORK_DELAY_MS = 100
const FOREGROUND_SYNC_DELAY_MS = 1_500
const WORDBANK_REFRESH_DELAY_MS = 4_000

let firstPageReady = false
let foregroundActive = false
let foregroundCycleId = 0
let scheduledCycleId = 0
const cycleTimers = new Set<ReturnType<typeof setTimeout>>()

function isActiveCycle(cycleId: number): boolean {
  return foregroundActive && foregroundCycleId === cycleId
}

function scheduleCycleTask(cycleId: number, delayMs: number, task: () => void) {
  const timer = setTimeout(() => {
    cycleTimers.delete(timer)
    if (isActiveCycle(cycleId)) task()
  }, delayMs)
  cycleTimers.add(timer)
}

async function submitWeappOpen() {
  // #ifdef MP-WEIXIN
  const result = await submitAppOpen().catch(() => null)
  if (result) setCachedStreakDays(result.streakDays)
  // #endif
}

function runPostReadyNetworkTasks(cycleId: number) {
  void fetchPublicConfig().then(config => {
    setAnalyticsEnabled(config.analyticsEnabled)
    setFeatureAnnouncementsEnabled(config.featureAnnouncementsEnabled)
  })

  enableAnalyticsNetworkFlush()
  void ensureUserSession().then(async session => {
    if (!session || !isActiveCycle(cycleId)) return

    await Promise.all([
      restorePracticeCloudProgress(),
      submitWeappOpen(),
      flushAnalyticsEvents()
    ])
  })
}

function scheduleForegroundCycleIfReady() {
  if (!foregroundActive || !firstPageReady) return
  if (scheduledCycleId === foregroundCycleId) return

  const cycleId = foregroundCycleId
  scheduledCycleId = cycleId
  scheduleCycleTask(cycleId, POST_READY_NETWORK_DELAY_MS, () => {
    runPostReadyNetworkTasks(cycleId)
  })
  scheduleCycleTask(cycleId, FOREGROUND_SYNC_DELAY_MS, () => {
    void ensureUserSession().then(session => {
      if (session && isActiveCycle(cycleId)) flushCloudSyncOnForeground(true)
    })
  })
  scheduleCycleTask(cycleId, WORDBANK_REFRESH_DELAY_MS, () => {
    void refreshPracticeSessionIfWordbankUpdated()
  })
}

export function beginAppForegroundCycle() {
  if (foregroundActive) return

  foregroundActive = true
  foregroundCycleId += 1
  scheduleForegroundCycleIfReady()
}

export function markAppPageReady() {
  firstPageReady = true
  scheduleForegroundCycleIfReady()
}

export function endAppForegroundCycle(): boolean {
  if (!foregroundActive) return false

  foregroundActive = false
  for (const timer of cycleTimers) clearTimeout(timer)
  cycleTimers.clear()
  return firstPageReady
}

export function resetAppNetworkLifecycleForTests() {
  for (const timer of cycleTimers) clearTimeout(timer)
  cycleTimers.clear()
  firstPageReady = false
  foregroundActive = false
  foregroundCycleId = 0
  scheduledCycleId = 0
}
