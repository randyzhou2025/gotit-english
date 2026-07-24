import bundledWordbankManifest from '@/data/wordbank.manifest.json'
import { buildWordAudio } from '@/core/audio'
import type { WordEntry } from './types'

export type CompactWordRecord = [
  word: string,
  phonetic: string,
  partOfSpeech: string,
  meaning: string,
  difficulty: number,
  slug: string,
  rowNumber: number,
  exampleSentence?: string,
  exampleTranslation?: string,
  commonPhrases?: string,
  wordForms?: string,
  etymology?: string,
  cognates?: string,
  antonyms?: string
]

export interface CompactUnit {
  number: number
  key?: string
  label?: string
  words: CompactWordRecord[]
}

export interface CompactPublisherBlock {
  publisher: {
    id: string
    name: string
  }
  sourceWorkbook: string
  books: Array<{
    id: string
    name: string
    order: number
    units: CompactUnit[]
  }>
}

export interface WordbankManifest {
  version: string
  publishers: Array<{
    publisher: CompactPublisherBlock['publisher']
    sourceWorkbook: string
    books: Array<{
      id: string
      name: string
      order: number
      units: Array<{
        number: number
        key?: string
        label?: string
        wordCount: number
      }>
    }>
  }>
}

const WORDBANK_CACHE_PREFIX = 'gotit:wordbank:data:'
const WORDBANK_PUBLISHER_VERSION_PREFIX = 'gotit:wordbank:publisher-version:'
const WORDBANK_VERSION_KEY = 'gotit:wordbank:version'
const WORDBANK_MANIFEST_KEY = 'gotit:wordbank:manifest'
const WORDBANK_PUBLISHER_IDS_KEY = 'gotit:wordbank:publisher-ids'
const LOCAL_WORDBANK_BASE_PATH = '/generated/wordbank'

const bundledManifest = bundledWordbankManifest as WordbankManifest
const wordbankCdnBaseUrl = resolveWordbankCdnBaseUrl()

function resolveWordbankCdnBaseUrl(): string {
  const explicit = String(import.meta.env.VITE_WORDBANK_CDN_BASE_URL || '').replace(/\/+$/, '')
  if (explicit) return explicit

  const audioBase = String(import.meta.env.VITE_AUDIO_CDN_BASE_URL || '').replace(/\/+$/, '')
  if (audioBase.endsWith('/generated/audio')) {
    return `${audioBase.slice(0, -'/generated/audio'.length)}/generated/wordbank`
  }

  return ''
}

function isPhraseEntry(word: string): boolean {
  return /\s/.test(word.trim())
}

function unitSegment(unit: CompactUnit): string {
  return unit.key ?? String(unit.number)
}

function unitDisplayName(unit: CompactUnit): string {
  return unit.label ?? (unit.number === 0 ? 'Welcome Unit' : `Unit ${unit.number}`)
}

