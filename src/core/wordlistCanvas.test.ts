import { describe, expect, it } from 'vitest'
import type { WordEntry } from './types'
import {
  WORDLIST_CANVAS_HEIGHT,
  WORDLIST_CANVAS_WIDTH,
  drawWordlistPage
} from './wordlistCanvas'
import { buildWordlistExportPages } from './wordlistExport'

interface RecordedText {
  text: string
  x: number
  y: number
  align: string
  fontSize: number
}

/** Advance-width model: CJK is square, latin is roughly half. Enough for geometry. */
function textWidth(text: string, fontSize: number): number {
  let units = 0
  for (const character of text) {
    units += character.charCodeAt(0) > 0x2e80 ? 1 : 0.5
  }
  return units * fontSize
}

function createRecordingContext() {
  const texts: RecordedText[] = []
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    setTransform: () => {},
    measureText(text: string) {
      return { width: textWidth(text, this.fontSize()) }
    },
    fontSize(): number {
      return Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? '10')
    },
    fillText(text: string, x: number, y: number) {
      texts.push({ text, x, y, align: this.textAlign, fontSize: this.fontSize() })
    }
  }
  return { context: context as unknown as CanvasRenderingContext2D, texts }
}

function makeWord(index: number, meaning: string): WordEntry {
  return {
    id: `w${index}`,
    word: `sample${index}`,
    meaning,
    unitId: 'rj:required-1:u1',
    unitName: 'Unit 1',
    unitNumber: 1,
    bookId: 'rj:required-1',
    bookName: '必修第一册',
    bookOrder: 1,
    publisherId: 'rj',
    publisherName: '人教版'
  } as WordEntry
}

const LONG_MEANING = '（工厂等）轮班工作时间；充满活力的；精力充沛的；业余时间'

function renderPage(mode: 'wordlist' | 'chinese' | 'english') {
  const words = Array.from({ length: 40 }, (_, index) => makeWord(index, LONG_MEANING))
  const page = buildWordlistExportPages(words)[0]!
  const { context, texts } = createRecordingContext()

  drawWordlistPage(context, {
    page,
    pageIndex: 0,
    pageCount: 1,
    mode,
    title: '中文词表 · 默写单词',
    subtitle: '必修第一册 · Unit 1',
    totalWords: words.length
  })

  return texts
}

describe('wordlist canvas geometry', () => {
  it('left-aligns every meaning line so it cannot spill into the word column', () => {
    const texts = renderPage('chinese')
    const meanings = texts.filter(entry => LONG_MEANING.startsWith(entry.text.slice(0, 4)))

    expect(meanings.length).toBeGreaterThan(0)
    for (const meaning of meanings) {
      expect(meaning.align).toBe('left')
    }
  })

  it('keeps every drawn string inside the table column it belongs to', () => {
    const texts = renderPage('wordlist')
    // Column boundaries for the two tables at x=68 and x=627, widths [42,174,289,40].
    const tableEnds = [68 + 545, 627 + 545]

    for (const entry of texts) {
      const width = textWidth(entry.text, entry.fontSize)
      const left = entry.align === 'right'
        ? entry.x - width
        : entry.align === 'center' ? entry.x - width / 2 : entry.x
      const right = left + width

      expect(left).toBeGreaterThanOrEqual(0)
      expect(right).toBeLessThanOrEqual(WORDLIST_CANVAS_WIDTH)

      // Anything starting inside a table must also end inside the same table.
      const table = tableEnds.findIndex((end, index) => left >= [68, 627][index]! && left < end)
      if (table >= 0) expect(right).toBeLessThanOrEqual(tableEnds[table]!)
    }
  })

  it('keeps all content within the A4 canvas height', () => {
    for (const entry of renderPage('english')) {
      expect(entry.y).toBeGreaterThan(0)
      expect(entry.y).toBeLessThan(WORDLIST_CANVAS_HEIGHT)
    }
  })

  it('blanks the column the chosen mode asks the learner to fill in', () => {
    const chinese = renderPage('chinese').map(entry => entry.text)
    const english = renderPage('english').map(entry => entry.text)

    expect(chinese).not.toContain('sample0')
    expect(english.some(text => text.startsWith('sample'))).toBe(true)
    expect(english.some(text => LONG_MEANING.startsWith(text.slice(0, 4)))).toBe(false)
  })
})
