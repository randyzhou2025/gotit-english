import unitEggManifest from '@/data/unit-eggs.manifest.json'

export type UnitEggTemplate = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'

export interface UnitEgg {
  template: UnitEggTemplate
  keyword: string
  title: string
  core: string
  explanation: string
  memory: string
  compare: string
  phonetic: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripContrastPunctuation(value: string): string {
  return value
    .trim()
    .replace(/^[：:，,；;。\s]+/, '')
    .replace(/[。；;\s]+$/, '')
    .replace(/[“”"]/g, '')
}

function removeContrastWord(value: string, word: string): string {
  if (!word) return stripContrastPunctuation(value)
  return stripContrastPunctuation(value.replace(
    new RegExp(`^${escapeRegExp(word)}\\s*(?:通常)?(?:是|表示|描述|可以是|可以表示)?\\s*`, 'i'),
    ''
  ))
}

function startsWithWholeWord(value: string, word: string): boolean {
  if (!word) return false
  return new RegExp(`^${escapeRegExp(word)}(?=\\s|是|：|:|，|,)`, 'i').test(value.trim())
}

export function getUnitEggContrastNotes(
  explanation: string,
  leftWord: string,
  rightWord: string
): [string, string] {
  const clauses = explanation.split(/[；;]/).map(part => part.trim()).filter(Boolean)
  const leftClause = clauses.find(part => startsWithWholeWord(part, leftWord)) ?? clauses[0] ?? ''
  const rightIndex = clauses.findIndex(part => startsWithWholeWord(part, rightWord))
  const rightClauses = rightIndex >= 0 ? clauses.slice(rightIndex) : clauses.slice(1)

  return [
    removeContrastWord(leftClause, leftWord),
    rightClauses
      .map((part, index) => removeContrastWord(part, index === 0 ? rightWord : ''))
      .filter(Boolean)
      .join('，')
  ]
}

interface UnitEggManifest {
  version: string
  source: string
  unitCount: number
  recordCount: number
  publishers: Array<{
    id: string
    unitCount: number
    recordCount: number
  }>
}

interface UnitEggPublisherPayload {
  version: string
  publisherId: string
  byUnit: Record<string, UnitEgg[]>
}

const LOCAL_UNIT_EGGS_BASE_PATH = '/generated/unit-eggs'
const UNIT_EGGS_CACHE_PREFIX = 'gotit:unit-eggs:publisher:'
const bundledManifest = unitEggManifest as UnitEggManifest
const unitEggsBaseUrl = resolveUnitEggsBaseUrl()
const publisherCache = new Map<string, UnitEggPublisherPayload>()
const publisherLoadPromises = new Map<string, Promise<UnitEggPublisherPayload | null>>()

function siblingAssetBase(baseUrl: string, currentSuffix: string): string {
  return baseUrl.endsWith(currentSuffix)
    ? `${baseUrl.slice(0, -currentSuffix.length)}/generated/unit-eggs`
    : ''
}

function resolveUnitEggsBaseUrl(): string {
  const explicit = String(import.meta.env.VITE_UNIT_EGGS_CDN_BASE_URL || '').replace(/\/+$/, '')
  if (explicit) return explicit

  const wordbankBase = String(import.meta.env.VITE_WORDBANK_CDN_BASE_URL || '').replace(/\/+$/, '')
  const wordbankSibling = siblingAssetBase(wordbankBase, '/generated/wordbank')
  if (wordbankSibling) return wordbankSibling

  const audioBase = String(import.meta.env.VITE_AUDIO_CDN_BASE_URL || '').replace(/\/+$/, '')
  return siblingAssetBase(audioBase, '/generated/audio') || LOCAL_UNIT_EGGS_BASE_PATH
}

function getRuntime(): UniApp.Uni | undefined {
  return typeof uni !== 'undefined' ? uni : undefined
}

function readStorage(key: string): string {
  try {
    return getRuntime()?.getStorageSync?.(key) ?? ''
  } catch {
    return ''
  }
}

function writeStorage(key: string, value: string) {
  try {
    getRuntime()?.setStorageSync?.(key, value)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
}

function isPublisherPayload(value: unknown, publisherId: string): value is UnitEggPublisherPayload {
  if (!value || typeof value !== 'object') return false

  const candidate = value as UnitEggPublisherPayload
  return typeof candidate.version === 'string'
    && candidate.publisherId === publisherId
    && Boolean(candidate.byUnit)
    && typeof candidate.byUnit === 'object'
}

function parsePayload(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

async function requestJson(url: string): Promise<unknown> {
  const runtime = getRuntime()
  if (runtime?.request) {
    return await new Promise((resolve, reject) => {
      runtime.request({
        url,
        method: 'GET',
        success: (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsePayload(response.data))
            return
          }
          reject(new Error(`Unit egg request failed (${response.statusCode})`))
        },
        fail: (error) => {
          reject(new Error(error.errMsg || 'Unit egg request failed'))
        }
      })
    })
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unit egg request failed (${response.status})`)
  }
  return response.json()
}

function publisherIdFromUnitId(unitId: string): string {
  const separator = unitId.indexOf(':')
  return separator > 0 ? unitId.slice(0, separator) : ''
}

function readCachedPublisher(publisherId: string): UnitEggPublisherPayload | null {
  const cached = readStorage(`${UNIT_EGGS_CACHE_PREFIX}${publisherId}`)
  if (!cached) return null

  const payload = parsePayload(cached)
  return isPublisherPayload(payload, publisherId) ? payload : null
}

function cachePublisher(payload: UnitEggPublisherPayload) {
  publisherCache.set(payload.publisherId, payload)
  writeStorage(`${UNIT_EGGS_CACHE_PREFIX}${payload.publisherId}`, JSON.stringify(payload))
}

function publisherUrl(publisherId: string): string {
  return `${unitEggsBaseUrl}/${publisherId}.json?v=${encodeURIComponent(bundledManifest.version)}`
}

async function loadPublisher(publisherId: string): Promise<UnitEggPublisherPayload | null> {
  const inMemory = publisherCache.get(publisherId)
  if (inMemory) return inMemory

  const cached = readCachedPublisher(publisherId)
  if (cached?.version === bundledManifest.version) {
    publisherCache.set(publisherId, cached)
    return cached
  }

  const existingPromise = publisherLoadPromises.get(publisherId)
  if (existingPromise) return existingPromise

  const loadPromise = (async () => {
    try {
      const payload = await requestJson(publisherUrl(publisherId))
      if (!isPublisherPayload(payload, publisherId)) {
        throw new Error(`Invalid unit egg payload for ${publisherId}`)
      }
      cachePublisher(payload)
      return payload
    } catch {
      if (cached) {
        publisherCache.set(publisherId, cached)
        return cached
      }
      return null
    }
  })().finally(() => {
    publisherLoadPromises.delete(publisherId)
  })

  publisherLoadPromises.set(publisherId, loadPromise)
  return loadPromise
}

export async function getUnitEggs(unitId: string): Promise<readonly UnitEgg[]> {
  const publisherId = publisherIdFromUnitId(unitId)
  if (!publisherId) return []

  const publisher = await loadPublisher(publisherId)
  return publisher?.byUnit[unitId] ?? []
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export async function getUnitEggForDate(unitId: string, date = new Date()): Promise<UnitEgg | null> {
  const eggs = await getUnitEggs(unitId)
  if (eggs.length === 0) return null

  const index = stableHash(`${unitId}:${localDateKey(date)}`) % eggs.length
  return eggs[index] ?? null
}

export const unitEggDatasetMeta = {
  version: bundledManifest.version,
  source: bundledManifest.source,
  unitCount: bundledManifest.unitCount,
  recordCount: bundledManifest.recordCount
} as const

export function resetUnitEggCacheForTests() {
  publisherCache.clear()
  publisherLoadPromises.clear()
}
