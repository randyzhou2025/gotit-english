import { beforeEach, describe, expect, it, vi } from 'vitest'

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
      request
    })
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
})
