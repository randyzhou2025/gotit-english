import type { Accent, DictationPlan, WordEntry } from './types'

export function getAudioUrl(entry: WordEntry, accent: Accent): string {
  return accent === 'uk' ? entry.audio.ukUrl : entry.audio.usUrl
}

export function getDictationAudioUrl(entry: WordEntry, plan: Pick<DictationPlan, 'accent' | 'prompt'>): string {
  return plan.prompt === 'chinese' ? entry.audio.zhUrl : getAudioUrl(entry, plan.accent)
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
