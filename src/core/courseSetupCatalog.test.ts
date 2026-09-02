import { describe, expect, it } from 'vitest'
import bundledManifest from '@/data/wordbank.manifest.json'
import {
  buildCourseSetupPublisherOptions,
  buildCourseSetupUnitOptions,
  buildUnitId,
  formatCourseSetupBookName,
  isUnitIdInCatalog
} from './courseSetupCatalog'
import type { WordbankManifest } from './wordbankLoader'

const manifest = bundledManifest as WordbankManifest

describe('courseSetupCatalog', () => {
  it('lists all senior publishers from manifest without loading word blocks', () => {
    const publishers = buildCourseSetupPublisherOptions(manifest, '高中', '')
    const ids = publishers.map(option => option.id)

    expect(ids).toContain('rj')
    expect(ids).toContain('bsd')
    expect(ids).toContain('shj')
    expect(publishers.length).toBeGreaterThan(3)
  })

  it('builds stable unit ids that match wordbank loader format', () => {
    const unitId = buildUnitId('rj', 'required-1', { key: 'welcome', number: 0 })
    expect(unitId).toBe('rj:required-1:uwelcome')
    expect(isUnitIdInCatalog(manifest, unitId)).toBe(true)
  })

  it('lists every unit for a senior book from manifest', () => {
    const units = buildCourseSetupUnitOptions(manifest, '高中', '', 'bsd', 'required-1', new Set())
    expect(units.map(unit => unit.name)).toEqual(['Unit 1', 'Unit 2', 'Unit 3'])
    expect(units[0]?.count).toBe(115)
  })

  it('lists bb senior and bb junior publishers for exam prep grades', () => {
    const seniorPublishers = buildCourseSetupPublisherOptions(manifest, '高中', '')
    expect(seniorPublishers.map(option => option.id)).toContain('bb-senior')

    const juniorPublishers = buildCourseSetupPublisherOptions(manifest, '初中', '中考')
    expect(juniorPublishers.map(option => option.id)).toContain('bb-junior')
    expect(juniorPublishers.some(option => option.id === 'rj')).toBe(false)
  })

  it('shortens bb book names for the course setup chips', () => {
    expect(formatCourseSetupBookName('高考3500词·随机')).toBe('随机')
    expect(formatCourseSetupBookName('中考2000词·顺序')).toBe('顺序')
  })
})
