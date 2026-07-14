import rawWordbank from '@/data/wordbank.generated.json'
import rawAudioManifest from '@/data/audio.generated.json'
import type { UnitGroup, WordEntry } from './types'

type CompactWordRecord = [
  word: string,
  phonetic: string,
  partOfSpeech: string,
  meaning: string,
  difficulty: number,
  slug: string,
  rowNumber: number
]

interface CompactWordbank {
  publisher: {
    id: string
    name: string
  }
  sourceWorkbook: string
  books: Array<{
    id: string
    name: string
    order: number
    units: Array<{
      number: number
      words: CompactWordRecord[]
    }>
  }>
}

interface AudioManifest {
  items: Record<string, {
    status?: 'pending' | 'ready'
    ukUrl?: string
    usUrl?: string
    zhUrl?: string
  }>
}

export function getWordbank(): WordEntry[] {
  const compact = rawWordbank as CompactWordbank
  const audioManifest = rawAudioManifest as AudioManifest
  const entries: WordEntry[] = []

  for (const book of compact.books) {
    for (const unit of book.units) {
      const unitId = `${compact.publisher.id}:${book.id}:u${unit.number}`

      for (const [word, phonetic, partOfSpeech, meaning, difficulty, slug, rowNumber] of unit.words) {
        const cdnKey = `${compact.publisher.id}/${book.id}/unit-${unit.number}/${slug}`
        const audioRecord = audioManifest.items[cdnKey]

        entries.push({
          id: `${unitId}:${slug}`,
          publisherId: compact.publisher.id,
          publisherName: compact.publisher.name,
          bookId: book.id,
          bookName: book.name,
          bookOrder: book.order,
          unitId,
          unitNumber: unit.number,
          unitName: `Unit ${unit.number}`,
          word,
          phonetic,
          partOfSpeech,
          meaning,
          difficulty,
          audio: {
            status: audioRecord?.status ?? 'pending',
            cdnKey,
            ukUrl: audioRecord?.ukUrl ?? '',
            usUrl: audioRecord?.usUrl ?? '',
            zhUrl: audioRecord?.zhUrl ?? ''
          },
          source: {
            workbook: compact.sourceWorkbook,
            sheet: book.name,
            rowNumber
          }
        })
      }
    }
  }

  return entries
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
  return `${unit.publisherName} ${unit.bookName} Unit ${unit.unitNumber}`
}

export function getWeakWords(words: WordEntry[], weakWordIds: string[]): WordEntry[] {
  const weakSet = new Set(weakWordIds)
  return words.filter(word => weakSet.has(word.id))
}
