import type { UnitGroup, WordEntry } from './types'

export type WorksheetMode = 'zh-en' | 'en-zh'

export interface WorksheetRow {
  word: WordEntry
  number: number
  lines: string[]
  height: number
}

export interface WorksheetPage {
  kind: 'questions' | 'answers'
  mode: WorksheetMode
  columns: WorksheetRow[][]
}

export const WORKSHEET_WIDTH = 794
export const WORKSHEET_HEIGHT = 1123
export const WORKSHEET_BODY_HEIGHT = 870
export const WORKSHEET_COLUMN_WIDTH = 330
export const WORKSHEET_PROMPT_WIDTH = 194

export function worksheetBookUnits(units: UnitGroup[], current: UnitGroup): UnitGroup[] {
  return units.filter(unit => unit.publisherId === current.publisherId && unit.bookId === current.bookId)
    .sort((a, b) => a.unitNumber - b.unitNumber)
}

export function worksheetSelection(units: UnitGroup[], unitIds: string[], wordIds: string[]): WordEntry[] {
  const selectedUnits = new Set(unitIds)
  const selectedWords = new Set(wordIds)
  return units.filter(unit => selectedUnits.has(unit.unitId))
    .flatMap(unit => unit.words.filter(word => selectedWords.has(word.id)))
}

export function worksheetPrompt(meaning: string): string {
  // Textbook annotations can contain the answer, e.g. “(pl. stadiums or stadia)”.
  return meaning.replace(/[（(][^）)]*[A-Za-z][^）)]*[）)]/g, '')
    .replace(/\[[^\]]*[A-Za-z][^\]]*\]/g, '').trim()
}

export function wrapWorksheetText(value: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  let length = 0
  for (const character of value) {
    const advance = character.charCodeAt(0) < 256 ? 0.54 : 1
    // A closing mark belongs to the preceding text, even at the wrap boundary.
    if (character === '\n' || (line && length + advance > width && !/[，。、；：！？）】》”’),;:!?]/.test(character))) {
      lines.push(line)
      line = ''
      length = 0
      if (character === '\n') continue
    }
    line += character
    length += advance
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

export function shuffleWorksheetWords(words: WordEntry[]): WordEntry[] {
  const result = [...words]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target]!, result[index]!]
  }
  return result
}

function worksheetMeaning(word: WordEntry): string {
  const meaning = worksheetPrompt(word.meaning)
  return word.partOfSpeech ? `${word.partOfSpeech} ${meaning}` : meaning
}

export function buildWorksheetPages(words: WordEntry[], mode: WorksheetMode = 'zh-en'): WorksheetPage[] {
  if (!words.length) return []
  return (['questions', 'answers'] as const).flatMap(kind => {
    const pages: WorksheetPage[] = []
    let columns: WorksheetRow[][] = [[], []]
    let column = 0
    let used = 0
    words.forEach((word, index) => {
      const english = kind === 'questions' ? mode === 'en-zh' : mode === 'zh-en'
      const value = english ? word.word : worksheetMeaning(word)
      const lines = wrapWorksheetText(value, kind === 'questions' ? 14 : 22)
      const height = Math.max(29, lines.length * 18 + 11)
      if (columns[column]!.length && (used + height > WORKSHEET_BODY_HEIGHT || columns[column]!.length >= 30)) {
        if (column === 1) {
          pages.push({ kind, mode, columns })
          columns = [[], []]
          column = 0
        } else column = 1
        used = 0
      }
      columns[column]!.push({ word, number: index + 1, lines, height })
      used += height
    })
    pages.push({ kind, mode, columns })
    return pages
  })
}

export function worksheetDefaultTitle(units: UnitGroup[], selectedUnitIds: string[]): string {
  if (!selectedUnitIds.length || selectedUnitIds.length === units.length) return '单词默写卷'
  const selected = units.filter(unit => selectedUnitIds.includes(unit.unitId))
  return selected.length <= 2 ? `${selected.map(unit => unit.unitName).join('、')} 单词默写卷` : '跨单元单词默写卷'
}
