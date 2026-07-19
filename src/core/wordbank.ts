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
  rowNumber: number,
  exampleSentence?: string,
  exampleTranslation?: string
]

interface CompactUnit {
  number: number
  key?: string
  label?: string
  words: CompactWordRecord[]
}

interface CompactPublisherBlock {
  publisher: {
    id: string
    name: string
  }
  sourceWorkbook: string
  books: Array<{
    id: string
    name: string
    order: number
    units: CompactUnit[]
  }>
}

interface CompactWordbank {
  publisher?: CompactPublisherBlock['publisher']
  sourceWorkbook?: string
  books?: CompactPublisherBlock['books']
  publishers?: CompactPublisherBlock[]
}

interface AudioManifest {
  items: Record<string, {
    status?: 'pending' | 'ready'
    ukUrl?: string
    usUrl?: string
    zhUrl?: string
  }>
}

function unitSegment(unit: CompactUnit): string {
  return unit.key ?? String(unit.number)
}

function unitDisplayName(unit: CompactUnit): string {
  return unit.label ?? (unit.number === 0 ? 'Welcome Unit' : `Unit ${unit.number}`)
}

function getPublisherBlocks(raw: CompactWordbank): CompactPublisherBlock[] {
  if (raw.publishers?.length) {
    return raw.publishers
  }

  if (raw.publisher && raw.books) {
    return [{
      publisher: raw.publisher,
      sourceWorkbook: raw.sourceWorkbook ?? '',
      books: raw.books
    }]
  }

  return []
}

export function getWordbank(): WordEntry[] {
  const audioManifest = rawAudioManifest as AudioManifest
  const entries: WordEntry[] = []

  for (const block of getPublisherBlocks(rawWordbank as CompactWordbank)) {
    for (const book of block.books) {
      for (const unit of book.units) {
        const segment = unitSegment(unit)
        const unitId = `${block.publisher.id}:${book.id}:u${segment}`

        for (const [word, phonetic, partOfSpeech, meaning, difficulty, slug, rowNumber, exampleSentence, exampleTranslation] of unit.words) {
          const cdnKey = `${block.publisher.id}/${book.id}/unit-${segment}/${slug}`
          const audioRecord = audioManifest.items[cdnKey]

          entries.push({
            id: `${unitId}:${slug}`,
            publisherId: block.publisher.id,
            publisherName: block.publisher.name,
            bookId: book.id,
            bookName: book.name,
            bookOrder: book.order,
            unitId,
            unitNumber: unit.number,
            unitName: unitDisplayName(unit),
            word,
            phonetic,
            partOfSpeech,
            meaning,
            exampleSentence: exampleSentence || undefined,
            exampleTranslation: exampleTranslation || undefined,
            difficulty,
            audio: {
              status: audioRecord?.status ?? 'pending',
              cdnKey,
              ukUrl: audioRecord?.ukUrl ?? '',
              usUrl: audioRecord?.usUrl ?? '',
              zhUrl: audioRecord?.zhUrl ?? ''
            },
            source: {
              workbook: block.sourceWorkbook,
              sheet: book.name,
              rowNumber
            }
          })
        }
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
  return `${unit.publisherName} ${unit.bookName} ${unit.unitName}`
}

export function getWeakWords(words: WordEntry[], weakWordIds: string[]): WordEntry[] {
  const weakSet = new Set(weakWordIds)
  return words.filter(word => weakSet.has(word.id))
}
