import { apiRequest, getAuthToken, isApiEnabled, type FeedbackCategory } from '@/core/userSession'

export type FeedbackSender = 'user' | 'admin'

export interface FeedbackReply {
  id: string
  sender: FeedbackSender
  content: string
  createdAt: string
}

export interface FeedbackThreadSummary {
  id: string
  category: FeedbackCategory | string
  content: string
  createdAt: string
  updatedAt: string
  lastMessage: FeedbackReply | null
  unread: boolean
}

export interface FeedbackThreadDetail extends FeedbackThreadSummary {
  replies: FeedbackReply[]
}

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  bug: '错误反馈',
  malfunction: '功能异常',
  experience: '体验问题',
  feature: '新功能建议',
  other: '其他'
}

export async function fetchFeedbackUnreadCount(): Promise<number> {
  if (!isApiEnabled() || !getAuthToken()) return 0
  try {
    const payload = await apiRequest<{ unreadCount: number }>('/api/feedback/unread')
    return Number(payload.unreadCount ?? 0)
  } catch {
    return 0
  }
}

export async function fetchFeedbackThreads(): Promise<FeedbackThreadSummary[]> {
  if (!isApiEnabled() || !getAuthToken()) return []
  const payload = await apiRequest<{ threads: FeedbackThreadSummary[] }>('/api/feedback')
  return payload.threads ?? []
}

export async function fetchFeedbackThread(id: string): Promise<FeedbackThreadDetail | null> {
  if (!isApiEnabled() || !getAuthToken()) return null
  const payload = await apiRequest<{ thread: FeedbackThreadDetail }>(`/api/feedback/${id}`)
  return payload.thread ?? null
}

export async function submitFeedback(input: {
  category: FeedbackCategory
  content: string
}): Promise<boolean> {
  if (!isApiEnabled() || !getAuthToken()) return false

  await apiRequest('/api/feedback', {
    method: 'POST',
    body: input
  })
  return true
}

export async function submitFeedbackReply(id: string, content: string): Promise<FeedbackReply | null> {
  if (!isApiEnabled() || !getAuthToken()) return null
  const payload = await apiRequest<{ reply: FeedbackReply }>(`/api/feedback/${id}/replies`, {
    method: 'POST',
    body: { content }
  })
  return payload.reply ?? null
}
