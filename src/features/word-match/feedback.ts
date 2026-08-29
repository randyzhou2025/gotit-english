type FeedbackKind = 'correct' | 'wrong'
type HapticStrength = 'light' | 'medium'

interface AudioContextLike {
  autoplay: boolean
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

let audioContexts: Partial<Record<FeedbackKind, AudioContextLike>> = {}

function createAudioContext(kind: FeedbackKind): AudioContextLike | null {
  try {
    if (typeof uni.createInnerAudioContext !== 'function') return null
    const context = uni.createInnerAudioContext() as unknown as AudioContextLike
    context.autoplay = false
    context.volume = kind === 'correct' ? 0.42 : 0.32
    context.src = AUDIO_PATHS[kind]
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
  if (!audioContexts.correct) audioContexts.correct = createAudioContext('correct') ?? undefined
  if (!audioContexts.wrong) audioContexts.wrong = createAudioContext('wrong') ?? undefined
}

export function playWordMatchFeedback(kind: FeedbackKind) {
  prepareWordMatchFeedback()
  triggerHaptic(kind === 'correct' ? 'light' : 'medium')
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

export function disposeWordMatchFeedback() {
  for (const context of Object.values(audioContexts)) {
    try {
      context?.destroy()
    } catch {
      // Ignore teardown errors in restricted runtimes.
    }
  }
  audioContexts = {}
}
