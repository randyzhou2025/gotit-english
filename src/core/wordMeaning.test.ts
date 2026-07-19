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
})
