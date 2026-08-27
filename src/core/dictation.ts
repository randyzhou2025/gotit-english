import { checkSpelling } from './spelling'
import type {
  Accent,
  DictationMode,
  DictationOrder,
  DictationPlan,
  DictationPrompt,
  DictationRecord,
  DictationRepeatCount,
  WordEntry
} from './types'

function shuffleWords(words: WordEntry[]): WordEntry[] {
  const nextWords = [...words]
  for (let index = nextWords.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = nextWords[index] as WordEntry
    nextWords[index] = nextWords[swapIndex] as WordEntry
    nextWords[swapIndex] = current
  }
  return nextWords
}

function createDictationSessionId(): string {
  return `dictation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function createDictationPlan(
  words: WordEntry[],
  mode: DictationMode,
  accent: Accent,
  prompt: DictationPrompt = 'chinese',
  intervalSeconds = 8,
  order: DictationOrder = 'shuffle',
  repeatCount: DictationRepeatCount = 1
): DictationPlan {
  const planWords = order === 'shuffle' ? shuffleWords(words) : [...words]
  const resolvedMode = prompt === 'bilingual' ? 'paper' : mode

  return {
    id: createDictationSessionId(),
    mode: resolvedMode,
    accent,
    prompt,
    intervalSeconds,
    order,
    repeatCount,
    words: planWords,
    estimatedSeconds: estimateDictationSeconds(words.length, resolvedMode, intervalSeconds, repeatCount)
  }
}

export function estimateDictationSeconds(
  wordCount: number,
  mode: DictationMode,
  intervalSeconds = 8,
  repeatCount: DictationRepeatCount = 1
): number {
  const normalizedWordCount = Math.max(0, Math.floor(wordCount))
  const secondsPerWord = mode === 'paper'
    ? intervalSeconds * repeatCount
    : mode === 'recognition'
      ? Math.max(8, intervalSeconds)
      : Math.max(18, intervalSeconds * repeatCount)

  return normalizedWordCount * secondsPerWord
}

export function gradeDictationInput(entry: WordEntry, input: string): DictationRecord {
  return {
    wordId: entry.id,
    input,
    correct: checkSpelling(input, entry).correct
  }
}

export function formatEstimatedMinutes(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return `${minutes} 分钟`
}
