import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  enableAnalyticsNetworkFlush: vi.fn(),
  ensureUserSession: vi.fn(),
  fetchPublicConfig: vi.fn(),
  flushAnalyticsEvents: vi.fn(),
  flushCloudSyncOnForeground: vi.fn(),
  refreshPracticeSessionIfWordbankUpdated: vi.fn(),
  restorePracticeCloudProgress: vi.fn(),
  setAnalyticsEnabled: vi.fn(),
  setCachedStreakDays: vi.fn(),
  submitAppOpen: vi.fn()
}))

vi.mock('@/app/usePracticeSession', () => ({
  refreshPracticeSessionIfWordbankUpdated: mocks.refreshPracticeSessionIfWordbankUpdated,
  restorePracticeCloudProgress: mocks.restorePracticeCloudProgress
}))

vi.mock('@/core/analytics', () => ({
  enableAnalyticsNetworkFlush: mocks.enableAnalyticsNetworkFlush,
  flushAnalyticsEvents: mocks.flushAnalyticsEvents,
  setAnalyticsEnabled: mocks.setAnalyticsEnabled
}))

vi.mock('@/core/classmates', () => ({ submitAppOpen: mocks.submitAppOpen }))
vi.mock('@/core/cloudSyncPolicy', () => ({
  flushCloudSyncOnForeground: mocks.flushCloudSyncOnForeground
}))
vi.mock('@/core/studyStats', () => ({ setCachedStreakDays: mocks.setCachedStreakDays }))
vi.mock('@/core/userSession', () => ({
  ensureUserSession: mocks.ensureUserSession,
  fetchPublicConfig: mocks.fetchPublicConfig
}))

describe('deferred app network lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.ensureUserSession.mockResolvedValue({ token: 'token' })
    mocks.fetchPublicConfig.mockResolvedValue({ analyticsEnabled: true })
    mocks.flushAnalyticsEvents.mockResolvedValue(undefined)
    mocks.refreshPracticeSessionIfWordbankUpdated.mockResolvedValue(false)
    mocks.restorePracticeCloudProgress.mockResolvedValue(undefined)
    mocks.submitAppOpen.mockResolvedValue({ streakDays: 3 })
  })

  afterEach(async () => {
    const lifecycle = await import('./appNetworkLifecycle')
    lifecycle.resetAppNetworkLifecycleForTests()
    vi.useRealTimers()
  })

  it('starts no network work before the first page is ready', async () => {
    const lifecycle = await import('./appNetworkLifecycle')

    lifecycle.beginAppForegroundCycle()
    await vi.advanceTimersByTimeAsync(10_000)

    expect(mocks.fetchPublicConfig).not.toHaveBeenCalled()
    expect(mocks.ensureUserSession).not.toHaveBeenCalled()
    expect(mocks.refreshPracticeSessionIfWordbankUpdated).not.toHaveBeenCalled()
  })

  it('runs each startup task once after ready and keeps the wordbank check delayed', async () => {
    const lifecycle = await import('./appNetworkLifecycle')

    lifecycle.beginAppForegroundCycle()
    lifecycle.markAppPageReady()
    lifecycle.markAppPageReady()
    lifecycle.beginAppForegroundCycle()
    await vi.advanceTimersByTimeAsync(100)

    expect(mocks.fetchPublicConfig).toHaveBeenCalledTimes(1)
    expect(mocks.enableAnalyticsNetworkFlush).toHaveBeenCalledTimes(1)
    expect(mocks.submitAppOpen).toHaveBeenCalledTimes(1)
    expect(mocks.restorePracticeCloudProgress).toHaveBeenCalledTimes(1)
    expect(mocks.flushAnalyticsEvents).toHaveBeenCalledTimes(1)
    expect(mocks.refreshPracticeSessionIfWordbankUpdated).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1_400)
    expect(mocks.flushCloudSyncOnForeground).toHaveBeenCalledTimes(1)
    expect(mocks.flushCloudSyncOnForeground).toHaveBeenCalledWith(true)

    await vi.advanceTimersByTimeAsync(2_500)
    expect(mocks.refreshPracticeSessionIfWordbankUpdated).toHaveBeenCalledTimes(1)
  })

  it('cancels pending work on hide and schedules one new set next foreground cycle', async () => {
    const lifecycle = await import('./appNetworkLifecycle')

    lifecycle.beginAppForegroundCycle()
    lifecycle.markAppPageReady()
    await vi.advanceTimersByTimeAsync(100)
    expect(lifecycle.endAppForegroundCycle()).toBe(true)
    await vi.advanceTimersByTimeAsync(5_000)

    expect(mocks.flushCloudSyncOnForeground).not.toHaveBeenCalled()
    expect(mocks.refreshPracticeSessionIfWordbankUpdated).not.toHaveBeenCalled()

    lifecycle.beginAppForegroundCycle()
    await vi.advanceTimersByTimeAsync(4_000)

    expect(mocks.fetchPublicConfig).toHaveBeenCalledTimes(1)
    expect(mocks.submitAppOpen).toHaveBeenCalledTimes(2)
    expect(mocks.flushCloudSyncOnForeground).toHaveBeenCalledTimes(1)
    expect(mocks.refreshPracticeSessionIfWordbankUpdated).toHaveBeenCalledTimes(1)
  })
})
