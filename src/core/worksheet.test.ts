import { describe, expect, it, vi } from 'vitest'
import type { UnitGroup, WordEntry } from './types'
import { buildWorksheetPages, shuffleWorksheetWords, worksheetBookUnits, worksheetDefaultTitle, worksheetPrompt, worksheetSelection, WORKSHEET_BODY_HEIGHT } from './worksheet'

function word(index: number, extra: Partial<WordEntry> = {}): WordEntry {
  return { id: `w${index}`, word: `word${index}`, meaning: `释义${index}`, ...extra } as WordEntry
}
function unit(publisherId: string, bookId: string, index: number): UnitGroup {
  const unitId = `${publisherId}:${bookId}:u${index}`
  return { publisherId, bookId, unitId, unitName: `Unit ${index}`, unitNumber: index, words: [word(index, { unitId })] } as UnitGroup
}

describe('worksheet range and ordering', () => {
  it('keeps books with the same identifier in different publishers separate', () => {
    const current = unit('rj', 'book', 1)
    const next = unit('rj', 'book', 2)
    const units = [next, unit('wy', 'book', 1), unit('rj', 'other', 1), current]
    expect(worksheetBookUnits(units, current)).toEqual([current, next])
    expect(units[0]).toBe(next)
  })

  it('supports more than three units and excludes deselected or stale words', () => {
    const units = Array.from({ length: 6 }, (_, index) => unit('rj', 'book', index + 1))
    const chosen = worksheetSelection(units, units.map(value => value.unitId), ['w6', 'w2', 'w1', 'w3', 'w4', 'w5', 'other'])
    expect(chosen.map(value => value.id)).toEqual(['w1', 'w2', 'w3', 'w4', 'w5', 'w6'])
    expect(worksheetSelection(units, [units[0]!.unitId], ['w1', 'w2'])).toEqual([units[0]!.words[0]])
  })

  it('shuffles a copy and keeps the ordered snapshot stable across pagination', () => {
    const words = Array.from({ length: 60 }, (_, index) => word(index))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const shuffled = shuffleWorksheetWords(words)
      expect(shuffled).not.toEqual(words)
      expect(words[0]!.id).toBe('w0')
      const pages = buildWorksheetPages(shuffled)
      const ids = (kind: string) => pages.filter(page => page.kind === kind).flatMap(page => page.columns.flat().map(row => row.word.id))
      expect(ids('questions')).toEqual(shuffled.map(value => value.id))
      expect(ids('answers')).toEqual(ids('questions'))
      expect(buildWorksheetPages(shuffled)).toEqual(pages)
    } finally { vi.restoreAllMocks() }
  })

  it('uses a short default title when all units are selected', () => {
    const units = Array.from({ length: 6 }, (_, index) => unit('rj', 'book', index + 1))
    expect(worksheetDefaultTitle(units, units.map(value => value.unitId))).toBe('单词默写卷')
    expect(worksheetDefaultTitle(units, [units[0]!.unitId])).toBe('Unit 1 单词默写卷')
  })
})

describe('worksheet pagination', () => {
  it('fits sixty single-line answers on each complete answer page', () => {
    const pages = buildWorksheetPages(Array.from({ length: 61 }, (_, index) => word(index)))
      .filter(page => page.kind === 'answers')
    expect(pages).toHaveLength(2)
    expect(pages[0]!.columns.map(column => column.length)).toEqual([30, 30])
    expect(pages[1]!.columns.flat().map(row => row.number)).toEqual([61])
  })

  it.each([0, 1, 30, 291].flatMap(count => (['zh-en', 'en-zh'] as const).map(mode => ({ count, mode }))))('keeps all $count $mode questions and answers numbered consistently', ({ count, mode }) => {
    const words = Array.from({ length: count }, (_, index) => word(index))
    const pages = buildWorksheetPages(words, mode)
    if (!count) { expect(pages).toEqual([]); return }
    const questions = pages.filter(page => page.kind === 'questions')
    const answers = pages.filter(page => page.kind === 'answers')
    const questionRows = questions.flatMap(page => page.columns.flat())
    const answerRows = answers.flatMap(page => page.columns.flat())
    expect(questionRows.map(row => row.number)).toEqual(Array.from({ length: count }, (_, index) => index + 1))
    expect(answerRows.map(row => row.word.id)).toEqual(words.map(value => value.id))
    expect(answerRows.map(row => row.number)).toEqual(questionRows.map(row => row.number))
    expect(pages.indexOf(answers[0]!)).toBe(questions.length)
    for (const page of pages) for (const column of page.columns) expect(column.reduce((sum, row) => sum + row.height, 0)).toBeLessThanOrEqual(WORKSHEET_BODY_HEIGHT)
  })

  it('wraps full meanings and long answer phrases instead of dropping their ends', () => {
    const meaning = '中文释义'.repeat(20)
    const phrase = 'a long English phrase '.repeat(6)
    const pages = buildWorksheetPages([word(1, { meaning, word: phrase })])
    expect(pages[0]!.columns[0]![0]!.lines.join('')).toBe(meaning)
    expect(pages[1]!.columns[0]![0]!.lines.join('')).toBe(phrase)
    for (const line of pages[1]!.columns[0]![0]!.lines) {
      expect(line.length * 0.54 * 13).toBeLessThanOrEqual(304)
    }
  })

  it('switches prompts and answers together while keeping the same selected words', () => {
    const words = [word(1, { word: 'social', meaning: '社会的；社交的', partOfSpeech: 'adj.' })]
    const chinese = buildWorksheetPages(words, 'zh-en')
    const english = buildWorksheetPages(words, 'en-zh')
    const prompt = (pages: ReturnType<typeof buildWorksheetPages>, index: number) => pages[index]!.columns[0]![0]!.lines.join('')
    expect(prompt(chinese, 0)).toBe('adj. 社会的；社交的')
    expect(prompt(chinese, 1)).toBe('social')
    expect(prompt(english, 0)).toBe('social')
    expect(prompt(english, 1)).toBe('adj. 社会的；社交的')
    expect(chinese.map(page => page.mode)).toEqual(['zh-en', 'zh-en'])
    expect(english.map(page => page.mode)).toEqual(['en-zh', 'en-zh'])
  })

  it('uses two columns of thirty compact questions for short prompts', () => {
    const questions = buildWorksheetPages(Array.from({ length: 61 }, (_, index) => word(index)))
      .filter(page => page.kind === 'questions')
    expect(questions).toHaveLength(2)
    expect(questions[0]!.columns.map(column => column.length)).toEqual([30, 30])
    expect(questions[1]!.columns.flat().map(row => row.number)).toEqual([61])
  })

  it('removes English answer annotations while preserving Chinese notes', () => {
    expect(worksheetPrompt('（pl. stadiums or stadia）体育场；运动场')).toBe('体育场；运动场')
    expect(worksheetPrompt('（forgave, forgiven）原谅；宽恕')).toBe('原谅；宽恕')
    expect(worksheetPrompt('内容；[pl.]目录')).toBe('内容；目录')
    expect(worksheetPrompt('十几岁的（指13至19岁）；青少年的')).toBe('十几岁的（指13至19岁）；青少年的')
  })
})
