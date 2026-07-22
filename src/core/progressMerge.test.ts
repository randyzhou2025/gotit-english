import { describe, expect, it } from 'vitest'
import { mergeProgress } from '@/core/progressMerge'

describe('mergeProgress', () => {
  it('unions word ids and picks newer selectedUnitId', () => {
    const local = {
      masteredWordIds: ['a', 'b'],
      savedWeakWordIds: ['c'],
      selectedUnitId: 'unit-local',
      courseSetupCompleted: false,
      updatedAt: '2026-07-20T10:00:00.000Z'
    }
    const remote = {
      masteredWordIds: ['b', 'd'],
      savedWeakWordIds: ['e'],
      selectedUnitId: 'unit-remote',
      courseSetupCompleted: true,
      updatedAt: '2026-07-21T10:00:00.000Z'
    }

    const merged = mergeProgress(local, remote)
    expect(merged.masteredWordIds.sort()).toEqual(['a', 'b', 'd'])
    expect(merged.savedWeakWordIds.sort()).toEqual(['c', 'e'])
    expect(merged.selectedUnitId).toBe('unit-remote')
    expect(merged.courseSetupCompleted).toBe(true)
    expect(Date.parse(merged.updatedAt)).toBeGreaterThanOrEqual(Date.parse(remote.updatedAt))
  })

  it('keeps local selectedUnitId when local is newer', () => {
    const local = {
      masteredWordIds: [],
      savedWeakWordIds: [],
      selectedUnitId: 'unit-local',
      courseSetupCompleted: true,
      updatedAt: '2026-07-22T10:00:00.000Z'
    }
    const remote = {
      masteredWordIds: [],
      savedWeakWordIds: [],
      selectedUnitId: 'unit-remote',
      courseSetupCompleted: false,
      updatedAt: '2026-07-21T10:00:00.000Z'
    }

    expect(mergeProgress(local, remote).selectedUnitId).toBe('unit-local')
  })
})
