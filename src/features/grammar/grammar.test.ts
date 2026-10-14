import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuestions, lessons, panorama, practiceSets, questionById, questions } from './content'
import { advanceQuiz, createQuiz, emptyProgress, exerciseStats, GRAMMAR_STORAGE_KEY, isLessonComplete, loadProgress, matchesAnswer, migrateProgress, nextPracticeSet, normalizeAnswer, practiceButtonLabel, prepareQuiz, recordAttempt, resetExercises, saveProgress, wrongQuestionIds } from './progress'
import type { Question } from './types'
import pages from '../../pages.json'
import { sceneTimeline } from './timeline'
import { goGrammar, openPractice, openReview, restartPractice } from './navigation'

const sample = questionById.get('lesson:01-03')!
function session(q: Question = sample) {
  const progress = emptyProgress()
  const quiz = createQuiz('t01:lesson', [q.id])
  progress.sessions[quiz.key] = quiz
  progress.activeSession = quiz.key
  quiz.values = [q.answer.split(' / ')[0]!]
  return progress
}
function active(progress: ReturnType<typeof emptyProgress>) { return progress.sessions[progress.activeSession]! }
beforeEach(() => {
  vi.stubGlobal('uni', { getStorageSync: vi.fn(), setStorageSync: vi.fn() })
  saveProgress(emptyProgress())
})

describe('latest textbook pack and complete tense catalogue', () => {
  it('covers all 16 exactly once in the 4 by 4 overview, split 6 + 4 + 6', () => {
    expect(lessons).toHaveLength(16)
    expect(['basic', 'advanced', 'extended'].map(level => lessons.filter(l => l.level === level).length)).toEqual([6, 4, 6])
    expect(new Set(panorama.flat())).toEqual(new Set(lessons.map(l => l.id)))
    for (const lesson of lessons) {
      expect(lesson.summary).toBeTruthy()
      expect(lesson.usages.length).toBeGreaterThan(0)
      expect(lesson.forms).toHaveLength(3)
    }
  })
  it('retains every original exercise, paired answer and passage context', () => {
    expect(questions).toHaveLength(506)
    expect(new Set(questions.map(q => q.id)).size).toBe(506)
    for (const lesson of lessons.slice(0, 10)) {
      expect(getQuestions(lesson.id, 'lesson')).toHaveLength(16)
      expect(getQuestions(lesson.id, 'workbook')).toHaveLength(25)
    }
    expect(questions.filter(q => q.bank === 'mixed')).toHaveLength(44)
    expect(questions.filter(q => q.bank === 'passage')).toHaveLength(12)
    expect(questions.filter(q => q.bank === 'writing')).toHaveLength(10)
    expect(questions.filter(q => q.bank === 'extension')).toHaveLength(30)
    for (const q of questions) {
      expect(q.answer, q.id).toBeTruthy()
      expect(q.explanation, q.id).toBeTruthy()
      if (q.label.includes('语篇')) expect(q.context, q.id).toBeTruthy()
      if (q.kind === 'choice') expect(q.options, q.id).toContain(q.answer)
      if (q.kind === 'fill') for (const answer of q.answer.split(/\s*\/\s*/)) {
        expect(answer.split(/[;；]/), q.id).toHaveLength(q.blankCount)
        expect(matchesAnswer(q, answer.split(/[;；]/)), q.id).toBe(true)
      }
    }
  })
  it('treats a slash between verb cues as a fill, not a two-option choice', () => {
    const question = questionById.get('workbook:06-10')!
    expect(question.kind).toBe('fill')
    expect(question.prompt).toContain('(already / make)')
    expect(matchesAnswer(question, ['has already made'])).toBe(true)
  })
  it('shows future time for a timetable or arranged event despite the present verb form', () => {
    expect(sceneTimeline('t01', 2).active).toEqual([2])
    expect(sceneTimeline('t04', 2).active).toEqual([2])
    expect(sceneTimeline('t04', 0).active).toEqual([1])
    expect(sceneTimeline('t15', 0).points).not.toContain('现在')
  })
  it('keeps grammar as native pages and retains the original four tab destinations', () => {
    expect(pages.tabBar.list.map(p => p.text)).toEqual(['首页', '同学', '生词本', '我的'])
    expect(pages.tabBar.list.map(p => p.pagePath)).not.toContain('pages/grammar/index')
    for (const path of ['index', 'lesson', 'practice', 'result']) {
      expect(pages.pages.find(p => p.path === `pages/grammar/${path}`)?.style.navigationStyle).toBe('default')
    }
    expect(pages.pages.find(p => p.path === 'pages/index/index')?.style.navigationStyle).toBe('custom')
  })
})

