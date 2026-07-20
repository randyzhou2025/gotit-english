import { describe, expect, it } from 'vitest'
import {
  buildWordDetailMemoryLines,
  isWordFormPlaceholderLine,
  parseWordDetailPhrases,
  parseWordDetailWordForms
} from './wordDetailExtras'

describe('wordDetailExtras', () => {
  it('filters placeholder word form lines', () => {
    expect(isWordFormPlaceholderLine('通常无规则比较级和最高级')).toBe(true)
    expect(isWordFormPlaceholderLine('adj. 通常无比较级和最高级')).toBe(true)
    expect(isWordFormPlaceholderLine('复数：exchanges')).toBe(false)
    expect(isWordFormPlaceholderLine('第三人称单数：registers')).toBe(false)
  })

  it('parses phrase lines', () => {
    expect(parseWordDetailPhrases('exchange students｜交换学生\ngave lecture｜讲座')).toEqual([
      { phrase: 'exchange students', gloss: '交换学生' },
      { phrase: 'gave lecture', gloss: '讲座' }
    ])
  })

  it('keeps concrete word forms and drops placeholders', () => {
    expect(parseWordDetailWordForms([
      '复数：exchanges',
      '第三人称单数：exchanges',
      '现在分词：exchanging',
      '过去式：exchanged',
      '过去分词：exchanged',
      'adj. 通常无比较级和最高级'
    ].join('\n'))).toEqual([
      '复数：exchanges',
      '第三人称单数：exchanges',
      '现在分词：exchanging',
      '过去式：exchanged',
      '过去分词：exchanged'
    ])
  })

  it('builds memory lines from etymology cognates and antonyms', () => {
    expect(buildWordDetailMemoryLines({
      etymology: '构词：register（登记；注册）+ -ation（动作；过程）',
      cognates: 'register v. 登记',
      antonyms: 'usual adj. 通常的'
    })).toEqual([
      { label: '词根词缀', text: '构词：register（登记；注册）+ -ation（动作；过程）' },
      { label: '同源词', text: 'register v. 登记' },
      { label: '反义词', text: 'usual adj. 通常的' }
    ])
  })
})
