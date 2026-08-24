import { describe, expect, it } from 'vitest'
import {
  isDefaultGeneratedNickname,
  shouldShowProfileEditHint,
  type UserProfile
} from './userSession'

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  nickname: '星野',
  isDefaultNickname: true,
  avatarUrl: '',
  createdAt: '2026-08-24T00:00:00.000Z',
  ...overrides
})

describe('default nickname profile state', () => {
  it('uses the persisted default flag for newly generated Chinese nicknames', () => {
    expect(shouldShowProfileEditHint(profile())).toBe(true)
    expect(shouldShowProfileEditHint(profile({ isDefaultNickname: false }))).toBe(false)
    expect(shouldShowProfileEditHint(profile({ avatarUrl: 'https://example.com/avatar.jpg' }))).toBe(false)
  })

  it('keeps compatibility with cached profiles from before the flag existed', () => {
    expect(isDefaultGeneratedNickname('课本单词通_ab123')).toBe(true)
    expect(isDefaultGeneratedNickname('自定义昵称')).toBe(false)
  })
})
