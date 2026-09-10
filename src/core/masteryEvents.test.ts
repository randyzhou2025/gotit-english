import { beforeEach, describe, expect, it, vi } from 'vitest'
import { acknowledgeMasteryEvents, readPendingMasteryEvents, recordMasteryEvents } from './masteryEvents'

describe('mastery event journal', () => {
  beforeEach(() => {
    const storage = new Map()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value)
    })
  })

  it('keeps the first action time across duplicate mastery and week rollover', () => {
    recordMasteryEvents(['hello', 'hello'], new Date('2026-09-06T15:59:59Z'))
    recordMasteryEvents(['hello'], new Date('2026-09-06T16:00:01Z'))
    expect(readPendingMasteryEvents()).toEqual([{ wordId: 'hello', masteredAt: '2026-09-06T15:59:59.000Z' }])
  })

  it('does not acknowledge events that arrived during an upload', () => {
    recordMasteryEvents(['hello'])
    const sent = readPendingMasteryEvents()
    recordMasteryEvents(['world'])
    acknowledgeMasteryEvents(sent)
    expect(readPendingMasteryEvents().map(event => event.wordId)).toEqual(['world'])
  })
})
