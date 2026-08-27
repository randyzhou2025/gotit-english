import { describe, expect, it } from 'vitest'
import {
  buildWordAudio,
  getAudioUrl,
  getDictationAudioUrls,
  getDictationPromptLabel,
  hasPlayableDictationAudio
} from './audio'
import type { WordEntry } from './types'

describe('buildWordAudio', () => {
  it('derives predictable CDN paths from cdnKey', () => {
    expect(buildWordAudio('rj/required-1/unit-welcome/exchange')).toEqual({
      status: 'ready',
      cdnKey: 'rj/required-1/unit-welcome/exchange',
      ukUrl: '/generated/audio/rj/required-1/unit-welcome/exchange/uk.mp3',
      usUrl: '/generated/audio/rj/required-1/unit-welcome/exchange/us.mp3',
      zhUrl: '/generated/audio/rj/required-1/unit-welcome/exchange/zh.mp3'
    })
  })

  it('resolves CDN base URL at runtime', () => {
    const entry = {
      audio: buildWordAudio('shj/required-1/unit-1/digital')
    } as WordEntry

    expect(getAudioUrl(entry, 'uk')).toContain('/shj/required-1/unit-1/digital/uk.mp3')
  })

  it('plays Chinese before English in bilingual dictation', () => {
    const entry = {
      audio: buildWordAudio('shj/required-1/unit-1/digital')
    } as WordEntry
    const plan = { accent: 'uk' as const, prompt: 'bilingual' as const }

    expect(getDictationAudioUrls(entry, plan)).toEqual([
      expect.stringContaining('/shj/required-1/unit-1/digital/zh.mp3'),
      expect.stringContaining('/shj/required-1/unit-1/digital/uk.mp3')
    ])
    expect(hasPlayableDictationAudio(entry, plan)).toBe(true)
    expect(getDictationPromptLabel({ ...plan, mode: 'paper' })).toBe('中英文听写')
  })
})