describe('returning to the grammar catalogue', () => {
  it('returns to the existing catalogue without duplicating it or losing the home page', () => {
    vi.stubGlobal('getCurrentPages', () => [
      { route: 'pages/index/index' }, { route: 'pages/grammar/index' },
      { route: 'pages/grammar/lesson' }, { route: 'pages/grammar/result' }
    ])
    vi.stubGlobal('uni', { navigateBack: vi.fn(), redirectTo: vi.fn() })
    goGrammar()
    expect(uni.navigateBack).toHaveBeenCalledWith({ delta: 2 })
    expect(uni.redirectTo).not.toHaveBeenCalled()
  })

  it('replaces a directly opened exercise when there is no catalogue in the stack', () => {
    vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/grammar/result' }])
    vi.stubGlobal('uni', { navigateBack: vi.fn(), redirectTo: vi.fn() })
    goGrammar()
    expect(uni.redirectTo).toHaveBeenCalledWith({ url: '/pages/grammar/index' })
    expect(uni.navigateBack).not.toHaveBeenCalled()
  })

  it('stays on the catalogue when it is already the current page', () => {
    vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/grammar/index' }])
    vi.stubGlobal('uni', { navigateBack: vi.fn(), redirectTo: vi.fn() })
    goGrammar()
    expect(uni.navigateBack).not.toHaveBeenCalled()
    expect(uni.redirectTo).not.toHaveBeenCalled()
  })
})

describe('answer checking and resume', () => {
  it('accepts case, curly contractions and punctuation, but keeps wrong tenses distinct', () => {
    expect(matchesAnswer(sample, [' DOESN’T LIKE. '])).toBe(true)
    expect(normalizeAnswer("didn't go")).not.toBe(normalizeAnswer("doesn't go"))
    const multi = questionById.get('lesson:01-B02')!
    expect(matchesAnswer(multi, ['Does', 'study'])).toBe(true)
    expect(matchesAnswer(multi, ['study', 'does'])).toBe(false)
    expect(matchesAnswer(multi, ['does study'])).toBe(false)
  })
  it('does not automatically grade an open expression against one sample', () => {
    const q = questionById.get('lesson:01-08')!
    expect(q.kind).toBe('reference')
    expect(matchesAnswer(q, [q.answer])).toBe(false)
    const progress = session(q)
    recordAttempt(progress, active(progress), q, true, 10)
    expect(progress.records[q.id]?.independent).toBe(0)
    expect(active(progress).attempts[0]?.selfChecked).toBe(true)
  })
  it('restores a draft, hint and revealed feedback across page unloads', () => {
    const progress = session()
    active(progress).hinted = true
    recordAttempt(progress, active(progress), sample, false, 10)
    saveProgress(progress)
    const calls = vi.mocked(uni.setStorageSync).mock.calls
    const written = calls[calls.length - 1]!
    expect(written[0]).toBe(GRAMMAR_STORAGE_KEY)
    vi.mocked(uni.getStorageSync).mockReturnValue(JSON.parse(JSON.stringify(written[1])))
    expect(loadProgress()).toEqual(progress)
    expect(active(loadProgress()).revealed).toBe(true)
  })
  it('does not submit twice or advance without a recorded answer', () => {
    const progress = session()
    expect(advanceQuiz(progress, active(progress))).toBe(false)
    recordAttempt(progress, active(progress), sample, true, 10)
    expect(recordAttempt(progress, active(progress), sample, false, 11)).toBeNull()
    expect(progress.records[sample.id]?.attempts).toBe(1)
    expect(advanceQuiz(progress, active(progress))).toBe(true)
    expect(active(progress).finished).toBe(true)
  })
  it('makes storage failure visible to the caller and retains the current session in memory', () => {
    const progress = session()
    vi.mocked(uni.setStorageSync).mockImplementation(() => { throw new Error('quota') })
    expect(saveProgress(progress)).toBe(false)
    expect(loadProgress()).toEqual(progress)
  })
})

