import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPendingWordMatchReward,
  pendingWordMatchRewards,
  queuePendingWordMatchReward
} from './progress'

describe('word match pending rewards', () => {
  let storage: Map<string, unknown>

  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value))
    })
  })

  it('keeps one pending reward per Unit round until sync succeeds', () => {
    queuePendingWordMatchReward({ unitId: 'u1', roundIndex: 0, wordCount: 5, bestCombo: 4, errorCount: 1 })
    queuePendingWordMatchReward({ unitId: 'u1', roundIndex: 0, wordCount: 6, bestCombo: 6, errorCount: 0 })
    queuePendingWordMatchReward({ unitId: 'u1', roundIndex: 1, wordCount: 4, bestCombo: 2, errorCount: 2 })

    expect(pendingWordMatchRewards()).toEqual([
      { unitId: 'u1', roundIndex: 0, wordCount: 6, bestCombo: 6, errorCount: 0 },
      { unitId: 'u1', roundIndex: 1, wordCount: 4, bestCombo: 2, errorCount: 2 }
    ])

    clearPendingWordMatchReward('u1', 0)
    expect(pendingWordMatchRewards()).toEqual([
      { unitId: 'u1', roundIndex: 1, wordCount: 4, bestCombo: 2, errorCount: 2 }
    ])
  })

  it('keeps legacy pending rewards but never upgrades them to a perfect round', () => {
    storage.set('gotit:wordMatch:pendingRewards:v1', [
      { unitId: 'legacy', roundIndex: 0, wordCount: 9 }
    ])

    expect(pendingWordMatchRewards()).toEqual([
      { unitId: 'legacy', roundIndex: 0, wordCount: 9, bestCombo: 0, errorCount: 1 }
    ])
  })
})
