import { describe, expect, it } from 'vitest'
import type { WordEntry } from '@/core/types'
import {
  buildWordMatchRounds,
  createRoundCards,
  meaningsConflict,
  shuffleCards
} from './core'

function word(id: string, value: string, meaning: string): WordEntry {
  return {
    id,
    publisherId: 'rj',
    publisherName: '人教版',
    bookId: 'required-1',
    bookName: '必修第一册',
    bookOrder: 1,
    unitId: 'rj:required-1:u1',
    unitNumber: 1,
    unitName: 'Unit 1',
    word: value,
    phonetic: '',
    partOfSpeech: '',
    meaning,
    difficulty: 1,
    audio: { status: 'pending', cdnKey: '', ukUrl: '', usUrl: '', zhUrl: '' },
    source: { workbook: '', sheet: '', rowNumber: 1 }
  }
}

describe('word match round building', () => {
  it('keeps one board per round with at most nine pairs', () => {
    const words = Array.from({ length: 25 }, (_, index) => (
      word(`word-${index}`, `word${index}`, `释义${index}`)
    ))
    const rounds = buildWordMatchRounds(words)

    expect(rounds).toHaveLength(3)
    expect(rounds.map(round => round.pairs.length)).toEqual([9, 9, 7])
  })

  it('separates words whose textbook meanings share a core sense', () => {
    const rounds = buildWordMatchRounds([
      word('goal', 'goal', '目标；目的'),
      word('target', 'target', '目标'),
      word('pressure', 'pressure', '压力'),
      word('stress', 'stress', '压力；忧虑；紧张'),
      word('method', 'method', '方法；措施'),
      word('task', 'task', '任务；工作')
    ])
    expect(meaningsConflict('目标；目的', '目标')).toBe(true)
    expect(meaningsConflict('压力', '压力；忧虑；紧张')).toBe(true)
    expect(rounds.every(round => {
      const ids = new Set(round.pairs.map(pair => pair.wordId))
      return !(ids.has('goal') && ids.has('target'))
        && !(ids.has('pressure') && ids.has('stress'))
    })).toBe(true)
  })

  it('separates identical English cards with different meanings', () => {
    const rounds = buildWordMatchRounds([
      word('sweet-noun', 'sweet', '糖果；甜食'),
      word('sweet-adjective', 'sweet', '甜的；可爱的'),
      word('fruit', 'fruit', '水果')
    ])

    expect(rounds.every(round => round.pairs.filter(pair => pair.word === 'sweet').length <= 1)).toBe(true)
  })

  it('creates one word card and one meaning card for every visible pair', () => {
    const [round] = buildWordMatchRounds([
      word('minor', 'minor', '较小的；次要的；未成年人的'),
      word('next-to', 'next to', '紧邻；在……旁边')
    ])
    const cards = createRoundCards(round!, values => values.slice().reverse())

    expect(cards).toHaveLength(4)
    expect(new Set(cards.map(card => card.pairId))).toEqual(new Set(['minor', 'next-to']))
    expect(cards.filter(card => card.kind === 'word')).toHaveLength(2)
    expect(cards.filter(card => card.kind === 'meaning')).toHaveLength(2)
    expect(cards.find(card => card.pairId === 'minor' && card.kind === 'meaning')?.text).toBe('较小的；次要的')
  })

  it('does not mutate the source card order while shuffling', () => {
    const source = [1, 2, 3, 4]
    const shuffled = shuffleCards(source, () => 0)

    expect(source).toEqual([1, 2, 3, 4])
    expect(shuffled).not.toBe(source)
    expect([...shuffled].sort()).toEqual(source)
  })
})
