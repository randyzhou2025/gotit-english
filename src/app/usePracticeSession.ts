import { computed, ref } from 'vue'
import { getDictationAudioUrl, getDictationPromptLabel, hasPlayableDictationAudio } from '@/core/audio'
import {
  createCheckupQuestions,
  gradeCheckupAnswer,
  summarizeCheckup
} from '@/core/checkup'
import {
  createDictationPlan,
  gradeDictationInput
} from '@/core/dictation'
import type {
  CheckupAnswer,
  CheckupQuestion,
  DictationMode,
  DictationOrder,
  DictationPlan,
  DictationPrompt,
  DictationRecord,
  DictationRepeatCount,
  UnitGroup,
  WordEntry
} from '@/core/types'
import {
  findUnit,
  getDefaultUnit,
  getUnitLabel,
  getWeakWords,
  getWordbank,
  groupUnits
} from '@/core/wordbank'

export type AppScreen = 'courseSetup' | 'home' | 'weakbook' | 'unitWords' | 'wordDetail' | 'checkupSetup' | 'checkup' | 'spelling' | 'report' | 'dictationSetup' | 'dictationWords' | 'dictation' | 'dictationReport' | 'dictationReward'
export type RecognitionState = 'idle' | 'correct' | 'wrong'
export type SchoolStage = '初中' | '高中'

export interface DictationRewardState {
  total: number
  masteredCount: number
  newlyMasteredCount: number
  forgottenCount: number
  beforeMastered: number
  afterMastered: number
  beforePercent: number
  afterPercent: number
  allCorrect: boolean
}

const DEFAULT_CHECKUP_LIMIT = 10
const CORRECT_ADVANCE_DELAY_MS = 640
const DICTATION_CORRECT_ADVANCE_DELAY_MS = 760
const FORGOTTEN_ADVANCE_DELAY_MS = 1000
const DEFAULT_DICTATION_ACCENT = 'uk'
const DICTATION_QUICK_PICK_COUNTS = [5, 10, 20, 30, 50]
const SAVED_WEAK_WORD_IDS_KEY = 'gotit:savedWeakWordIds'
const MASTERED_WORD_IDS_KEY = 'gotit:masteredWordIds'
const SELECTED_UNIT_ID_KEY = 'gotit:selectedUnitId'
const COURSE_SETUP_COMPLETED_KEY = 'gotit:courseSetupCompleted'
const UNFINISHED_DICTATION_KEY = 'gotit:unfinishedDictation'
const SCHOOL_STAGE_OPTIONS: SchoolStage[] = ['初中', '高中']
const JUNIOR_GRADE_OPTIONS = ['六年级', '七年级', '八年级', '九年级']

interface SavedDictationProgress {
  plan: DictationPlan
  index: number
}

function loadUnfinishedDictation(): SavedDictationProgress | null {
  try {
    const saved = uni.getStorageSync(UNFINISHED_DICTATION_KEY) as Partial<SavedDictationProgress> | null
    if (!saved?.plan || !Array.isArray(saved.plan.words) || saved.plan.words.length === 0) return null

    const index = Number(saved.index)
    if (!Number.isInteger(index) || index < 0 || index >= saved.plan.words.length) return null

    return { plan: saved.plan, index }
  } catch {
    return null
  }
}

