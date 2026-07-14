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
  Accent,
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

export type AppScreen = 'home' | 'weakbook' | 'unitWords' | 'checkupSetup' | 'checkup' | 'spelling' | 'report' | 'dictationSetup' | 'dictationWords' | 'dictation' | 'dictationReport'
export type RecognitionState = 'idle' | 'correct' | 'wrong'

const DEFAULT_CHECKUP_LIMIT = 10
const CORRECT_ADVANCE_DELAY_MS = 640
const DICTATION_CORRECT_ADVANCE_DELAY_MS = 760
const SAVED_WEAK_WORD_IDS_KEY = 'gotit:savedWeakWordIds'
const MASTERED_WORD_IDS_KEY = 'gotit:masteredWordIds'

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

function inferSchoolStage(unit: UnitGroup): string {
  return /初中|七年级|八年级|九年级/.test(unit.bookName) ? '初中' : '高中'
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

export function usePracticeSession() {
  const words = getWordbank()
  const units = groupUnits(words)
  const defaultUnit = getDefaultUnit(units)

  const screen = ref<AppScreen>('home')
  const selectedUnitId = ref(defaultUnit?.unitId ?? '')

  const checkupQuestions = ref<CheckupQuestion[]>([])
  const checkupAnswers = ref<CheckupAnswer[]>([])
  const checkupIndex = ref(0)
  const checkupLimit = ref(0)
  const selectedMeaning = ref('')
  const recognitionState = ref<RecognitionState>('idle')
  const spellingInput = ref('')
  const savedWeakWordIds = ref<string[]>(loadSavedWordIds(SAVED_WEAK_WORD_IDS_KEY))
  const masteredWordIds = ref<string[]>(loadSavedWordIds(MASTERED_WORD_IDS_KEY))
  const selectedWeakWordIds = ref<string[]>([])

  const dictationMode = ref<DictationMode>('paper')
  const dictationAccent = ref<Accent>('uk')
  const dictationPrompt = ref<DictationPrompt>('chinese')
  const dictationIntervalSeconds = ref(8)
  const dictationOrder = ref<DictationOrder>('shuffle')
  const dictationRepeatCount = ref<DictationRepeatCount>(1)
  const dictationPlan = ref<DictationPlan | null>(null)
  const dictationIndex = ref(0)
  const dictationInput = ref('')
  const dictationRecords = ref<DictationRecord[]>([])
  const showDictationAnswer = ref(false)
  const dictationSourceWords = ref<WordEntry[] | null>(null)
  const selectedDictationWordIds = ref<string[]>([])

  const selectedUnit = computed<UnitGroup | undefined>(() => findUnit(units, selectedUnitId.value))
  const currentSchoolStage = computed(() => selectedUnit.value ? inferSchoolStage(selectedUnit.value) : '高中')
  const selectedUnitIndex = computed(() => {
    const index = units.findIndex(unit => unit.unitId === selectedUnitId.value)
    return index < 0 ? 0 : index
  })
  const schoolStageOptions = computed(() => uniqueValues(units.map(unit => inferSchoolStage(unit))))
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
    .map(unit => `Unit ${unit.unitNumber}`))
  const selectedUnitQuickIndex = computed(() => Math.max(0, unitQuickOptions.value.indexOf(`Unit ${selectedUnit.value?.unitNumber ?? 1}`)))
  const unitWords = computed(() => selectedUnit.value?.words ?? [])
  const masteredWordIdSet = computed(() => new Set(masteredWordIds.value))
  const masteredUnitWords = computed(() => unitWords.value.filter(word => masteredWordIdSet.value.has(word.id)))
  const masteredUnitWordCount = computed(() => masteredUnitWords.value.length)
  const unitWordCount = computed(() => unitWords.value.length)
  const unitMasteryLabel = computed(() => `${masteredUnitWordCount.value}/${unitWordCount.value}`)
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
  const selectedDictationWords = computed(() => {
    const selectedSet = new Set(selectedDictationWordIds.value)
    return activeWords.value.filter(word => selectedSet.has(word.id))
  })
  const selectedDictationWordCount = computed(() => selectedDictationWords.value.length)
  const allDictationWordsSelected = computed(() => {
    return activeWords.value.length > 0 && selectedDictationWordCount.value === activeWords.value.length
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

    return {
      total,
      answered: dictationRecords.value.length,
      correct,
      wrong,
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

  function setSelectedUnitByIndex(index: number) {
    const next = units[index]
    if (!next) return
    selectedUnitId.value = next.unitId
    checkupLimit.value = 0
    selectedDictationWordIds.value = next.words
      .filter(word => !masteredWordIdSet.value.has(word.id))
      .map(word => word.id)
    resetPractice()
  }

  function setSelectedUnit(unit: UnitGroup | undefined) {
    if (!unit) return
    selectedUnitId.value = unit.unitId
    checkupLimit.value = 0
    selectedDictationWordIds.value = unit.words
      .filter(word => !masteredWordIdSet.value.has(word.id))
      .map(word => word.id)
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
    dictationInput.value = ''
    dictationRecords.value = []
    showDictationAnswer.value = false
    dictationSourceWords.value = null
    selectedDictationWordIds.value = activeWords.value.map(word => word.id)
    scrollToTop()
  }

  function resetRecognition() {
    selectedMeaning.value = ''
    recognitionState.value = 'idle'
  }

  function recordWeakWord(wordId: string) {
    if (masteredWordIds.value.includes(wordId)) return
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
    selectedDictationWordIds.value = selectedDictationWordIds.value.filter(id => !wordIds.includes(id))
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

  function startSelectedWeakCheckup() {
    beginCheckup(selectedWeakWords.value, selectedWeakWords.value.length)
  }

  function openWeakbook() {
    selectedWeakWordIds.value = savedWeakWords.value.map(word => word.id)
    screen.value = 'weakbook'
    scrollToTop()
  }

  function openUnitWords() {
    screen.value = 'unitWords'
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
    recordCheckupAnswer(answer)
    moveToNextCheckupQuestion()
  }

  function openDictationSetup() {
    dictationSourceWords.value = null
    if (selectedDictationWordIds.value.length === 0) {
      selectedDictationWordIds.value = activeWords.value.map(word => word.id)
    }
    screen.value = 'dictationSetup'
    scrollToTop()
  }

  function openSelectedWeakDictationSetup() {
    const selected = selectedWeakWords.value
    if (selected.length === 0) return

    dictationSourceWords.value = selected
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
      selectedDictationWordIds.value = activeWords.value.map(word => word.id)
    }
    screen.value = 'dictationWords'
    scrollToTop()
  }

  function backFromDictationWordPicker() {
    screen.value = 'dictationSetup'
    scrollToTop()
  }

  function toggleDictationWordSelection(wordId: string) {
    selectedDictationWordIds.value = selectedDictationWordIds.value.includes(wordId)
      ? selectedDictationWordIds.value.filter(id => id !== wordId)
      : [...selectedDictationWordIds.value, wordId]
  }

  function selectAllDictationWords() {
    selectedDictationWordIds.value = activeWords.value.map(word => word.id)
  }

  function quickSelectDictationWords(count: number) {
    selectedDictationWordIds.value = activeWords.value.slice(0, count).map(word => word.id)
  }

  function clearDictationWordSelection() {
    selectedDictationWordIds.value = []
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
      dictationAccent.value,
      dictationPrompt.value,
      dictationIntervalSeconds.value,
      dictationOrder.value,
      dictationRepeatCount.value
    )
    dictationPlan.value = plan
    dictationIndex.value = 0
    dictationInput.value = ''
    dictationRecords.value = []
    showDictationAnswer.value = false
    screen.value = 'dictation'
    scrollToTop()
  }

  function submitDictationInput() {
    const entry = currentDictationEntry.value
    if (!entry || dictationMode.value !== 'online' || !dictationInput.value.trim() || showDictationAnswer.value) return

    const record = gradeDictationInput(entry, dictationInput.value)
    dictationRecords.value = [...dictationRecords.value, record]
    if (!record.correct) {
      recordWeakWord(entry.id)
    } else {
      recordMasteredWords([entry.id])
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

  function revealPaperAnswer() {
    if (showDictationAnswer.value) return
    showDictationAnswer.value = true
  }

  function nextDictation() {
    if (!dictationPlan.value) return

    if (dictationIndex.value < dictationPlan.value.words.length - 1) {
      dictationIndex.value += 1
      dictationInput.value = ''
      showDictationAnswer.value = false
      scrollToTop()
      return
    }

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
    currentCheckupQuestion,
    currentDictationEntry,
    dictationAccent,
    dictationAudioReady,
    dictationAudioUrl,
    dictationIndex,
    dictationInput,
    dictationIntervalSeconds,
    dictationMode,
    dictationOrder,
    dictationPlan,
    dictationProgressLabel,
    dictationPrompt,
    dictationRecords,
    dictationRepeatCount,
    dictationSummary,
    dictationTitle,
    dictationWrongWords,
    effectiveCheckupLimit,
    isUnitWordMastered,
    markSelectedWeakWordsKnown,
    markUnitWordKnown,
    openDictationSetup,
    openDictationWordPicker,
    openCheckupSetup,
    openSelectedWeakDictationSetup,
    openUnitWords,
    openWeakbook,
    nextAfterWrong,
    recognitionState,
    resetPractice,
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
    selectedDictationWordIds,
    selectedDictationWords,
    schoolStageOptions,
    publisherOptions,
    bookOptions,
    savedWeakWords,
    setSelectedBookByIndex,
    setCheckupLimit,
    setSelectedPublisherByIndex,
    setSelectedSchoolStageByIndex,
    setSelectedUnitByIndex,
    setSelectedUnitQuickByIndex,
    showDictationAnswer,
    spellingInput,
    startCheckup,
    startSelectedWeakCheckup,
    startDictation,
    submitDictationInput,
    submitSpelling,
    targetDictationWords,
    toggleDictationWordSelection,
    toggleWeakWordSelection,
    unitQuickOptions,
    unitLabel,
    unitOptions,
    unitMasteryLabel,
    unitWordCount,
    unitWords,
    units,
    weakWords,
    nextDictation
  }
}
