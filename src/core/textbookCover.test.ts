import { afterEach, describe, expect, it, vi } from 'vitest'

describe('buildTextbookCoverUrl', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('uses local static path when CDN base is unset', async () => {
    vi.stubEnv('VITE_COVERS_CDN_BASE_URL', '')
    const { buildTextbookCoverUrl } = await import('./textbookCover')
    expect(buildTextbookCoverUrl('ylj', 'grade-7-1')).toBe('/static/textbook-covers/ylj-grade-7-1.jpg')
  })

  it('uses CDN URL when base is configured', async () => {
    vi.stubEnv('VITE_COVERS_CDN_BASE_URL', 'https://audio.xuexidazi.site/generated/textbook-covers/')
    const { buildTextbookCoverUrl } = await import('./textbookCover')
    expect(buildTextbookCoverUrl('ylj', 'grade-7-1')).toBe(
      'https://audio.xuexidazi.site/generated/textbook-covers/ylj-grade-7-1.jpg'
    )
  })
})
