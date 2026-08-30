export interface ThemeAssetSources {
  primary: string
  fallback: string
}

const LOCAL_THEME_BASE_PATH = '/generated/themes'

function siblingThemeBase(baseUrl: string, currentSuffix: string): string {
  return baseUrl.endsWith(currentSuffix)
    ? `${baseUrl.slice(0, -currentSuffix.length)}/generated/themes`
    : ''
}

function resolveThemeBaseUrl(): string {
  const explicit = String(import.meta.env.VITE_THEME_CDN_BASE_URL || '').replace(/\/+$/, '')
  if (explicit) return explicit

  const wordbankBase = String(import.meta.env.VITE_WORDBANK_CDN_BASE_URL || '').replace(/\/+$/, '')
  const wordbankSibling = siblingThemeBase(wordbankBase, '/generated/wordbank')
  if (wordbankSibling) return wordbankSibling

  const audioBase = String(import.meta.env.VITE_AUDIO_CDN_BASE_URL || '').replace(/\/+$/, '')
  return siblingThemeBase(audioBase, '/generated/audio') || LOCAL_THEME_BASE_PATH
}

const themeBaseUrl = resolveThemeBaseUrl()

export function buildThemeAssetSources(name: string): ThemeAssetSources {
  return {
    primary: `${themeBaseUrl}/${name}.webp`,
    fallback: `${themeBaseUrl}/${name}.jpg`
  }
}