describe('persistent exercise progress and immediate wrong-answer review', () => {
  it('saves drafts independently for different tenses and exercise banks', () => {
    const progress = emptyProgress()
    const first = prepareQuiz(progress, 't01:lesson')!
    first.values = ['draft one']
    first.hinted = true
    const second = prepareQuiz(progress, 't02:lesson')!
    second.values = ['draft two']
    const workbook = prepareQuiz(progress, 't01:workbook')!
    workbook.values = ['draft three']
    expect(prepareQuiz(progress, 't01:lesson')).toBe(first)
    expect(first.values).toEqual(['draft one'])
    expect(first.hinted).toBe(true)
    expect(prepareQuiz(progress, 't02:lesson')?.values).toEqual(['draft two'])
    expect(prepareQuiz(progress, 't01:workbook')?.values).toEqual(['draft three'])
    expect(Object.keys(progress.sessions)).toHaveLength(3)
  })
  it('resumes the most recently used bank after practicing another tense and reloading storage', () => {
    const progress = emptyProgress()
    prepareQuiz(progress, 't01:lesson')
    const workbook = prepareQuiz(progress, 't01:workbook')!
    workbook.values = ['saved workbook draft']
    prepareQuiz(progress, 't02:lesson')
    saveProgress(progress)
    vi.mocked(uni.getStorageSync).mockReturnValue(JSON.parse(JSON.stringify(progress)))
    const restored = loadProgress()
    expect(nextPracticeSet(restored, 't01')?.id).toBe('t01:workbook')
    expect(prepareQuiz(restored, nextPracticeSet(restored, 't01')!.id)?.values).toEqual(['saved workbook draft'])
    resetExercises(restored, 't01')
    expect(nextPracticeSet(restored, 't01')?.id).toBe('t01:lesson')
    expect(restored.sessions['t02:lesson']).toBeDefined()
  })
  it('resumes at the next unfinished question after leaving submitted feedback', () => {
    const progress = emptyProgress()
    const quiz = prepareQuiz(progress, 't01:lesson')!
    recordAttempt(progress, quiz, questionById.get(quiz.questionIds[0]!)!, true)
    expect(quiz.cursor).toBe(0)
    const resumed = prepareQuiz(progress, 't01:lesson')!
    expect(resumed.cursor).toBe(1)
    expect(resumed.revealed).toBe(false)
    expect(resumed.values).toEqual([])
    const unfinished = emptyProgress()
    prepareQuiz(unfinished, 't01:lesson')!.values = ['draft before first submission']
    expect(practiceButtonLabel(unfinished, 't01')).toBe('继续练习')
  })
  it('moves to the next bank when its last answer is correct, even before viewing the result', () => {
    const progress = emptyProgress()
    const quiz = prepareQuiz(progress, 't01:lesson')!
    for (const [index, id] of quiz.questionIds.entries()) {
      recordAttempt(progress, quiz, questionById.get(id)!, true)
      if (index < quiz.questionIds.length - 1) advanceQuiz(progress, quiz)
    }
    expect(quiz.finished).toBe(false)
    expect(nextPracticeSet(progress, 't01')?.id).toBe('t01:workbook')
  })
  it('adds a wrong answer immediately and completes it after one correct review', () => {
    const progress = session()
    recordAttempt(progress, active(progress), sample, false, 10)
    expect(wrongQuestionIds(progress, 't01')).toEqual([sample.id])
    expect(exerciseStats(progress, 't01:lesson')).toMatchObject({ practiced: 1, completed: 0, remaining: 16, wrong: 1 })
    const review = prepareQuiz(progress, 't01:lesson', 'review')!
    recordAttempt(progress, review, sample, true, 11)
    expect(wrongQuestionIds(progress)).toEqual([])
    expect(exerciseStats(progress, 't01:lesson')).toMatchObject({ practiced: 1, completed: 1, remaining: 15, wrong: 0 })
    expect(progress.records[sample.id]?.attempts).toBe(2)
  })
  it('counts a hinted or self-checked correct answer as complete without counting it as independent', () => {
    const progress = session()
    active(progress).hinted = true
    recordAttempt(progress, active(progress), sample, true)
    expect(progress.records[sample.id]).toMatchObject({ completed: true, independent: 0 })
    expect(wrongQuestionIds(progress)).toEqual([])
  })
  it('leaves a wrong review pending and resumes the unfinished main exercise', () => {
    const progress = emptyProgress()
    const quiz = prepareQuiz(progress, 't01:lesson')!
    const first = questionById.get(quiz.questionIds[0]!)!
    recordAttempt(progress, quiz, first, false)
    advanceQuiz(progress, quiz)
    quiz.values = ['unfinished draft']
    const review = prepareQuiz(progress, 't01', 'review')!
    recordAttempt(progress, review, first, false)
    advanceQuiz(progress, review)
    expect(wrongQuestionIds(progress, 't01')).toEqual([first.id])
    expect(prepareQuiz(progress, 't01:lesson')).toBe(quiz)
    expect(quiz.cursor).toBe(1)
    expect(quiz.values).toEqual(['unfinished draft'])
  })
  it('continues to the next bank after completing all textbook exercises', () => {
    const progress = emptyProgress()
    const quiz = prepareQuiz(progress, 't01:lesson')!
    for (const id of quiz.questionIds) {
      recordAttempt(progress, quiz, questionById.get(id)!, true)
      advanceQuiz(progress, quiz)
    }
    expect(quiz.finished).toBe(true)
    expect(exerciseStats(progress, 't01:lesson').remaining).toBe(0)
    expect(nextPracticeSet(progress, 't01')?.id).toBe('t01:workbook')
    expect(exerciseStats(progress, 't01')).toMatchObject({ practiced: 16, completed: 16, remaining: 25 })
    expect(prepareQuiz(progress, 't01:lesson')).toBeNull()
  })
  it('reviews remaining wrong answers instead of replaying correct answers when a bank has been attempted', () => {
    const progress = emptyProgress()
    const quiz = prepareQuiz(progress, 't01:lesson')!
    for (const [index, id] of quiz.questionIds.entries()) {
      recordAttempt(progress, quiz, questionById.get(id)!, index !== 0)
      advanceQuiz(progress, quiz)
    }
    expect(exerciseStats(progress, quiz.scope)).toMatchObject({ practiced: 16, remaining: 1, wrong: 1 })
    const review = prepareQuiz(progress, quiz.scope)!
    expect(review.mode).toBe('review')
    expect(review.questionIds).toEqual([quiz.questionIds[0]])
    recordAttempt(progress, review, questionById.get(review.questionIds[0]!)!, true)
    advanceQuiz(progress, review)
    expect(exerciseStats(progress, quiz.scope)).toMatchObject({ practiced: 16, remaining: 0, wrong: 0 })
  })
  it('resets only the requested exercises and preserves legacy read records and other drafts', () => {
    const progress = session()
    progress.readLessons = ['t01', 't02']
    recordAttempt(progress, active(progress), sample, false)
    const other = prepareQuiz(progress, 't02:lesson')!
    other.values = ['other tense']
    const workbook = prepareQuiz(progress, 't01:workbook')!
    workbook.values = ['same tense, other bank']
    resetExercises(progress, 't01:lesson')
    expect(exerciseStats(progress, 't01:lesson')).toMatchObject({ practiced: 0, remaining: 16, wrong: 0 })
    expect(progress.readLessons).toEqual(['t01', 't02'])
    expect(progress.sessions['t02:lesson']?.values).toEqual(['other tense'])
    expect(progress.sessions['t01:workbook']?.values).toEqual(['same tense, other bank'])
    expect(prepareQuiz(progress, 't01:lesson')?.cursor).toBe(0)
  })
  it('marks all 506 exercises complete only after every question has been answered correctly', () => {
    const progress = emptyProgress()
    for (const set of practiceSets) {
      const quiz = prepareQuiz(progress, set.id)!
      while (!quiz.finished) {
        recordAttempt(progress, quiz, questionById.get(quiz.questionIds[quiz.cursor]!)!, true)
        advanceQuiz(progress, quiz)
      }
    }
    expect(exerciseStats(progress, 'all')).toEqual({ total: 506, practiced: 506, completed: 506, unpracticed: 0, remaining: 0, wrong: 0 })
    expect(prepareQuiz(progress, 't01:lesson')).toBeNull()
    expect(prepareQuiz(progress, 'all', 'review')).toBeNull()
  })
  it('migrates legacy learning, correct and wrong records, preserving the current draft in its full bank', () => {
    const oldQuiz = { id: 'old', title: '本次复习', questionIds: [sample.id], cursor: 0,
      values: ['draft answer'], hinted: true, revealed: false, attempts: [], finished: false }
    const other = getQuestions('t01', 'lesson')[0]!
    const progress = migrateProgress({ version: 1, readLessons: ['t01'], reviews: { [sample.id]: { due: 999 } }, quiz: oldQuiz,
      records: { [sample.id]: { attempts: 1, independent: 0, lastAt: 10 }, [other.id]: { attempts: 1, independent: 1, lastAt: 9 } } })
    expect(progress.readLessons).toEqual(['t01'])
    expect(progress.currentLessonId).toBe('t01')
    expect(wrongQuestionIds(progress)).toEqual([sample.id])
    expect(active(progress).title).toBe('一般现在时 · 教材练习')
    expect(active(progress).values).toEqual(['draft answer'])
    expect(active(progress).hinted).toBe(true)
    expect(active(progress).questionIds[0]).toBe(sample.id)
    expect(active(progress).questionIds).toHaveLength(15)
    expect(progress.records[other.id]?.completed).toBe(true)
  })
})

