import type { WordbankManifest } from './wordbankLoader'

export type SchoolStage = '初中' | '高中'

const JUNIOR_GRADE_PATTERN = /六年级|七年级|八年级|九年级/

export function inferSchoolStageFromBookName(bookName: string): SchoolStage {
  return /中考|初中|六年级|七年级|八年级|九年级/.test(bookName) ? '初中' : '高中'
}

export function inferJuniorGradeFromBookName(bookName: string): string {
  if (bookName.includes('中考')) return '中考'
  const match = bookName.match(JUNIOR_GRADE_PATTERN)
  return match?.[0] ?? ''
}

export function formatCourseSetupBookName(bookName: string): string {
  const match = bookName.match(/^(?:中考2000词|高考3500词)·(.+)$/)
  return match?.[1] ?? bookName
}

export function buildUnitId(
  publisherId: string,
  bookId: string,
  unit: { key?: string, number: number }
): string {
  const segment = unit.key ?? String(unit.number)
  return `${publisherId}:${bookId}:u${segment}`
}

function unitDisplayName(unit: { label?: string, number: number }): string {
  return unit.label ?? (unit.number === 0 ? 'Welcome Unit' : `Unit ${unit.number}`)
}

function listManifestBooks(manifest: WordbankManifest, stage: SchoolStage, grade: string) {
  const books: Array<{
    publisherId: string
    publisherName: string
    bookId: string
    bookName: string
    bookOrder: number
    units: Array<{ id: string, name: string, count: number, unitNumber: number }>
  }> = []

  for (const entry of manifest.publishers) {
    for (const book of entry.books) {
      if (inferSchoolStageFromBookName(book.name) !== stage) continue
      if (stage === '初中' && grade && !book.name.includes(grade)) continue

      books.push({
        publisherId: entry.publisher.id,
        publisherName: entry.publisher.name,
        bookId: book.id,
        bookName: book.name,
        bookOrder: book.order,
        units: book.units.map(unit => ({
          id: buildUnitId(entry.publisher.id, book.id, unit),
          name: unitDisplayName(unit),
          count: unit.wordCount,
          unitNumber: unit.number
        }))
      })
    }
  }

  return books
}

export function buildCourseSetupPublisherOptions(
  manifest: WordbankManifest,
  stage: SchoolStage,
  grade: string
): Array<{ id: string, name: string }> {
  const map = new Map<string, string>()
  for (const book of listManifestBooks(manifest, stage, grade)) {
    if (!map.has(book.publisherId)) {
      map.set(book.publisherId, book.publisherName)
    }
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
}

function countMasteredWithPrefix(masteredSet: Set<string>, prefix: string): number {
  let count = 0
  for (const wordId of masteredSet) {
    if (wordId.startsWith(prefix)) count += 1
  }
  return count
}

function computeMasteryPercent(total: number, mastered: number): number | null {
  if (total <= 0 || mastered <= 0) return null
  return Math.max(1, Math.round((mastered / total) * 100))
}

export function buildCourseSetupBookOptions(
  manifest: WordbankManifest,
  stage: SchoolStage,
  grade: string,
  publisherId: string,
  masteredSet: Set<string>
): Array<{ id: string, name: string, masteryPercent: number | null }> {
  const bookMap = new Map<string, { id: string, name: string, order: number, wordCount: number }>()

  for (const book of listManifestBooks(manifest, stage, grade)) {
    if (book.publisherId !== publisherId) continue
    const totalWords = book.units.reduce((sum, unit) => sum + unit.count, 0)
    bookMap.set(book.bookId, {
      id: book.bookId,
      name: book.bookName,
      order: book.bookOrder,
      wordCount: totalWords
    })
  }

  return Array.from(bookMap.values())
    .sort((a, b) => a.order - b.order)
    .map(book => ({
      id: book.id,
      name: book.name,
      masteryPercent: computeMasteryPercent(
        book.wordCount,
        countMasteredWithPrefix(masteredSet, `${publisherId}:${book.id}:`)
      )
    }))
}

export function buildCourseSetupUnitOptions(
  manifest: WordbankManifest,
  stage: SchoolStage,
  grade: string,
  publisherId: string,
  bookId: string,
  masteredSet: Set<string>
): Array<{ id: string, name: string, count: number, masteryPercent: number | null }> {
  return listManifestBooks(manifest, stage, grade)
    .filter(book => book.publisherId === publisherId && book.bookId === bookId)
    .flatMap(book => book.units)
    .sort((a, b) => a.unitNumber - b.unitNumber)
    .map(unit => ({
      id: unit.id,
      name: unit.name,
      count: unit.count,
      masteryPercent: computeMasteryPercent(
        unit.count,
        countMasteredWithPrefix(masteredSet, `${unit.id}:`)
      )
    }))
}

export function lookupUnitInCatalog(manifest: WordbankManifest, unitId: string) {
  const parts = unitId.split(':')
  const publisherId = parts[0]
  const bookId = parts[1]
  const unitMatch = unitId.match(/:u([^:]+)$/)
  const unitSegment = unitMatch?.[1]
  if (!publisherId || !bookId || !unitSegment) return null

  for (const entry of manifest.publishers) {
    if (entry.publisher.id !== publisherId) continue
    for (const book of entry.books) {
      if (book.id !== bookId) continue
      const unit = book.units.find(item => (item.key ?? String(item.number)) === unitSegment)
      if (!unit) continue
      return {
        publisherId: entry.publisher.id,
        publisherName: entry.publisher.name,
        bookId: book.id,
        bookName: book.name,
        unitId,
        unitName: unitDisplayName(unit)
      }
    }
  }

  return null
}

export function isUnitIdInCatalog(manifest: WordbankManifest, unitId: string): boolean {
  return lookupUnitInCatalog(manifest, unitId) !== null
}
