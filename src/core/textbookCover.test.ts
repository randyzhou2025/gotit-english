import { afterEach, describe, expect, it, vi } from 'vitest'

describe('textbookCover', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
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

  it('appends CDN Last-Modified as cache-bust version', async () => {
    vi.stubEnv('VITE_COVERS_CDN_BASE_URL', 'https://audio.xuexidazi.site/generated/textbook-covers/')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, {
      status: 200,
      headers: {
        'Last-Modified': 'Tue, 18 Aug 2026 09:36:55 GMT',
      },
    }))

    const coverModule = await import('./textbookCover')
    const before = coverModule.getTextbookCoverRevision()
    await coverModule.ensureTextbookCoverVersion('ylj', 'grade-9-1')

    expect(coverModule.buildTextbookCoverUrl('ylj', 'grade-9-1')).toBe(
      `https://audio.xuexidazi.site/generated/textbook-covers/ylj-grade-9-1.jpg?v=${Date.parse('Tue, 18 Aug 2026 09:36:55 GMT')}`
    )
    expect(coverModule.getTextbookCoverRevision()).toBe(before + 1)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://audio.xuexidazi.site/generated/textbook-covers/ylj-grade-9-1.jpg',
      { method: 'HEAD', cache: 'no-store' },
    )
  })
})
