import type { ProgressSnapshot } from '@/core/userSession'

function uniqueWordIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(id => typeof id === 'string' && id.length > 0)))
}

function parseTime(value: string | undefined): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

export function mergeProgress(local: ProgressSnapshot, remote: ProgressSnapshot): ProgressSnapshot {
  const localUpdatedAt = parseTime(local.updatedAt)
  const remoteUpdatedAt = parseTime(remote.updatedAt)
  const mergedUpdatedAtMs = Math.max(localUpdatedAt, remoteUpdatedAt, Date.now())

  let selectedUnitId = local.selectedUnitId
  if (remote.selectedUnitId) {
    if (!local.selectedUnitId || remoteUpdatedAt >= localUpdatedAt) {
      selectedUnitId = remote.selectedUnitId
    }
  }

  return {
    masteredWordIds: uniqueWordIds([...local.masteredWordIds, ...remote.masteredWordIds]),
    savedWeakWordIds: uniqueWordIds([...local.savedWeakWordIds, ...remote.savedWeakWordIds]),
    selectedUnitId,
    courseSetupCompleted: Boolean(local.courseSetupCompleted || remote.courseSetupCompleted),
    updatedAt: new Date(mergedUpdatedAtMs).toISOString()
  }
}

export function readLocalProgressSnapshot(): ProgressSnapshot {
  const readIds = (key: string) => {
    try {
      const saved = uni.getStorageSync(key)
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []
    } catch {
      return []
    }
  }

  let selectedUnitId = ''
  try {
    const saved = uni.getStorageSync('gotit:selectedUnitId')
    selectedUnitId = typeof saved === 'string' ? saved : ''
  } catch {
    selectedUnitId = ''
  }

  let courseSetupCompleted = Boolean(selectedUnitId)
  if (!courseSetupCompleted) {
    try {
      courseSetupCompleted = uni.getStorageSync('gotit:courseSetupCompleted') === true
    } catch {
      courseSetupCompleted = false
    }
  }

  let updatedAt = ''
  try {
    const saved = uni.getStorageSync('gotit:progress:updatedAt')
    updatedAt = typeof saved === 'string' ? saved : ''
  } catch {
    updatedAt = ''
  }

  return {
    masteredWordIds: readIds('gotit:masteredWordIds'),
    savedWeakWordIds: readIds('gotit:savedWeakWordIds'),
    selectedUnitId,
    courseSetupCompleted,
    updatedAt
  }
}

export function writeLocalProgressSnapshot(snapshot: ProgressSnapshot) {
  try {
    uni.setStorageSync('gotit:masteredWordIds', snapshot.masteredWordIds)
    uni.setStorageSync('gotit:savedWeakWordIds', snapshot.savedWeakWordIds)
    uni.setStorageSync('gotit:selectedUnitId', snapshot.selectedUnitId)
    uni.setStorageSync('gotit:courseSetupCompleted', snapshot.courseSetupCompleted)
    uni.setStorageSync('gotit:progress:updatedAt', snapshot.updatedAt)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
}
