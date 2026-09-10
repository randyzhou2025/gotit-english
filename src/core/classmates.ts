import { apiRequest, ensureUserSession, getAuthToken, isApiEnabled } from '@/core/userSession'

export type ShareType = 'UNIT_INVITE' | 'DICTATION_RESULT' | 'CLASSMATE_INVITE' | 'WORD_MATCH_CHALLENGE'

export interface UnitShareContext {
  publisherId: string
  bookId: string
  unitId: string
  unitName: string
}

export interface ShareDescriptor {
  shareToken: string
  path: string
}

export interface AcceptedShareContext extends UnitShareContext {
  volumeId: string
  shareType: ShareType
  isSelfShare: boolean
  classmateCreated: boolean
}

export interface LearningPowerBreakdown {
  dictationWordScore: number
  validDictationScore: number
  dailyBonusScore: number
  streakScore: number
  mistakeReviewScore: number
}

export interface LearningPowerAward {
  duplicate: boolean
  validDictation: boolean
  earned: number
  breakdown: LearningPowerBreakdown
  weekKey: string
  weeklyLearningPower: number
  myRank: number | null
}

export interface FeedItem {
  id: string
  userId: string
  nickname: string
  avatarUrl: string
  activityType: 'DICTATION_COMPLETED' | 'DAILY_STUDY' | 'STREAK' | 'RANK_UP'
  unitId: string | null
  unitName: string | null
  countValue: number | null
  rankValue: number | null
  occurredAt: string
  cheerCount: number
  cheeredByMe: boolean
}

export type LeaderboardMetric = 'time' | 'words' | 'power'
export type LeaderboardPeriod = 'week' | 'total'

export interface LeaderboardEntry {
  rank: number
  userId: string
  nickname: string
  avatarUrl: string
  value: number
  isMe: boolean
}

export interface LeaderboardSnapshot {
  metric: LeaderboardMetric
  period: LeaderboardPeriod
  weekKey: string
  weekStart: string
  weekEnd: string
  displayLimit: number
  asOf: string
  myValue: number
  myRank: number | null
  gapToPrevious: number | null
  ranking: LeaderboardEntry[]
  myEntry: LeaderboardEntry | null
}

export interface ClassmateSummary {
  id: string
  nickname: string
  avatarUrl: string
}

async function ensureAuthenticatedApi(): Promise<boolean> {
  if (!isApiEnabled()) return false
  if (getAuthToken()) return true
  await ensureUserSession()
  return Boolean(getAuthToken())
}

export async function createClassmateShare(
  context: UnitShareContext,
  shareType: ShareType
): Promise<ShareDescriptor | null> {
  if (!(await ensureAuthenticatedApi())) return null
  return apiRequest<ShareDescriptor>('/api/shares', {
    method: 'POST',
    body: { ...context, shareType }
  })
}

export async function acceptClassmateShare(shareToken: string): Promise<AcceptedShareContext> {
  if (!(await ensureAuthenticatedApi())) throw new Error('登录未完成')
  return apiRequest<AcceptedShareContext>(`/api/shares/${encodeURIComponent(shareToken)}/accept`, {
    method: 'POST',
    body: {}
  })
}

export async function submitDictationCompletion(input: {
  sessionId: string
  unitId: string
  unitName: string
  unitWordCount: number
  completed: true
  wordResults: Array<{ wordId: string; correct: boolean }>
  reviewedWeakWordIds: string[]
}): Promise<LearningPowerAward | null> {
  if (!(await ensureAuthenticatedApi())) return null
  return apiRequest<LearningPowerAward>('/api/learning-power/dictations', {
    method: 'POST',
    body: input
  })
}

export async function submitAppOpen(): Promise<{
  duplicate: boolean
  earned: number
  streakDays: number
  weekKey: string
  weeklyLearningPower: number
} | null> {
  if (!(await ensureAuthenticatedApi())) return null
  return apiRequest('/api/learning-power/app-opens', { method: 'POST', body: {} })
}

export async function submitDictationWordCompletion(input: {
  sessionId: string
  unitId: string
  wordId: string
}): Promise<{ earned: number; weekKey: string } | null> {
  if (!(await ensureAuthenticatedApi())) return null
  return apiRequest('/api/learning-power/dictation-words', {
    method: 'POST',
    body: input
  })
}

export async function submitMistakeReviews(input: {
  reviewSessionId: string
  wordIds: string[]
}): Promise<{ earned: number; weekKey: string; weeklyLearningPower: number } | null> {
  if (!(await ensureAuthenticatedApi())) return null
  return apiRequest('/api/learning-power/reviews', { method: 'POST', body: input })
}

export async function submitWordlistExport(input: {
  exportId: string
  unitId?: string
}): Promise<{ duplicate: boolean; earned: number; weekKey: string } | null> {
  if (!(await ensureAuthenticatedApi())) return null
  return apiRequest('/api/learning-power/wordlist-exports', { method: 'POST', body: input })
}

export async function fetchClassmateFeed(): Promise<{ classmateCount: number; items: FeedItem[] }> {
  if (!(await ensureAuthenticatedApi())) return { classmateCount: 0, items: [] }
  return apiRequest('/api/classmates/feed')
}

export async function toggleClassmateCheer(feedId: string): Promise<{ cheered: boolean; cheerCount: number }> {
  return apiRequest(`/api/classmates/feed/${encodeURIComponent(feedId)}/cheer`, {
    method: 'POST',
    body: {}
  })
}

export async function fetchLeaderboard(metric: LeaderboardMetric = 'power', period: LeaderboardPeriod = 'week'): Promise<LeaderboardSnapshot> {
  if (!(await ensureAuthenticatedApi())) {
    return {
      metric, period, asOf: '',
      weekKey: '',
      weekStart: '',
      weekEnd: '',
      displayLimit: 10,
      myValue: 0,
      myRank: null,
      gapToPrevious: null,
      ranking: [],
      myEntry: null
    }
  }
  return apiRequest(`/api/classmates/leaderboard?metric=${metric}&period=${period}`)
}

export async function fetchClassmates(): Promise<ClassmateSummary[]> {
  if (!(await ensureAuthenticatedApi())) return []
  const payload = await apiRequest<{ classmates: ClassmateSummary[] }>('/api/classmates')
  return payload.classmates
}

export async function removeClassmate(classmateUserId: string): Promise<void> {
  await apiRequest(`/api/classmates/${encodeURIComponent(classmateUserId)}`, { method: 'DELETE' })
}
