import type { UnitGroup, WordEntry } from './types'
import { ensureWordbankLoaded, expandPublisherBlock, getWordbankManifest } from './wordbankLoader'

export { ensureWordbankLoaded, expandPublisherBlock, getWordbankManifest, resetWordbankCacheForTests } from './wordbankLoader'
export type { CompactPublisherBlock, WordbankManifest } from './wordbankLoader'

export function isPhraseEntry(word: string): boolean {
  return /\s/.test(word.trim())
}

export function getWordbank(): WordEntry[] {
  throw new Error('getWordbank() is sync-only legacy API. Call ensureWordbankLoaded() first.')
}

export async function loadWordbank(): Promise<WordEntry[]> {
  return ensureWordbankLoaded()
}

export function groupUnits(words: WordEntry[]): UnitGroup[] {
  const groups = new Map<string, UnitGroup>()

  for (const word of words) {
    if (!groups.has(word.unitId)) {
      groups.set(word.unitId, {
        publisherId: word.publisherId,
        publisherName: word.publisherName,
        bookId: word.bookId,
        bookName: word.bookName,
        bookOrder: word.bookOrder,
        unitId: word.unitId,
        unitNumber: word.unitNumber,
        unitName: word.unitName,
        words: []
      })
    }
    groups.get(word.unitId)?.words.push(word)
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.publisherId !== b.publisherId) return a.publisherId.localeCompare(b.publisherId)
    if (a.bookOrder !== b.bookOrder) return a.bookOrder - b.bookOrder
    return a.unitNumber - b.unitNumber
  })
}

export function getDefaultUnit(units: UnitGroup[]): UnitGroup | undefined {
  return units[0]
}

export function findUnit(units: UnitGroup[], unitId: string): UnitGroup | undefined {
  return units.find(unit => unit.unitId === unitId)
}

export function getUnitLabel(unit: UnitGroup): string {
  return `${unit.publisherName} ${unit.bookName} ${unit.unitName}`
}

export function getWeakWords(words: WordEntry[], weakWordIds: string[]): WordEntry[] {
  const weakSet = new Set(weakWordIds)
  return words.filter(word => weakSet.has(word.id))
}
