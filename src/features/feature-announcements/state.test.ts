import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FEATURE_ANNOUNCEMENTS } from './catalog'
import {
  FEATURE_ANNOUNCEMENT_NEW_USER_EXCLUSIONS_KEY,
  FEATURE_ANNOUNCEMENT_STORAGE_KEY,
  captureFeatureAnnouncementAudience,
  findNextFeatureAnnouncement,
  markFeatureAnnouncementSeen,
  readSeenFeatureAnnouncementIds,
  resetFeatureAnnouncementMemoryForTests
} from './state'

describe('feature announcement state', () => {
  const storage = new Map<string, unknown>()
  const runtime = {
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value))
  }

  beforeEach(() => {
    storage.clear()
    runtime.getStorageSync.mockClear()
    runtime.setStorageSync.mockClear()
    resetFeatureAnnouncementMemoryForTests()
  })

  it('returns the first enabled announcement the user has not seen', () => {
    const announcements = [
      { ...FEATURE_ANNOUNCEMENTS[0]!, id: 'disabled', enabled: false },
      { ...FEATURE_ANNOUNCEMENTS[0]!, id: 'seen' },
      { ...FEATURE_ANNOUNCEMENTS[0]!, id: 'next' }
    ]

    expect(findNextFeatureAnnouncement(announcements, ['seen'])?.id).toBe('next')
  })

  it('persists a stable id once and then suppresses that announcement', () => {
    const announcement = FEATURE_ANNOUNCEMENTS[0]!

    markFeatureAnnouncementSeen(announcement.id, runtime)
    markFeatureAnnouncementSeen(announcement.id, runtime)

    expect(storage.get(FEATURE_ANNOUNCEMENT_STORAGE_KEY)).toEqual([announcement.id])
    expect(readSeenFeatureAnnouncementIds(runtime)).toEqual([announcement.id])
    expect(findNextFeatureAnnouncement([announcement], [announcement.id])).toBeNull()
  })

  it('keeps an in-memory seen state when local storage is unavailable', () => {
    const unavailableRuntime = {
      getStorageSync: () => { throw new Error('unavailable') },
      setStorageSync: () => { throw new Error('unavailable') }
    }
    const announcement = FEATURE_ANNOUNCEMENTS[0]!

    markFeatureAnnouncementSeen(announcement.id, unavailableRuntime)

    expect(readSeenFeatureAnnouncementIds(unavailableRuntime)).toContain(announcement.id)
  })

  it('keeps catalog ids unique and points the first notice at the real course page', () => {
    const ids = FEATURE_ANNOUNCEMENTS.map(announcement => announcement.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(FEATURE_ANNOUNCEMENTS[0]?.primaryAction).toMatchObject({
      type: 'navigateTo',
      url: '/pages/course/index'
    })
  })

  it('permanently excludes an existing-users-only notice for a new user', () => {
    const announcement = { ...FEATURE_ANNOUNCEMENTS[0]!, existingUsersOnly: true }

    captureFeatureAnnouncementAudience([announcement], runtime)

    expect(storage.get(FEATURE_ANNOUNCEMENT_NEW_USER_EXCLUSIONS_KEY)).toEqual([announcement.id])
    expect(findNextFeatureAnnouncement([announcement], [], [announcement.id])).toBeNull()
  })

  it('keeps an existing-users-only notice eligible for a returning user', () => {
    const announcement = { ...FEATURE_ANNOUNCEMENTS[0]!, existingUsersOnly: true }
    storage.set('gotit:courseSetupCompleted', true)

    captureFeatureAnnouncementAudience([announcement], runtime)

    expect(storage.get(FEATURE_ANNOUNCEMENT_NEW_USER_EXCLUSIONS_KEY)).toBeUndefined()
    expect(findNextFeatureAnnouncement([announcement], [], [])?.id).toBe(announcement.id)
  })

  it('shows an excluded notice when its existing-users-only switch is turned off', () => {
    const announcement = { ...FEATURE_ANNOUNCEMENTS[0]!, existingUsersOnly: false }

    expect(findNextFeatureAnnouncement([announcement], [], [announcement.id])?.id).toBe(announcement.id)
  })
})
