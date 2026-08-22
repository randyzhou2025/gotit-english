import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadTodayDictationWordCount, recordTodayDictationWords } from './dailyDictationProgress'

describe('daily dictation progress', () => {
  let storage: Map<string, unknown>

  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value))
    })
  })

  it('adds completed dictation words on the same local day', () => {
    const date = new Date(2026, 7, 22, 9, 0)

    expect(recordTodayDictationWords(20, date)).toBe(20)
    expect(recordTodayDictationWords(5, date)).toBe(25)
    expect(loadTodayDictationWordCount(date)).toBe(25)
  })

  it('starts from zero on a new local day', () => {
    recordTodayDictationWords(20, new Date(2026, 7, 22, 23, 50))

    expect(loadTodayDictationWordCount(new Date(2026, 7, 23, 0, 10))).toBe(0)
  })
})
