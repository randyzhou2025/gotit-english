import { apiRequest, getAuthToken, isApiEnabled } from '@/core/userSession'

export type LearningReminderMode = 'one_time' | 'long_term'

export interface LearningReminderSettings {
  enabled: boolean
  remainingCredits: number | null
  reminderTime: string
  lastDeliveryStatus: string
  mode: LearningReminderMode
  templateId: string
  available: boolean
}

export const DEFAULT_LEARNING_REMINDER: LearningReminderSettings = {
  enabled: false,
  remainingCredits: 0,
  reminderTime: '19:00',
  lastDeliveryStatus: '',
  mode: 'one_time',
  templateId: '',
  available: false
}

const REMINDER_CACHE_KEY = 'gotit:learning-reminder'

export function getCachedLearningReminder(): LearningReminderSettings {
  try {
    const cached = uni.getStorageSync(REMINDER_CACHE_KEY) as Partial<LearningReminderSettings> | null
    if (!cached || typeof cached.enabled !== 'boolean') return { ...DEFAULT_LEARNING_REMINDER }
    return { ...DEFAULT_LEARNING_REMINDER, ...cached }
  } catch {
    return { ...DEFAULT_LEARNING_REMINDER }
  }
}

function cacheLearningReminder(reminder: LearningReminderSettings): LearningReminderSettings {
  try {
    uni.setStorageSync(REMINDER_CACHE_KEY, reminder)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
  return reminder
}

export async function fetchLearningReminder(): Promise<LearningReminderSettings> {
  if (!isApiEnabled() || !getAuthToken()) return DEFAULT_LEARNING_REMINDER
  const payload = await apiRequest<{ reminder: LearningReminderSettings }>('/api/user/reminder')
  return cacheLearningReminder(payload.reminder)
}

export async function saveLearningReminder(input: {
  enabled: boolean
  reminderTime: string
}): Promise<LearningReminderSettings> {
  const payload = await apiRequest<{ reminder: LearningReminderSettings }>('/api/user/reminder', {
    method: 'PUT',
    body: input
  })
  return cacheLearningReminder(payload.reminder)
}

export async function renewLearningReminder(reminderTime: string): Promise<LearningReminderSettings> {
  const payload = await apiRequest<{ reminder: LearningReminderSettings }>('/api/user/reminder/renew', {
    method: 'POST',
    body: { reminderTime }
  })
  return cacheLearningReminder(payload.reminder)
}

export function requestLearningReminderSubscription(templateId: string): Promise<boolean> {
  // #ifdef MP-WEIXIN
  const runtime = uni as typeof uni & {
    requestSubscribeMessage?: (options: {
      tmplIds: string[]
      success: (result: Record<string, string>) => void
      fail: (error: unknown) => void
    }) => void
  }
  if (typeof runtime.requestSubscribeMessage === 'function') {
    return new Promise((resolve, reject) => {
      runtime.requestSubscribeMessage!({
        tmplIds: [templateId],
        success: (result) => {
          const statuses = result as unknown as Record<string, string>
          resolve(statuses[templateId] === 'accept')
        },
        fail: reject
      })
    })
  }
  // #endif
  return Promise.resolve(false)
}
