import { describe, expect, it } from 'vitest'
import {
  isStoredMemoryPlaceholder,
  isStoredPhrasePlaceholder,
  isStoredWordFormPlaceholder,
  sanitizeWordDetailTuple
} from '../../scripts/sanitize-word-detail-fields.mjs'

describe('sanitizeWordDetailTuple', () => {
  it('drops bb excel placeholder fields while keeping real content', () => {
    const tuple = sanitizeWordDetailTuple([
      'forth',
      '/ˈfɔrθ/',
      'adv.',
      '向前；出来',
      1,
      'forth',
      1334,
      'The word “forth” is often used to add detail to a sentence.',
      '副词“forth”（向前）常用于为句子补充更具体的信息。',
      '—（暂无高价值固定搭配）',
      '通常无固定词形变化',
      '—（基础词或无高价值常用拆分）'
    ])

    expect(tuple[9]).toBeUndefined()
    expect(tuple[10]).toBeUndefined()
    expect(tuple[11]).toBeUndefined()
    expect(tuple[7]).toContain('forth')
  })

  it('recognizes stored placeholder patterns', () => {
    expect(isStoredPhrasePlaceholder('—（暂无高价值固定搭配）')).toBe(true)
    expect(isStoredPhrasePlaceholder('look forward to｜期待')).toBe(false)
    expect(isStoredWordFormPlaceholder('通常无固定词形变化')).toBe(true)
    expect(isStoredWordFormPlaceholder('复数：children')).toBe(false)
    expect(isStoredMemoryPlaceholder('—（基础词，无明显常用词根词缀拆分）')).toBe(true)
    expect(isStoredMemoryPlaceholder('构词：register + -ation')).toBe(false)
  })
})
