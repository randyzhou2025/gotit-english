import pack from './content.generated.json'
import { extendedLessons, extendedQuestions } from './extensions'
import type { Bank, Lesson, Question } from './types'

// Keep the imported textbook unchanged; use plain wording for learning hints.
const coreJudgements: Record<string, string> = {
  t01: '描述习惯、经常发生的事或客观事实，用一般现在时。',
  t02: '表示过去发生的动作或存在的状态，用一般过去时。',
  t03: 'will常用于临时决定、承诺或预测；be going to常用于计划或有依据的预测。有时两者可以互换。',
  t04: '动作现在或最近一段时间正在进行，用现在进行时。它也可以表示近期已安排好的活动。',
  t05: '过去某个时刻正在做某事，用过去进行时。突然发生的事，常用一般过去时。',
  t06: '过去的事对现在有影响、到现在为止的经历，或从过去持续到现在的状态，常用现在完成时。',
  t07: '过去说过或想过之后会发生的事，用过去将来时。',
  t08: '将来某个时刻正在做某事，用将来进行时。',
  t09: '两个动作都发生在过去；较早发生的动作，可用过去完成时。',
  t10: '强调从过去开始的持续活动，或刚结束活动对现在的影响，可用现在完成进行时。'
}
export const lessons: Lesson[] = [
  ...(pack.lessons as Lesson[]).map(lesson => ({ ...lesson, judgement: coreJudgements[lesson.id]! })),
  ...extendedLessons
]
export const questions: Question[] = [...pack.questions as Question[], ...extendedQuestions]
export const questionById = new Map(questions.map(q => [q.id, q]))
export const levelLabels = { basic: '基础 6种', advanced: '进阶 4种', extended: '拓展 6种' }
export const bankLabels: Record<Bank, string> = {
  lesson: '教材练习', workbook: '专项练习', mixed: '时态综合练习',
  passage: '短文填空', writing: '写作练习', extension: '拓展练习'
}
export function getLesson(id: string) { return lessons.find(l => l.id === id) }
export function getQuestions(tenseId: string, bank?: Bank) {
  return questions.filter(q => q.tenseId === tenseId && (!bank || q.bank === bank))
}
export const practiceSets = [
  ...lessons.flatMap(lesson => (lesson.level === 'extended' ? ['extension'] as Bank[] : ['lesson', 'workbook'] as Bank[])
    .map(bank => ({ id: `${lesson.id}:${bank}`, tenseId: lesson.id, bank,
      title: `${lesson.title} · ${bankLabels[bank]}`, questionIds: getQuestions(lesson.id, bank).map(q => q.id) }))),
  ...(['mixed', 'passage', 'writing'] as Bank[]).map(bank => ({ id: bank, tenseId: '', bank,
    title: bankLabels[bank], questionIds: questions.filter(q => q.bank === bank).map(q => q.id) }))
]
export function scopeQuestionIds(scope: string): string[] {
  if (scope === 'all') return questions.map(q => q.id)
  return practiceSets.find(set => set.id === scope)?.questionIds || practiceSets.filter(set => set.tenseId === scope).flatMap(set => set.questionIds)
}
export function scopeTitle(scope: string): string {
  return practiceSets.find(set => set.id === scope)?.title || getLesson(scope)?.title || '全部时态'
}
// Rows: simple, continuous, perfect, perfect continuous. Columns: now, past, future, future-in-past.
export const panorama = [
  ['t01', 't02', 't03', 't07'], ['t04', 't05', 't08', 't14'],
  ['t06', 't09', 't12', 't15'], ['t10', 't11', 't13', 't16']
]
