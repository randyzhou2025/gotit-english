import type { WordEntry } from '@/core/types'

export const WORD_MATCH_PAIRS_PER_ROUND = 9

export interface WordMatchPair {
  id: string
  wordId: string
  word: string
  gameMeaning: string
  fullMeaning: string
  wordKey: string
  meaningKeys: string[]
  entry: WordEntry
}

export interface WordMatchRound {
  index: number
  pairs: WordMatchPair[]
  wordCount: number
}

export interface WordMatchCard {
  id: string
  pairId: string
  kind: 'word' | 'meaning'
  text: string
  fullMeaning: string
}

function cleanMeaning(value: string): string {
  return value
    .trim()
    .replace(/^[（(][^）)]*,[^）)]*[a-zA-Z][^）)]*[）)]\s*/, '')
    .replace(/\r?\n+/g, '；')
    .replace(/[；;]+/g, '；')
    .replace(/^；|；$/g, '')
    .trim()
}

function normalizeMeaningKey(value: string): string {
  return value
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\s，,。！？!?、…·“”‘’'"：:；;\-]/g, '')
    .trim()
}

function meaningParts(value: string): string[] {
  return cleanMeaning(value)
    .split('；')
    .map(part => part.trim())
    .filter(Boolean)
}

function meaningKeys(value: string): string[] {
  return Array.from(new Set(meaningParts(value).map(normalizeMeaningKey).filter(Boolean)))
}

export function meaningsConflict(left: string, right: string): boolean {
  const leftKeys = new Set(meaningKeys(left))
  return meaningKeys(right).some(key => leftKeys.has(key))
}

export function buildGameMeaning(fullMeaning: string): string {
  const parts = meaningParts(fullMeaning)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  return parts.slice(0, 2).join('；')
}

function toPair(entry: WordEntry): WordMatchPair | null {
  const fullMeaning = cleanMeaning(entry.meaning)
  const gameMeaning = buildGameMeaning(fullMeaning)
  const keys = meaningKeys(fullMeaning)
  if (!entry.word.trim() || !gameMeaning || keys.length === 0) return null

  return {
    id: entry.id,
    wordId: entry.id,
    word: entry.word.trim(),
    gameMeaning,
    fullMeaning,
    wordKey: entry.word.trim().toLowerCase().replace(/\s+/g, ' '),
    meaningKeys: keys,
    entry
  }
}

function canShareRound(pair: WordMatchPair, round: WordMatchRound): boolean {
  if (round.pairs.length >= WORD_MATCH_PAIRS_PER_ROUND) return false
  if (round.pairs.some(item => item.wordKey === pair.wordKey)) return false
  const occupiedKeys = new Set(round.pairs.flatMap(item => item.meaningKeys))
  return pair.meaningKeys.every(key => !occupiedKeys.has(key))
}

export function buildWordMatchRounds(words: WordEntry[]): WordMatchRound[] {
  const rounds: WordMatchRound[] = []
  for (const entry of words) {
    const pair = toPair(entry)
    if (!pair) continue

    let round = rounds.find(candidate => canShareRound(pair, candidate))
    if (!round) {
      round = { index: rounds.length, pairs: [], wordCount: 0 }
      rounds.push(round)
    }
    round.pairs.push(pair)
    round.wordCount = round.pairs.length
  }
  return rounds
}

export function shuffleCards<T>(values: T[], random: () => number = Math.random): T[] {
  const result = values.slice()
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target]!, result[index]!]
  }
  return result
}

export function createRoundCards(
  round: WordMatchRound,
  shuffle: <T>(values: T[]) => T[] = shuffleCards
): WordMatchCard[] {
  const cards = round.pairs.flatMap<WordMatchCard>(pair => [
    {
      id: `${pair.id}:word`,
      pairId: pair.id,
      kind: 'word',
      text: pair.word,
      fullMeaning: pair.fullMeaning
    },
    {
      id: `${pair.id}:meaning`,
      pairId: pair.id,
      kind: 'meaning',
      text: pair.gameMeaning,
      fullMeaning: pair.fullMeaning
    }
  ])
  return shuffle(cards)
}
