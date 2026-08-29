import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  disposeWordMatchFeedback,
  playWordMatchFeedback
} from './feedback'

describe('word match multimodal feedback', () => {
  const contexts = Array.from({ length: 2 }, () => ({
    autoplay: false,
    src: '',
    volume: 0,
    play: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    destroy: vi.fn()
  }))
  const vibrateShort = vi.fn()

  beforeEach(() => {
    disposeWordMatchFeedback()
    contexts.forEach(context => {
      context.play.mockReset()
      context.stop.mockReset()
      context.seek.mockReset()
      context.destroy.mockReset()
    })
    vibrateShort.mockReset()
    let contextIndex = 0
    vi.stubGlobal('uni', {
      createInnerAudioContext: vi.fn(() => contexts[contextIndex++]!),
      vibrateShort
    })
  })

  it('plays a light success cue and a medium error cue', () => {
    playWordMatchFeedback('correct')
    expect(contexts[0]!.src).toBe('/static/audio/word-match-correct.mp3')
    expect(contexts[0]!.play).toHaveBeenCalledOnce()
    expect(vibrateShort).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'light' }))

    playWordMatchFeedback('wrong')
    expect(contexts[1]!.src).toBe('/static/audio/word-match-wrong.mp3')
    expect(contexts[1]!.play).toHaveBeenCalledOnce()
    expect(vibrateShort).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'medium' }))
  })
})
