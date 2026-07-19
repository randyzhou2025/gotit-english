export type Accent = 'uk' | 'us'
export type DictationPrompt = 'english' | 'chinese'
export type DictationMode = 'paper' | 'online' | 'recognition'
export type DictationOrder = 'sequence' | 'shuffle'
export type DictationRepeatCount = 1 | 2
export type MasteryStatus = 'mastered' | 'recognition' | 'unknown'

export interface WordAudio {
  status: 'pending' | 'ready'
  cdnKey: string
  ukUrl: string
  usUrl: string
  zhUrl: string
}

export interface WordEntry {
  id: string
  publisherId: string
  publisherName: string
  bookId: string
  bookName: string
  bookOrder: number
  unitId: string
  unitNumber: number
  unitName: string
  word: string
  phonetic: string
  usPhonetic?: string
  partOfSpeech: string
  meaning: string
  exampleSentence?: string
  exampleTranslation?: string
  difficulty: number
  audio: WordAudio
  source: {
    workbook: string
    sheet: string
    rowNumber: number
  }
}

export interface UnitGroup {
  publisherId: string
  publisherName: string
  bookId: string
  bookName: string
  bookOrder: number
  unitId: string
  unitNumber: number
  unitName: string
  words: WordEntry[]
}

export interface SpellingResult {
  correct: boolean
  normalizedInput: string
  normalizedAnswer: string
}

export interface CheckupQuestion {
  id: string
  word: WordEntry
  meaningChoices: string[]
}

export interface CheckupAnswer {
  questionId: string
  wordId: string
  selectedMeaning: string
  recognitionCorrect: boolean
  spellingInput: string
  spellingCorrect: boolean
  status: MasteryStatus
}

export interface CheckupSummary {
  total: number
  mastered: number
  recognition: number
  unknown: number
  accuracy: number
  weakWordIds: string[]
}

export interface DictationPlan {
  id: string
  mode: DictationMode
  accent: Accent
  prompt: DictationPrompt
  intervalSeconds: number
  order: DictationOrder
  repeatCount: DictationRepeatCount
  words: WordEntry[]
  estimatedSeconds: number
}

export interface DictationRecord {
  wordId: string
  input: string
  correct: boolean
  forgotten?: boolean
}
