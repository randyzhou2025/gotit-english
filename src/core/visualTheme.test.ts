import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VISUAL_THEME_ID,
  getNextVisualThemeId,
  getVisualTheme,
  serializeVisualThemeTokens,
  VISUAL_THEMES
} from './visualTheme'

describe('visual themes', () => {
  it('ships a complete fallback palette for the primary app screens', () => {
    const theme = getVisualTheme(DEFAULT_VISUAL_THEME_ID)

    expect(theme.homeBackground).toBe('/static/themes/morning-mint.jpg')
    expect(theme.tokens['--theme-study-background']).toContain('linear-gradient')
    expect(theme.tokens['--page-bg']).toBeTruthy()
    expect(theme.tokens['--surface']).toBeTruthy()
    expect(theme.tokens['--accent']).toBeTruthy()
    expect(theme.tokens['--ink']).toBeTruthy()
  })

  it('ships three three-character named themes with complete linked-screen tokens', () => {
    expect(VISUAL_THEMES).toHaveLength(3)
    expect(VISUAL_THEMES.map(theme => theme.name)).toEqual(['晨雾青', '云野蓝', '墨影白'])
    expect(VISUAL_THEMES.every(theme => Array.from(theme.name).length === 3)).toBe(true)

    const cloudfield = getVisualTheme('cloudfield-sky')
    expect(cloudfield.homeBackground).toBe('/static/themes/cloudfield-sky.jpg')
    expect(cloudfield.tokens['--theme-study-background']).toContain('linear-gradient')
    expect(cloudfield.tokens['--theme-switch-swatch']).toContain('linear-gradient')

    const inkPearl = getVisualTheme('ink-pearl')
    expect(inkPearl.homeBackground).toBeUndefined()
    expect(inkPearl.tokens['--accent']).toBe('#181818')
    expect(inkPearl.tokens['--danger']).toBe('#181818')
    expect(inkPearl.tokens['--theme-home-scrim']).toContain('linear-gradient')
  })

  it('defaults to morning mint, restores a saved theme, and cycles predictably on tap', () => {
    expect(getVisualTheme('').id).toBe(DEFAULT_VISUAL_THEME_ID)
    expect(getVisualTheme('cloudfield-sky').id).toBe('cloudfield-sky')
    expect(getNextVisualThemeId(DEFAULT_VISUAL_THEME_ID)).toBe('cloudfield-sky')
    expect(getNextVisualThemeId('cloudfield-sky')).toBe('ink-pearl')
    expect(getNextVisualThemeId('ink-pearl')).toBe(DEFAULT_VISUAL_THEME_ID)
    expect(getNextVisualThemeId('unknown')).toBe(DEFAULT_VISUAL_THEME_ID)
  })

  it('serializes theme data as root-level CSS variables', () => {
    const style = serializeVisualThemeTokens(getVisualTheme(DEFAULT_VISUAL_THEME_ID))

    expect(style).toContain('--page-bg: #dfece6;')
    expect(style).toContain('--theme-study-background: linear-gradient(')
    expect(style).not.toContain('undefined')
  })
})
