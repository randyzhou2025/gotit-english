import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('visual theme preference', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    vi.resetModules()
    storage.clear()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key) ?? '',
      setStorageSync: (key: string, value: string) => storage.set(key, value)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to morning mint and saves a user switch', async () => {
    const { useVisualTheme } = await import('./useVisualTheme')
    const theme = useVisualTheme()

    expect(theme.activeVisualTheme.value.name).toBe('晨雾青')
    theme.switchToNextVisualTheme()
    expect(theme.activeVisualTheme.value.name).toBe('云野蓝')
    expect(storage.get('gotit:visualTheme:last')).toBe('cloudfield-sky')
    theme.switchToNextVisualTheme()
    expect(theme.activeVisualTheme.value.name).toBe('墨影白')
    expect(storage.get('gotit:visualTheme:last')).toBe('ink-pearl')
    theme.switchToNextVisualTheme()
    expect(theme.activeVisualTheme.value.name).toBe('晨雾青')
    expect(storage.get('gotit:visualTheme:last')).toBe('morning-mint')
  })

  it('restores the saved theme on the next launch', async () => {
    storage.set('gotit:visualTheme:last', 'ink-pearl')
    const { useVisualTheme } = await import('./useVisualTheme')

    expect(useVisualTheme().activeVisualTheme.value.name).toBe('墨影白')
  })
})
