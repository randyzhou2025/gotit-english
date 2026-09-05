import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmCourseSetupAndEnter,
  createPracticeSession,
  ensurePracticeSessionReady,
  openSharedUnitHome,
  openUnitDictationChallenge,
  openUnitWordMatchChallenge,
  resetPracticeSessionForTests,
  resetPracticeSessionState,
  restorePracticeCloudProgress
} from './usePracticeSession'
import { ensureManifestReady, ensureWordbankFullyLoaded, resetWordbankCacheForTests } from '@/core/wordbank'
import { seedWordbankTestCache } from '@/test/wordbankTestCache'

const scoringMocks = vi.hoisted(() => ({
  submitDictationCompletion: vi.fn(),
  submitDictationWordCompletion: vi.fn(),
  submitMistakeReviews: vi.fn()
}))

vi.mock('@/core/classmates', () => ({
  submitDictationCompletion: scoringMocks.submitDictationCompletion,
  submitDictationWordCompletion: scoringMocks.submitDictationWordCompletion,
  submitMistakeReviews: scoringMocks.submitMistakeReviews
}))

describe('practice session dictation navigation', () => {
  let storage: Map<string, unknown>

  beforeEach(async () => {
    scoringMocks.submitDictationCompletion.mockReset().mockResolvedValue(null)
    scoringMocks.submitDictationWordCompletion.mockReset().mockResolvedValue(null)
    scoringMocks.submitMistakeReviews.mockReset().mockResolvedValue(null)
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

  it('submits each completed word without blocking navigation', async () => {
    const session = await openSession()
    session.dictationOrder.value = 'sequence'
    session.openDictationSetup()
    session.startDictation()
    const plan = session.dictationPlan.value
    const firstWord = plan?.words[0]
    if (!plan || !firstWord) return
    scoringMocks.submitDictationWordCompletion.mockReturnValue(new Promise(() => {}))

    session.nextDictation()

    expect(session.dictationIndex.value).toBe(1)
    expect(scoringMocks.submitDictationWordCompletion).toHaveBeenCalledWith({
      sessionId: plan.id,
      unitId: firstWord.unitId,
      wordId: firstWord.id
    })
  })

  it('starts full score settlement on report entry and only displays it after confirmation', async () => {
    const session = await openSession()
    session.openDictationSetup()
    session.startDictation()
    const plan = session.dictationPlan.value
    if (!plan) return
    scoringMocks.submitDictationCompletion.mockResolvedValue({
      duplicate: false,
      validDictation: true,
      earned: 25,
      breakdown: {
        dictationWordScore: 10,
        validDictationScore: 5,
        dailyBonusScore: 10,
        streakScore: 0,
        mistakeReviewScore: 0
      },
      weekKey: '2026-W35',
      weeklyLearningPower: 25,
      myRank: 1
    })
    session.dictationIndex.value = plan.words.length - 1

    session.nextDictation()

    expect(session.screen.value).toBe('dictationReport')
    expect(scoringMocks.submitDictationCompletion).toHaveBeenCalledTimes(1)
    expect(session.dictationReward.value).toBeNull()
    await Promise.resolve()
    expect(session.learningPowerAward.value?.earned).toBe(25)

    session.confirmDictationResult()
    expect(session.screen.value).toBe('dictationReward')
    expect(scoringMocks.submitDictationCompletion).toHaveBeenCalledTimes(1)
  })

  it('scores a historical weak word when it is dictated or marked known', async () => {
    const session = await openSession()
    const weakWord = session.unitWords.value[0]
    if (!weakWord) return
    session.saveWeakWord(weakWord.id)
    session.dictationOrder.value = 'sequence'
    session.openDictationSetup()
    session.startDictation()
    const plan = session.dictationPlan.value
    if (!plan) return

    session.nextDictation()
    expect(scoringMocks.submitMistakeReviews).toHaveBeenCalledWith({
      reviewSessionId: plan.id,
      wordIds: [weakWord.id]
    })

    session.resetPractice()
    session.openWeakbook()
    session.toggleWeakWordSelection(weakWord.id)
    session.markSelectedWeakWordsKnown()
    expect(scoringMocks.submitMistakeReviews).toHaveBeenLastCalledWith({
      reviewSessionId: expect.stringMatching(/^review-/),
      wordIds: [weakWord.id]
    })
  })

  it('persists completed dictation word totals for the current day', async () => {
    const session = await openSession()
    session.openDictationSetup()
    session.startDictation()
    const completedWordCount = session.dictationPlan.value?.words.length ?? 0

    session.confirmDictationResult()
    expect(session.todayDictationWordCount.value).toBe(completedWordCount)

    session.confirmDictationResult()
    expect(session.todayDictationWordCount.value).toBe(completedWordCount)

    resetPracticeSessionState()
    const restoredSession = await ensurePracticeSessionReady()
    expect(restoredSession.todayDictationWordCount.value).toBe(completedWordCount)
  })

  it('updates the mounted session immediately when cloud progress arrives', async () => {
    const session = await openSession()
    const masteredWord = session.unitWords.value[0]
    if (!masteredWord) return

    expect(session.masteredUnitWordCount.value).toBe(0)
    session.adoptProgress({
      masteredWordIds: [masteredWord.id],
      savedWeakWordIds: [],
      selectedUnitId: masteredWord.unitId,
      courseSetupCompleted: true,
      updatedAt: new Date().toISOString()
    })

    expect(session.masteredUnitWordCount.value).toBe(1)
    expect(session.courseSetupUnitOptions.value.find(unit => unit.id === masteredWord.unitId)?.masteryPercent)
      .toBeGreaterThan(0)
  })

  it('restores the cloud textbook and unit after local storage was deleted', async () => {
    resetPracticeSessionForTests()
    resetWordbankCacheForTests()
    storage.delete('gotit:courseSetupCompleted')
    storage.delete('gotit:selectedUnitId')
    storage.delete('gotit:masteredWordIds')
    storage.delete('gotit:savedWeakWordIds')
    seedWordbankTestCache(storage)
    await ensureManifestReady()
    const remoteWordId = 'rj:required-1:u1:teenage'
    const runtime = uni as unknown as Record<string, unknown>
    runtime.login = vi.fn((options: { success: (result: { code: string }) => void }) => {
      options.success({ code: 'fresh-install-code' })
    })
    runtime.request = vi.fn(async (options: { url: string }) => {
      if (options.url.endsWith('/api/weapp/session')) {
        return {
          statusCode: 200,
          data: {
            token: 'fresh-install-token',
            user: {
              nickname: 'Justin',
              isDefaultNickname: false,
              avatarUrl: '',
              createdAt: '2026-08-01T00:00:00.000Z'
            },
            progress: {
              masteredWordIds: [remoteWordId],
              savedWeakWordIds: [],
              selectedUnitId: 'rj:required-1:u1',
              courseSetupCompleted: true,
              updatedAt: '2026-08-27T00:00:00.000Z'
            },
            dashboard: {
              todayWords: 0,
              todayMinutes: 0,
              streakDays: 0,
              totalMastered: 1,
              totalStudyDays: 0
            }
          }
        }
      }
      return { statusCode: 200, data: {} }
    })

    const session = await ensurePracticeSessionReady()
    await restorePracticeCloudProgress()

    await vi.waitFor(() => {
      expect(session.courseSetupCompleted.value).toBe(true)
      expect(session.selectedUnit.value?.unitId).toBe('rj:required-1:u1')
      expect(session.unitWordCount.value).toBeGreaterThan(0)
      expect(session.masteredUnitWordCount.value).toBe(1)
    })
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
    expect(session.isUnitWordMastered(firstWord.id)).toBe(true)
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
    expect(session.units.value.length).toBeGreaterThan(0)
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
    const rjUnit = session.units.value.find(unit => unit.publisherId === 'rj' && unit.unitName === 'Welcome Unit')
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
    expect(session.units.value.length).toBe(0)

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
    expect(next.units.value.length).toBeGreaterThan(0)
    expect(storage.get('gotit:courseSetupCompleted')).toBe(true)
    expect(storage.get('gotit:selectedUnitId')).toBe(unitId)
  })

  it('opens a shared unit directly in dictation setup for a new user', async () => {
    const session = await ensurePracticeSessionReady()
    expect(session.units.value.length).toBe(0)

    const targetUnitId = 'rj:required-1:u1'
    expect(await openUnitDictationChallenge(targetUnitId)).toBe(true)

    expect(session.courseSetupCompleted.value).toBe(false)
    expect(session.selectedUnit.value?.unitId).toBe(targetUnitId)
    expect(session.unitWords.value.length).toBeGreaterThan(0)
    expect(session.screen.value).toBe('dictationSetup')
    expect(storage.get('gotit:courseSetupCompleted')).not.toBe(true)
    expect(storage.get('gotit:selectedUnitId')).not.toBe(targetUnitId)

    session.backFromDictationSetup()
    expect(session.screen.value).toBe('courseSetup')
    expect(storage.get('gotit:selectedUnitId')).not.toBe(targetUnitId)
  })

  it('sets a classmate invite unit as current and opens its home for a new user', async () => {
    const session = await ensurePracticeSessionReady()
    expect(session.units.value.length).toBe(0)

    const targetUnitId = 'rj:required-1:u1'
    expect(await openSharedUnitHome(targetUnitId)).toBe(true)

    expect(session.courseSetupCompleted.value).toBe(true)
    expect(session.selectedUnit.value?.unitId).toBe(targetUnitId)
    expect(session.unitWords.value.length).toBeGreaterThan(0)
    expect(session.screen.value).toBe('home')
    expect(storage.get('gotit:courseSetupCompleted')).toBe(true)
    expect(storage.get('gotit:selectedUnitId')).toBe(targetUnitId)
  })

  it('prepares a shared unit for word match without entering dictation', async () => {
    const session = await ensurePracticeSessionReady()
    const targetUnitId = 'rj:required-1:u1'

    expect(await openUnitWordMatchChallenge(targetUnitId)).toBe(true)

    expect(session.courseSetupCompleted.value).toBe(false)
    expect(session.selectedUnit.value?.unitId).toBe(targetUnitId)
    expect(session.unitWords.value.length).toBeGreaterThan(0)
    expect(session.screen.value).toBe('courseSetup')
    expect(storage.get('gotit:selectedUnitId')).not.toBe(targetUnitId)
  })

  it('rejects an unknown shared unit without completing setup', async () => {
    expect(await openUnitDictationChallenge('missing:book:unit')).toBe(false)
    const session = await ensurePracticeSessionReady()

    expect(session.courseSetupCompleted.value).toBe(false)
    expect(session.screen.value).toBe('courseSetup')
    expect(storage.get('gotit:courseSetupCompleted')).not.toBe(true)
  })

  it('stamps progress updatedAt so a stale cloud snapshot cannot revert the choice', async () => {
    const staleStamp = '2020-01-01T00:00:00.000Z'
    storage.set('gotit:progress:updatedAt', staleStamp)

    const session = await ensurePracticeSessionReady()
    session.setCourseSetupStage('高中')
    session.setCourseSetupPublisher('rj')
    const unitId = session.courseSetupUnitOptions.value[0]!.id
    session.setCourseSetupUnit(unitId)

    expect(await confirmCourseSetupAndEnter()).toBe(true)
    expect(storage.get('gotit:selectedUnitId')).toBe(unitId)
    expect(Date.parse(storage.get('gotit:progress:updatedAt') as string))
      .toBeGreaterThan(Date.parse(staleStamp))
  })

  it('keeps the latest unit after switching textbooks twice', async () => {
    const first = await ensurePracticeSessionReady()
    first.setCourseSetupStage('高中')
    first.setCourseSetupPublisher('rj')
    const firstUnitId = first.courseSetupUnitOptions.value[0]!.id
    first.setCourseSetupUnit(firstUnitId)
    expect(await confirmCourseSetupAndEnter()).toBe(true)

    const second = await ensurePracticeSessionReady()
    second.openCourseSetup()
    second.setCourseSetupStage('初中')
    second.setCourseSetupGrade('七年级')
    second.setCourseSetupPublisher('kp')
    const secondUnitId = second.courseSetupUnitOptions.value[0]!.id
    second.setCourseSetupUnit(secondUnitId)
    expect(await confirmCourseSetupAndEnter()).toBe(true)

    expect(secondUnitId).not.toBe(firstUnitId)
    expect(storage.get('gotit:selectedUnitId')).toBe(secondUnitId)
    const current = await ensurePracticeSessionReady()
    expect(current.selectedUnit.value?.unitId).toBe(secondUnitId)
  })

  it('updates the same session object so mounted shells see the new textbook', async () => {
    const session = await ensurePracticeSessionReady()
    session.setCourseSetupStage('高中')
    session.setCourseSetupPublisher('rj')
    session.setCourseSetupUnit(session.courseSetupUnitOptions.value[0]!.id)
    expect(await confirmCourseSetupAndEnter()).toBe(true)

    session.openCourseSetup()
    session.setCourseSetupStage('初中')
    session.setCourseSetupGrade('七年级')
    session.setCourseSetupPublisher('kp')
    const switchedUnitId = session.courseSetupUnitOptions.value[0]!.id
    session.setCourseSetupUnit(switchedUnitId)
    expect(await confirmCourseSetupAndEnter()).toBe(true)

    // The reference a mounted shell captured at setup time must reflect the switch;
    // recreating the session instead would leave that shell on the old textbook.
    expect(await ensurePracticeSessionReady()).toBe(session)
    expect(session.selectedUnit.value?.unitId).toBe(switchedUnitId)
    expect(session.unitWords.value.length).toBeGreaterThan(0)
    expect(session.screen.value).toBe('home')
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
