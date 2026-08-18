import { describe, expect, it } from 'vitest'
import { splitMeaningByPartOfSpeech } from './wordMeaning'

describe('splitMeaningByPartOfSpeech', () => {
  it('keeps single part of speech on one line', () => {
    expect(splitMeaningByPartOfSpeech('n.', '交换；交流')).toEqual([
      { partOfSpeech: 'n.', meaning: '交换；交流' }
    ])
  })

  it('splits duplicated rj noun/verb meanings', () => {
    expect(splitMeaningByPartOfSpeech('n.; vt.', '交换；交流；交换；交流；交易；兑换')).toEqual([
      { partOfSpeech: 'n.', meaning: '交换；交流' },
      { partOfSpeech: 'vt.', meaning: '交换；交流；交易；兑换' }
    ])
  })

  it('splits noun/verb pairs with four segments', () => {
    expect(splitMeaningByPartOfSpeech('n.; v.', '搭档；同伴；配偶；结成伙伴')).toEqual([
      { partOfSpeech: 'n.', meaning: '搭档；同伴；配偶' },
      { partOfSpeech: 'v.', meaning: '结成伙伴' }
    ])
    expect(splitMeaningByPartOfSpeech('n.; v.', '义务工作者；志愿者；自愿做；义务做')).toEqual([
      { partOfSpeech: 'n.', meaning: '义务工作者；志愿者' },
      { partOfSpeech: 'v.', meaning: '自愿做；义务做' }
    ])
  })

  it('splits noun/adjective pairs with three segments', () => {
    expect(splitMeaningByPartOfSpeech('n.; adj.', '塑料；塑料制的；塑料的')).toEqual([
      { partOfSpeech: 'n.', meaning: '塑料' },
      { partOfSpeech: 'adj.', meaning: '塑料制的；塑料的' }
    ])
  })

  it('maps one segment per tag when counts match', () => {
    expect(splitMeaningByPartOfSpeech('v.; n.', '闲聊；聊天')).toEqual([
      { partOfSpeech: 'v.', meaning: '闲聊' },
      { partOfSpeech: 'n.', meaning: '聊天' }
    ])
  })

  it('repeats shared meaning for multiple tags when only one segment exists', () => {
    expect(splitMeaningByPartOfSpeech('n.; adj.', '值得做的')).toEqual([
      { partOfSpeech: 'n.', meaning: '值得做的' },
      { partOfSpeech: 'adj.', meaning: '值得做的' }
    ])
  })

  it('respects parentheses when splitting meaning segments', () => {
    expect(splitMeaningByPartOfSpeech('v.; n.', '把……归咎于；指责；（坏事或错事的）责任；指责')).toEqual([
      { partOfSpeech: 'v.', meaning: '把……归咎于；指责' },
      { partOfSpeech: 'n.', meaning: '（坏事或错事的）责任；指责' }
    ])
  })

  it('splits adjective/noun pairs by 的 vs noun glosses', () => {
    expect(splitMeaningByPartOfSpeech(
      'adj.; n.',
      '职业的，专业的；有职业的；娴熟的，精通业务的；专门人员，专业人士'
    )).toEqual([
      { partOfSpeech: 'adj.', meaning: '职业的，专业的；有职业的；娴熟的，精通业务的' },
      { partOfSpeech: 'n.', meaning: '专门人员，专业人士' }
    ])
  })

  it('aligns three-or-more tags by meaning instead of even chunks', () => {
    expect(splitMeaningByPartOfSpeech(
      'adj.；n.；linking v.；vt.',
      '相等的；平等的；相当的；同等的人 （物）；与……相等；比得上'
    )).toEqual([
      { partOfSpeech: 'adj.', meaning: '相等的；平等的；相当的' },
      { partOfSpeech: 'n.', meaning: '同等的人 （物）' },
      { partOfSpeech: 'linking v.', meaning: '与……相等' },
      { partOfSpeech: 'vt.', meaning: '比得上' }
    ])

    expect(splitMeaningByPartOfSpeech(
      'adj.; n.; vi.',
      '主要的；重要的；大的；主修课程；主修学生；主修；专门研究'
    )).toEqual([
      { partOfSpeech: 'adj.', meaning: '主要的；重要的；大的' },
      { partOfSpeech: 'n.', meaning: '主修课程；主修学生' },
      { partOfSpeech: 'vi.', meaning: '主修；专门研究' }
    ])

    expect(splitMeaningByPartOfSpeech(
      'n.; adj.; prep.',
      '过去；过去的事情；过去的；在……之后'
    )).toEqual([
      { partOfSpeech: 'n.', meaning: '过去；过去的事情' },
      { partOfSpeech: 'adj.', meaning: '过去的' },
      { partOfSpeech: 'prep.', meaning: '在……之后' }
    ])
  })

  it('drops unmatched extra tags instead of leaving empty lines', () => {
    expect(splitMeaningByPartOfSpeech(
      'adj.；adv.；n.',
      '附近的，邻近的；在附近，不远'
    )).toEqual([
      { partOfSpeech: 'adj.', meaning: '附近的，邻近的' },
      { partOfSpeech: 'adv.', meaning: '在附近，不远' }
    ])
  })

  it('keeps noun lecture glosses off the verb line', () => {
    expect(splitMeaningByPartOfSpeech(
      'n.；vi.；vt.',
      '讲座，演讲；教训，训斥；开讲座，讲课；指责，训斥'
    )).toEqual([
      { partOfSpeech: 'n.', meaning: '讲座，演讲；教训，训斥' },
      { partOfSpeech: 'vi.', meaning: '开讲座，讲课' },
      { partOfSpeech: 'vt.', meaning: '指责，训斥' }
    ])
  })

  it('assigns own verbs to v. instead of pron.', () => {
    expect(splitMeaningByPartOfSpeech(
      'adj.; pron.; v.',
      '自己的；本人的；拥有；有；承担；负责'
    )).toEqual([
      { partOfSpeech: 'adj.', meaning: '自己的；本人的' },
      { partOfSpeech: 'v.', meaning: '拥有；有；承担；负责' }
    ])
  })

  it('does not split inflection commas inside POS parentheses', () => {
    expect(splitMeaningByPartOfSpeech(
      'v. (smelt /smelt/, smelt; smelled, smelled); n.',
      '闻到；发出……气味；气味；臭味'
    )).toEqual([
      { partOfSpeech: 'v. (smelt /smelt/, smelt; smelled, smelled)', meaning: '闻到；发出……气味' },
      { partOfSpeech: 'n.', meaning: '气味；臭味' }
    ])
  })
})
