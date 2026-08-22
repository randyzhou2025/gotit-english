const DAILY_DICTATION_PROGRESS_KEY = 'gotit:dailyDictationProgress'

interface DailyDictationProgress {
  date: string
  completedWordCount: number
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function loadTodayDictationWordCount(date = new Date()): number {
  try {
    const saved = uni.getStorageSync(DAILY_DICTATION_PROGRESS_KEY) as Partial<DailyDictationProgress> | null
    if (!saved || saved.date !== localDateKey(date)) return 0

    const count = Number(saved.completedWordCount)
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
  } catch {
    return 0
  }
}

export function recordTodayDictationWords(completedWordCount: number, date = new Date()): number {
  const increment = Math.max(0, Math.floor(completedWordCount))
  const nextCount = loadTodayDictationWordCount(date) + increment

  try {
    uni.setStorageSync(DAILY_DICTATION_PROGRESS_KEY, {
      date: localDateKey(date),
      completedWordCount: nextCount
    } satisfies DailyDictationProgress)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }

  return nextCount
}
