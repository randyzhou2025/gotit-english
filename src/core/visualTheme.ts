export interface VisualTheme {
  id: string
  name: string
  homeBackground?: string
  tokens: Record<string, string>
}

export const DEFAULT_VISUAL_THEME_ID = 'morning-mint'

const MORNING_MINT_THEME: VisualTheme = {
  id: DEFAULT_VISUAL_THEME_ID,
  name: '晨雾青',
  homeBackground: '/static/themes/morning-mint.jpg',
  tokens: {
    '--page-bg': '#dfece6',
    '--surface': 'rgba(252, 254, 251, 0.90)',
    '--surface-soft': 'rgba(244, 249, 246, 0.80)',
    '--surface-cool': '#e0eee8',
    '--ink': '#173c33',
    '--ink-soft': '#365b50',
    '--muted': '#6c827a',
    '--muted-light': '#9bada5',
    '--line': 'rgba(75, 111, 98, 0.20)',
    '--line-strong': 'rgba(75, 111, 98, 0.34)',
    '--accent': '#1b7158',
    '--accent-strong': '#155744',
    '--accent-soft': '#d5ebe2',
    '--accent-shadow': 'rgba(20, 74, 59, 0.20)',
    '--ink-shadow': 'rgba(20, 74, 59, 0.10)',
    '--shadow-soft': '0 10px 24px rgba(20, 74, 59, 0.10)',
    '--theme-switch-swatch': 'linear-gradient(135deg, #b9d9cc 0%, #1b7158 100%)',
    '--theme-chrome': 'rgba(223, 236, 230, 0.94)',
    '--theme-study-background': 'linear-gradient(180deg, #d9eee7 0%, #bfdcd0 55%, #a8c7aa 100%)',
    '--theme-home-scrim': 'linear-gradient(180deg, rgba(221, 241, 233, 0.28) 0%, rgba(226, 240, 234, 0.56) 38%, rgba(221, 236, 229, 0.92) 77%, #e3eee9 100%)'
  }
}

const CLOUDFIELD_SKY_THEME: VisualTheme = {
  id: 'cloudfield-sky',
  name: '云野蓝',
  homeBackground: '/static/themes/cloudfield-sky.jpg',
  tokens: {
    '--page-bg': '#e8f0f4',
    '--surface': 'rgba(255, 253, 248, 0.92)',
    '--surface-soft': 'rgba(248, 248, 244, 0.84)',
    '--surface-cool': '#e1edf2',
    '--ink': '#263e4b',
    '--ink-soft': '#496371',
    '--muted': '#718691',
    '--muted-light': '#a4b2b8',
    '--line': 'rgba(82, 125, 154, 0.20)',
    '--line-strong': 'rgba(82, 125, 154, 0.34)',
    '--accent': '#527f9d',
    '--accent-strong': '#365f7b',
    '--accent-soft': '#dcebf2',
    '--accent-shadow': 'rgba(54, 95, 123, 0.20)',
    '--ink-shadow': 'rgba(38, 62, 75, 0.10)',
    '--shadow-soft': '0 10px 24px rgba(54, 95, 123, 0.10)',
    '--theme-switch-swatch': 'linear-gradient(135deg, #d7eaf5 0%, #527f9d 62%, #dccbac 100%)',
    '--theme-chrome': 'rgba(232, 240, 244, 0.94)',
    '--theme-study-background': 'linear-gradient(180deg, #e9f3f7 0%, #d9e9ef 55%, #e7dfcf 100%)',
    '--theme-home-scrim': 'linear-gradient(180deg, rgba(226, 240, 249, 0.16) 0%, rgba(234, 242, 246, 0.48) 38%, rgba(231, 239, 241, 0.86) 78%, #e7edf0 100%)'
  }
}

const INK_PEARL_THEME: VisualTheme = {
  id: 'ink-pearl',
  name: '墨影白',
  tokens: {
    '--page-bg': '#f1f1ee',
    '--surface': 'rgba(255, 255, 253, 0.94)',
    '--surface-soft': 'rgba(247, 247, 244, 0.90)',
    '--surface-cool': '#ecece9',
    '--ink': '#171717',
    '--ink-soft': '#444440',
    '--muted': '#777772',
    '--muted-light': '#aaa9a3',
    '--line': 'rgba(23, 23, 23, 0.12)',
    '--line-strong': 'rgba(23, 23, 23, 0.28)',
    '--accent': '#181818',
    '--accent-strong': '#050505',
    '--accent-soft': '#e9e9e6',
    '--danger': '#181818',
    '--accent-shadow': 'rgba(0, 0, 0, 0.18)',
    '--ink-shadow': 'rgba(0, 0, 0, 0.09)',
    '--shadow-soft': '0 10px 24px rgba(0, 0, 0, 0.09)',
    '--theme-switch-swatch': 'linear-gradient(90deg, #171717 0%, #171717 50%, #fff 50%, #fff 100%)',
    '--theme-chrome': 'rgba(247, 247, 244, 0.95)',
    '--theme-study-background': 'linear-gradient(180deg, #f7f7f4 0%, #efefec 55%, #e7e7e3 100%)',
    '--theme-home-scrim': 'linear-gradient(145deg, transparent 0%, transparent 17%, rgba(23, 23, 23, 0.035) 17.2%, transparent 17.7%, transparent 100%), linear-gradient(28deg, transparent 0%, transparent 72%, rgba(23, 23, 23, 0.025) 72.2%, transparent 72.7%, transparent 100%), linear-gradient(180deg, rgba(255, 255, 253, 0.98) 0%, rgba(246, 246, 243, 0.94) 58%, #eeeeeb 100%)'
  }
}

export const VISUAL_THEMES: VisualTheme[] = [
  MORNING_MINT_THEME,
  CLOUDFIELD_SKY_THEME,
  INK_PEARL_THEME
]

export function getVisualTheme(themeId: string | null | undefined): VisualTheme {
  return VISUAL_THEMES.find(theme => theme.id === themeId) ?? MORNING_MINT_THEME
}

export function getNextVisualThemeId(currentThemeId: string | null | undefined): string {
  const currentIndex = VISUAL_THEMES.findIndex(theme => theme.id === currentThemeId)
  if (currentIndex < 0) return DEFAULT_VISUAL_THEME_ID
  return VISUAL_THEMES[(currentIndex + 1) % VISUAL_THEMES.length]?.id ?? DEFAULT_VISUAL_THEME_ID
}

export function serializeVisualThemeTokens(theme: VisualTheme): string {
  return Object.entries(theme.tokens)
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ')
}
