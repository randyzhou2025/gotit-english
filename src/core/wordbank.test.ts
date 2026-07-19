import { describe, expect, it } from 'vitest'
import { isPhraseEntry } from './wordbank'

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
