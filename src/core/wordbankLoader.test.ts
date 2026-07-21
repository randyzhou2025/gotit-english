import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureWordbankLoaded,
  refreshWordbankIfUpdated,
  resetWordbankCacheForTests
} from './wordbankLoader'

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
    vi.unstubAllGlobals()
    resetWordbankCacheForTests()
  })

  it('uses remote manifest when CDN responds', async () => {
    const remoteManifest = {
      version: 'remote:99',
      publishers: [{ publisher: { id: 'remote', name: 'Remote' }, sourceWorkbook: '', books: [] }]
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => remoteManifest
    })

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        publisher: { id: 'remote', name: 'Remote' },
        sourceWorkbook: '',
        books: []
      })
    })

    await ensureWordbankLoaded()

    expect(storage.get('gotit:wordbank:manifest')).toBe(JSON.stringify(remoteManifest))
    expect(storage.get('gotit:wordbank:version')).toBe('remote:99')
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/manifest\.json\?_=\d+/)
  })

  it('falls back to cached manifest when CDN is unavailable', async () => {
    const cachedManifest = {
      version: 'cached:42',
      publishers: [{ publisher: { id: 'cached', name: 'Cached' }, sourceWorkbook: '', books: [] }]
    }

    storage.set('gotit:wordbank:manifest', JSON.stringify(cachedManifest))
    fetchMock.mockRejectedValueOnce(new Error('offline'))

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        publisher: { id: 'cached', name: 'Cached' },
        sourceWorkbook: '',
        books: []
      })
    })

    await ensureWordbankLoaded()

    expect(storage.get('gotit:wordbank:version')).toBe('cached:42')
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

    fetchMock.mockRejectedValueOnce(new Error('offline'))
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        publisher: { id: 'b', name: 'Fresh B' },
        sourceWorkbook: '',
        books: []
      })
    })

    await ensureWordbankLoaded()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toMatch(/b\.json\?v=2/)
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

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => initialManifest
    })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        publisher: { id: 'a', name: 'A' },
        sourceWorkbook: '',
        books: []
      })
    })

    await ensureWordbankLoaded()

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedManifest
    })
    fetchMock.mockRejectedValueOnce(new Error('offline'))
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
    expect(fetchMock.mock.calls.at(-1)?.[0]).toMatch(/b\.json\?v=2/)
  })

  it('skips refresh when remote manifest version is unchanged', async () => {
    const manifest = {
      version: 'a:1',
      publishers: [{ publisher: { id: 'a', name: 'A' }, sourceWorkbook: '', books: [] }]
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => manifest
    })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        publisher: { id: 'a', name: 'A' },
        sourceWorkbook: '',
        books: []
      })
    })

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
