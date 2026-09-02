import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureWordbankFullyLoaded,
  ensureWordbankLoaded,
  expandPublisherBlock,
  refreshWordbankIfUpdated,
  resetWordbankCacheForTests
} from './wordbankLoader'

describe('expandPublisherBlock word ids', () => {
  it('keeps the first slug and disambiguates duplicates within a unit', () => {
    const entries = expandPublisherBlock({
      publisher: { id: 'ylj', name: '译林版' },
      sourceWorkbook: 'test.xlsx',
      books: [{
        id: 'grade-7-1',
        name: '七年级上册',
        order: 1,
        units: [{
          number: 5,
          key: '5',
          label: 'Unit 5',
          words: [
            ['bottle', '', '', '瓶子', 1, 'bottle', 10],
            ['sweet', '', '', '糖果；甜食', 1, 'sweet', 11],
            ['sweet', '', '', '甜的；可爱的', 1, 'sweet', 25]
          ]
        }]
      }]
    })

    expect(entries.map(entry => entry.id)).toEqual([
      'ylj:grade-7-1:u5:bottle',
      'ylj:grade-7-1:u5:sweet',
      'ylj:grade-7-1:u5:sweet@25'
    ])
  })

  it('reuses textbook audio when a compact record provides audioCdnKey', () => {
    const entries = expandPublisherBlock({
      publisher: { id: 'bb-senior', name: '高考3500词' },
      sourceWorkbook: 'bb.xlsx',
      books: [{
        id: 'alpha',
        name: '高考3500词·顺序',
        order: 1,
        units: [{
          number: 1,
          key: '01',
          label: 'Unit 1',
          words: [
            ['abandon', '', '', '放弃', 1, 'abandon', 1, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'rj/required-1/unit-1/abandon']
          ]
        }]
      }]
    })

    expect(entries[0]?.audio.cdnKey).toBe('rj/required-1/unit-1/abandon')
    expect(entries[0]?.audio.ukUrl).toContain('rj/required-1/unit-1/abandon/uk.mp3')
  })

  it('expands bb lexicon slug references into word entries', () => {
    const entries = expandPublisherBlock({
      publisher: { id: 'bb-junior', name: '中考2000词' },
      sourceWorkbook: 'bb.xlsx',
      lexicon: {
        a: ['a', '/ə/', 'art.', '一个', 1, 'a', 5],
        able: ['able', '/ˈeɪbl/', 'adj.', '能够', 1, 'able', 8],
        about: ['about', '/əˈbaʊt/', 'prep.', '关于', 1, 'about', 9]
      },
      books: [{
        id: 'alpha',
        name: '中考2000词·顺序',
        order: 1,
        units: [{
          number: 1,
          key: '01',
          label: 'Unit 1',
          words: ['a', 'able', 'about']
        }]
      }]
    })

    expect(entries.map(entry => entry.word)).toEqual(['a', 'able', 'about'])
    expect(entries[1]?.phonetic).toBe('/ˈeɪbl/')
  })

  it('uses shared bb audio keys for words without a textbook reuse key', () => {
    const entries = expandPublisherBlock({
      publisher: { id: 'bb-junior', name: '中考2000词' },
      sourceWorkbook: 'bb.xlsx',
      books: [{
        id: 'alpha',
        name: '中考2000词·顺序',
        order: 1,
        units: [{
          number: 1,
          key: '01',
          label: 'Unit 1',
          words: [
            ['absolute', '', '', '完全的', 1, 'absolute', 1]
          ]
        }]
      }]
    })

    expect(entries[0]?.audio.cdnKey).toBe('bb/shared/absolute')
  })
})

