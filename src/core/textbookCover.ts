const LOCAL_COVERS_BASE_PATH = '/static/textbook-covers'
const coversCdnBaseUrl = String(import.meta.env.VITE_COVERS_CDN_BASE_URL || '').replace(/\/+$/, '')

let coverVersionByKey = new Map<string, string>()
let coverRevision = 0
const coverRevisionListeners = new Set<() => void>()
const coverVersionRequests = new Map<string, Promise<void>>()

function coverKey(publisherId: string, bookId: string): string {
  return `${publisherId}:${bookId}`
}

function coverFileName(publisherId: string, bookId: string): string {
  return `${publisherId}-${bookId}.jpg`
}

function coverBaseUrl(publisherId: string, bookId: string): string {
  const fileName = coverFileName(publisherId, bookId)
  return coversCdnBaseUrl
    ? `${coversCdnBaseUrl}/${fileName}`
    : `${LOCAL_COVERS_BASE_PATH}/${fileName}`
}

function notifyCoverRevision(): void {
  coverRevision += 1
  for (const listener of coverRevisionListeners) {
    listener()
  }
}

function readCoverVersionFromHeaders(response: Response): string | undefined {
  const etag = response.headers.get('etag')?.replace(/^W\/"|"/g, '').trim()
  if (etag) return etag

  const lastModified = response.headers.get('last-modified')
  if (!lastModified) return undefined

  const timestamp = Date.parse(lastModified)
  return Number.isFinite(timestamp) ? String(timestamp) : undefined
}

export function getTextbookCoverRevision(): number {
  return coverRevision
}

export function subscribeTextbookCoverRevision(listener: () => void): () => void {
  coverRevisionListeners.add(listener)
  return () => {
    coverRevisionListeners.delete(listener)
  }
}

export async function ensureTextbookCoverVersion(
  publisherId: string,
  bookId: string,
): Promise<void> {
  if (!coversCdnBaseUrl) return

  const key = coverKey(publisherId, bookId)
  if (coverVersionByKey.has(key)) return

  const pending = coverVersionRequests.get(key)
  if (pending) {
    await pending
    return
  }

  const request = (async () => {
    try {
      const response = await fetch(coverBaseUrl(publisherId, bookId), {
        method: 'HEAD',
        cache: 'no-store',
      })
      if (!response.ok) return

      const version = readCoverVersionFromHeaders(response)
      if (!version) return

      coverVersionByKey.set(key, version)
      notifyCoverRevision()
    } catch {
      // Keep plain URLs when CDN metadata is unavailable.
    } finally {
      coverVersionRequests.delete(key)
    }
  })()

  coverVersionRequests.set(key, request)
  await request
}

export function buildTextbookCoverUrl(publisherId: string, bookId: string): string {
  const baseUrl = coverBaseUrl(publisherId, bookId)
  const version = coverVersionByKey.get(coverKey(publisherId, bookId))
  if (!version) return baseUrl
  return `${baseUrl}?v=${encodeURIComponent(version)}`
}

// Backward-compatible aliases used by existing call sites/tests.
export const getTextbookCoverManifestRevision = getTextbookCoverRevision
export const subscribeTextbookCoverManifest = subscribeTextbookCoverRevision

export async function ensureTextbookCoverManifestLoaded(): Promise<void> {
  // No-op: cover versions resolve per book via CDN HEAD metadata.
}
