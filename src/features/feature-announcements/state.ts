import type { FeatureAnnouncement } from './types'

export const FEATURE_ANNOUNCEMENT_STORAGE_KEY = 'gotit:featureAnnouncements:seen:v1'
export const FEATURE_ANNOUNCEMENT_NEW_USER_EXCLUSIONS_KEY = 'gotit:featureAnnouncements:newUserExclusions:v1'

interface AnnouncementStorage {
  getStorageSync?: (key: string) => unknown
  setStorageSync?: (key: string, value: unknown) => void
}

const MAX_SEEN_ANNOUNCEMENTS = 50
const memorySeenIds = new Set<string>()
const memoryNewUserExclusionIds = new Set<string>()

function getRuntimeStorage(): AnnouncementStorage | null {
  try {
    return uni as unknown as AnnouncementStorage
  } catch {
    return null
  }
}

function normalizeSeenIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    .slice(-MAX_SEEN_ANNOUNCEMENTS)
}

export function readSeenFeatureAnnouncementIds(storage = getRuntimeStorage()): string[] {
  let storedIds: string[] = []
  try {
    storedIds = normalizeSeenIds(storage?.getStorageSync?.(FEATURE_ANNOUNCEMENT_STORAGE_KEY))
  } catch {
    // The in-memory fallback still prevents repeated presentation this session.
  }

  for (const id of storedIds) memorySeenIds.add(id)
  return [...new Set([...storedIds, ...memorySeenIds])].slice(-MAX_SEEN_ANNOUNCEMENTS)
}

export function readNewUserFeatureAnnouncementExclusions(storage = getRuntimeStorage()): string[] {
  let storedIds: string[] = []
  try {
    storedIds = normalizeSeenIds(storage?.getStorageSync?.(FEATURE_ANNOUNCEMENT_NEW_USER_EXCLUSIONS_KEY))
  } catch {
    // The in-memory fallback keeps this launch in the same audience cohort.
  }

  for (const id of storedIds) memoryNewUserExclusionIds.add(id)
  return [...new Set([...storedIds, ...memoryNewUserExclusionIds])].slice(-MAX_SEEN_ANNOUNCEMENTS)
}

export function captureFeatureAnnouncementAudience(
  announcements: readonly FeatureAnnouncement[],
  storage = getRuntimeStorage()
): void {
  let hasExistingHistory = false
  try {
    const selectedUnitId = storage?.getStorageSync?.('gotit:selectedUnitId')
    hasExistingHistory = storage?.getStorageSync?.('gotit:courseSetupCompleted') === true
      || (typeof selectedUnitId === 'string' && selectedUnitId.length > 0)
  } catch {
    // Missing storage is treated as a new user for an existing-users-only notice.
  }
  if (hasExistingHistory) return

  const excludedIds = readNewUserFeatureAnnouncementExclusions(storage)
  for (const announcement of announcements) {
    if (announcement.existingUsersOnly && !excludedIds.includes(announcement.id)) {
      excludedIds.push(announcement.id)
      memoryNewUserExclusionIds.add(announcement.id)
    }
  }

  try {
    storage?.setStorageSync?.(
      FEATURE_ANNOUNCEMENT_NEW_USER_EXCLUSIONS_KEY,
      excludedIds.slice(-MAX_SEEN_ANNOUNCEMENTS)
    )
  } catch {
    // The in-memory audience decision remains active for this launch.
  }
}

export function markFeatureAnnouncementSeen(
  id: string,
  storage = getRuntimeStorage()
): void {
  if (!id) return

  memorySeenIds.add(id)
  const seenIds = readSeenFeatureAnnouncementIds(storage)
  if (!seenIds.includes(id)) seenIds.push(id)
  const compactIds = seenIds.slice(-MAX_SEEN_ANNOUNCEMENTS)

  try {
    storage?.setStorageSync?.(FEATURE_ANNOUNCEMENT_STORAGE_KEY, compactIds)
  } catch {
    // The in-memory fallback remains active for this app session.
  }
}

export function findNextFeatureAnnouncement(
  announcements: readonly FeatureAnnouncement[],
  seenIds = readSeenFeatureAnnouncementIds(),
  newUserExclusionIds = readNewUserFeatureAnnouncementExclusions()
): FeatureAnnouncement | null {
  const seen = new Set(seenIds)
  const newUserExclusions = new Set(newUserExclusionIds)
  return announcements.find(announcement => (
    announcement.enabled
    && !seen.has(announcement.id)
    && (!announcement.existingUsersOnly || !newUserExclusions.has(announcement.id))
  )) ?? null
}

export function resetFeatureAnnouncementMemoryForTests(): void {
  memorySeenIds.clear()
  memoryNewUserExclusionIds.clear()
}
