import { apiRequest, ensureUserSession, getAuthToken, isApiEnabled } from '@/core/userSession'
import {
  clearPendingWordMatchReward,
  pendingWordMatchRewards,
  type PendingWordMatchReward
} from './progress'

export interface WordMatchRoundAward {
  duplicate: boolean
  earned: number
  dailyEarned: number
  dailyLimit: number
  weekKey: string
  weeklyLearningPower: number
}

export async function submitWordMatchRound(input: PendingWordMatchReward): Promise<WordMatchRoundAward | null> {
  if (!isApiEnabled()) return null
  if (!getAuthToken()) await ensureUserSession()
  if (!getAuthToken()) return null

  return apiRequest<WordMatchRoundAward>('/api/learning-power/word-match-rounds', {
    method: 'POST',
    body: input
  })
}

export async function syncPendingWordMatchRewards(): Promise<void> {
  for (const reward of pendingWordMatchRewards()) {
    try {
      const award = await submitWordMatchRound(reward)
      if (!award) return
      clearPendingWordMatchReward(reward.unitId, reward.roundIndex)
    } catch {
      return
    }
  }
}
