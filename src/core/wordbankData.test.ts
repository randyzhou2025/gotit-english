import { describe, expect, it } from 'vitest'
import manifest from '@/data/wordbank.manifest.json'

describe('generated wordbank manifest', () => {
  it('keeps Yilin senior and junior books under one publisher', () => {
    const yljPublishers = manifest.publishers.filter(entry => entry.publisher.id === 'ylj')
    const ylj = yljPublishers[0]

    expect(yljPublishers).toHaveLength(1)
    expect(ylj?.sourceWorkbook).toBe('译林版高中英语全7册_词汇表.xlsx')
    expect(ylj?.books.slice(0, 7).map(book => book.id)).toEqual([
      'required-1',
      'required-2',
      'required-3',
      'selective-required-1',
      'selective-required-2',
      'selective-required-3',
      'selective-required-4'
    ])
    expect(ylj?.books.slice(0, 7).flatMap(book => book.units)).toHaveLength(28)
    expect(ylj?.books.slice(0, 7).flatMap(book => book.units)
      .reduce((sum, unit) => sum + unit.wordCount, 0)).toBe(1864)
    expect(ylj?.books.slice(7).map(book => book.id)).toEqual([
      'grade-7-1',
      'grade-7-2',
      'grade-8-1',
      'grade-8-2',
      'grade-9-1',
      'grade-9-2'
    ])
  })

  it('includes all seven Foreign Language Teaching and Research Press senior books', () => {
    const wyPublishers = manifest.publishers.filter(entry => entry.publisher.id === 'wy')
    const wy = wyPublishers[0]

    expect(wyPublishers).toHaveLength(1)
    expect(wy?.publisher.name).toBe('外研社版')
    expect(wy?.sourceWorkbook).toBe('外研社版高中英语全7册_词汇表.xlsx')
    expect(wy?.books.map(book => book.id)).toEqual([
      'required-1',
      'required-2',
      'required-3',
      'selective-required-1',
      'selective-required-2',
      'selective-required-3',
      'selective-required-4'
    ])
    expect(wy?.books.flatMap(book => book.units)).toHaveLength(42)
    expect(wy?.books.flatMap(book => book.units)
      .reduce((sum, unit) => sum + unit.wordCount, 0)).toBe(2030)
  })
})
