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
const audioCdnBaseUrl = String(import.meta.env.VITE_AUDIO_CDN_BASE_URL || '').replace(/\/+$/, '')
const BACKGROUND_MUSIC_URL = audioCdnBaseUrl
  ? `${audioCdnBaseUrl}/word-match/bgm-v1.mp3`
  : ''
const BACKGROUND_MUSIC_CACHE_FILE = 'word-match-bgm-v1.mp3'
const BACKGROUND_MUSIC_VOLUME = 0.12
const SOUND_ENABLED_STORAGE_KEY = 'word-match-sound-enabled'

let audioContexts: Partial<Record<FeedbackKind, AudioContextLike>> = {}
let backgroundMusicContext: AudioContextLike | null = null
let backgroundMusicPlaying = false
let backgroundMusicRequested = false
let backgroundMusicSource = ''
let backgroundMusicSourcePromise: Promise<string> | null = null
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

function createBackgroundMusicContext(source: string): AudioContextLike | null {
  try {
    if (typeof uni.createInnerAudioContext !== 'function') return null
    const context = uni.createInnerAudioContext() as unknown as AudioContextLike
    context.autoplay = false
    context.loop = true
    context.volume = BACKGROUND_MUSIC_VOLUME
    context.src = source
    return context
  } catch {
    return null
  }
}

interface FileSystemLike {
  access: (options: { path: string; success: () => void; fail: () => void }) => void
  saveFile: (options: {
    tempFilePath: string
    filePath: string
    success: (result?: { savedFilePath?: string }) => void
    fail: () => void
  }) => void
}

function fileExists(fileSystem: FileSystemLike, path: string): Promise<boolean> {
  return new Promise(resolve => {
    fileSystem.access({ path, success: () => resolve(true), fail: () => resolve(false) })
  })
}

function downloadBackgroundMusic(url: string): Promise<string> {
  return new Promise(resolve => {
    try {
      uni.downloadFile({
        url,
        success: result => {
          const statusCode = result.statusCode ?? 0
          resolve(statusCode >= 200 && statusCode < 300 ? result.tempFilePath : '')
        },
        fail: () => resolve('')
      })
    } catch {
      resolve('')
    }
  })
}

function saveBackgroundMusic(
  fileSystem: FileSystemLike,
  tempFilePath: string,
  filePath: string
): Promise<string> {
  return new Promise(resolve => {
    fileSystem.saveFile({
      tempFilePath,
      filePath,
      success: result => resolve(result?.savedFilePath || filePath),
      fail: () => resolve('')
    })
  })
}

async function resolveBackgroundMusicSource(): Promise<string> {
  if (!BACKGROUND_MUSIC_URL) return ''

  const runtime = uni as typeof uni & {
    env?: { USER_DATA_PATH?: string }
    getFileSystemManager?: () => FileSystemLike
  }
  const userDataPath = runtime.env?.USER_DATA_PATH
  if (!userDataPath || typeof runtime.getFileSystemManager !== 'function') {
    return BACKGROUND_MUSIC_URL
  }

  const fileSystem = runtime.getFileSystemManager()
  const cachedPath = `${userDataPath}/${BACKGROUND_MUSIC_CACHE_FILE}`
  if (await fileExists(fileSystem, cachedPath)) return cachedPath

  const tempFilePath = await downloadBackgroundMusic(BACKGROUND_MUSIC_URL)
  if (!tempFilePath) return ''

  return await saveBackgroundMusic(fileSystem, tempFilePath, cachedPath) || tempFilePath
}

function getBackgroundMusicSource(): Promise<string> {
  if (backgroundMusicSource) return Promise.resolve(backgroundMusicSource)
  if (!backgroundMusicSourcePromise) {
    backgroundMusicSourcePromise = resolveBackgroundMusicSource().then(source => {
      backgroundMusicSource = source
      backgroundMusicSourcePromise = null
      return source
    })
  }
  return backgroundMusicSourcePromise
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
  backgroundMusicRequested = true
  if (!isWordMatchSoundEnabled()) return
  void getBackgroundMusicSource().then(source => {
    if (!source || !backgroundMusicRequested || !isWordMatchSoundEnabled()) return
    if (!backgroundMusicContext) backgroundMusicContext = createBackgroundMusicContext(source)
    if (!backgroundMusicContext || backgroundMusicPlaying) return
    try {
      backgroundMusicContext.play()
      backgroundMusicPlaying = true
    } catch {
      // The game remains usable when playback is blocked by the runtime.
    }
  })
}

export function stopWordMatchBackgroundMusic() {
  backgroundMusicRequested = false
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
