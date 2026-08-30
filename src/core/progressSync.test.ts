import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('progress upload safety', () => {
  let storage: Map<string, unknown>
  let request: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    storage = new Map<string, unknown>([
      ['gotit:auth:token', 'test-token'],
      ['gotit:masteredWordIds', ['rj:required-1:u1:hello']],
      ['gotit:savedWeakWordIds', []],
      ['gotit:selectedUnitId', 'rj:required-1:u1'],
      ['gotit:courseSetupCompleted', true]
    ])
    request = vi.fn().mockResolvedValue({ statusCode: 200, data: {} })
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
      removeStorageSync: vi.fn((key: string) => storage.delete(key)),
      login: vi.fn(({ success }: { success: (result: { code: string }) => void }) => {
        success({ code: 'fresh-login-code' })
      }),
      request
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not upload merely because the app enters foreground or background', async () => {
    const { flushProgressUpload } = await import('./progressSync')

    await flushProgressUpload()

    expect(request).not.toHaveBeenCalled()
  })

  it('still uploads progress after a real local change', async () => {
    const { flushProgressUpload, markProgressDirty } = await import('./progressSync')

    markProgressDirty()
    await flushProgressUpload()

    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0]?.[0]?.data.masteredWordIds)
      .toEqual(['rj:required-1:u1:hello'])
  })

  it('keeps a failed upload dirty for the next retry', async () => {
    request
      .mockResolvedValueOnce({ statusCode: 500, data: {} })
      .mockResolvedValueOnce({ statusCode: 200, data: {} })
    const { flushProgressUpload, markProgressDirty } = await import('./progressSync')

    markProgressDirty()
    await flushProgressUpload()
    await flushProgressUpload()

    expect(request).toHaveBeenCalledTimes(2)
  })

  it('waits before retrying a failed upload instead of spinning immediately', async () => {
    vi.useFakeTimers()
    request
      .mockResolvedValueOnce({ statusCode: 500, data: {} })
      .mockResolvedValueOnce({ statusCode: 200, data: {} })
    const { flushProgressUpload, markProgressDirty } = await import('./progressSync')

    markProgressDirty()
    await flushProgressUpload()
    await vi.advanceTimersByTimeAsync(4_999)

    expect(request).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)

    expect(request).toHaveBeenCalledTimes(2)
  })

  it('stops automatic retries after the bounded backoff sequence', async () => {
    vi.useFakeTimers()
    request.mockResolvedValue({ statusCode: 500, data: {} })
    const { flushProgressUpload, markProgressDirty } = await import('./progressSync')

    markProgressDirty()
    await flushProgressUpload()
    await vi.advanceTimersByTimeAsync(5_000 + 30_000 + 120_000)

    expect(request).toHaveBeenCalledTimes(4)

    await vi.advanceTimersByTimeAsync(600_000)

    expect(request).toHaveBeenCalledTimes(4)
  })

  it('does not automatically retry a non-retryable client error', async () => {
    vi.useFakeTimers()
    request.mockResolvedValue({ statusCode: 400, data: {} })
    const { flushProgressUpload, markProgressDirty } = await import('./progressSync')

    markProgressDirty()
    await flushProgressUpload()
    await vi.advanceTimersByTimeAsync(600_000)

    expect(request).toHaveBeenCalledTimes(1)
  })

  it('refreshes an expired session and retries a 401 only once', async () => {
    request.mockImplementation(async (options: { url: string; header?: Record<string, string> }) => {
      if (options.url.endsWith('/api/weapp/session')) {
        return {
          statusCode: 200,
          data: {
            token: 'fresh-token',
            user: {
              nickname: '测试用户',
              isDefaultNickname: true,
              avatarUrl: '',
              createdAt: '2026-08-30T00:00:00.000Z'
            },
            progress: {
              masteredWordIds: [],
              savedWeakWordIds: [],
              selectedUnitId: '',
              courseSetupCompleted: false,
              updatedAt: ''
            },
            dashboard: {
              todayWords: 0,
              todayMinutes: 0,
              streakDays: 0,
              totalMastered: 0,
              totalStudyDays: 0
            }
          }
        }
      }

      if (options.header?.Authorization === 'Bearer test-token') {
        return { statusCode: 401, data: {} }
      }
      return { statusCode: 200, data: {} }
    })
    const { flushProgressUpload, markProgressDirty } = await import('./progressSync')

    markProgressDirty()
    await flushProgressUpload()

    expect(request).toHaveBeenCalledTimes(3)
    expect(request.mock.calls[1]?.[0]?.url).toContain('/api/weapp/session')
    expect(request.mock.calls[2]?.[0]?.header.Authorization).toBe('Bearer fresh-token')
  })

  it('keeps the existing retry deadline when newer progress arrives', async () => {
    vi.useFakeTimers()
    request
      .mockResolvedValueOnce({ statusCode: 500, data: {} })
      .mockResolvedValueOnce({ statusCode: 200, data: {} })
    const { flushProgressUpload, markProgressDirty } = await import('./progressSync')

    markProgressDirty()
    await flushProgressUpload()
    await vi.advanceTimersByTimeAsync(1_000)
    storage.set('gotit:masteredWordIds', [
      'rj:required-1:u1:hello',
      'rj:required-1:u1:world'
    ])
    markProgressDirty()
    await vi.advanceTimersByTimeAsync(3_999)

    expect(request).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)

    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1]?.[0]?.data.masteredWordIds).toEqual([
      'rj:required-1:u1:hello',
      'rj:required-1:u1:world'
    ])
  })
})