describe('lesson completion is determined by every exercise', () => {
  it('ignores an old read marker and requires both banks and corrected wrong answers', () => {
    const progress = emptyProgress()
    progress.readLessons = ['t01']
    expect(isLessonComplete(progress, 't01')).toBe(false)
    for (const set of practiceSets.filter(set => set.tenseId === 't01')) {
      const quiz = prepareQuiz(progress, set.id)!
      while (!quiz.finished) {
        const question = questionById.get(quiz.questionIds[quiz.cursor]!)!
        recordAttempt(progress, quiz, question, question.id !== sample.id)
        advanceQuiz(progress, quiz)
      }
      expect(isLessonComplete(progress, 't01')).toBe(false)
    }
    expect(exerciseStats(progress, 't01')).toMatchObject({ practiced: 41, remaining: 1, wrong: 1 })
    const review = prepareQuiz(progress, 't01', 'review')!
    recordAttempt(progress, review, sample, true)
    expect(isLessonComplete(progress, 't01')).toBe(true)
    resetExercises(progress, 't01:lesson')
    expect(isLessonComplete(progress, 't01')).toBe(false)
    expect(progress.readLessons).toEqual(['t01'])
  })
  it('does not mark an empty or unknown lesson complete', () => {
    const progress = emptyProgress()
    expect(isLessonComplete(progress, 't11')).toBe(false)
    expect(isLessonComplete(progress, 'unknown')).toBe(false)
  })
})

