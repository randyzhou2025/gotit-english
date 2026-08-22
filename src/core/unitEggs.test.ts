import { describe, expect, it } from 'vitest'
import {
  getUnitEggContrastNotes,
  getUnitEggForDate,
  getUnitEggs,
  unitEggDatasetMeta
} from './unitEggs'

describe('unit egg dataset', () => {
  it('loads every junior-high and high-school workbook record', () => {
    expect(unitEggDatasetMeta.recordCount).toBe(1815)
    expect(unitEggDatasetMeta.unitCount).toBe(366)
    expect(getUnitEggs('rj:required-1:uwelcome')).toHaveLength(6)
    expect(getUnitEggs('ylj:selective-required-4:u4')).toHaveLength(5)
    expect(getUnitEggs('rj:grade-7-1:ustarter-1')).toHaveLength(2)
    expect(getUnitEggs('wyx:grade-7-1:ustarter')).toHaveLength(4)
    expect(getUnitEggs('shjx:grade-6-1:u1')).toHaveLength(4)
    expect(getUnitEggs('ylj:grade-9-1:u1')).toHaveLength(4)
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
