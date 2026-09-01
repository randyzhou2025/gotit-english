import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  disposeWordMatchFeedback,
  isWordMatchSoundEnabled,
  playWordMatchFeedback,
  setWordMatchSoundEnabled,
  startWordMatchBackgroundMusic,
  stopWordMatchBackgroundMusic
} from './feedback'

describe('word match multimodal feedback', () => {
  const contexts = Array.from({ length: 3 }, () => ({
    autoplay: false,
    loop: false,
    src: '',
    volume: 0,
    play: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    destroy: vi.fn()
  }))
  const vibrateShort = vi.fn()
  const setStorageSync = vi.fn()
  const downloadFile = vi.fn()
  const access = vi.fn()
  const saveFile = vi.fn()

  beforeEach(() => {
    disposeWordMatchFeedback()
    contexts.forEach(context => {
      context.play.mockReset()
      context.stop.mockReset()
      context.seek.mockReset()
      context.destroy.mockReset()
    })
    vibrateShort.mockReset()
    setStorageSync.mockReset()
    downloadFile.mockReset()
    access.mockReset()
    saveFile.mockReset()
    access.mockImplementation(options => options.fail())
    downloadFile.mockImplementation(options => options.success({
      statusCode: 200,
      tempFilePath: '/tmp/word-match-bgm.mp3'
    }))
    saveFile.mockImplementation(options => options.success({ savedFilePath: options.filePath }))
    let contextIndex = 0
    vi.stubGlobal('uni', {
      createInnerAudioContext: vi.fn(() => contexts[contextIndex++]!),
      downloadFile,
      env: { USER_DATA_PATH: '/user-data' },
      getFileSystemManager: vi.fn(() => ({ access, saveFile })),
      setStorageSync,
      vibrateShort
    })
    setWordMatchSoundEnabled(true)
    setStorageSync.mockClear()
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

  it('silently skips background music when the first download fails', async () => {
    downloadFile.mockImplementation(options => options.fail())

    startWordMatchBackgroundMusic()
    await vi.waitFor(() => expect(downloadFile).toHaveBeenCalledOnce())

    expect(uni.createInnerAudioContext).not.toHaveBeenCalled()
  })

  it('downloads, persists and loops quiet background music without duplicate requests', async () => {
    playWordMatchFeedback('correct')
    playWordMatchFeedback('wrong')

    startWordMatchBackgroundMusic()
    startWordMatchBackgroundMusic()

    await vi.waitFor(() => expect(contexts[2]!.play).toHaveBeenCalledOnce())
    expect(downloadFile).toHaveBeenCalledOnce()
    expect(downloadFile).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('/generated/audio/word-match/bgm-v1.mp3')
    }))
    expect(saveFile).toHaveBeenCalledWith(expect.objectContaining({
      tempFilePath: '/tmp/word-match-bgm.mp3',
      filePath: '/user-data/word-match-bgm-v1.mp3'
    }))
    expect(contexts[2]!.src).toBe('/user-data/word-match-bgm-v1.mp3')
    expect(contexts[2]!.loop).toBe(true)
    expect(contexts[2]!.volume).toBe(0.12)

    stopWordMatchBackgroundMusic()
    expect(contexts[2]!.stop).toHaveBeenCalledOnce()
  })

  it('persists mute, silences music and cues, but keeps haptic feedback', () => {
    setWordMatchSoundEnabled(false)
    playWordMatchFeedback('correct')
    startWordMatchBackgroundMusic()

    expect(isWordMatchSoundEnabled()).toBe(false)
    expect(setStorageSync).toHaveBeenCalledWith('word-match-sound-enabled', false)
    expect(uni.createInnerAudioContext).not.toHaveBeenCalled()
    expect(vibrateShort).toHaveBeenCalledOnce()
  })
})
