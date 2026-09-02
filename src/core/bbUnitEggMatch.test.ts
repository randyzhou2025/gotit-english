import { describe, expect, it } from 'vitest'
import {
  buildTextbookEggIndex,
  matchEggsForUnit,
  normalizeMatchKey,
  pickBestEgg
} from '../../scripts/bb-unit-egg-match.mjs'

describe('bb unit egg keyword matching', () => {
  it('normalizes match keys case-insensitively', () => {
    expect(normalizeMatchKey(' Accept ')).toBe('accept')
  })

  it('picks the richer egg when multiple textbook sources match', () => {
    const best = pickBestEgg([
      {
        template: 'A',
        keyword: 'accept',
        title: 'A',
        core: 'accept',
        explanation: '',
        memory: '',
        compare: '',
        phonetic: ''
      },
      {
        template: 'B',
        keyword: 'accept',
        title: 'Accept or receive?',
        core: 'accept',
        explanation: 'accept 是主动接受；receive 是客观收到',
        memory: '主动接受用 accept',
        compare: 'receive',
        phonetic: '/əkˈsept/'
      }
    ])

    expect(best?.template).toBe('B')
  })

  it('matches eggs via compare field when keyword is absent from the unit', () => {
    const index = buildTextbookEggIndex(new Map([
      ['rj', {
        byUnit: {
          'rj:required-1:u1': [{
            template: 'J',
            keyword: 'flight',
            title: 'Fly or flight?',
            core: 'flight',
            explanation: 'fly 是动词；flight 是名词',
            memory: '',
            compare: 'fly',
            phonetic: ''
          }]
        }
      }]
    ]), new Set(['rj']))

    expect(matchEggsForUnit(['fly'], index).map(egg => egg.keyword)).toEqual(['flight'])
  })

  it('matches eggs in unit word order and dedupes by keyword', () => {
    const index = buildTextbookEggIndex(new Map([
      ['rj', {
        byUnit: {
          'rj:required-1:u1': [{
            template: 'A',
            keyword: 'accept',
            title: 'Accept',
            core: 'accept',
            explanation: '主动接受',
            memory: '',
            compare: '',
            phonetic: ''
          }],
          'rj:required-2:u2': [{
            template: 'B',
            keyword: 'account',
            title: 'Account',
            core: 'account',
            explanation: '账户',
            memory: '',
            compare: '',
            phonetic: ''
          }]
        }
      }]
    ]), new Set(['rj']))

    expect(matchEggsForUnit(['account', 'accept', 'account'], index).map(egg => egg.keyword)).toEqual([
      'account',
      'accept'
    ])
  })
})
