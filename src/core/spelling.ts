import type { SpellingResult, WordEntry } from './types'

export function normalizeSpelling(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function getAcceptedSpellings(word: string): string[] {
  const normalized = normalizeSpelling(word)
  return Array.from(new Set([normalized]))
}

export function checkSpelling(input: string, entry: Pick<WordEntry, 'word'>): SpellingResult {
  const normalizedInput = normalizeSpelling(input)
  const accepted = getAcceptedSpellings(entry.word)
  const normalizedAnswer = accepted[0] ?? ''

  return {
    correct: accepted.includes(normalizedInput),
    normalizedInput,
    normalizedAnswer
  }
}