export function expandPublisherBlock(block: CompactPublisherBlock): WordEntry[] {
  const entries: WordEntry[] = []

  for (const book of block.books) {
    for (const unit of book.units) {
      const segment = unitSegment(unit)
      const unitId = `${block.publisher.id}:${book.id}:u${segment}`
      const seenSlugs = new Set<string>()

      for (const [
        word,
        phonetic,
        partOfSpeech,
        meaning,
        difficulty,
        slug,
        rowNumber,
        exampleSentence,
        exampleTranslation,
        commonPhrases,
        wordForms,
        etymology,
        cognates,
        antonyms
      ] of unit.words) {
        if (isPhraseEntry(word)) continue

        const cdnKey = `${block.publisher.id}/${book.id}/unit-${segment}/${slug}`
        const idKey = seenSlugs.has(slug) ? `${slug}@${rowNumber}` : slug
        seenSlugs.add(slug)

        entries.push({
          id: `${unitId}:${idKey}`,
          publisherId: block.publisher.id,
          publisherName: block.publisher.name,
          bookId: book.id,
          bookName: book.name,
          bookOrder: book.order,
          unitId,
          unitNumber: unit.number,
          unitName: unitDisplayName(unit),
          word,
          phonetic,
          partOfSpeech,
          meaning,
          exampleSentence: exampleSentence || undefined,
          exampleTranslation: exampleTranslation || undefined,
          commonPhrases: commonPhrases || undefined,
          wordForms: wordForms || undefined,
          etymology: etymology || undefined,
          cognates: cognates || undefined,
          antonyms: antonyms || undefined,
          difficulty,
          audio: buildWordAudio(cdnKey),
          source: {
            workbook: block.sourceWorkbook,
            sheet: book.name,
            rowNumber
          }
        })
      }
    }
  }

  return entries
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

function removeStorage(key: string) {
  try {
    getRuntime()?.removeStorageSync?.(key)
  } catch {
    // Ignore storage cleanup failures.
  }
}

function resolveWordbankBasePath(): string {
  return wordbankCdnBaseUrl || LOCAL_WORDBANK_BASE_PATH
}

function resolveManifestUrl(bustCache: boolean): string {
  const url = `${resolveWordbankBasePath()}/manifest.json`
  return bustCache ? `${url}?_=${Date.now()}` : url
}

function publisherVersionToken(manifestVersion: string, publisherId: string): string {
  const segment = manifestVersion
    .split('|')
    .find(part => part.startsWith(`${publisherId}:`))

  return segment ?? `${publisherId}:${manifestVersion}`
}

function publisherCacheVersionParam(publisherToken: string): string {
  const [, versionPart = publisherToken] = publisherToken.split(':')
  return encodeURIComponent(versionPart)
}

function resolvePublisherUrl(publisherId: string, publisherToken: string): string {
  const versionParam = publisherCacheVersionParam(publisherToken)
  return `${resolveWordbankBasePath()}/${publisherId}.json?v=${versionParam}`
}

function isWordbankManifest(value: unknown): value is WordbankManifest {
  if (!value || typeof value !== 'object') return false

  const candidate = value as WordbankManifest
  return typeof candidate.version === 'string'
    && Array.isArray(candidate.publishers)
    && candidate.publishers.every(entry => typeof entry.publisher?.id === 'string')
}

interface RequestJsonOptions {
  bustCache?: boolean
}

async function requestJson(url: string, options: RequestJsonOptions = {}): Promise<unknown> {
  const runtime = getRuntime()
  if (runtime?.request) {
    return await new Promise((resolve, reject) => {
      runtime.request({
        url,
        method: 'GET',
        header: options.bustCache ? { 'Cache-Control': 'no-cache' } : undefined,
        success: (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(response.data)
            return
          }
          reject(new Error(`Wordbank request failed (${response.statusCode})`))
        },
        fail: (error) => {
          reject(new Error(error.errMsg || 'Wordbank request failed'))
        }
      })
    })
  }

  const response = await fetch(url, options.bustCache ? { cache: 'no-store' } : undefined)
  if (!response.ok) {
    throw new Error(`Wordbank request failed (${response.status})`)
  }
  return response.json()
}

function readCachedManifest(): WordbankManifest | null {
  const cached = readStorage(WORDBANK_MANIFEST_KEY)
  if (!cached) return null

  try {
    const parsed = JSON.parse(cached) as unknown
    return isWordbankManifest(parsed) ? parsed : null
  } catch {
    removeStorage(WORDBANK_MANIFEST_KEY)
    return null
  }
}

function cacheManifest(manifest: WordbankManifest) {
  writeStorage(WORDBANK_MANIFEST_KEY, JSON.stringify(manifest))
  writeStorage(WORDBANK_VERSION_KEY, manifest.version)
}

async function fetchRemoteManifest(): Promise<WordbankManifest | null> {
  try {
    const payload = await requestJson(resolveManifestUrl(true), { bustCache: true })
    if (!isWordbankManifest(payload)) return null
    return payload
  } catch {
    return null
  }
}

async function resolveManifest(): Promise<WordbankManifest> {
  const remote = await fetchRemoteManifest()
  if (remote) {
    cacheManifest(remote)
    return remote
  }

  const cached = readCachedManifest()
  if (cached) return cached

  return bundledManifest
}

function readStoredPublisherIds(): string[] {
  const raw = readStorage(WORDBANK_PUBLISHER_IDS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    removeStorage(WORDBANK_PUBLISHER_IDS_KEY)
    return []
  }
}

function syncPublisherCaches(manifest: WordbankManifest) {
  const activePublisherIds = new Set(
    manifest.publishers.map(entry => entry.publisher.id)
  )

  for (const publisherId of readStoredPublisherIds()) {
    if (activePublisherIds.has(publisherId)) continue
    removeStorage(`${WORDBANK_CACHE_PREFIX}${publisherId}`)
    removeStorage(`${WORDBANK_PUBLISHER_VERSION_PREFIX}${publisherId}`)
  }

  writeStorage(
    WORDBANK_PUBLISHER_IDS_KEY,
    JSON.stringify([...activePublisherIds])
  )
}

