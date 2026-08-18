import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isMeaningfulPhrase, suggestClassicPhrase } from '../../scripts/phrase-enrichment.mjs'

const root = path.resolve(import.meta.dirname, '../..')

describe('phrase enrichment', () => {
  it('prefers classic collocations from other textbook banks', () => {
    const phrase = suggestClassicPhrase(root, 'confidence', 'n.', '自信', 'She has great confidence in her ability.')
    expect(phrase?.split('｜')[0]).toMatch(/confidence/i)
    expect(phrase?.split('｜')[0]).not.toBe('a confidence')
  })

  it('extracts location and verb patterns from example sentences', () => {
    expect(suggestClassicPhrase(root, 'campus', 'n.', '校园', 'Students gathered on campus for the festival.')).toContain('on campus')
    expect(suggestClassicPhrase(root, 'intend', 'vt.', '计划', 'I intend to finish the report before Friday.')).toContain('intend to')
    expect(suggestClassicPhrase(root, 'stressful', 'adj.', '充满压力的', 'Exam week can be stressful for many students.')).toContain('be stressful')
  })

  it('does not invent filler article-only phrases', () => {
    expect(suggestClassicPhrase(root, 'piano', 'n.', '钢琴', 'She plays the piano every day.')).toBeUndefined()
    expect(suggestClassicPhrase(root, 'athlete', 'n.', '运动员', 'He is a talented athlete.')).toBeUndefined()
    expect(isMeaningfulPhrase('a piano', 'piano', 'n.')).toBe(false)
    expect(isMeaningfulPhrase('be challenging', 'challenging', 'adj.')).toBe(false)
  })
})
