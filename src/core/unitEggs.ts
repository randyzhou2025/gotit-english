import unitEggData from '@/data/unit-eggs.generated.json'

export type UnitEggTemplate = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'

export interface UnitEgg {
  id: string
  sequence: number
  template: UnitEggTemplate
  keyword: string
  title: string
  core: string
  explanation: string
  memory: string
  compare: string
  phonetic: string
  meaning: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripContrastPunctuation(value: string): string {
  return value
    .trim()
    .replace(/^[：:，,；;。\s]+/, '')
    .replace(/[。；;\s]+$/, '')
    .replace(/[“”"]/g, '')
}

function removeContrastWord(value: string, word: string): string {
  if (!word) return stripContrastPunctuation(value)
  return stripContrastPunctuation(value.replace(
    new RegExp(`^${escapeRegExp(word)}\\s*(?:通常)?(?:是|表示|描述|可以是|可以表示)?\\s*`, 'i'),
    ''
  ))
}

function startsWithWholeWord(value: string, word: string): boolean {
  if (!word) return false
  return new RegExp(`^${escapeRegExp(word)}(?=\\s|是|：|:|，|,)`, 'i').test(value.trim())
}

export function getUnitEggContrastNotes(
  explanation: string,
  leftWord: string,
  rightWord: string
): [string, string] {
  const clauses = explanation.split(/[；;]/).map(part => part.trim()).filter(Boolean)
  const leftClause = clauses.find(part => startsWithWholeWord(part, leftWord)) ?? clauses[0] ?? ''
  const rightIndex = clauses.findIndex(part => startsWithWholeWord(part, rightWord))
  const rightClauses = rightIndex >= 0 ? clauses.slice(rightIndex) : clauses.slice(1)

  return [
    removeContrastWord(leftClause, leftWord),
    rightClauses
      .map((part, index) => removeContrastWord(part, index === 0 ? rightWord : ''))
      .filter(Boolean)
      .join('，')
  ]
}

interface UnitEggDataset {
  version: string
  source: string
  unitCount: number
  recordCount: number
  byUnit: Record<string, UnitEgg[]>
}

const dataset = unitEggData as UnitEggDataset

export function getUnitEggs(unitId: string): readonly UnitEgg[] {
  return dataset.byUnit[unitId] ?? []
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getUnitEggForDate(unitId: string, date = new Date()): UnitEgg | null {
  const eggs = getUnitEggs(unitId)
  if (eggs.length === 0) return null

  const index = stableHash(`${unitId}:${localDateKey(date)}`) % eggs.length
  return eggs[index] ?? null
}

export const unitEggDatasetMeta = {
  version: dataset.version,
  source: dataset.source,
  unitCount: dataset.unitCount,
  recordCount: dataset.recordCount
} as const
