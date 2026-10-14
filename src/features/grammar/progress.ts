import { practiceSets, questionById, scopeQuestionIds, scopeTitle } from './content'
import type { Attempt, Progress, Question, Quiz } from './types'

export const GRAMMAR_STORAGE_KEY = 'gotit:grammar:v2'
const LEGACY_KEY = 'gotit:grammar:v1'
let fallback: Progress | null = null
export function emptyProgress(): Progress {
  return { version: 2, readLessons: [], currentLessonId: '', lastPracticeSets: {}, records: {}, sessions: {}, activeSession: '' }
}
interface LegacyProgress {
  version: 1
  readLessons: string[]
  records: Record<string, { attempts: number; independent: number; lastAt: number }>
  reviews: Record<string, unknown>
  quiz: Omit<Quiz, 'key' | 'scope' | 'mode'> | null
}
export function migrateProgress(old: LegacyProgress): Progress {
  const progress = emptyProgress()
  progress.readLessons = [...old.readLessons]
  for (const [id, record] of Object.entries(old.records)) {
    if (questionById.has(id)) progress.records[id] = { ...record, completed: record.independent > 0 && !old.reviews[id] }
  }
  for (const attempt of old.quiz?.attempts || []) {
    const record = progress.records[attempt.questionId]
    if (record) record.completed = attempt.correct
  }
  const previous = old.quiz
  const currentId = previous?.questionIds[previous.cursor]
  const set = practiceSets.find(item => item.questionIds.includes(currentId || ''))
  if (set) progress.currentLessonId = set.tenseId
  if (previous && !previous.finished && set && currentId) {
    const quiz = createQuiz(set.id, [currentId, ...set.questionIds.filter(id => id !== currentId && !progress.records[id]?.attempts)])
    quiz.values = [...previous.values]
    quiz.hinted = previous.hinted
    quiz.revealed = previous.revealed
    quiz.attempts = previous.attempts.filter(attempt => attempt.questionId === currentId)
    progress.sessions[quiz.key] = quiz
    progress.activeSession = quiz.key
    if (set.tenseId) progress.lastPracticeSets[set.tenseId] = set.id
  }
  return progress
}
export function loadProgress(): Progress {
  if (fallback) return JSON.parse(JSON.stringify(fallback)) as Progress
  try {
    const data = uni.getStorageSync(GRAMMAR_STORAGE_KEY)
    if (data?.version === 2 && Array.isArray(data.readLessons) && data.records && data.sessions) return { ...data, lastPracticeSets: data.lastPracticeSets || {} } as Progress
    const old = uni.getStorageSync(LEGACY_KEY)
    if (old?.version === 1 && Array.isArray(old.readLessons) && old.records && old.reviews) {
      const migrated = migrateProgress(old as LegacyProgress)
      saveProgress(migrated)
      return migrated
    }
  } catch { /* A session remains usable without persistent storage. */ }
  return emptyProgress()
}
export function saveProgress(data: Progress): boolean {
  try {
    uni.setStorageSync(GRAMMAR_STORAGE_KEY, data)
    fallback = null
    return true
  } catch {
    fallback = JSON.parse(JSON.stringify(data)) as Progress
    return false
  }
}
export function normalizeAnswer(value: string): string {
  const contractions: Record<string, string> = {
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "won't": 'will not',
    "wouldn't": 'would not', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not',
    "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
    "i'm": 'i am', "i've": 'i have', "we've": 'we have', "they've": 'they have', "you're": 'you are'
  }
  return value.toLowerCase().replace(/[’‘]/g, "'")
    .replace(/\b[a-z]+'[a-z]+\b/g, word => contractions[word] || word)
    .replace(/[.!?,。！？,，]/g, '').replace(/\s+/g, ' ').trim()
}
export function matchesAnswer(question: Question, values: string[]): boolean {
  if (question.kind === 'reference') return false
  return question.answer.split(/\s*\/\s*/).some(variant => {
    const parts = variant.split(/[;；]/)
    return parts.length === values.length && parts.every((part, i) => normalizeAnswer(part) === normalizeAnswer(values[i] || ''))
  })
}
export function wrongQuestionIds(progress: Progress, scope = 'all'): string[] {
  return scopeQuestionIds(scope).filter(id => progress.records[id]?.attempts && !progress.records[id]?.completed)
}
export function exerciseStats(progress: Progress, scope: string) {
  const ids = scopeQuestionIds(scope)
  const practiced = ids.filter(id => progress.records[id]?.attempts).length
  const completed = ids.filter(id => progress.records[id]?.completed).length
  return { total: ids.length, practiced, completed, unpracticed: ids.length - practiced,
    remaining: ids.length - completed, wrong: practiced - completed }
}
export function isLessonComplete(progress: Progress, lessonId: string): boolean {
  const stats = exerciseStats(progress, lessonId)
  return stats.total > 0 && stats.remaining === 0
}
export function createQuiz(scope: string, ids: string[], mode: Quiz['mode'] = 'practice'): Quiz {
  return { id: String(Date.now()), key: mode === 'review' ? `review:${scope}` : scope, scope, mode,
    title: scopeTitle(scope), questionIds: ids.filter(id => questionById.has(id)),
    cursor: 0, values: [], hinted: false, revealed: false, attempts: [], finished: false }
}
function clearDraft(quiz: Quiz) {
  quiz.values = []
  quiz.hinted = false
  quiz.revealed = false
}
function skipCompleted(progress: Progress, quiz: Quiz) {
  while (progress.records[quiz.questionIds[quiz.cursor] || '']?.completed) {
    quiz.cursor++
    clearDraft(quiz)
  }
  if (quiz.cursor >= quiz.questionIds.length) quiz.finished = true
}
export function prepareQuiz(progress: Progress, scope: string, mode: Quiz['mode'] = 'practice'): Quiz | null {
  if (mode === 'review' && !wrongQuestionIds(progress, scope).length) return null
  const key = mode === 'review' ? `review:${scope}` : scope
  let quiz = progress.sessions[key]
  if (quiz && !quiz.finished) {
    const currentId = quiz.questionIds[quiz.cursor]
    if (quiz.attempts.some(attempt => attempt.questionId === currentId)) advanceQuiz(progress, quiz)
    else skipCompleted(progress, quiz)
  }
  if (!quiz || quiz.finished) {
    const ids = mode === 'review' ? wrongQuestionIds(progress, scope)
      : scopeQuestionIds(scope).filter(id => !progress.records[id]?.attempts)
    if (!ids.length) return mode === 'practice' && wrongQuestionIds(progress, scope).length ? prepareQuiz(progress, scope, 'review') : null
    quiz = createQuiz(scope, ids, mode)
    progress.sessions[key] = quiz
  }
  progress.activeSession = quiz.key
  const set = practiceSets.find(item => item.id === scope)
  if (set?.tenseId) {
    progress.currentLessonId = set.tenseId
    if (mode === 'practice') progress.lastPracticeSets[set.tenseId] = set.id
  }
  else if (practiceSets.some(item => item.tenseId === scope)) progress.currentLessonId = scope
  return quiz
}
export function nextPracticeSet(progress: Progress, tenseId: string) {
  const sets = practiceSets.filter(set => set.tenseId === tenseId)
  const pending = sets.find(set => set.id === progress.lastPracticeSets[tenseId] && progress.sessions[set.id] && !progress.sessions[set.id]!.finished && exerciseStats(progress, set.id).remaining)
  return pending || sets.find(set => {
    const session = progress.sessions[set.id]
    return session && !session.finished && exerciseStats(progress, set.id).remaining
  }) || sets.find(set => exerciseStats(progress, set.id).unpracticed) || sets.find(set => exerciseStats(progress, set.id).wrong) || sets[0]
}
export function practiceButtonLabel(progress: Progress, scope: string): string {
  const stats = exerciseStats(progress, scope)
  if (!stats.remaining) return '重新练习'
  const quiz = progress.sessions[nextPracticeSet(progress, scope)?.id || scope]
  return stats.practiced || (quiz && !quiz.finished) ? '继续练习' : '练习'
}
export function resetExercises(progress: Progress, scope: string) {
  const ids = new Set(scopeQuestionIds(scope))
  for (const id of ids) delete progress.records[id]
  for (const [key, quiz] of Object.entries(progress.sessions)) {
    if (!quiz.questionIds.some(id => ids.has(id))) continue
    if (quiz.mode === 'practice') delete progress.sessions[key]
    else {
      const currentId = quiz.questionIds[quiz.cursor]
      quiz.questionIds = quiz.questionIds.filter(id => !ids.has(id))
      quiz.attempts = quiz.attempts.filter(attempt => !ids.has(attempt.questionId))
      quiz.cursor = Math.max(0, quiz.questionIds.indexOf(currentId || ''))
      if (ids.has(currentId || '')) clearDraft(quiz)
      if (!quiz.questionIds.length) delete progress.sessions[key]
    }
  }
  if (!progress.sessions[progress.activeSession]) progress.activeSession = ''
  for (const [tenseId, setId] of Object.entries(progress.lastPracticeSets)) {
    if (!progress.sessions[setId]) delete progress.lastPracticeSets[tenseId]
  }
}
export function recordAttempt(progress: Progress, quiz: Quiz, question: Question, correct: boolean, now = Date.now()): Attempt | null {
  if (quiz.finished || quiz.questionIds[quiz.cursor] !== question.id || quiz.attempts.some(a => a.questionId === question.id)) return null
  const selfChecked = question.kind === 'reference'
  const attempt: Attempt = { questionId: question.id, values: [...quiz.values], correct,
    hinted: quiz.hinted, selfChecked, at: now }
  const record = progress.records[question.id] || { attempts: 0, independent: 0, lastAt: 0, completed: false }
  record.attempts++
  if (correct && !quiz.hinted && !selfChecked) record.independent++
  record.lastAt = now
  record.completed = correct
  progress.records[question.id] = record
  quiz.attempts.push(attempt)
  quiz.revealed = true
  return attempt
}
export function advanceQuiz(progress: Progress, quiz: Quiz): boolean {
  if (!quiz.attempts.some(a => a.questionId === quiz.questionIds[quiz.cursor])) return false
  quiz.cursor++
  clearDraft(quiz)
  skipCompleted(progress, quiz)
  return quiz.finished
}
