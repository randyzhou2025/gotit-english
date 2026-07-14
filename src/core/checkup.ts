import { checkSpelling } from './spelling'
import type { CheckupAnswer, CheckupQuestion, CheckupSummary, MasteryStatus, WordEntry } from './types'

function hashText(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function uniqueMeanings(words: WordEntry[], exceptWordId: string): string[] {
  const meanings = words
    .filter(word => word.id !== exceptWordId)
    .map(word => word.meaning)
    .filter(Boolean)

  return Array.from(new Set(meanings))
}

export function createMeaningChoices(target: WordEntry, pool: WordEntry[], count = 4): string[] {
  const distractors = uniqueMeanings(pool, target.id)
    .sort((a, b) => hashText(`${target.id}:${a}`) - hashText(`${target.id}:${b}`))
    .slice(0, Math.max(0, count - 1))

  return [target.meaning, ...distractors]
    .sort((a, b) => hashText(`${target.id}:${b}:choice`) - hashText(`${target.id}:${a}:choice`))
}

export function createCheckupQuestions(
  words: WordEntry[],
  limit = 12,
  choicePool: WordEntry[] = words
): CheckupQuestion[] {
  return words
    .slice()
    .sort((a, b) => {
      const difficultyDelta = b.difficulty - a.difficulty
      if (difficultyDelta !== 0) return difficultyDelta
      return hashText(a.id) - hashText(b.id)
    })
    .slice(0, limit)
    .map(word => ({
      id: `checkup:${word.id}`,
      word,
      meaningChoices: createMeaningChoices(word, choicePool)
    }))
}

export function gradeCheckupAnswer(
  question: CheckupQuestion,
  selectedMeaning: string,
  spellingInput: string
): CheckupAnswer {
  const spelling = checkSpelling(spellingInput, question.word)
  const recognitionCorrect = selectedMeaning === question.word.meaning
  const status: MasteryStatus = recognitionCorrect && spelling.correct
    ? 'mastered'
    : recognitionCorrect || spelling.correct
      ? 'recognition'
      : 'unknown'

  return {
    questionId: question.id,
    wordId: question.word.id,
    selectedMeaning,
    recognitionCorrect,
    spellingInput,
    spellingCorrect: spelling.correct,
    status
  }
}

export function summarizeCheckup(answers: CheckupAnswer[]): CheckupSummary {
  const total = answers.length
  const mastered = answers.filter(answer => answer.status === 'mastered').length
  const recognition = answers.filter(answer => answer.status === 'recognition').length
  const unknown = answers.filter(answer => answer.status === 'unknown').length

  return {
    total,
    mastered,
    recognition,
    unknown,
    accuracy: total === 0 ? 0 : Math.round((mastered / total) * 100),
    weakWordIds: answers
      .filter(answer => answer.status !== 'mastered')
      .map(answer => answer.wordId)
  }
}