async function readCachedPublisherBlock(
  publisherId: string,
  publisherToken: string
): Promise<CompactPublisherBlock | null> {
  if (readStorage(`${WORDBANK_PUBLISHER_VERSION_PREFIX}${publisherId}`) !== publisherToken) {
    return null
  }

  const cached = readStorage(`${WORDBANK_CACHE_PREFIX}${publisherId}`)
  if (!cached) return null

  try {
    return JSON.parse(cached) as CompactPublisherBlock
  } catch {
    removeStorage(`${WORDBANK_CACHE_PREFIX}${publisherId}`)
    removeStorage(`${WORDBANK_PUBLISHER_VERSION_PREFIX}${publisherId}`)
    return null
  }
}

function cachePublisherBlock(
  publisherId: string,
  publisherToken: string,
  block: CompactPublisherBlock
) {
  writeStorage(`${WORDBANK_PUBLISHER_VERSION_PREFIX}${publisherId}`, publisherToken)
  writeStorage(`${WORDBANK_CACHE_PREFIX}${publisherId}`, JSON.stringify(block))
}

async function loadPublisherBlock(
  publisherId: string,
  publisherToken: string
): Promise<CompactPublisherBlock> {
  const cached = await readCachedPublisherBlock(publisherId, publisherToken)
  if (cached) return cached

  const url = resolvePublisherUrl(publisherId, publisherToken)
  const payload = await requestJson(url)
  const block = payload as CompactPublisherBlock
  cachePublisherBlock(publisherId, publisherToken, block)
  return block
}

let resolvedManifest: WordbankManifest | null = null
let cachedWords: WordEntry[] | null = null
let loadPromise: Promise<WordEntry[]> | null = null
let refreshInFlight: Promise<boolean> | null = null

function clearWordbankMemoryCache() {
  resolvedManifest = null
  cachedWords = null
  loadPromise = null
}

function activeWordbankVersion(): string {
  return resolvedManifest?.version
    ?? readStorage(WORDBANK_VERSION_KEY)
    ?? bundledManifest.version
}

export function getWordbankManifest(): WordbankManifest {
  return resolvedManifest ?? bundledManifest
}

export function resetWordbankCacheForTests() {
  clearWordbankMemoryCache()
  refreshInFlight = null
  removeStorage(WORDBANK_VERSION_KEY)
  removeStorage(WORDBANK_MANIFEST_KEY)
  removeStorage(WORDBANK_PUBLISHER_IDS_KEY)

  for (const publisher of bundledManifest.publishers) {
    const publisherId = publisher.publisher.id
    removeStorage(`${WORDBANK_CACHE_PREFIX}${publisherId}`)
    removeStorage(`${WORDBANK_PUBLISHER_VERSION_PREFIX}${publisherId}`)
  }
}

export async function ensureWordbankLoaded(): Promise<WordEntry[]> {
  if (cachedWords) return cachedWords
  if (!loadPromise) {
    loadPromise = (async () => {
      const manifest = await resolveManifest()
      resolvedManifest = manifest
      syncPublisherCaches(manifest)

      const blocks = await Promise.all(
        manifest.publishers.map(entry => {
          const publisherId = entry.publisher.id
          const publisherToken = publisherVersionToken(manifest.version, publisherId)
          return loadPublisherBlock(publisherId, publisherToken)
        })
      )

      cachedWords = blocks.flatMap(expandPublisherBlock)
      writeStorage(WORDBANK_VERSION_KEY, manifest.version)
      return cachedWords
    })()
  }
  return loadPromise
}

async function refreshWordbankIfUpdatedInternal(): Promise<boolean> {
  if (loadPromise) {
    await loadPromise.catch(() => undefined)
  }

  const remote = await fetchRemoteManifest()
  if (!remote) return false

  if (remote.version === activeWordbankVersion()) {
    return false
  }

  cacheManifest(remote)
  clearWordbankMemoryCache()
  await ensureWordbankLoaded()
  return true
}

export function refreshWordbankIfUpdated(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshWordbankIfUpdatedInternal().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}
