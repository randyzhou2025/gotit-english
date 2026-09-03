import { afterEach, describe, expect, it, vi } from 'vitest'
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

describe('public app config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns the remote announcement switch when the API responds', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test')
    vi.stubGlobal('uni', {
      request: vi.fn().mockResolvedValue({
        statusCode: 200,
        data: {
          customerServiceQrUrl: '',
          icpNumber: '',
          analyticsEnabled: true,
          featureAnnouncementsEnabled: false
        }
      })
    })
    const { fetchPublicConfig } = await import('./userSession')

    expect(await fetchPublicConfig()).toMatchObject({
      analyticsEnabled: true,
      featureAnnouncementsEnabled: false
    })
  })

  it('keeps announcements enabled while the public API is rolling out the new switch', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test')
    vi.stubGlobal('uni', {
      request: vi.fn().mockResolvedValue({
        statusCode: 200,
        data: {
          customerServiceQrUrl: '',
          icpNumber: '',
          analyticsEnabled: true
        }
      })
    })
    const { fetchPublicConfig } = await import('./userSession')

    expect(await fetchPublicConfig()).toMatchObject({
      analyticsEnabled: true,
      featureAnnouncementsEnabled: true
    })
  })

  it('fails closed for announcements when the configured API is unavailable', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test')
    vi.stubGlobal('uni', {
      request: vi.fn().mockRejectedValue(new Error('offline'))
    })
    const { fetchPublicConfig } = await import('./userSession')

    expect(await fetchPublicConfig()).toMatchObject({
      analyticsEnabled: true,
      featureAnnouncementsEnabled: false
    })
  })
})
