export type Level = 'basic' | 'advanced' | 'extended'
export type Bank = 'lesson' | 'workbook' | 'mixed' | 'passage' | 'writing' | 'extension'
export interface Lesson {
  id: string
  title: string
  english: string
  level: Level
  summary: string
  structure: string
  forms: Array<{ label: string; example: string }>
  usages: Array<{ label: string; example: string; translation: string }>
  judgement: string
  clues: string
  pitfalls: string[]
}
export interface Question {
  id: string
  code: string
  tenseId: string
  bank: Bank
  label: string
  kind: 'choice' | 'fill' | 'reference'
  prompt: string
  context: string
  blankCount: number
  options: string[]
  answer: string
  explanation: string
}
export interface Attempt {
  questionId: string
  values: string[]
  correct: boolean
  hinted: boolean
  selfChecked: boolean
  at: number
}
export interface Quiz {
  id: string
  key: string
  scope: string
  mode: 'practice' | 'review'
  title: string
  questionIds: string[]
  cursor: number
  values: string[]
  hinted: boolean
  revealed: boolean
  attempts: Attempt[]
  finished: boolean
}
export interface Progress {
  version: 2
  readLessons: string[]
  currentLessonId: string
  lastPracticeSets: Record<string, string>
  records: Record<string, { attempts: number; independent: number; lastAt: number; completed: boolean }>
  sessions: Record<string, Quiz>
  activeSession: string
}
