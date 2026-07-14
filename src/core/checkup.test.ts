import { describe, expect, it } from 'vitest'
import { createCheckupQuestions, gradeCheckupAnswer, summarizeCheckup } from './checkup'
import type { WordEntry } from './types'

const words: WordEntry[] = [
  makeWord('1', 'architecture', '建筑', 5),
  makeWord('2', 'water', '水', 1),
  makeWord('3', 'school', '学校', 1),
  makeWord('4', 'future', '未来', 2)
]

function makeWord(id: string, word: string, meaning: string, difficulty: number): WordEntry {
  return {
    id,
    publisherId: 'test',
    publisherName: '测试',
    bookId: 'book',
    bookName: '测试册',
    bookOrder: 1,
    unitId: 'unit',
    unitNumber: 1,
    unitName: 'Unit 1',
    word,
    phonetic: '',
    partOfSpeech: 'n.',
    meaning,
    difficulty,
    audio: {
      status: 'pending',
      cdnKey: id,
      ukUrl: '',
      usUrl: '',
      zhUrl: ''
    },
    source: {
      workbook: 'test.xlsx',
      sheet: 'sheet',
      rowNumber: Number(id)
    }
  }
}

describe('checkup', () => {
  it('picks hard words first and builds meaning choices', () => {
    const questions = createCheckupQuestions(words, 2)
    expect(questions).toHaveLength(2)
    expect(questions[0]?.word.word).toBe('architecture')
    expect(questions[0]?.meaningChoices).toContain('建筑')
  })

  it('grades answer status and summary', () => {
    const question = createCheckupQuestions(words, 1)[0]
    expect(question).toBeDefined()
    if (!question) return
    const mastered = gradeCheckupAnswer(question, question.word.meaning, question.word.word)
    const weak = gradeCheckupAnswer(question, '水', 'wrong')
    const summary = summarizeCheckup([mastered, weak])

    expect(mastered.status).toBe('mastered')
    expect(weak.status).toBe('unknown')
    expect(summary.accuracy).toBe(50)
    expect(summary.weakWordIds).toEqual([question.word.id])
  })
})
