import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmCourseSetupAndEnter,
  createPracticeSession,
  ensurePracticeSessionReady,
  resetPracticeSessionForTests,
  resetPracticeSessionState
} from './usePracticeSession'
import { ensureManifestReady, ensureWordbankFullyLoaded, resetWordbankCacheForTests } from '@/core/wordbank'
import { seedWordbankTestCache } from '@/test/wordbankTestCache'

describe('practice session dictation navigation', () => {
  let storage: Map<string, unknown>

  beforeEach(async () => {
    storage = new Map()
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
      removeStorageSync: vi.fn((key: string) => storage.delete(key)),
      pageScrollTo: vi.fn(),
      showToast: vi.fn(),
      vibrateShort: vi.fn()
    })
    resetPracticeSessionForTests()
    resetWordbankCacheForTests()
    seedWordbankTestCache(storage)
    storage.set('gotit:courseSetupCompleted', true)
    storage.set('gotit:selectedUnitId', 'rj:required-1:u1')
    await ensureWordbankFullyLoaded()
  })

  async function openSession() {
    resetPracticeSessionState()
    return ensurePracticeSessionReady()
  }

  it('keeps an unfinished dictation resumable and supports going to the previous word', async () => {
    const session = await openSession()
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

  it('does not offer resume after the final word completes', async () => {
    const session = await openSession()
    session.openDictationSetup()
    session.startDictation()

    const lastIndex = (session.dictationPlan.value?.words.length ?? 1) - 1
    session.dictationIndex.value = lastIndex
    session.nextDictation()

    expect(session.dictationInProgress.value).toBe(false)
    expect(session.screen.value).toBe('dictationReport')
  })

  it('restores unfinished progress after the session is recreated', async () => {
    const firstSession = await openSession()
    firstSession.openDictationSetup()
    firstSession.startDictation()
    firstSession.nextDictation()

    resetPracticeSessionState()
    const restoredSession = await ensurePracticeSessionReady()
    expect(restoredSession.dictationInProgress.value).toBe(true)
    expect(restoredSession.dictationIndex.value).toBe(1)

    restoredSession.resumeDictation()
    expect(restoredSession.screen.value).toBe('dictation')
  })

  it('preserves weakbook selection after returning from a weak-word detail', async () => {
    const initialSession = await openSession()
    const weakWordIds = initialSession.unitWords.value
      .slice(0, 3)
      .map(word => word.id)
    storage.set('gotit:savedWeakWordIds', weakWordIds)

    const session = await openSession()
    session.openWeakbook()
    expect(session.selectedWeakWordIds.value).toEqual([])
    session.toggleWeakWordSelection(weakWordIds[1]!)

    const selectionBeforeDetail = [...session.selectedWeakWordIds.value]
    session.openWordDetail(weakWordIds[0]!, {
      source: 'weakbook',
      orderedWordIds: weakWordIds
    })
    session.openWeakbook()

    expect(session.selectedWeakWordIds.value).toEqual(selectionBeforeDetail)
  })

  it('uses the weakbook order and count in weak-word detail progress', async () => {
    const initialSession = await openSession()
    const weakWordIds = initialSession.unitWords.value
      .slice(0, 3)
      .map(word => word.id)
    storage.set('gotit:savedWeakWordIds', weakWordIds)

    const session = await openSession()
    session.openWordDetail(weakWordIds[1]!, {
      source: 'weakbook',
      orderedWordIds: weakWordIds
    })

    expect(session.wordDetailProgressLabel.value).toBe('2/3')
    session.nextWordDetail()
    expect(session.wordDetailProgressLabel.value).toBe('3/3')
    session.previousWordDetail()
    expect(session.wordDetailProgressLabel.value).toBe('2/3')
  })

  it('uses textbook order for unit word detail progress', async () => {
    const session = await openSession()
    const firstWord = session.unitWords.value[0]
    if (!firstWord) return

    session.openUnitWords(false)
    session.openWordDetail(firstWord.id, { source: 'unitWords' })

    expect(session.wordDetailProgressLabel.value).toBe(`1/${session.unitWords.value.length}`)
    expect(session.hasPreviousWordDetail.value).toBe(false)
    expect(session.hasNextWordDetail.value).toBe(session.unitWords.value.length > 1)
  })

  it('uses mastered-first order when opening unit word detail from that list', async () => {
    const session = await openSession()
    const [firstWord, secondWord] = session.unitWords.value
    if (!firstWord || !secondWord) return

    session.markUnitWordKnown(firstWord.id)
    session.openUnitWords(true)
    session.openWordDetail(firstWord.id, { source: 'unitWords' })

    expect(session.wordDetailProgressLabel.value).toBe('1/' + session.unitWords.value.length)
    session.openWordDetail(secondWord.id, { source: 'unitWords' })
    expect(session.wordDetailProgressLabel.value).toBe('2/' + session.unitWords.value.length)
  })

  it('records recognition dictation answers', async () => {
    const session = await openSession()
    session.dictationPrompt.value = 'english'
    session.dictationMode.value = 'recognition'
    session.openDictationSetup()
    session.startDictation()

    const firstWord = session.dictationPlan.value?.words[0]
    const secondWord = session.dictationPlan.value?.words[1]
    if (!firstWord || !secondWord) return

    session.submitDictationRecognition(true)
    expect(session.dictationRecords.value).toEqual([
      expect.objectContaining({ wordId: firstWord.id, correct: true })
    ])
    expect(session.dictationIndex.value).toBe(1)

    session.submitDictationRecognition(false)
    expect(session.dictationRecords.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ wordId: firstWord.id, correct: true }),
        expect.objectContaining({ wordId: secondWord.id, correct: false, forgotten: true })
      ])
    )
    expect(session.dictationIndex.value).toBe(2)
  })

  it('builds a practice session from loaded words', async () => {
    const words = await ensureWordbankFullyLoaded()
    const session = createPracticeSession(words)
    expect(session.units.length).toBeGreaterThan(0)
    expect(session.unitWords.value.length).toBeGreaterThan(0)
  })

  it('keeps publisher selection visible after switching from junior to senior stage', async () => {
    const session = await openSession()
    session.openCourseSetup()
    session.setCourseSetupStage('初中')
    session.setCourseSetupGrade('七年级')
    session.setCourseSetupPublisher('kp')

    session.setCourseSetupStage('高中')

    const activeId = session.courseSetupActivePublisherId.value
    expect(activeId).toBeTruthy()
    expect(activeId).not.toBe('kp')
    expect(session.courseSetupPublisherOptions.value.some(option => option.id === activeId)).toBe(true)
    expect(session.courseSetupPublisherId.value).toBe(activeId)
  })

  it('restores junior course setup after switching senior back to junior', async () => {
    const session = await openSession()
    session.openCourseSetup()

    session.setCourseSetupStage('初中')
    session.setCourseSetupGrade('七年级')
    session.setCourseSetupPublisher('kp')

    session.setCourseSetupStage('高中')
    expect(session.courseSetupStage.value).toBe('高中')

    session.setCourseSetupStage('初中')

    expect(session.courseSetupStage.value).toBe('初中')
    expect(session.courseSetupGrade.value).toBe('七年级')
    expect(session.courseSetupPublisherId.value).toBe('kp')
    expect(session.courseSetupPublisherOptions.value.some(option => option.id === 'kp')).toBe(true)
    expect(session.courseSetupBookOptions.value.length).toBeGreaterThan(0)
    expect(session.courseSetupUnitOptions.value.length).toBeGreaterThan(0)
    expect(session.courseSetupCanConfirm.value).toBe(true)
  })

  it('highlights the same publisher chip after kp and rj junior selections', async () => {
    const session = await openSession()
    session.openCourseSetup()

    session.setCourseSetupStage('初中')
    session.setCourseSetupGrade('七年级')
    session.setCourseSetupPublisher('kp')
    session.setCourseSetupStage('高中')
    const afterKp = session.courseSetupActivePublisherId.value

    session.setCourseSetupStage('初中')
    session.setCourseSetupGrade('七年级')
    session.setCourseSetupPublisher('rj')
    session.setCourseSetupStage('高中')
    const afterRj = session.courseSetupActivePublisherId.value

    expect(afterKp).toBeTruthy()
    expect(afterRj).toBeTruthy()
    expect(afterKp).toBe(afterRj)
    expect(session.courseSetupPublisherId.value).toBe(afterRj)
  })

  it('syncs publisher selection from the chosen unit id', async () => {
    const session = await openSession()
    const rjUnit = session.units.find(unit => unit.publisherId === 'rj' && unit.unitName === 'Welcome Unit')
    if (!rjUnit) return

    session.openCourseSetup()
    session.setCourseSetupStage('高中')
    session.setCourseSetupPublisher('shj')
    expect(session.courseSetupPublisherId.value).toBe('shj')

    session.setCourseSetupUnit(rjUnit.unitId)
    expect(session.courseSetupPublisherId.value).toBe('rj')
    expect(session.courseSetupActivePublisherId.value).toBe('rj')
  })
})