describe('practice and restart navigation', () => {
  const storage = new Map<string, unknown>()
  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.has(key) ? JSON.parse(JSON.stringify(storage.get(key))) : ''),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, JSON.parse(JSON.stringify(value)))),
      navigateTo: vi.fn(), redirectTo: vi.fn(), showModal: vi.fn(), showToast: vi.fn()
    })
  })
  it('opens the full bank directly, then resumes its saved draft without a replacement prompt', () => {
    openPractice('t01')
    expect(uni.navigateTo).toHaveBeenLastCalledWith({ url: '/pages/grammar/practice?key=t01%3Alesson' })
    const progress = loadProgress()
    active(progress).values = ['saved input']
    expect(active(progress).questionIds).toHaveLength(16)
    saveProgress(progress)
    openPractice('t02')
    openPractice('t01')
    expect(active(loadProgress()).values).toEqual(['saved input'])
    expect(uni.showModal).not.toHaveBeenCalled()
  })
  it('can review wrong answers without losing the normal exercise session', () => {
    openPractice('t01')
    const progress = loadProgress()
    const quiz = active(progress)
    const first = questionById.get(quiz.questionIds[0]!)!
    recordAttempt(progress, quiz, first, false)
    advanceQuiz(progress, quiz)
    quiz.values = ['pending normal answer']
    saveProgress(progress)
    openReview('t01')
    expect(active(loadProgress()).mode).toBe('review')
    expect(loadProgress().sessions['t01:lesson']?.values).toEqual(['pending normal answer'])
  })
  it('leaves existing progress untouched when restart is canceled', () => {
    const progress = session()
    recordAttempt(progress, active(progress), sample, false)
    saveProgress(progress)
    restartPractice('t01:lesson')
    const modal = vi.mocked(uni.showModal).mock.calls[0]![0]!
    modal.success?.({ confirm: false, cancel: true, errMsg: '' })
    expect(loadProgress()).toEqual(progress)
    expect(uni.navigateTo).not.toHaveBeenCalled()
  })
  it('confirms before restarting a completed bank and preserves legacy read records', () => {
    const progress = emptyProgress()
    progress.readLessons = ['t01']
    for (const q of getQuestions('t01', 'lesson')) progress.records[q.id] = { attempts: 1, independent: 1, lastAt: 10, completed: true }
    saveProgress(progress)
    openPractice('t01:lesson')
    expect(uni.navigateTo).not.toHaveBeenCalled()
    const modal = vi.mocked(uni.showModal).mock.calls[0]![0]!
    expect(modal.title).toBe('练习已全部完成')
    modal.success?.({ confirm: true, cancel: false, errMsg: '' })
    expect(exerciseStats(loadProgress(), 't01:lesson')).toMatchObject({ practiced: 0, remaining: 16 })
    expect(loadProgress().readLessons).toEqual(['t01'])
    expect(active(loadProgress()).cursor).toBe(0)
  })
})
