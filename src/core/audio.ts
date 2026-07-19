import type { Accent, DictationPlan, WordAudio, WordEntry } from './types'

const LOCAL_AUDIO_BASE_PATH = '/generated/audio'
const audioCdnBaseUrl = String(import.meta.env.VITE_AUDIO_CDN_BASE_URL || '').replace(/\/+$/, '')

export function buildWordAudio(cdnKey: string): WordAudio {
  const base = `${LOCAL_AUDIO_BASE_PATH}/${cdnKey}`
  return {
    status: 'ready',
    cdnKey,
    ukUrl: `${base}/uk.mp3`,
    usUrl: `${base}/us.mp3`,
    zhUrl: `${base}/zh.mp3`
  }
}

function resolveAudioUrl(url: string): string {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  if (!audioCdnBaseUrl) return url

  if (url.startsWith(`${LOCAL_AUDIO_BASE_PATH}/`)) {
    return `${audioCdnBaseUrl}/${url.slice(LOCAL_AUDIO_BASE_PATH.length + 1)}`
  }

  return url.startsWith('/') ? `${audioCdnBaseUrl}${url}` : `${audioCdnBaseUrl}/${url}`
}

export function getAudioUrl(entry: WordEntry, accent: Accent): string {
  return resolveAudioUrl(accent === 'uk' ? entry.audio.ukUrl : entry.audio.usUrl)
}

export function getDictationAudioUrl(entry: WordEntry, plan: Pick<DictationPlan, 'accent' | 'prompt'>): string {
  return plan.prompt === 'chinese' ? resolveAudioUrl(entry.audio.zhUrl) : getAudioUrl(entry, plan.accent)
}

export function hasPlayableAudio(entry: WordEntry, accent: Accent): boolean {
  return Boolean(getAudioUrl(entry, accent))
}

export function hasPlayableDictationAudio(entry: WordEntry, plan: Pick<DictationPlan, 'accent' | 'prompt'>): boolean {
  return Boolean(getDictationAudioUrl(entry, plan))
}

export function getAccentLabel(accent: Accent): string {
  return accent === 'uk' ? '英音' : '美音'
}

export function getDictationPromptLabel(plan: Pick<DictationPlan, 'accent' | 'prompt'>): string {
  return plan.prompt === 'chinese' ? '中文听写' : `${getAccentLabel(plan.accent)}听写`
}
