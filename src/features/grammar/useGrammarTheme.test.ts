import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { showCallbacks } = vi.hoisted(() => ({ showCallbacks: [] as Array<() => void> }))
vi.mock('@dcloudio/uni-app', () => ({ onShow: (callback: () => void) => showCallbacks.push(callback) }))

describe('grammar native navigation theme', () => {
  const storage = new Map<string, string>()
  const setNavigationBarColor = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    storage.clear()
    showCallbacks.length = 0
    setNavigationBarColor.mockClear()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key) ?? '',
      setStorageSync: (key: string, value: string) => storage.set(key, value),
      setBackgroundColor: vi.fn(),
      setNavigationBarColor
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['morning-mint', '#dfece6'], ['cloudfield-sky', '#e8f0f4'], ['ink-pearl', '#f1f1ee']
  ])('matches the page background when opening a %s grammar page', async (id, color) => {
    storage.set('gotit:visualTheme:last', id!)
    const { useGrammarTheme } = await import('./useGrammarTheme')
    useGrammarTheme()
    showCallbacks.forEach(show => show())
    expect(setNavigationBarColor).toHaveBeenLastCalledWith({ frontColor: '#000000', backgroundColor: color })
  })

  it('updates a cached grammar page after the home theme changes', async () => {
    const { useGrammarTheme } = await import('./useGrammarTheme')
    const theme = useGrammarTheme()
    showCallbacks.forEach(show => show())
    theme.switchToNextVisualTheme()
    showCallbacks.forEach(show => show())
    expect(setNavigationBarColor).toHaveBeenLastCalledWith({ frontColor: '#000000', backgroundColor: '#e8f0f4' })
  })

  it('keeps navigation synchronization scoped to grammar pages', async () => {
    const { useVisualTheme } = await import('@/app/useVisualTheme')
    useVisualTheme()
    showCallbacks.forEach(show => show())
    expect(setNavigationBarColor).not.toHaveBeenCalled()
  })
})
