import { describe, expect, it } from 'vitest'
import { buildThemeAssetSources } from './themeAssets'

describe('theme CDN assets', () => {
  it('keeps WebP primary and JPG fallback URLs ready for non-core images', () => {
    const sources = buildThemeAssetSources('future-background')

    expect(sources.primary).toMatch(/\/generated\/themes\/future-background\.webp$/)
    expect(sources.fallback).toMatch(/\/generated\/themes\/future-background\.jpg$/)
  })
})
