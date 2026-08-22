import { describe, expect, it } from 'vitest'
import {
  getUnitEggContrastNotes,
  getUnitEggForDate,
  getUnitEggs,
  unitEggDatasetMeta
} from './unitEggs'

describe('unit egg dataset', () => {
  it('loads every workbook record and covered high-school unit', () => {
    expect(unitEggDatasetMeta.recordCount).toBe(1064)
    expect(unitEggDatasetMeta.unitCount).toBe(183)
    expect(getUnitEggs('rj:required-1:uwelcome')).toHaveLength(6)
    expect(getUnitEggs('ylj:selective-required-4:u4')).toHaveLength(5)
  })

  it('does not invent eggs for uncovered junior-high units', () => {
    expect(getUnitEggs('ylj:grade-9-1:u1')).toEqual([])
    expect(getUnitEggForDate('ylj:grade-9-1:u1', new Date(2026, 7, 20))).toBeNull()
  })

  it('keeps the same unit egg stable throughout a local calendar day', () => {
    const morning = getUnitEggForDate('rj:required-1:u1', new Date(2026, 7, 20, 8, 0))
    const evening = getUnitEggForDate('rj:required-1:u1', new Date(2026, 7, 20, 21, 30))

    expect(morning).not.toBeNull()
    expect(evening?.id).toBe(morning?.id)
  })

  it('does not match breath inside breathe when splitting contrast notes', () => {
    expect(getUnitEggContrastNotes(
      'breathe 是动词“呼吸”；breath 是名词“呼吸”',
      'breathe',
      'breath'
    )).toEqual(['动词呼吸', '名词呼吸'])
  })
})
