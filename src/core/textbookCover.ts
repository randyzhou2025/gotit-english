const LOCAL_COVERS_BASE_PATH = '/static/textbook-covers'
const coversCdnBaseUrl = String(import.meta.env.VITE_COVERS_CDN_BASE_URL || '').replace(/\/+$/, '')

export function buildTextbookCoverUrl(publisherId: string, bookId: string): string {
  const fileName = `${publisherId}-${bookId}.jpg`
  const localPath = `${LOCAL_COVERS_BASE_PATH}/${fileName}`
  if (!coversCdnBaseUrl) return localPath
  return `${coversCdnBaseUrl}/${fileName}`
}