describe('confirmCourseSetupAndEnter', () => {
  let storage: Map<string, unknown>

  beforeEach(async () => {
    storage = new Map()
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
      removeStorageSync: vi.fn((key: string) => storage.delete(key)),
      pageScrollTo: vi.fn(),
      showToast: vi.fn(),
      showLoading: vi.fn(),
      hideLoading: vi.fn(),
      vibrateShort: vi.fn()
    })
    resetPracticeSessionForTests()
    resetWordbankCacheForTests()
    seedWordbankTestCache(storage)
    await ensureManifestReady()
  })

  it('loads the selected publisher and enters home for a new user', async () => {
    const session = await ensurePracticeSessionReady()
    expect(session.units.length).toBe(0)

    session.setCourseSetupStage('高中')
    session.setCourseSetupPublisher('rj')
    const unitId = session.courseSetupUnitOptions.value[0]?.id
    expect(unitId).toBeTruthy()
    session.setCourseSetupUnit(unitId!)

    const ok = await confirmCourseSetupAndEnter()
    expect(ok).toBe(true)

    const next = await ensurePracticeSessionReady()
    expect(next.screen.value).toBe('home')
    expect(next.selectedUnit.value?.unitId).toBe(unitId)
    expect(next.units.length).toBeGreaterThan(0)
    expect(storage.get('gotit:courseSetupCompleted')).toBe(true)
    expect(storage.get('gotit:selectedUnitId')).toBe(unitId)
  })

  it('skips the loading popup when the publisher is already expanded', async () => {
    const session = await ensurePracticeSessionReady()
    session.setCourseSetupStage('高中')
    session.setCourseSetupPublisher('rj')
    session.setCourseSetupUnit(session.courseSetupUnitOptions.value[0]!.id)

    expect(await confirmCourseSetupAndEnter()).toBe(true)

    const showLoading = vi.fn()
    ;(uni as unknown as Record<string, unknown>).showLoading = showLoading

    const next = await ensurePracticeSessionReady()
    next.openCourseSetup()
    next.setCourseSetupStage('高中')
    next.setCourseSetupPublisher('rj')
    next.setCourseSetupUnit(next.courseSetupUnitOptions.value[1]!.id)

    expect(await confirmCourseSetupAndEnter()).toBe(true)
    expect(showLoading).not.toHaveBeenCalled()
  })

  it('hides the loading popup before reporting a download failure', async () => {
    const session = await ensurePracticeSessionReady()
    session.setCourseSetupStage('高中')
    session.setCourseSetupPublisher('rj')
    session.setCourseSetupUnit(session.courseSetupUnitOptions.value[0]!.id)

    const calls: string[] = []
    const runtime = uni as unknown as Record<string, unknown>
    runtime.showLoading = vi.fn(() => { calls.push('showLoading') })
    runtime.hideLoading = vi.fn(() => { calls.push('hideLoading') })
    runtime.showToast = vi.fn(() => { calls.push('showToast') })
    runtime.request = vi.fn((options: { fail?: (error: { errMsg: string }) => void }) => {
      options.fail?.({ errMsg: 'request:fail' })
    })
    resetWordbankCacheForTests()
    await ensureManifestReady()

    expect(await confirmCourseSetupAndEnter()).toBe(false)
    expect(calls).toEqual(['showLoading', 'hideLoading', 'showToast'])
  })
})
