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
  antonyms?: string,
  audioCdnKey?: string
]

export type CompactUnitWordRef = CompactWordRecord | string

export interface CompactUnit {
  number: number
  key?: string
  label?: string
  words: CompactUnitWordRef[]
  retiredWords?: CompactWordRecord[]
}

export interface CompactPublisherBlock {
  publisher: {
    id: string
    name: string
  }
  sourceWorkbook: string
  lexicon?: Record<string, CompactWordRecord>
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
const SELECTED_UNIT_ID_KEY = 'gotit:selectedUnitId'
const LOCAL_WORDBANK_BASE_PATH = '/generated/wordbank'
const BACKGROUND_LOAD_YIELD_MS = 48

const bundledManifest = bundledWordbankManifest as WordbankManifest
const wordbankCdnBaseUrl = resolveWordbankCdnBaseUrl()

type WordbankExpansionListener = (words: WordEntry[]) => void

let resolvedManifest: WordbankManifest | null = null
let cachedWords: WordEntry[] | null = null
let loadedPublisherIds = new Set<string>()
let loadPromise: Promise<WordEntry[]> | null = null
let fullLoadPromise: Promise<WordEntry[]> | null = null
let refreshInFlight: Promise<boolean> | null = null
let expansionListener: WordbankExpansionListener | null = null

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

function resolveCompactWordRecord(
  block: CompactPublisherBlock,
  rawWord: CompactUnitWordRef
): CompactWordRecord | null {
  if (Array.isArray(rawWord)) return rawWord
  if (typeof rawWord !== 'string') return null
  return block.lexicon?.[rawWord] ?? null
}

export function expandPublisherBlock(block: CompactPublisherBlock): WordEntry[] {
  const entries: WordEntry[] = []

  for (const book of block.books) {
    for (const unit of book.units) {
      const segment = unitSegment(unit)
      const unitId = `${block.publisher.id}:${book.id}:u${segment}`
      const seenSlugs = new Set<string>()

      for (const rawWord of unit.words) {
        const record = resolveCompactWordRecord(block, rawWord)
        if (!record) continue

        const [
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
        antonyms,
        audioCdnKey
      ] = record
        if (isPhraseEntry(word)) continue

        const cdnKey = audioCdnKey || (
          block.publisher.id.startsWith('bb-')
            ? `bb/shared/${slug}`
            : `${block.publisher.id}/${book.id}/unit-${segment}/${slug}`
        )
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

function publisherIdFromScopedId(value: string): string {
  const end = value.indexOf(':')
  return end > 0 ? value.slice(0, end) : ''
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

function resolveManifestFast(): WordbankManifest {
  return readCachedManifest() ?? bundledManifest
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
  return resolveManifestFast()
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

function manifestPublisherIds(manifest: WordbankManifest): string[] {
  return manifest.publishers.map(entry => entry.publisher.id)
}

function selectedPublisherId(manifest: WordbankManifest): string {
  const selectedUnitId = readStorage(SELECTED_UNIT_ID_KEY)
  if (!selectedUnitId) return ''

  const publisherId = publisherIdFromScopedId(selectedUnitId)
  return manifest.publishers.some(entry => entry.publisher.id === publisherId)
    ? publisherId
    : ''
}

function collectPriorityPublisherIds(manifest: WordbankManifest): string[] {
  const ids = new Set<string>()
  const selectedPublisher = selectedPublisherId(manifest)
  if (selectedPublisher) ids.add(selectedPublisher)

  if (ids.size === 0) {
    const fallback = manifest.publishers[0]?.publisher.id
    if (fallback) ids.add(fallback)
  }

  return [...ids]
}

function remainingPublisherIds(manifest: WordbankManifest, loaded: Set<string>): string[] {
  return manifestPublisherIds(manifest).filter(publisherId => !loaded.has(publisherId))
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

function readStalePublisherBlock(publisherId: string): CompactPublisherBlock | null {
  const cached = readStorage(`${WORDBANK_CACHE_PREFIX}${publisherId}`)
  if (!cached) return null

  try {
    return JSON.parse(cached) as CompactPublisherBlock
  } catch {
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

  try {
    const url = resolvePublisherUrl(publisherId, publisherToken)
    const payload = await requestJson(url)
    const block = payload as CompactPublisherBlock
    cachePublisherBlock(publisherId, publisherToken, block)
    return block
  } catch {
    const stale = readStalePublisherBlock(publisherId)
    if (stale) return stale
    throw new Error(`Failed to load publisher ${publisherId}`)
  }
}

async function loadPublisherBlocksForIds(
  manifest: WordbankManifest,
  publisherIds: string[]
): Promise<{ words: WordEntry[], loadedIds: string[] }> {
  if (publisherIds.length === 0) {
    return { words: [], loadedIds: [] }
  }

  const idSet = new Set(publisherIds)
  const entries = manifest.publishers.filter(entry => idSet.has(entry.publisher.id))
  const blocks = await Promise.all(
    entries.map(entry => {
      const publisherId = entry.publisher.id
      const publisherToken = publisherVersionToken(manifest.version, publisherId)
      return loadPublisherBlock(publisherId, publisherToken)
    })
  )

  return {
    words: blocks.flatMap(expandPublisherBlock),
    loadedIds: blocks.map(block => block.publisher.id)
  }
}

function mergeLoadedWords(existing: WordEntry[], incoming: WordEntry[]): WordEntry[] {
  if (incoming.length === 0) return existing
  if (existing.length === 0) return incoming

  const seen = new Set(existing.map(word => word.id))
  const merged = [...existing]
  for (const word of incoming) {
    if (seen.has(word.id)) continue
    seen.add(word.id)
    merged.push(word)
  }
  return merged
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function notifyWordbankExpanded(words: WordEntry[]) {
  expansionListener?.(words)
}

function scheduleRemainingPublisherLoad(manifest: WordbankManifest) {
  const pendingIds = remainingPublisherIds(manifest, loadedPublisherIds)
  if (pendingIds.length === 0) return
  if (fullLoadPromise) return

  fullLoadPromise = (async () => {
    await delay(BACKGROUND_LOAD_YIELD_MS)

    const { words, loadedIds } = await loadPublisherBlocksForIds(manifest, pendingIds)
    for (const publisherId of loadedIds) {
      loadedPublisherIds.add(publisherId)
    }

    if (words.length > 0 && cachedWords) {
      cachedWords = mergeLoadedWords(cachedWords, words)
      notifyWordbankExpanded(cachedWords)
    }

    return cachedWords ?? words
  })().finally(() => {
    fullLoadPromise = null
  })
}

function clearWordbankMemoryCache() {
  resolvedManifest = null
  cachedWords = null
  loadedPublisherIds = new Set()
  loadPromise = null
  fullLoadPromise = null
}

function activeWordbankVersion(): string {
  return resolvedManifest?.version
    ?? readStorage(WORDBANK_VERSION_KEY)
    ?? bundledManifest.version
}

export function getWordbankManifest(): WordbankManifest {
  return resolvedManifest ?? resolveManifestFast()
}

export function getLoadedWordCount(): number {
  return cachedWords?.length ?? 0
}

export function isPublisherLoaded(publisherId: string): boolean {
  return cachedWords !== null && loadedPublisherIds.has(publisherId)
}

export function isWordbankFullyLoaded(): boolean {
  const manifest = resolvedManifest ?? resolveManifestFast()
  if (manifest.publishers.length === 0) return true
  return remainingPublisherIds(manifest, loadedPublisherIds).length === 0
}

export function onWordbankExpanded(listener: WordbankExpansionListener) {
  expansionListener = listener
}

export function resetWordbankCacheForTests() {
  clearWordbankMemoryCache()
  refreshInFlight = null
  expansionListener = null
  removeStorage(WORDBANK_VERSION_KEY)
  removeStorage(WORDBANK_MANIFEST_KEY)
  removeStorage(WORDBANK_PUBLISHER_IDS_KEY)

  for (const publisher of bundledManifest.publishers) {
    const publisherId = publisher.publisher.id
    removeStorage(`${WORDBANK_CACHE_PREFIX}${publisherId}`)
    removeStorage(`${WORDBANK_PUBLISHER_VERSION_PREFIX}${publisherId}`)
  }
}

export async function ensureManifestReady(): Promise<WordbankManifest> {
  if (resolvedManifest) return resolvedManifest

  const manifest = await resolveManifest()
  resolvedManifest = manifest
  syncPublisherCaches(manifest)
  return manifest
}

export async function ensurePublisherLoaded(publisherId: string): Promise<WordEntry[]> {
  const manifest = await ensureManifestReady()
  if (loadedPublisherIds.has(publisherId) && cachedWords) {
    return cachedWords.filter(word => word.publisherId === publisherId)
  }

  const { words, loadedIds } = await loadPublisherBlocksForIds(manifest, [publisherId])
  for (const id of loadedIds) {
    loadedPublisherIds.add(id)
  }

  cachedWords = mergeLoadedWords(cachedWords ?? [], words)
  writeStorage(WORDBANK_VERSION_KEY, manifest.version)

  if (!loadPromise) {
    loadPromise = Promise.resolve(cachedWords)
  }

  return words
}

export async function ensureWordbankLoaded(): Promise<WordEntry[]> {
  if (cachedWords !== null) return cachedWords
  if (!loadPromise) {
    loadPromise = (async () => {
      const manifest = await resolveManifest()
      resolvedManifest = manifest
      syncPublisherCaches(manifest)

      const priorityIds = collectPriorityPublisherIds(manifest)
      const { words, loadedIds } = await loadPublisherBlocksForIds(manifest, priorityIds)
      for (const publisherId of loadedIds) {
        loadedPublisherIds.add(publisherId)
      }

      cachedWords = words
      writeStorage(WORDBANK_VERSION_KEY, manifest.version)
      return cachedWords
    })()
  }
  return loadPromise
}

export async function ensureWordbankFullyLoaded(): Promise<WordEntry[]> {
  await ensureWordbankLoaded()
  if (isWordbankFullyLoaded()) return cachedWords ?? []

  let pending = fullLoadPromise
  if (!pending) {
    const manifest = resolvedManifest ?? await resolveManifest()
    scheduleRemainingPublisherLoad(manifest)
    pending = fullLoadPromise
  }

  if (pending) {
    await pending.catch(() => undefined)
  }

  return cachedWords ?? []
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

  const selectedPublisher = selectedPublisherId(remote)
  cacheManifest(remote)
  clearWordbankMemoryCache()
  if (selectedPublisher) {
    await ensurePublisherLoaded(selectedPublisher)
  }
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
