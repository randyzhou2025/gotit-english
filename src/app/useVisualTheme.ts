import { computed, ref } from 'vue'
import {
  DEFAULT_VISUAL_THEME_ID,
  getNextVisualThemeId,
  getVisualTheme,
  serializeVisualThemeTokens
} from '@/core/visualTheme'
import { trackAnalyticsEvent } from '@/core/analytics'

const VISUAL_THEME_STORAGE_KEY = 'gotit:visualTheme:last'

const activeVisualThemeId = ref(DEFAULT_VISUAL_THEME_ID)
let initialized = false

function saveActiveVisualThemeId() {
  try {
    uni.setStorageSync(VISUAL_THEME_STORAGE_KEY, activeVisualThemeId.value)
  } catch {
    // The in-memory theme still stays stable for this app session.
  }
}

export function initializeVisualTheme() {
  if (initialized) return

  let previousThemeId = ''
  try {
    previousThemeId = String(uni.getStorageSync(VISUAL_THEME_STORAGE_KEY) || '')
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }

  activeVisualThemeId.value = getVisualTheme(previousThemeId).id
  initialized = true

  saveActiveVisualThemeId()
  const theme = getVisualTheme(activeVisualThemeId.value)
  trackAnalyticsEvent('theme_selected', { themeId: theme.id, themeName: theme.name })
}

function switchToNextVisualTheme() {
  activeVisualThemeId.value = getNextVisualThemeId(activeVisualThemeId.value)
  saveActiveVisualThemeId()
  const theme = getVisualTheme(activeVisualThemeId.value)
  trackAnalyticsEvent('theme_selected', { themeId: theme.id, themeName: theme.name })
}

export function useVisualTheme() {
  initializeVisualTheme()

  const activeVisualTheme = computed(() => getVisualTheme(activeVisualThemeId.value))
  const activeVisualThemeStyle = computed(() => serializeVisualThemeTokens(activeVisualTheme.value))

  return {
    activeVisualTheme,
    activeVisualThemeId,
    activeVisualThemeStyle,
    switchToNextVisualTheme
  }
}
