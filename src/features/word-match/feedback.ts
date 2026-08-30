type FeedbackKind = 'correct' | 'wrong'
type HapticStrength = 'light' | 'medium'

interface AudioContextLike {
  autoplay: boolean
  loop: boolean
  src: string
  volume: number
  play: () => void
  stop: () => void
  seek: (position: number) => void
  destroy: () => void
}

const AUDIO_PATHS: Record<FeedbackKind, string> = {
  correct: '/static/audio/word-match-correct.mp3',
  wrong: '/static/audio/word-match-wrong.mp3'
}
const BACKGROUND_MUSIC_PATH = '/static/audio/word-match-bgm.mp3'
const BACKGROUND_MUSIC_VOLUME = 0.12
const SOUND_ENABLED_STORAGE_KEY = 'word-match-sound-enabled'

let audioContexts: Partial<Record<FeedbackKind, AudioContextLike>> = {}
let backgroundMusicContext: AudioContextLike | null = null
let backgroundMusicPlaying = false
let soundEnabled = true
let soundPreferenceLoaded = false

function loadSoundPreference() {
  if (soundPreferenceLoaded) return
  soundPreferenceLoaded = true
  try {
    const storage = uni as unknown as { getStorageSync?: (key: string) => unknown }
    const saved = storage.getStorageSync?.(SOUND_ENABLED_STORAGE_KEY)
    soundEnabled = saved !== false && saved !== 'false' && saved !== 0
  } catch {
    soundEnabled = true
  }
}

export function isWordMatchSoundEnabled() {
  loadSoundPreference()
  return soundEnabled
}

export function setWordMatchSoundEnabled(enabled: boolean) {
  soundPreferenceLoaded = true
  soundEnabled = enabled
  try {
    const storage = uni as unknown as { setStorageSync?: (key: string, value: boolean) => void }
    storage.setStorageSync?.(SOUND_ENABLED_STORAGE_KEY, enabled)
  } catch {
    // Keep the in-memory preference when storage is unavailable.
  }
  if (!enabled) stopWordMatchBackgroundMusic()
}

function createAudioContext(kind: FeedbackKind): AudioContextLike | null {
  try {
    if (typeof uni.createInnerAudioContext !== 'function') return null
    const context = uni.createInnerAudioContext() as unknown as AudioContextLike
    context.autoplay = false
    context.loop = false
    context.volume = kind === 'correct' ? 0.42 : 0.32
    context.src = AUDIO_PATHS[kind]
    return context
  } catch {
    return null
  }
}

function createBackgroundMusicContext(): AudioContextLike | null {
  try {
    if (typeof uni.createInnerAudioContext !== 'function') return null
    const context = uni.createInnerAudioContext() as unknown as AudioContextLike
    context.autoplay = false
    context.loop = true
    context.volume = BACKGROUND_MUSIC_VOLUME
    context.src = BACKGROUND_MUSIC_PATH
    return context
  } catch {
    return null
  }
}

function triggerHaptic(strength: HapticStrength) {
  try {
    const feedback = uni as unknown as {
      vibrateShort?: (options?: { type?: HapticStrength; fail?: () => void }) => void
    }
    const runtime = globalThis as unknown as {
      wx?: { vibrateShort?: (options?: { type?: HapticStrength; fail?: () => void }) => void }
    }
    const plainFallback = () => {
      if (feedback.vibrateShort) feedback.vibrateShort({})
      else runtime.wx?.vibrateShort?.({})
    }
    if (feedback.vibrateShort) feedback.vibrateShort({ type: strength, fail: plainFallback })
    else runtime.wx?.vibrateShort?.({ type: strength, fail: plainFallback })
  } catch {
    // Haptics are unavailable in some preview runtimes.
  }
}

export function prepareWordMatchFeedback() {
  if (!isWordMatchSoundEnabled()) return
  if (!audioContexts.correct) audioContexts.correct = createAudioContext('correct') ?? undefined
  if (!audioContexts.wrong) audioContexts.wrong = createAudioContext('wrong') ?? undefined
}

export function playWordMatchFeedback(kind: FeedbackKind) {
  triggerHaptic(kind === 'correct' ? 'light' : 'medium')
  if (!isWordMatchSoundEnabled()) return
  prepareWordMatchFeedback()
  const context = audioContexts[kind]
  if (!context) return
  try {
    context.stop()
    context.seek(0)
    context.play()
  } catch {
    // Visual feedback remains available if audio playback is blocked.
  }
}

export function startWordMatchBackgroundMusic() {
  if (!isWordMatchSoundEnabled()) return
  if (!backgroundMusicContext) backgroundMusicContext = createBackgroundMusicContext()
  if (!backgroundMusicContext || backgroundMusicPlaying) return
  try {
    backgroundMusicContext.play()
    backgroundMusicPlaying = true
  } catch {
    // The game remains usable when autoplay is blocked by the runtime.
  }
}

export function stopWordMatchBackgroundMusic() {
  backgroundMusicPlaying = false
  try {
    backgroundMusicContext?.stop()
  } catch {
    // Ignore teardown errors in restricted runtimes.
  }
}

export function disposeWordMatchFeedback() {
  stopWordMatchBackgroundMusic()
  for (const context of Object.values(audioContexts)) {
    try {
      context?.destroy()
    } catch {
      // Ignore teardown errors in restricted runtimes.
    }
  }
  audioContexts = {}
  try {
    backgroundMusicContext?.destroy()
  } catch {
    // Ignore teardown errors in restricted runtimes.
  }
  backgroundMusicContext = null
}
