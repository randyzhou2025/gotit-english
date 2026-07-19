import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPracticeSession } from './usePracticeSession'

describe('practice session dictation navigation', () => {
  let storage: Map<string, unknown>

  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
      removeStorageSync: vi.fn((key: string) => storage.delete(key)),
      pageScrollTo: vi.fn(),
      showToast: vi.fn(),
      vibrateShort: vi.fn()
    })
  })

  it('keeps an unfinished dictation resumable and supports going to the previous word', () => {
    const session = createPracticeSession()
    session.openDictationSetup()
    session.startDictation()

    expect(session.dictationInProgress.value).toBe(true)
    expect(session.screen.value).toBe('dictation')

    session.nextDictation()
    expect(session.dictationIndex.value).toBe(1)

    session.showScreen('dictationSetup')
    session.resumeDictation()
    expect(session.screen.value).toBe('dictation')
    expect(session.dictationIndex.value).toBe(1)

    session.previousDictation()
    expect(session.dictationIndex.value).toBe(0)

    session.previousDictation()
    expect(session.dictationIndex.value).toBe(0)
  })

  it('does not offer resume after the final word completes', () => {
    const session = createPracticeSession()
    session.openDictationSetup()
    session.startDictation()

    const lastIndex = (session.dictationPlan.value?.words.length ?? 1) - 1
    session.dictationIndex.value = lastIndex
    session.nextDictation()

    expect(session.dictationInProgress.value).toBe(false)
    expect(session.screen.value).toBe('dictationReport')
  })

  it('restores unfinished progress after the session is recreated', () => {
    const firstSession = createPracticeSession()
    firstSession.openDictationSetup()
    firstSession.startDictation()
    firstSession.nextDictation()

    const restoredSession = createPracticeSession()
    expect(restoredSession.dictationInProgress.value).toBe(true)
    expect(restoredSession.dictationIndex.value).toBe(1)

    restoredSession.resumeDictation()
    expect(restoredSession.screen.value).toBe('dictation')
  })

  it('preserves weakbook selection after returning from a weak-word detail', () => {
    const initialSession = createPracticeSession()
    const weakWordIds = initialSession.unitWords.value
      .slice(0, 3)
      .map(word => word.id)
    storage.set('gotit:savedWeakWordIds', weakWordIds)

    const session = createPracticeSession()
    session.openWeakbook()
    session.toggleWeakWordSelection(weakWordIds[1]!)

    const selectionBeforeDetail = [...session.selectedWeakWordIds.value]
    session.openWordDetail(weakWordIds[0]!, weakWordIds)
    session.openWeakbook()

    expect(session.selectedWeakWordIds.value).toEqual(selectionBeforeDetail)
  })

  it('uses the weakbook order and count in weak-word detail progress', () => {
    const initialSession = createPracticeSession()
    const weakWordIds = initialSession.unitWords.value
      .slice(0, 3)
      .map(word => word.id)
    storage.set('gotit:savedWeakWordIds', weakWordIds)

    const session = createPracticeSession()
    session.openWordDetail(weakWordIds[1]!, weakWordIds)

    expect(session.wordDetailProgressLabel.value).toBe('2/3')
    session.nextWordDetail()
    expect(session.wordDetailProgressLabel.value).toBe('3/3')
  })
})
