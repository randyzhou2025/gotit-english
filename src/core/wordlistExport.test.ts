import { describe, expect, it } from 'vitest'
import type { WordEntry } from './types'
import {
  buildJpegPdf,
  buildWordlistExportFilename,
  buildWordlistExportPages,
  WORDLIST_EXPORT_ROWS
} from './wordlistExport'

function makeWords(count: number): WordEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `word-${index + 1}`,
    publisherId: 'publisher',
    publisherName: '出版社',
    bookId: 'book',
    bookName: '九年级全一册',
    bookOrder: 1,
    unitId: 'unit',
    unitNumber: 1,
    unitName: 'Unit 1',
    word: `word-${index + 1}`,
    phonetic: '',
    partOfSpeech: 'n.',
    meaning: `释义-${index + 1}`,
    difficulty: 1,
    audio: {
      status: 'pending',
      cdnKey: '',
      ukUrl: '',
      usUrl: '',
      zhUrl: ''
    },
    source: {
      workbook: '',
      sheet: '',
      rowNumber: index + 1
    }
  }))
}

describe('buildWordlistExportPages', () => {
  it('places 40 complete word rows on each wordlist page', () => {
    const pages = buildWordlistExportPages(makeWords(41))

    expect(pages).toHaveLength(2)
    expect(pages[0]?.left).toHaveLength(WORDLIST_EXPORT_ROWS)
    expect(pages[0]?.right).toHaveLength(WORDLIST_EXPORT_ROWS)
    expect(pages[0]?.left[19]?.word).toBe('word-20')
    expect(pages[0]?.right[0]?.word).toBe('word-21')
    expect(pages[1]?.left[0]?.word).toBe('word-41')
  })

  it('places 40 distinct words on Chinese and English list pages', () => {
    const pages = buildWordlistExportPages(makeWords(41))

    expect(pages).toHaveLength(2)
    expect(pages[0]?.left[19]?.word).toBe('word-20')
    expect(pages[0]?.right[0]?.word).toBe('word-21')
    expect(pages[0]?.right[19]?.word).toBe('word-40')
    expect(pages[1]?.left[0]?.word).toBe('word-41')
    expect(pages[1]?.right.every(word => word === null)).toBe(true)
  })
})

describe('buildJpegPdf', () => {
  it('builds a valid multi-page PDF container', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const pdf = buildJpegPdf([
      { bytes: jpeg, width: 1240, height: 1754 },
      { bytes: jpeg, width: 1240, height: 1754 }
    ])
    const ascii = String.fromCharCode(...pdf)

    expect(ascii.startsWith('%PDF-1.4')).toBe(true)
    expect(ascii).toContain('/Count 2')
    expect(ascii).toContain('/Filter /DCTDecode')
    expect(ascii).toContain('%%EOF')
  })
})

describe('buildWordlistExportFilename', () => {
  it.each([
    ['wordlist', 'grade-7-1-unit-1-wordlist.pdf'],
    ['chinese', 'grade-7-1-unit-1-chinese-wordlist.pdf'],
    ['english', 'grade-7-1-unit-1-english-wordlist.pdf']
  ] as const)('uses the current book, unit, and %s mode', (mode, expected) => {
    expect(buildWordlistExportFilename('grade-7-1', 'Unit 1', mode)).toBe(expected)
  })

  it('normalizes English identifiers and never keeps Chinese filename text', () => {
    expect(buildWordlistExportFilename('required-1', 'Welcome Unit', 'wordlist'))
      .toBe('required-1-welcome-unit-wordlist.pdf')
    expect(buildWordlistExportFilename('当前册', '当前单元', 'english'))
      .toBe('current-book-current-unit-english-wordlist.pdf')
  })
})
