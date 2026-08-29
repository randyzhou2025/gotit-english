const WORD_MATCH_PROGRESS_KEY = 'gotit:wordMatch:completedRounds:v2'
const WORD_MATCH_PENDING_REWARDS_KEY = 'gotit:wordMatch:pendingRewards:v1'

type StoredProgress = Record<string, number[]>

export interface PendingWordMatchReward {
  unitId: string
  roundIndex: number
  wordCount: number
  bestCombo: number
  errorCount: number
}

function readProgress(): StoredProgress {
  try {
    const value = uni.getStorageSync(WORD_MATCH_PROGRESS_KEY)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value as StoredProgress
  } catch {
    return {}
  }
}

function writeProgress(progress: StoredProgress) {
  try {
    uni.setStorageSync(WORD_MATCH_PROGRESS_KEY, progress)
  } catch {
    // The game remains playable when local storage is unavailable.
  }
}

export function completedWordMatchRounds(unitId: string, roundCount: number): number[] {
  const completed = readProgress()[unitId] ?? []
  return Array.from(new Set(completed))
    .filter(index => Number.isInteger(index) && index >= 0 && index < roundCount)
    .sort((left, right) => left - right)
}

export function nextWordMatchRound(unitId: string, roundCount: number): number {
  if (roundCount <= 0) return 0
  const completed = new Set(completedWordMatchRounds(unitId, roundCount))
  for (let index = 0; index < roundCount; index += 1) {
    if (!completed.has(index)) return index
  }
  return 0
}

export function markWordMatchRoundCompleted(unitId: string, roundIndex: number) {
  const progress = readProgress()
  progress[unitId] = Array.from(new Set([...(progress[unitId] ?? []), roundIndex]))
    .filter(index => Number.isInteger(index) && index >= 0)
    .sort((left, right) => left - right)
  writeProgress(progress)
}

export function pendingWordMatchRewards(): PendingWordMatchReward[] {
  try {
    const value = uni.getStorageSync(WORD_MATCH_PENDING_REWARDS_KEY)
    if (!Array.isArray(value)) return []
    return value.flatMap((item): PendingWordMatchReward[] => {
      if (
        !item
        || typeof item.unitId !== 'string'
        || !Number.isInteger(item.roundIndex)
        || !Number.isInteger(item.wordCount)
      ) return []

      return [{
        unitId: item.unitId,
        roundIndex: item.roundIndex,
        wordCount: item.wordCount,
        bestCombo: Number.isInteger(item.bestCombo) ? Math.max(0, item.bestCombo) : 0,
        errorCount: Number.isInteger(item.errorCount) ? Math.max(0, item.errorCount) : 1
      }]
    })
  } catch {
    return []
  }
}

export function queuePendingWordMatchReward(reward: PendingWordMatchReward) {
  const pending = pendingWordMatchRewards()
    .filter(item => item.unitId !== reward.unitId || item.roundIndex !== reward.roundIndex)
  pending.push(reward)
  try {
    uni.setStorageSync(WORD_MATCH_PENDING_REWARDS_KEY, pending)
  } catch {
    // Reward sync is best-effort when storage is unavailable.
  }
}

export function clearPendingWordMatchReward(unitId: string, roundIndex: number) {
  const pending = pendingWordMatchRewards()
    .filter(item => item.unitId !== unitId || item.roundIndex !== roundIndex)
  try {
    uni.setStorageSync(WORD_MATCH_PENDING_REWARDS_KEY, pending)
  } catch {
    // Keep the game playable if storage becomes unavailable.
  }
}
