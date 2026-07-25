import { describe, expect, it } from 'vitest'
import { isPhraseEntry, stripLeadingIrregularVerbNote } from './wordbank'

describe('isPhraseEntry', () => {
  it('treats multi-word collocations as phrases', () => {
    expect(isPhraseEntry('make an impression')).toBe(true)
    expect(isPhraseEntry('what if')).toBe(true)
    expect(isPhraseEntry('seat belt')).toBe(true)
  })

  it('keeps single-word entries', () => {
    expect(isPhraseEntry('exchange')).toBe(false)
    expect(isPhraseEntry('p.m.')).toBe(false)
  })
})

describe('stripLeadingIrregularVerbNote', () => {
  it('removes leading irregular verb notes with English letters', () => {
    expect(stripLeadingIrregularVerbNote('（forgave, forgiven）原谅；宽恕；对不起；请原谅'))
      .toBe('原谅；宽恕；对不起；请原谅')
    expect(stripLeadingIrregularVerbNote('（slid, slid）（使）滑行；滑动'))
      .toBe('（使）滑行；滑动')
    expect(stripLeadingIrregularVerbNote('（bit /bɪt/, bitten /ˈbɪtn/）咬；叮；蜇'))
      .toBe('咬；叮；蜇')
  })

  it('leaves meanings without leading irregular verb notes unchanged', () => {
    expect(stripLeadingIrregularVerbNote('原谅；宽恕')).toBe('原谅；宽恕')
    expect(stripLeadingIrregularVerbNote('（BrE）内裤；短裤')).toBe('（BrE）内裤；短裤')
    expect(stripLeadingIrregularVerbNote('（good 的比较级）较好的；更好的'))
      .toBe('（good 的比较级）较好的；更好的')
    expect(stripLeadingIrregularVerbNote('（also forwards）向前；前进'))
      .toBe('（also forwards）向前；前进')
    expect(stripLeadingIrregularVerbNote('（has /hæz/，是 have 的第三人称单数形式）有；吃；经历'))
      .toBe('（has /hæz/，是 have 的第三人称单数形式）有；吃；经历')
  })
})