describe('wordbankLoader manifest resolution', () => {
  let storage: Map<string, unknown>
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    storage = new Map()
    fetchMock = vi.fn()
    resetWordbankCacheForTests()

    vi.stubGlobal('uni', {
      getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
      setStorageSync: vi.fn((key: string, value: unknown) => {
        storage.set(key, value)
      }),
      removeStorageSync: vi.fn((key: string) => {
        storage.delete(key)
      })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    resetWordbankCacheForTests()
  })

  it('uses the bundled manifest without checking the network during cold startup', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        publisher: { id: 'shj', name: '沪教版' },
        sourceWorkbook: '',
        books: []
      })
    })

    await ensureWordbankLoaded()

    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('manifest.json'))).toBe(false)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/shj.json')
  })

  it('prefers cached manifest on cold start without refreshing it in background', async () => {
    const cachedManifest = {
      version: 'cached:42',
      publishers: [{ publisher: { id: 'cached', name: 'Cached' }, sourceWorkbook: '', books: [] }]
    }
    const cachedBlock = {
      publisher: { id: 'cached', name: 'Cached' },
      sourceWorkbook: '',
      books: []
    }

    storage.set('gotit:wordbank:manifest', JSON.stringify(cachedManifest))
    storage.set('gotit:wordbank:publisher-version:cached', 'cached:42')
    storage.set('gotit:wordbank:data:cached', JSON.stringify(cachedBlock))
    storage.set('gotit:wordbank:publisher-ids', JSON.stringify(['cached']))
    await ensureWordbankLoaded()

    expect(storage.get('gotit:wordbank:version')).toBe('cached:42')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not load unrelated publishers in the background after startup', async () => {
    vi.useFakeTimers()
    const manifest = {
      version: 'a:1|b:1',
      publishers: [
        { publisher: { id: 'a', name: 'A' }, sourceWorkbook: '', books: [] },
        { publisher: { id: 'b', name: 'B' }, sourceWorkbook: '', books: [] }
      ]
    }

    storage.set('gotit:wordbank:manifest', JSON.stringify(manifest))
    storage.set('gotit:wordbank:publisher-version:a', 'a:1')
    storage.set('gotit:wordbank:data:a', JSON.stringify({
      publisher: { id: 'a', name: 'A' },
      sourceWorkbook: '',
      books: []
    }))
    storage.set('gotit:wordbank:publisher-ids', JSON.stringify(['a', 'b']))
    storage.set('gotit:selectedUnitId', 'a:book:u1')
    storage.set('gotit:savedWeakWordIds', ['b:book:u1:weak'])
    storage.set('gotit:masteredWordIds', ['b:book:u1:known'])
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => manifest
    })

    await ensureWordbankLoaded()
    await vi.advanceTimersByTimeAsync(100)

    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('/b.json'))).toBe(false)
  })

  it('re-fetches only publishers whose version token changed', async () => {
    const manifest = {
      version: 'a:1|b:2',
      publishers: [
        { publisher: { id: 'a', name: 'A' }, sourceWorkbook: '', books: [] },
        { publisher: { id: 'b', name: 'B' }, sourceWorkbook: '', books: [] }
      ]
    }

    storage.set('gotit:wordbank:manifest', JSON.stringify(manifest))
    storage.set('gotit:wordbank:publisher-version:a', 'a:1')
    storage.set('gotit:wordbank:data:a', JSON.stringify({
      publisher: { id: 'a', name: 'A' },
      sourceWorkbook: '',
      books: []
    }))
    storage.set('gotit:wordbank:publisher-version:b', 'b:1')
    storage.set('gotit:wordbank:data:b', JSON.stringify({
      publisher: { id: 'b', name: 'Old B' },
      sourceWorkbook: '',
      books: []
    }))
    storage.set('gotit:wordbank:publisher-ids', JSON.stringify(['a', 'b']))

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        publisher: { id: 'b', name: 'Fresh B' },
        sourceWorkbook: '',
        books: []
      })
    })

    await ensureWordbankFullyLoaded()

    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('b.json?v=2'))).toBe(true)
    expect(JSON.parse(String(storage.get('gotit:wordbank:data:b'))).publisher.name).toBe('Fresh B')
    expect(JSON.parse(String(storage.get('gotit:wordbank:data:a'))).publisher.name).toBe('A')
  })

  it('reloads wordbank when remote manifest version changes on refresh', async () => {
    const initialManifest = {
      version: 'a:1',
      publishers: [{ publisher: { id: 'a', name: 'A' }, sourceWorkbook: '', books: [] }]
    }
    const updatedManifest = {
      version: 'a:1|b:2',
      publishers: [
        { publisher: { id: 'a', name: 'A' }, sourceWorkbook: '', books: [] },
        { publisher: { id: 'b', name: 'B' }, sourceWorkbook: '', books: [] }
      ]
    }

    storage.set('gotit:wordbank:manifest', JSON.stringify(initialManifest))
    storage.set('gotit:wordbank:publisher-version:a', 'a:1')
    storage.set('gotit:wordbank:data:a', JSON.stringify({
      publisher: { id: 'a', name: 'A' },
      sourceWorkbook: '',
      books: []
    }))
    storage.set('gotit:wordbank:publisher-ids', JSON.stringify(['a']))
    storage.set('gotit:selectedUnitId', 'a:book:u1')

    await ensureWordbankLoaded()

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedManifest
    })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        publisher: { id: 'b', name: 'B' },
        sourceWorkbook: '',
        books: []
      })
    })

    const updated = await refreshWordbankIfUpdated()

    expect(updated).toBe(true)
    expect(storage.get('gotit:wordbank:version')).toBe('a:1|b:2')
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('b.json'))).toBe(false)
    await ensureWordbankFullyLoaded()
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('b.json?v=2'))).toBe(true)
  })

  it('updates the manifest without loading a fallback publisher before course setup', async () => {
    const initialManifest = {
      version: 'a:1',
      publishers: [{ publisher: { id: 'a', name: 'A' }, sourceWorkbook: '', books: [] }]
    }
    const updatedManifest = {
      version: 'a:2',
      publishers: [{ publisher: { id: 'a', name: 'A' }, sourceWorkbook: '', books: [] }]
    }

    storage.set('gotit:wordbank:manifest', JSON.stringify(initialManifest))
    storage.set('gotit:wordbank:version', initialManifest.version)
    storage.set('gotit:wordbank:publisher-ids', JSON.stringify(['a']))

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedManifest
    })

    const updated = await refreshWordbankIfUpdated()

    expect(updated).toBe(true)
    expect(storage.get('gotit:wordbank:version')).toBe('a:2')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/manifest\.json\?_=/)
  })

  it('skips refresh when remote manifest version is unchanged', async () => {
    const manifest = {
      version: 'a:1',
      publishers: [{ publisher: { id: 'a', name: 'A' }, sourceWorkbook: '', books: [] }]
    }

    storage.set('gotit:wordbank:manifest', JSON.stringify(manifest))
    storage.set('gotit:wordbank:publisher-version:a', 'a:1')
    storage.set('gotit:wordbank:data:a', JSON.stringify({
      publisher: { id: 'a', name: 'A' },
      sourceWorkbook: '',
      books: []
    }))
    storage.set('gotit:wordbank:publisher-ids', JSON.stringify(['a']))
    storage.set('gotit:selectedUnitId', 'a:book:u1')

    await ensureWordbankLoaded()
    fetchMock.mockClear()

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => manifest
    })

    const updated = await refreshWordbankIfUpdated()

    expect(updated).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/manifest\.json\?_=\d+/)
  })
})
