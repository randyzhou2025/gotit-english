import { describe, expect, it } from 'vitest'
import { SCORE_POSTER_QUOTES, formatScorePosterDate, pickScorePosterQuote } from './scorePosterCopy'

describe('score poster copy', () => {
  it('offers ten compact English quotes', () => {
    expect(SCORE_POSTER_QUOTES).toHaveLength(10)
    expect(SCORE_POSTER_QUOTES.every(({ lines, author }) => lines.every(Boolean) && Boolean(author))).toBe(true)
    expect(Math.max(...SCORE_POSTER_QUOTES.flatMap(({ lines }) => lines.map(line => line.length)))).toBeLessThanOrEqual(30)
  })

  it('avoids showing the same quote twice in a row', () => {
    const first = pickScorePosterQuote(-1, 0)
    const second = pickScorePosterQuote(first.index, 0)
    expect(second.index).not.toBe(first.index)
  })

  it('formats the date in English', () => {
    expect(formatScorePosterDate(new Date(2026, 8, 5))).toBe('05 Sep 2026')
  })
})
