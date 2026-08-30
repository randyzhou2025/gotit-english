import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('analytics queue', () => {
  const storage = new Map<string, unknown>()
  const request = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    storage.clear()
    request.mockReset()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
      request
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('queues after the click stack and removes a delivered batch', async () => {
    const analytics = await import('./analytics')
    analytics.trackAnalyticsEvent('home_export_click', { unitId: 'unit-1' })

    expect(storage.get('gotit:analytics:queue:v1')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(0)

    const queued = storage.get('gotit:analytics:queue:v1') as Array<{ name: string }>
    expect(queued).toHaveLength(1)
    expect(queued[0]?.name).toBe('home_export_click')

    storage.set('gotit:auth:token', 'token')
    request.mockResolvedValue({ statusCode: 202, data: { accepted: 1 } })
    analytics.enableAnalyticsNetworkFlush()
    await analytics.flushAnalyticsEvents()

    expect(request).toHaveBeenCalledTimes(1)
    expect(storage.get('gotit:analytics:queue:v1')).toEqual([])
  })

  it('keeps events locally when upload fails', async () => {
    storage.set('gotit:auth:token', 'token')
    request.mockRejectedValue(new Error('offline'))
    const analytics = await import('./analytics')
    analytics.trackAnalyticsEvent('weakbook_click', { source: 'tabbar' })
    await vi.advanceTimersByTimeAsync(0)
    analytics.enableAnalyticsNetworkFlush()
    await analytics.flushAnalyticsEvents()

    const queued = storage.get('gotit:analytics:queue:v1') as unknown[]
    expect(queued).toHaveLength(1)
  })

  it('queues a classmate invitation click with its page source', async () => {
    const analytics = await import('./analytics')
    analytics.trackAnalyticsEvent('classmate_invite_click', {
      source: 'dictation_reward',
      shareType: 'DICTATION_RESULT'
    })
    await vi.advanceTimersByTimeAsync(0)

    const queued = storage.get('gotit:analytics:queue:v1') as Array<{
      name: string
      properties: Record<string, string>
    }>
    expect(queued).toEqual([
      expect.objectContaining({
        name: 'classmate_invite_click',
        properties: {
          source: 'dictation_reward',
          shareType: 'DICTATION_RESULT'
        }
      })
    ])
  })

  it('queues the word match home entry as the only module-specific event', async () => {
    const analytics = await import('./analytics')
    analytics.trackAnalyticsEvent('home_word_match_click', {
      unitId: 'rj:required-1:u1',
      bookName: '必修第一册',
      unitName: 'Unit 1'
    })
    await vi.advanceTimersByTimeAsync(0)

    const queued = storage.get('gotit:analytics:queue:v1') as Array<{ name: string }>
    expect(queued[queued.length - 1]?.name).toBe('home_word_match_click')
  })

  it('clears pending events and stops uploads when disabled', async () => {
    storage.set('gotit:auth:token', 'token')
    const analytics = await import('./analytics')
    analytics.trackAnalyticsEvent('unit_wordlist_click')
    await vi.advanceTimersByTimeAsync(0)

    analytics.setAnalyticsEnabled(false)
    analytics.trackAnalyticsEvent('weakbook_click')
    await vi.advanceTimersByTimeAsync(2_000)
    await analytics.flushAnalyticsEvents()

    expect(storage.get('gotit:analytics:queue:v1')).toEqual([])
    expect(request).not.toHaveBeenCalled()
  })

  it('does not upload queued events before the first page is ready', async () => {
    storage.set('gotit:auth:token', 'token')
    request.mockResolvedValue({ statusCode: 202, data: { accepted: 1 } })
    const analytics = await import('./analytics')

    analytics.trackAnalyticsEvent('home_export_click')
    await vi.advanceTimersByTimeAsync(2_000)

    expect(request).not.toHaveBeenCalled()

    analytics.enableAnalyticsNetworkFlush()
    await analytics.flushAnalyticsEvents()

    expect(request).toHaveBeenCalledTimes(1)
  })
})