function saveUnfinishedDictation(plan: DictationPlan, index: number) {
  try {
    uni.setStorageSync(UNFINISHED_DICTATION_KEY, { plan, index })
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
}

function clearUnfinishedDictation() {
  try {
    uni.removeStorageSync(UNFINISHED_DICTATION_KEY)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
}

function loadSavedWordIds(key: string): string[] {
  try {
    const saved = uni.getStorageSync(key)
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function saveWordIds(key: string, ids: string[]) {
  try {
    uni.setStorageSync(key, ids)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
}

function loadSavedUnitId(): string {
  try {
    const saved = uni.getStorageSync(SELECTED_UNIT_ID_KEY)
    return typeof saved === 'string' ? saved : ''
  } catch {
    return ''
  }
}

function loadCourseSetupCompleted(savedUnitId: string): boolean {
  if (savedUnitId) return true

  try {
    return uni.getStorageSync(COURSE_SETUP_COMPLETED_KEY) === true
  } catch {
    return false
  }
}

function saveCourseSetupCompleted() {
  try {
    uni.setStorageSync(COURSE_SETUP_COMPLETED_KEY, true)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
}

function saveSelectedUnitId(unitId: string) {
  try {
    uni.setStorageSync(SELECTED_UNIT_ID_KEY, unitId)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
}

function sampleWords<T>(items: T[], count: number): T[] {
  if (count >= items.length) return [...items]

  const pool = [...items]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = pool[index]!
    pool[index] = pool[swapIndex]!
    pool[swapIndex] = current
  }

  return pool.slice(0, count)
}

function inferSchoolStage(unit: UnitGroup): SchoolStage {
  return /初中|七年级|八年级|九年级/.test(unit.bookName) ? '初中' : '高中'
}

function inferJuniorGrade(unit: UnitGroup): string {
  return JUNIOR_GRADE_OPTIONS.find(grade => unit.bookName.includes(grade)) ?? ''
}

function computeMasteryPercent(wordIds: string[], masteredSet: Set<string>): number | null {
  if (wordIds.length === 0) return null

  let masteredCount = 0
  for (const wordId of wordIds) {
    if (masteredSet.has(wordId)) masteredCount += 1
  }
  if (masteredCount === 0) return null

  return Math.round((masteredCount / wordIds.length) * 100)
}

function toBookCourseOptions(
  units: UnitGroup[],
  masteredSet: Set<string>
): Array<{ id: string, name: string, masteryPercent: number | null }> {
  const books = new Map<string, { id: string, name: string, order: number, wordIds: string[] }>()

  for (const unit of units) {
    let book = books.get(unit.bookId)
    if (!book) {
      book = { id: unit.bookId, name: unit.bookName, order: unit.bookOrder, wordIds: [] }
      books.set(unit.bookId, book)
    }
    book.wordIds.push(...unit.words.map(word => word.id))
  }

  return Array.from(books.values())
    .sort((a, b) => a.order - b.order)
    .map(book => ({
      id: book.id,
      name: book.name,
      masteryPercent: computeMasteryPercent(book.wordIds, masteredSet)
    }))
}

function toCourseOptions<T extends UnitGroup>(
  units: T[],
  getId: (unit: T) => string,
  getName: (unit: T) => string
): Array<{ id: string, name: string }> {
  const map = new Map<string, string>()
  for (const unit of units) {
    if (!map.has(getId(unit))) {
      map.set(getId(unit), getName(unit))
    }
  }

  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values))
}

function getDefaultCheckupLimit(wordCount: number): number {
  return Math.min(DEFAULT_CHECKUP_LIMIT, Math.max(0, wordCount))
}

function normalizeCheckupLimit(limit: number, wordCount: number): number {
  if (wordCount <= 0) return 0
  if (!Number.isFinite(limit) || limit <= 0) return getDefaultCheckupLimit(wordCount)
  return Math.min(wordCount, Math.max(1, Math.round(limit)))
}

function scrollToTop() {
  setTimeout(() => {
    try {
      uni.pageScrollTo({ scrollTop: 0, duration: 0 })
    } catch {
      // Some non-page preview contexts do not expose pageScrollTo.
    }
  }, 0)
}

type HapticStrength = 'light' | 'medium' | 'heavy'

function triggerHapticFeedback(strength: HapticStrength = 'medium') {
  try {
    const feedback = uni as unknown as {
      vibrateShort?: (options?: {
        type?: HapticStrength
        fail?: () => void
      }) => void
    }
    const runtime = globalThis as unknown as {
      wx?: {
        vibrateShort?: (options?: { type?: HapticStrength; fail?: () => void }) => void
      }
    }
    // Android ignores `type` (fixed ~15ms); iOS maps it to light/medium/heavy intensity.
    // Some Android bases reject an unknown `type`, so fall back to a plain call on failure.
    const plainFallback = () => {
      if (feedback.vibrateShort) {
        feedback.vibrateShort({})
        return
      }
      runtime.wx?.vibrateShort?.({})
    }

    if (feedback.vibrateShort) {
      feedback.vibrateShort({ type: strength, fail: plainFallback })
      return
    }

    if (runtime.wx?.vibrateShort) {
      runtime.wx.vibrateShort({ type: strength, fail: plainFallback })
      return
    }
  } catch {
    // Haptic feedback is best-effort and unavailable in some preview runtimes.
  }
}

export function createPracticeSession() {
  const words = getWordbank()
  const units = groupUnits(words)
  const defaultUnit = getDefaultUnit(units)
  const savedUnitId = loadSavedUnitId()
  const initialUnit = findUnit(units, savedUnitId) ?? defaultUnit
  const initiallyCompletedCourseSetup = loadCourseSetupCompleted(savedUnitId)
  const unfinishedDictation = loadUnfinishedDictation()

  const screen = ref<AppScreen>(initiallyCompletedCourseSetup ? 'home' : 'courseSetup')
  const selectedUnitId = ref(initialUnit?.unitId ?? '')
  const courseSetupCompleted = ref(initiallyCompletedCourseSetup)
  const courseSetupStage = ref<SchoolStage>(initialUnit ? inferSchoolStage(initialUnit) : '高中')
  const courseSetupGrade = ref(initialUnit && inferSchoolStage(initialUnit) === '初中' ? inferJuniorGrade(initialUnit) : '')
  const courseSetupPublisherId = ref(initialUnit?.publisherId ?? '')
  const courseSetupBookId = ref(initialUnit?.bookId ?? '')
  const courseSetupUnitId = ref(initialUnit?.unitId ?? '')

  const checkupQuestions = ref<CheckupQuestion[]>([])
  const checkupAnswers = ref<CheckupAnswer[]>([])
  const checkupIndex = ref(0)
  const checkupLimit = ref(0)
  const selectedMeaning = ref('')
  const recognitionState = ref<RecognitionState>('idle')
  const spellingInput = ref('')
  const savedWeakWordIds = ref<string[]>(loadSavedWordIds(SAVED_WEAK_WORD_IDS_KEY))
  const masteredWordIds = ref<string[]>(loadSavedWordIds(MASTERED_WORD_IDS_KEY))
  const masteredWordIdSet = computed(() => new Set(masteredWordIds.value))
  const selectedWeakWordIds = ref<string[]>([])
  const selectedWordDetailId = ref('')
  const unitWordsMasteredFirst = ref(false)

  const dictationMode = ref<DictationMode>(unfinishedDictation?.plan.mode ?? 'paper')
  const dictationPrompt = ref<DictationPrompt>(unfinishedDictation?.plan.prompt ?? 'chinese')
  const dictationIntervalSeconds = ref(unfinishedDictation?.plan.intervalSeconds ?? 8)
  const dictationOrder = ref<DictationOrder>(unfinishedDictation?.plan.order ?? 'shuffle')
  const dictationRepeatCount = ref<DictationRepeatCount>(unfinishedDictation?.plan.repeatCount ?? 1)
  const dictationPlan = ref<DictationPlan | null>(unfinishedDictation?.plan ?? null)
  const dictationIndex = ref(unfinishedDictation?.index ?? 0)
  const dictationInProgress = ref(Boolean(unfinishedDictation))
  const dictationInput = ref('')
  const dictationRecords = ref<DictationRecord[]>([])
  const showDictationAnswer = ref(false)
  const dictationSourceWords = ref<WordEntry[] | null>(null)
  const selectedDictationWordIds = ref<string[]>([])
  const selectedDictationQuickCount = ref<number | null>(null)
  const dictationExcludesMasteredWords = ref(true)
  const dictationResultConfirmed = ref(false)
  const dictationReward = ref<DictationRewardState | null>(null)

  const selectedUnit = computed<UnitGroup | undefined>(() => findUnit(units, selectedUnitId.value))
  const currentSchoolStage = computed(() => selectedUnit.value ? inferSchoolStage(selectedUnit.value) : '高中')
  const selectedUnitIndex = computed(() => {
    const index = units.findIndex(unit => unit.unitId === selectedUnitId.value)
    return index < 0 ? 0 : index
  })
  const schoolStageOptions = computed(() => SCHOOL_STAGE_OPTIONS)
  const selectedSchoolStageIndex = computed(() => Math.max(0, schoolStageOptions.value.indexOf(currentSchoolStage.value)))
  const publisherOptions = computed(() => uniqueValues(units
    .filter(unit => inferSchoolStage(unit) === currentSchoolStage.value)
    .map(unit => unit.publisherName)))
  const selectedPublisherIndex = computed(() => Math.max(0, publisherOptions.value.indexOf(selectedUnit.value?.publisherName ?? '')))
  const bookOptions = computed(() => uniqueValues(units
    .filter(unit => inferSchoolStage(unit) === currentSchoolStage.value && unit.publisherId === selectedUnit.value?.publisherId)
    .sort((a, b) => a.bookOrder - b.bookOrder)
    .map(unit => unit.bookName)))
  const selectedBookIndex = computed(() => Math.max(0, bookOptions.value.indexOf(selectedUnit.value?.bookName ?? '')))
  const unitQuickOptions = computed(() => units
    .filter(unit => {
      return inferSchoolStage(unit) === currentSchoolStage.value
        && unit.publisherId === selectedUnit.value?.publisherId
        && unit.bookId === selectedUnit.value?.bookId
    })
    .sort((a, b) => a.unitNumber - b.unitNumber)
    .map(unit => unit.unitName))
  const selectedUnitQuickIndex = computed(() => Math.max(0, unitQuickOptions.value.indexOf(selectedUnit.value?.unitName ?? '')))
  const courseSetupStageOptions = computed(() => SCHOOL_STAGE_OPTIONS)
  const courseSetupGradeOptions = computed(() => JUNIOR_GRADE_OPTIONS)
  const courseSetupStageUnits = computed(() => {
    if (courseSetupStage.value === '初中') {
      if (!courseSetupGrade.value) return []
      return units.filter(unit => inferSchoolStage(unit) === '初中' && unit.bookName.includes(courseSetupGrade.value))
    }

    return units.filter(unit => inferSchoolStage(unit) === '高中')
  })
  const courseSetupPublisherOptions = computed(() => toCourseOptions(
    courseSetupStageUnits.value,
    unit => unit.publisherId,
    unit => unit.publisherName
  ))
  const courseSetupBookOptions = computed(() => toBookCourseOptions(
    courseSetupStageUnits.value.filter(unit => unit.publisherId === courseSetupPublisherId.value),
    masteredWordIdSet.value
  ))
  const courseSetupUnitOptions = computed(() => courseSetupStageUnits.value
    .filter(unit => unit.publisherId === courseSetupPublisherId.value && unit.bookId === courseSetupBookId.value)
    .sort((a, b) => a.unitNumber - b.unitNumber)
    .map(unit => ({
      id: unit.unitId,
      name: unit.unitName,
      count: unit.words.length,
      masteryPercent: computeMasteryPercent(unit.words.map(word => word.id), masteredWordIdSet.value)
    })))
  const courseSetupCanConfirm = computed(() => courseSetupUnitOptions.value.some(unit => unit.id === courseSetupUnitId.value))
  const unitWords = computed(() => selectedUnit.value?.words ?? [])
  const masteredUnitWords = computed(() => unitWords.value.filter(word => masteredWordIdSet.value.has(word.id)))
  const masteredUnitWordCount = computed(() => masteredUnitWords.value.length)
  const unitWordCount = computed(() => unitWords.value.length)
  const unitMasteryLabel = computed(() => `${masteredUnitWordCount.value}/${unitWordCount.value}`)
  const unitMasteryPercent = computed(() => {
    if (unitWordCount.value === 0) return 0
    return Math.round((masteredUnitWordCount.value / unitWordCount.value) * 100)
  })
  const wordDetailOrderedIds = computed(() => {
    const unmastered = unitWords.value.filter(word => !masteredWordIdSet.value.has(word.id))
    const mastered = unitWords.value.filter(word => masteredWordIdSet.value.has(word.id))
    return [...unmastered, ...mastered].map(word => word.id)
  })
  const wordDetailEntry = computed(() => {
    if (!selectedWordDetailId.value) return null
    return unitWords.value.find(word => word.id === selectedWordDetailId.value) ?? null
  })
  const wordDetailIndex = computed(() => {
    const index = wordDetailOrderedIds.value.indexOf(selectedWordDetailId.value)
    return index >= 0 ? index : 0
  })
  const wordDetailProgressLabel = computed(() => {
    const total = wordDetailOrderedIds.value.length
    if (total <= 0) return '0/0'
    return `${wordDetailIndex.value + 1}/${total}`
  })
  const hasNextWordDetail = computed(() => (
    wordDetailIndex.value >= 0
    && wordDetailIndex.value < wordDetailOrderedIds.value.length - 1
  ))
  const activeWords = computed(() => unitWords.value.filter(word => !masteredWordIdSet.value.has(word.id)))
  const defaultCheckupLimit = computed(() => getDefaultCheckupLimit(activeWords.value.length))
  const effectiveCheckupLimit = computed(() => normalizeCheckupLimit(checkupLimit.value, activeWords.value.length))
  const checkupLimitOptions = computed(() => {
    const total = activeWords.value.length
    const options = [defaultCheckupLimit.value, 10, 20, 30, total]
      .filter(option => option > 0 && option <= total)

    return Array.from(new Set(options))
  })
  const unitLabel = computed(() => selectedUnit.value ? getUnitLabel(selectedUnit.value) : '请选择 Unit')
  const unitOptions = computed(() => units.map(unit => getUnitLabel(unit)))
  const wordLookup = computed(() => new Map(words.map(word => [word.id, word])))

  const currentCheckupQuestion = computed(() => checkupQuestions.value[checkupIndex.value])
  const checkupProgressLabel = computed(() => {
    if (checkupQuestions.value.length === 0) return '0/0'
    return `${checkupIndex.value + 1}/${checkupQuestions.value.length}`
  })
  const checkupSummary = computed(() => summarizeCheckup(checkupAnswers.value))
  const weakWords = computed(() => getWeakWords(activeWords.value, checkupSummary.value.weakWordIds))
  const savedWeakWords = computed(() => {
    return savedWeakWordIds.value
      .map(id => wordLookup.value.get(id))
      .filter((word): word is WordEntry => {
        return word !== undefined && word.unitId === selectedUnitId.value && !masteredWordIdSet.value.has(word.id)
      })
  })
  const selectedWeakWords = computed(() => {
    return selectedWeakWordIds.value
      .map(id => wordLookup.value.get(id))
      .filter((word): word is WordEntry => {
        return word !== undefined && savedWeakWordIds.value.includes(word.id)
      })
  })
  const selectedWeakWordCount = computed(() => selectedWeakWords.value.length)
  const allWeakWordsSelected = computed(() => {
    return savedWeakWords.value.length > 0 && selectedWeakWordCount.value === savedWeakWords.value.length
  })
  const dictationPickerBaseWords = computed(() => dictationSourceWords.value ?? unitWords.value)
  const dictationPickerWords = computed(() => {
    if (!dictationExcludesMasteredWords.value) return dictationPickerBaseWords.value

    return dictationPickerBaseWords.value.filter(word => !masteredWordIdSet.value.has(word.id))
  })
  const selectedDictationWords = computed(() => {
    const selectedSet = new Set(selectedDictationWordIds.value)
    return dictationPickerWords.value.filter(word => selectedSet.has(word.id))
  })
  const dictationPickerDisplayWords = computed(() => {
    const wordById = new Map(dictationPickerWords.value.map(word => [word.id, word]))
    const selectedWords = selectedDictationWordIds.value
      .map(id => wordById.get(id))
      .filter((word): word is WordEntry => word !== undefined)
    const selectedSet = new Set(selectedWords.map(word => word.id))
    const unselectedWords = dictationPickerWords.value.filter(word => !selectedSet.has(word.id))

    return [...selectedWords, ...unselectedWords]
  })
  const selectedDictationWordCount = computed(() => selectedDictationWords.value.length)
  const allDictationWordsSelected = computed(() => {
    return dictationPickerWords.value.length > 0 && selectedDictationWordCount.value === dictationPickerWords.value.length
  })
  const dictationQuickPickOptions = computed(() => {
    const total = dictationPickerWords.value.length
    const countOptions = DICTATION_QUICK_PICK_COUNTS
      .filter(count => count <= total)
      .map(count => ({
        id: `count:${count}`,
        count,
        label: `${count}词`,
        isAll: false
      }))

    if (total > 0) {
      countOptions.push({
        id: 'all',
        count: total,
        label: '全部',
        isAll: true
      })
    }

    return countOptions
  })
  const targetDictationWords = computed(() => {
    return selectedDictationWords.value
  })
  const currentDictationEntry = computed(() => dictationPlan.value?.words[dictationIndex.value])
  const dictationProgressLabel = computed(() => {
    const total = dictationPlan.value?.words.length ?? 0
    if (total === 0) return '0/0'
    return `${dictationIndex.value + 1}/${total}`
  })
  const dictationTitle = computed(() => {
    if (!dictationPlan.value) return '自动听写'
    return getDictationPromptLabel(dictationPlan.value)
  })
  const dictationAudioUrl = computed(() => {
    if (!dictationPlan.value || !currentDictationEntry.value) return ''
    return getDictationAudioUrl(currentDictationEntry.value, dictationPlan.value)
  })
  const dictationAudioReady = computed(() => {
    if (!dictationPlan.value || !currentDictationEntry.value) return false
    return hasPlayableDictationAudio(currentDictationEntry.value, dictationPlan.value)
  })
  const dictationSummary = computed(() => {
    const total = dictationPlan.value?.words.length ?? 0
    const correct = dictationRecords.value.filter(record => record.correct).length
    const wrong = dictationRecords.value.length - correct
    const forgotten = dictationRecords.value.filter(record => record.forgotten).length

    return {
      total,
      answered: dictationRecords.value.length,
      correct,
      wrong,
      forgotten,
      accuracy: dictationRecords.value.length === 0
        ? 0
        : Math.round((correct / dictationRecords.value.length) * 100)
    }
  })
  const dictationWrongWords = computed(() => {
    return dictationRecords.value
      .filter(record => !record.correct)
      .map(record => wordLookup.value.get(record.wordId))
      .filter((word): word is WordEntry => word !== undefined)
  })
  const dictationForgottenWords = computed(() => {
    return dictationRecords.value
      .filter(record => record.forgotten)
      .map(record => wordLookup.value.get(record.wordId))
      .filter((word): word is WordEntry => word !== undefined)
  })

  function syncCourseSetupDraftFromUnit(unit: UnitGroup | undefined) {
    if (!unit) return

    courseSetupStage.value = inferSchoolStage(unit)
    courseSetupGrade.value = courseSetupStage.value === '初中' ? inferJuniorGrade(unit) : ''
    courseSetupPublisherId.value = unit.publisherId
    courseSetupBookId.value = unit.bookId
    courseSetupUnitId.value = unit.unitId
  }

  function setCourseDraftToFirstUnit(stage: SchoolStage) {
    const next = courseSetupStageUnits.value.find(unit => inferSchoolStage(unit) === stage)
    if (!next) {
      courseSetupPublisherId.value = ''
      courseSetupBookId.value = ''
      courseSetupUnitId.value = ''
      return
    }

    courseSetupPublisherId.value = next.publisherId
    courseSetupBookId.value = next.bookId
    courseSetupUnitId.value = next.unitId
  }

  function setCourseSetupStage(stage: SchoolStage) {
    courseSetupStage.value = stage
    if (stage === '初中') {
      courseSetupGrade.value = ''
      courseSetupPublisherId.value = ''
      courseSetupBookId.value = ''
      courseSetupUnitId.value = ''
      return
    }

    courseSetupGrade.value = ''
    setCourseDraftToFirstUnit(stage)
  }

  function setCourseSetupGrade(grade: string) {
    courseSetupGrade.value = grade
    setCourseDraftToFirstUnit('初中')
  }

  function setCourseSetupPublisher(publisherId: string) {
    courseSetupPublisherId.value = publisherId
    const next = courseSetupStageUnits.value.find(unit => unit.publisherId === publisherId)
    courseSetupBookId.value = next?.bookId ?? ''
    courseSetupUnitId.value = next?.unitId ?? ''
  }

  function setCourseSetupBook(bookId: string) {
    courseSetupBookId.value = bookId
    const next = courseSetupStageUnits.value.find(unit => {
      return unit.publisherId === courseSetupPublisherId.value && unit.bookId === bookId
    })
    courseSetupUnitId.value = next?.unitId ?? ''
  }

  function setCourseSetupUnit(unitId: string) {
    courseSetupUnitId.value = unitId
  }

  function openCourseSetup() {
    syncCourseSetupDraftFromUnit(selectedUnit.value)
    screen.value = 'courseSetup'
    scrollToTop()
  }

  function confirmCourseSetup() {
    const next = findUnit(units, courseSetupUnitId.value)
    if (!next) {
      uni.showToast({
        title: '当前词库暂未上线',
        icon: 'none'
      })
      return
    }

    courseSetupCompleted.value = true
    saveCourseSetupCompleted()
    setSelectedUnit(next)
  }

  function setSelectedUnitByIndex(index: number) {
    const next = units[index]
    if (!next) return
    selectedUnitId.value = next.unitId
    saveSelectedUnitId(next.unitId)
    checkupLimit.value = 0
    setDefaultDictationSelection(true)
    resetPractice()
  }

  function setSelectedUnit(unit: UnitGroup | undefined) {
    if (!unit) return
    selectedUnitId.value = unit.unitId
    saveSelectedUnitId(unit.unitId)
    checkupLimit.value = 0
    setDefaultDictationSelection(true)
    resetPractice()
  }

  function setSelectedSchoolStageByIndex(index: number) {
    const stage = schoolStageOptions.value[index]
    const next = units.find(unit => inferSchoolStage(unit) === stage)
    setSelectedUnit(next)
  }

  function setSelectedPublisherByIndex(index: number) {
    const publisherName = publisherOptions.value[index]
    const next = units.find(unit => inferSchoolStage(unit) === currentSchoolStage.value && unit.publisherName === publisherName)
    setSelectedUnit(next)
  }

  function setSelectedBookByIndex(index: number) {
    const bookName = bookOptions.value[index]
    const next = units.find(unit => {
      return inferSchoolStage(unit) === currentSchoolStage.value
        && unit.publisherId === selectedUnit.value?.publisherId
        && unit.bookName === bookName
    })
    setSelectedUnit(next)
  }

  function setSelectedUnitQuickByIndex(index: number) {
    const next = units
      .filter(unit => {
        return inferSchoolStage(unit) === currentSchoolStage.value
          && unit.publisherId === selectedUnit.value?.publisherId
          && unit.bookId === selectedUnit.value?.bookId
      })
      .sort((a, b) => a.unitNumber - b.unitNumber)[index]
    setSelectedUnit(next)
  }

  function resetPractice() {
    screen.value = 'home'
    checkupQuestions.value = []
    checkupAnswers.value = []
    checkupIndex.value = 0
    resetRecognition()
    spellingInput.value = ''
    checkupLimit.value = 0
    dictationPlan.value = null
    dictationIndex.value = 0
    dictationInProgress.value = false
    clearUnfinishedDictation()
    dictationInput.value = ''
    dictationRecords.value = []
    showDictationAnswer.value = false
    dictationSourceWords.value = null
    selectedDictationQuickCount.value = null
    setDefaultDictationSelection(true)
    dictationResultConfirmed.value = false
    dictationReward.value = null
    scrollToTop()
  }

  function showScreen(nextScreen: AppScreen) {
    screen.value = nextScreen
    scrollToTop()
  }

  function resetRecognition() {
    selectedMeaning.value = ''
    recognitionState.value = 'idle'
  }

  function setDefaultDictationSelection(excludeMastered: boolean) {
    dictationExcludesMasteredWords.value = excludeMastered
    selectedDictationQuickCount.value = null
    const sourceWords = dictationSourceWords.value ?? unitWords.value
    selectedDictationWordIds.value = sourceWords
      .filter(word => !excludeMastered || !masteredWordIdSet.value.has(word.id))
      .map(word => word.id)
  }

  function recordWeakWord(wordId: string) {
    if (masteredWordIds.value.includes(wordId)) {
      const nextMasteredIds = masteredWordIds.value.filter(id => id !== wordId)
      masteredWordIds.value = nextMasteredIds
      saveWordIds(MASTERED_WORD_IDS_KEY, nextMasteredIds)
    }
    if (savedWeakWordIds.value.includes(wordId)) return

    const nextIds = [wordId, ...savedWeakWordIds.value]
    savedWeakWordIds.value = nextIds
    saveWordIds(SAVED_WEAK_WORD_IDS_KEY, nextIds)
  }

  function removeWeakWords(wordIds: string[]) {
    if (wordIds.length === 0) return

    const removeSet = new Set(wordIds)
    const nextIds = savedWeakWordIds.value.filter(id => !removeSet.has(id))
    savedWeakWordIds.value = nextIds
    selectedWeakWordIds.value = selectedWeakWordIds.value.filter(id => !removeSet.has(id))
    saveWordIds(SAVED_WEAK_WORD_IDS_KEY, nextIds)
  }

  function recordMasteredWords(wordIds: string[]) {
    if (wordIds.length === 0) return

    const nextIds = Array.from(new Set([...masteredWordIds.value, ...wordIds]))
    masteredWordIds.value = nextIds
    saveWordIds(MASTERED_WORD_IDS_KEY, nextIds)
    removeWeakWords(wordIds)
  }

  function recordCheckupAnswer(answer: CheckupAnswer) {
    checkupAnswers.value = [...checkupAnswers.value, answer]
    if (answer.status !== 'mastered') {
      recordWeakWord(answer.wordId)
      return
    }

    recordMasteredWords([answer.wordId])
  }

  function moveToNextCheckupQuestion() {
    if (checkupIndex.value < checkupQuestions.value.length - 1) {
      checkupIndex.value += 1
      spellingInput.value = ''
      resetRecognition()
      screen.value = 'checkup'
      scrollToTop()
      return
    }

    screen.value = 'report'
    scrollToTop()
  }

  function beginCheckup(targetWords: WordEntry[], limit: number) {
    if (targetWords.length === 0) return

    checkupQuestions.value = createCheckupQuestions(targetWords, limit, unitWords.value)
    checkupAnswers.value = []
    checkupIndex.value = 0
    spellingInput.value = ''
    resetRecognition()
    screen.value = 'checkup'
    scrollToTop()
  }

  function openCheckupSetup() {
    checkupLimit.value = 0
    screen.value = 'checkupSetup'
    scrollToTop()
  }

  function setCheckupLimit(limit: number) {
    if (!Number.isFinite(limit) || limit <= 0) {
      checkupLimit.value = 0
      return
    }

    checkupLimit.value = normalizeCheckupLimit(limit, activeWords.value.length)
  }

  function startCheckup() {
    beginCheckup(activeWords.value, effectiveCheckupLimit.value)
  }

  function startReportWeakCheckup() {
    if (weakWords.value.length > 0) {
      beginCheckup(weakWords.value, weakWords.value.length)
      return
    }

    startCheckup()
  }

  function startSelectedWeakCheckup() {
    beginCheckup(selectedWeakWords.value, selectedWeakWords.value.length)
  }

  function openWeakbook() {
    selectedWeakWordIds.value = savedWeakWords.value.map(word => word.id)
    screen.value = 'weakbook'
    scrollToTop()
  }

  function openUnitWords(masteredFirst = false) {
    unitWordsMasteredFirst.value = masteredFirst
    screen.value = 'unitWords'
    scrollToTop()
  }

  function openWordDetail(wordId: string) {
    selectedWordDetailId.value = wordId
    screen.value = 'wordDetail'
    scrollToTop()
  }

  function nextWordDetail() {
    const ids = wordDetailOrderedIds.value
    const index = ids.indexOf(selectedWordDetailId.value)
    if (index < 0 || index >= ids.length - 1) return

    const nextId = ids[index + 1]
    if (!nextId) return

    selectedWordDetailId.value = nextId
    scrollToTop()
  }

  function toggleWeakWordSelection(wordId: string) {
    selectedWeakWordIds.value = selectedWeakWordIds.value.includes(wordId)
      ? selectedWeakWordIds.value.filter(id => id !== wordId)
      : [...selectedWeakWordIds.value, wordId]
  }

  function selectAllWeakWords() {
    selectedWeakWordIds.value = savedWeakWords.value.map(word => word.id)
  }

  function clearWeakWordSelection() {
    selectedWeakWordIds.value = []
  }

  function markSelectedWeakWordsKnown() {
    recordMasteredWords(selectedWeakWordIds.value)
  }

  function markUnitWordKnown(wordId: string) {
    triggerHapticFeedback('light')
    if (masteredWordIdSet.value.has(wordId)) {
      const nextIds = masteredWordIds.value.filter(id => id !== wordId)
      masteredWordIds.value = nextIds
      saveWordIds(MASTERED_WORD_IDS_KEY, nextIds)

      if (unitWords.value.some(word => word.id === wordId) && !selectedDictationWordIds.value.includes(wordId)) {
        selectedDictationWordIds.value = [...selectedDictationWordIds.value, wordId]
      }
      return
    }

    recordMasteredWords([wordId])
  }

  function isUnitWordMastered(wordId: string): boolean {
    return masteredWordIdSet.value.has(wordId)
  }

  function selectMeaning(choice: string) {
    const question = currentCheckupQuestion.value
    if (!question || recognitionState.value !== 'idle') return

    selectedMeaning.value = choice
    const correct = choice === question.word.meaning
    recognitionState.value = correct ? 'correct' : 'wrong'
    triggerHapticFeedback(correct ? 'medium' : 'heavy')

    if (correct) {
      setTimeout(() => {
        if (screen.value === 'checkup' && recognitionState.value === 'correct') {
          screen.value = 'spelling'
        }
      }, CORRECT_ADVANCE_DELAY_MS)
      return
    }

    recordCheckupAnswer(gradeCheckupAnswer(question, choice, ''))
  }

  function nextAfterWrong() {
    if (recognitionState.value !== 'wrong') return
    moveToNextCheckupQuestion()
  }

  function submitSpelling() {
    const question = currentCheckupQuestion.value
    if (!question || !selectedMeaning.value || !spellingInput.value.trim()) return

    const answer = gradeCheckupAnswer(question, selectedMeaning.value, spellingInput.value)
    triggerHapticFeedback(answer.spellingCorrect ? 'medium' : 'heavy')
    recordCheckupAnswer(answer)
    moveToNextCheckupQuestion()
  }

  function openDictationSetup() {
    dictationSourceWords.value = null
    setDefaultDictationSelection(true)
    screen.value = 'dictationSetup'
    scrollToTop()
  }

  function openSelectedWeakDictationSetup() {
    const selected = selectedWeakWords.value
    if (selected.length === 0) return

    dictationSourceWords.value = selected
    selectedDictationQuickCount.value = null
    dictationExcludesMasteredWords.value = false
    selectedDictationWordIds.value = selected.map(word => word.id)
    screen.value = 'dictationSetup'
    scrollToTop()
  }

  function backFromDictationSetup() {
    if (dictationSourceWords.value) {
      screen.value = 'weakbook'
      scrollToTop()
      return
    }

    resetPractice()
  }

  function openDictationWordPicker() {
    if (selectedDictationWordIds.value.length === 0) {
      selectedDictationWordIds.value = dictationPickerWords.value.map(word => word.id)
    }
    screen.value = 'dictationWords'
    scrollToTop()
  }

  function backFromDictationWordPicker() {
    screen.value = 'dictationSetup'
    scrollToTop()
  }

  function toggleDictationWordSelection(wordId: string) {
    selectedDictationQuickCount.value = null
    selectedDictationWordIds.value = selectedDictationWordIds.value.includes(wordId)
      ? selectedDictationWordIds.value.filter(id => id !== wordId)
      : [...selectedDictationWordIds.value, wordId]
  }

  function selectAllDictationWords() {
    if (allDictationWordsSelected.value) {
      clearDictationWordSelection()
      return
    }

    selectedDictationQuickCount.value = null
    selectedDictationWordIds.value = dictationPickerWords.value.map(word => word.id)
  }

  function quickSelectDictationWords(count: number) {
    const normalizedCount = Math.min(Math.max(0, Math.round(count)), dictationPickerWords.value.length)

    if (
      normalizedCount > 0
      && selectedDictationQuickCount.value === normalizedCount
      && selectedDictationWordCount.value === normalizedCount
    ) {
      clearDictationWordSelection()
      return
    }

    if (normalizedCount <= 0) {
      clearDictationWordSelection()
      return
    }

    selectedDictationQuickCount.value = normalizedCount
    selectedDictationWordIds.value = sampleWords(dictationPickerWords.value, normalizedCount).map(word => word.id)
  }

  function clearDictationWordSelection() {
    selectedDictationQuickCount.value = null
    selectedDictationWordIds.value = []
  }

  function setDictationExcludeMasteredWords(excludesMastered: boolean) {
    if (dictationExcludesMasteredWords.value === excludesMastered) return

    selectedDictationQuickCount.value = null
    dictationExcludesMasteredWords.value = excludesMastered

    if (dictationExcludesMasteredWords.value) {
      const allowedIds = new Set(dictationPickerWords.value.map(word => word.id))
      selectedDictationWordIds.value = selectedDictationWordIds.value.filter(id => allowedIds.has(id))
      return
    }

    const masteredIds = dictationPickerBaseWords.value
      .filter(word => masteredWordIdSet.value.has(word.id))
      .map(word => word.id)
    selectedDictationWordIds.value = Array.from(new Set([...selectedDictationWordIds.value, ...masteredIds]))
  }

  function toggleExcludeMasteredDictationWords() {
    setDictationExcludeMasteredWords(!dictationExcludesMasteredWords.value)
  }

  function confirmDictationWordSelection() {
    if (selectedDictationWordIds.value.length === 0) return
    screen.value = 'dictationSetup'
    scrollToTop()
  }

  function startDictation() {
    if (targetDictationWords.value.length === 0) {
      uni.showToast({
        title: '请先选择单词',
        icon: 'none'
      })
      return
    }

    const plan = createDictationPlan(
      targetDictationWords.value,
      dictationMode.value,
      DEFAULT_DICTATION_ACCENT,
      dictationPrompt.value,
      dictationIntervalSeconds.value,
      dictationOrder.value,
      dictationRepeatCount.value
    )
    dictationPlan.value = plan
    dictationIndex.value = 0
    dictationInProgress.value = true
    saveUnfinishedDictation(plan, 0)
    dictationInput.value = ''
    dictationRecords.value = []
    showDictationAnswer.value = false
    dictationResultConfirmed.value = false
    screen.value = 'dictation'
    scrollToTop()
  }

  function submitDictationInput() {
    const entry = currentDictationEntry.value
    if (!entry || dictationMode.value !== 'online' || !dictationInput.value.trim() || showDictationAnswer.value) return

    const record = gradeDictationInput(entry, dictationInput.value)
    triggerHapticFeedback(record.correct ? 'medium' : 'heavy')
    const nextRecord: DictationRecord = record.correct
      ? record
      : {
          ...record,
          forgotten: true
        }
    dictationRecords.value = [...dictationRecords.value, nextRecord]
    if (!record.correct) {
      recordWeakWord(entry.id)
    }
    showDictationAnswer.value = true

    if (record.correct) {
      const wordId = entry.id
      setTimeout(() => {
        if (screen.value === 'dictation' && currentDictationEntry.value?.id === wordId && showDictationAnswer.value) {
          nextDictation()
        }
      }, DICTATION_CORRECT_ADVANCE_DELAY_MS)
    }
  }

  function setDictationWordForgotten(wordId: string, forgotten: boolean) {
    const word = dictationPlan.value?.words.find(word => word.id === wordId)
    if (!word) return

    if (forgotten) {
      recordWeakWord(word.id)
    }

    const existingRecord = dictationRecords.value.find(record => record.wordId === word.id)
    if (existingRecord) {
      dictationRecords.value = dictationRecords.value.map(record => {
        if (record.wordId !== word.id) return record

        return {
          ...record,
          correct: !forgotten,
          forgotten
        }
      })
    } else {
      dictationRecords.value = [
        ...dictationRecords.value,
        {
          wordId: word.id,
          input: '',
          correct: !forgotten,
          forgotten
        }
      ]
    }
  }

  function markDictationWordForgotten(wordId: string) {
    setDictationWordForgotten(wordId, true)
  }

  function toggleDictationReportWordStatus(wordId: string) {
    if (dictationResultConfirmed.value) return

    const record = dictationRecords.value.find(record => record.wordId === wordId)
    setDictationWordForgotten(wordId, record?.forgotten !== true)
  }

  function startForgottenDictation() {
    const forgottenIds = new Set(dictationRecords.value
      .filter(record => record.forgotten)
      .map(record => record.wordId))
    const forgottenWords = (dictationPlan.value?.words ?? []).filter(word => forgottenIds.has(word.id))

    if (forgottenWords.length === 0) {
      uni.showToast({
        title: '没有需要再听的生词',
        icon: 'none'
      })
      return
    }

    dictationSourceWords.value = forgottenWords
    selectedDictationQuickCount.value = null
    selectedDictationWordIds.value = forgottenWords.map(word => word.id)
    dictationExcludesMasteredWords.value = false
    startDictation()
  }

  function markCurrentDictationForgotten() {
    const entry = currentDictationEntry.value
    if (!entry) return

    markDictationWordForgotten(entry.id)

    if (dictationMode.value === 'online') {
      showDictationAnswer.value = true
    }

    const wordId = entry.id
    setTimeout(() => {
      if (screen.value === 'dictation' && currentDictationEntry.value?.id === wordId) {
        nextDictation()
      }
    }, FORGOTTEN_ADVANCE_DELAY_MS)
  }

  function confirmDictationResult() {
    if (!dictationPlan.value || dictationResultConfirmed.value) return

    const beforeMasteredIds = new Set(masteredWordIds.value)
    const beforeUnitMastered = unitWords.value.filter(word => beforeMasteredIds.has(word.id)).length
    const forgottenWordIds = new Set(dictationRecords.value
      .filter(record => record.forgotten)
      .map(record => record.wordId))
    const masteredIds = dictationPlan.value.words
      .filter(word => !forgottenWordIds.has(word.id))
      .map(word => word.id)
    const newlyMasteredCount = masteredIds.filter(id => !beforeMasteredIds.has(id)).length

    recordMasteredWords(masteredIds)
    dictationResultConfirmed.value = true

    const afterMasteredIds = new Set(masteredWordIds.value)
    const afterUnitMastered = unitWords.value.filter(word => afterMasteredIds.has(word.id)).length
    const total = unitWordCount.value
    const allCorrect = forgottenWordIds.size === 0

    dictationReward.value = {
      total: dictationPlan.value.words.length,
      masteredCount: masteredIds.length,
      newlyMasteredCount,
      forgottenCount: forgottenWordIds.size,
      beforeMastered: beforeUnitMastered,
      afterMastered: afterUnitMastered,
      beforePercent: total === 0 ? 0 : Math.round((beforeUnitMastered / total) * 100),
      afterPercent: total === 0 ? 0 : Math.round((afterUnitMastered / total) * 100),
      allCorrect
    }
    triggerHapticFeedback(allCorrect ? 'heavy' : 'medium')
    if (allCorrect) {
      setTimeout(() => triggerHapticFeedback('heavy'), 130)
    }
    screen.value = 'dictationReward'
    scrollToTop()
  }

  function finishDictationReward() {
    dictationReward.value = null
    resetPractice()
  }

  function revealPaperAnswer() {
    if (showDictationAnswer.value) return
    showDictationAnswer.value = true
  }

  function resumeDictation() {
    if (!dictationInProgress.value || !dictationPlan.value || !currentDictationEntry.value) return

    screen.value = 'dictation'
    scrollToTop()
  }

  function previousDictation() {
    if (!dictationPlan.value || dictationIndex.value <= 0) return

    dictationIndex.value -= 1
    dictationInput.value = ''
    showDictationAnswer.value = false
    saveUnfinishedDictation(dictationPlan.value, dictationIndex.value)
    scrollToTop()
  }

  function nextDictation() {
    if (!dictationPlan.value) return

    if (dictationIndex.value < dictationPlan.value.words.length - 1) {
      dictationIndex.value += 1
      dictationInput.value = ''
      showDictationAnswer.value = false
      saveUnfinishedDictation(dictationPlan.value, dictationIndex.value)
      scrollToTop()
      return
    }

    dictationInProgress.value = false
    clearUnfinishedDictation()
    selectedWeakWordIds.value = savedWeakWords.value.map(word => word.id)
    screen.value = 'dictationReport'
    scrollToTop()
  }

  return {
    activeWords,
    checkupAnswers,
    checkupIndex,
    checkupLimit,
    checkupLimitOptions,
    checkupProgressLabel,
    checkupQuestions,
    checkupSummary,
    allWeakWordsSelected,
    allDictationWordsSelected,
    backFromDictationSetup,
    backFromDictationWordPicker,
    clearWeakWordSelection,
    clearDictationWordSelection,
    confirmDictationWordSelection,
    confirmDictationResult,
    confirmCourseSetup,
    courseSetupBookId,
    courseSetupBookOptions,
    courseSetupCanConfirm,
    courseSetupCompleted,
    courseSetupGrade,
    courseSetupGradeOptions,
    courseSetupPublisherId,
    courseSetupPublisherOptions,
    courseSetupStage,
    courseSetupStageOptions,
    courseSetupUnitId,
    courseSetupUnitOptions,
    currentCheckupQuestion,
    currentDictationEntry,
    dictationAudioReady,
    dictationAudioUrl,
    dictationIndex,
    dictationInProgress,
    dictationInput,
    dictationIntervalSeconds,
    dictationMode,
    dictationOrder,
    dictationPlan,
    dictationQuickPickOptions,
    dictationProgressLabel,
    dictationPrompt,
    dictationRecords,
    dictationReward,
    dictationResultConfirmed,
    dictationRepeatCount,
    dictationSummary,
    dictationTitle,
    dictationExcludesMasteredWords,
    dictationForgottenWords,
    dictationWrongWords,
    dictationPickerDisplayWords,
    dictationPickerWords,
    effectiveCheckupLimit,
    finishDictationReward,
    isUnitWordMastered,
    markSelectedWeakWordsKnown,
    markCurrentDictationForgotten,
    markDictationWordForgotten,
    markUnitWordKnown,
    masteredUnitWordCount,
    openDictationSetup,
    openDictationWordPicker,
    openCheckupSetup,
    openCourseSetup,
    openSelectedWeakDictationSetup,
    openUnitWords,
    openWordDetail,
    openWeakbook,
    nextAfterWrong,
    nextWordDetail,
    recognitionState,
    resetPractice,
    resumeDictation,
    revealPaperAnswer,
    screen,
    selectMeaning,
    selectAllDictationWords,
    selectAllWeakWords,
    quickSelectDictationWords,
    selectedMeaning,
    selectedBookIndex,
    selectedPublisherIndex,
    selectedSchoolStageIndex,
    selectedUnit,
    selectedUnitIndex,
    selectedUnitQuickIndex,
    selectedWeakWordCount,
    selectedWeakWordIds,
    selectedWeakWords,
    selectedDictationWordCount,
    selectedDictationQuickCount,
    selectedDictationWordIds,
    selectedDictationWords,
    schoolStageOptions,
    publisherOptions,
    bookOptions,
    savedWeakWords,
    setSelectedBookByIndex,
    setCheckupLimit,
    setCourseSetupBook,
    setCourseSetupGrade,
    setCourseSetupPublisher,
    setCourseSetupStage,
    setCourseSetupUnit,
    setDictationExcludeMasteredWords,
    setSelectedPublisherByIndex,
    setSelectedSchoolStageByIndex,
    setSelectedUnitByIndex,
    setSelectedUnitQuickByIndex,
    showScreen,
    showDictationAnswer,
    spellingInput,
    startCheckup,
    startReportWeakCheckup,
    startSelectedWeakCheckup,
    startDictation,
    startForgottenDictation,
    submitDictationInput,
    submitSpelling,
    targetDictationWords,
    toggleExcludeMasteredDictationWords,
    toggleDictationReportWordStatus,
    toggleDictationWordSelection,
    toggleWeakWordSelection,
    hasNextWordDetail,
    wordDetailEntry,
    wordDetailProgressLabel,
    unitQuickOptions,
    unitLabel,
    unitOptions,
    unitMasteryLabel,
    unitMasteryPercent,
    unitWordCount,
    unitWords,
    unitWordsMasteredFirst,
    units,
    weakWords,
    nextDictation,
    previousDictation
  }
}

type PracticeSession = ReturnType<typeof createPracticeSession>

let practiceSession: PracticeSession | null = null

export function usePracticeSession(): PracticeSession {
  if (!practiceSession) {
    practiceSession = createPracticeSession()
  }

  return practiceSession
}
