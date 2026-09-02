import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import unitEggManifest from '@/data/unit-eggs.manifest.json'
import {
  getUnitEggContrastNotes,
  getUnitEggForDate,
  getUnitEggs,
  resetUnitEggCacheForTests,
  unitEggDatasetMeta,
  type UnitEgg
} from './unitEggs'

const UNIT_ID = 'rj:required-1:u1'

function publisherPayload(version = unitEggDatasetMeta.version) {
  const eggs: UnitEgg[] = [
    {
      template: 'A',
      keyword: 'accept',
      title: 'Accept or receive?',
      core: 'accept',
      explanation: 'accept 是主动接受；receive 是客观收到',
      memory: '主动接受用 accept',
      compare: 'receive',
      phonetic: '/əkˈsept/'
    },
    {
      template: 'B',
      keyword: 'affect',
      title: 'Affect or effect?',
      core: 'affect',
      explanation: 'affect 常作动词；effect 常作名词',
      memory: 'Affect is an action',
      compare: 'effect',
      phonetic: '/əˈfekt/'
    }
  ]

  return {
    version,
    publisherId: 'rj',
    byUnit: {
      [UNIT_ID]: eggs
    }
  }
}

describe('unit egg publisher loading', () => {
  let storage: Map<string, unknown>
  let requestMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    storage = new Map()
    requestMock = vi.fn((options: { success: (response: { statusCode: number, data: unknown }) => void }) => {
      options.success({ statusCode: 200, data: publisherPayload() })
    })
    resetUnitEggCacheForTests()
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
      setStorageSync: vi.fn((key: string, value: unknown) => {
        storage.set(key, value)
      }),
      request: requestMock
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    resetUnitEggCacheForTests()
  })

  it('keeps the generated dataset totals in the bundled manifest', () => {
    const manifest = unitEggManifest as { publishers: Array<{ id: string }> }
    expect(unitEggDatasetMeta.recordCount).toBeGreaterThan(1815)
    expect(unitEggDatasetMeta.unitCount).toBeGreaterThan(366)
    expect(manifest.publishers.some(entry => entry.id === 'bb-junior')).toBe(true)
    expect(manifest.publishers.some(entry => entry.id === 'bb-senior')).toBe(true)
  })

  it('loads bb publisher eggs by unit id', async () => {
    requestMock.mockImplementationOnce((options: { success: (response: { statusCode: number, data: unknown }) => void }) => {
      options.success({
        statusCode: 200,
        data: {
          version: unitEggDatasetMeta.version,
          publisherId: 'bb-senior',
          byUnit: {
            'bb-senior:alpha:u01': [{
              template: 'A',
              keyword: 'accept',
              title: 'Accept',
              core: 'accept',
              explanation: '主动接受',
              memory: '',
              compare: '',
              phonetic: '/əkˈsept/'
            }]
          }
        }
      })
    })

    const eggs = await getUnitEggs('bb-senior:alpha:u01')
    expect(eggs).toHaveLength(1)
    expect(requestMock.mock.calls[0]?.[0].url).toMatch(/\/bb-senior\.json\?v=/)
  })

  it('loads only the publisher for the selected unit and caches it', async () => {
    const eggs = await getUnitEggs(UNIT_ID)

    expect(eggs).toHaveLength(2)
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock.mock.calls[0]?.[0].url).toMatch(/\/rj\.json\?v=/)
    expect(storage.get('gotit:unit-eggs:publisher:rj')).toBe(JSON.stringify(publisherPayload()))

    await getUnitEggs(UNIT_ID)
    expect(requestMock).toHaveBeenCalledTimes(1)
  })

  it('uses a current local cache without making a request', async () => {
    storage.set('gotit:unit-eggs:publisher:rj', JSON.stringify(publisherPayload()))

    const eggs = await getUnitEggs(UNIT_ID)

    expect(eggs).toHaveLength(2)
    expect(requestMock).not.toHaveBeenCalled()
  })

  it('falls back to stale cached data when the refresh fails', async () => {
    storage.set('gotit:unit-eggs:publisher:rj', JSON.stringify(publisherPayload('older-version')))
    requestMock.mockImplementationOnce((options: { fail: (error: { errMsg: string }) => void }) => {
      options.fail({ errMsg: 'offline' })
    })

    const eggs = await getUnitEggs(UNIT_ID)

    expect(eggs).toHaveLength(2)
    expect(requestMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the same unit egg stable throughout a local calendar day', async () => {
    const morning = await getUnitEggForDate(UNIT_ID, new Date(2026, 7, 20, 8, 0))
    const evening = await getUnitEggForDate(UNIT_ID, new Date(2026, 7, 20, 21, 30))

    expect(morning).not.toBeNull()
    expect(evening?.keyword).toBe(morning?.keyword)
  })
})

describe('unit egg presentation helpers', () => {
  it('does not match breath inside breathe when splitting contrast notes', () => {
    expect(getUnitEggContrastNotes(
      'breathe 是动词“呼吸”；breath 是名词“呼吸”',
      'breathe',
      'breath'
    )).toEqual(['动词呼吸', '名词呼吸'])
  })
})
