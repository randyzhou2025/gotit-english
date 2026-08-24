import { apiRequest, ensureUserSession, getAuthToken, isApiEnabled } from '@/core/userSession'

export type ShareType = 'UNIT_INVITE' | 'DICTATION_RESULT' | 'CLASSMATE_INVITE'

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

export interface LeaderboardEntry {
  rank: number
  userId: string
  nickname: string
  avatarUrl: string
  learningPower: number
  isMe: boolean
}

export interface LeaderboardSnapshot {
  weekKey: string
  weekStart: string
  weekEnd: string
  displayLimit: number
  topSpecialCount: number
  myLearningPower: number
  myRank: number | null
  pointsToOvertakePrevious: number | null
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
}): Promise<LearningPowerAward | null> {
  if (!(await ensureAuthenticatedApi())) return null
  return apiRequest<LearningPowerAward>('/api/learning-power/dictations', {
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

export async function fetchLeaderboard(): Promise<LeaderboardSnapshot> {
  if (!(await ensureAuthenticatedApi())) {
    return {
      weekKey: '',
      weekStart: '',
      weekEnd: '',
      displayLimit: 10,
      topSpecialCount: 3,
      myLearningPower: 0,
      myRank: null,
      pointsToOvertakePrevious: null,
      ranking: [],
      myEntry: null
    }
  }
  return apiRequest('/api/classmates/leaderboard')
}

export async function fetchClassmates(): Promise<ClassmateSummary[]> {
  if (!(await ensureAuthenticatedApi())) return []
  const payload = await apiRequest<{ classmates: ClassmateSummary[] }>('/api/classmates')
  return payload.classmates
}

export async function removeClassmate(classmateUserId: string): Promise<void> {
  await apiRequest(`/api/classmates/${encodeURIComponent(classmateUserId)}`, { method: 'DELETE' })
}
