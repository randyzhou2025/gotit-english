import { describe, expect, it } from 'vitest'
import { checkSpelling, normalizeSpelling } from './spelling'

describe('spelling', () => {
  it('normalizes case, whitespace, apostrophes and accents', () => {
    expect(normalizeSpelling('  Café  ')).toBe('cafe')
    expect(normalizeSpelling('rock  ’n’  roll')).toBe("rock 'n' roll")
  })

  it('checks spelling against normalized textbook word', () => {
    expect(checkSpelling('CAFE', { word: 'café' }).correct).toBe(true)
    expect(checkSpelling('note book', { word: 'notebook' }).correct).toBe(false)
  })
})

