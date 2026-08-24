import { describe, expect, it } from 'vitest'
import {
  buildUnitChallengePath,
  buildUnitChallengeTitle,
  readUnitChallengeId,
  UNIT_CHALLENGE_ROUTE
} from './unitChallenge'

describe('unit challenge sharing', () => {
  it('builds a share path with only the opaque share token', () => {
    const token = 'opaque_share_token-123'
    const path = buildUnitChallengePath(token)

    expect(path).toBe(`${UNIT_CHALLENGE_ROUTE}?token=opaque_share_token-123`)
    expect(readUnitChallengeId({
      token: 'opaque_share_token-123'
    })).toBe(token)
    expect(path).not.toContain('userId')
    expect(path).not.toContain('unitId')
  })

  it('ignores links without a share token', () => {
    expect(readUnitChallengeId({ unitId: 'rj:required-1:u1' })).toBe('')
    expect(buildUnitChallengePath('')).toBe(UNIT_CHALLENGE_ROUTE)
  })

  it('names the shared textbook and unit in the card title', () => {
    expect(buildUnitChallengeTitle({
      unitId: 'rj:required-1:u1',
      bookName: '必修第一册',
      unitName: 'Unit 1'
    })).toBe('我刚完成 Unit 1，你也来挑战一下')
  })
})
