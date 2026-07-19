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
  const secondsPerWord = mode === 'paper'
    ? intervalSeconds * repeatCount
    : mode === 'recognition'
      ? Math.max(8, intervalSeconds)
      : Math.max(18, intervalSeconds * repeatCount)

  return {
    id: `dictation:${mode}:${accent}:${prompt}:${intervalSeconds}:${order}:${repeatCount}:${planWords.map(word => word.id).join('|')}`,
    mode,
    accent,
    prompt,
    intervalSeconds,
    order,
    repeatCount,
    words: planWords,
    estimatedSeconds: words.length * secondsPerWord
  }
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
