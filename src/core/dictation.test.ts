import { describe, expect, it } from 'vitest'
import { createDictationPlan, formatEstimatedMinutes, gradeDictationInput } from './dictation'
import type { WordEntry } from './types'

const word: WordEntry = {
  id: 'word-1',
  publisherId: 'test',
  publisherName: '测试',
  bookId: 'book',
  bookName: '测试册',
  bookOrder: 1,
  unitId: 'unit',
  unitNumber: 1,
  unitName: 'Unit 1',
  word: 'challenge',
  phonetic: '',
  partOfSpeech: 'n.',
  meaning: '挑战',
  difficulty: 3,
  audio: {
    status: 'pending',
    cdnKey: 'word-1',
    ukUrl: '',
    usUrl: '',
    zhUrl: ''
  },
  source: {
    workbook: 'test.xlsx',
    sheet: 'sheet',
    rowNumber: 1
  }
}

describe('dictation', () => {
  it('creates mode-aware plans', () => {
    const paper = createDictationPlan([word, word], 'paper', 'uk', 'chinese', 8, 'sequence', 1)
    const online = createDictationPlan([word, word], 'online', 'us', 'english', 8, 'sequence', 1)
    const chinese = createDictationPlan([word, word], 'online', 'uk', 'chinese', 12, 'sequence', 2)

    expect(paper.estimatedSeconds).toBe(16)
    expect(online.estimatedSeconds).toBe(36)
    expect(chinese.prompt).toBe('chinese')
    expect(chinese.intervalSeconds).toBe(12)
    expect(chinese.repeatCount).toBe(2)
    expect(chinese.estimatedSeconds).toBe(48)
    expect(formatEstimatedMinutes(paper.estimatedSeconds)).toBe('1 分钟')
  })

  it('records online input correctness', () => {
    expect(gradeDictationInput(word, 'challenge').correct).toBe(true)
    expect(gradeDictationInput(word, 'challange').correct).toBe(false)
  })
})
