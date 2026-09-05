import { apiRequest, getAuthToken, isApiEnabled } from '@/core/userSession'

export type LearningReminderMode = 'one_time' | 'long_term'

export interface LearningReminderSettings {
  enabled: boolean
  reminderTime: string
  lastDeliveryStatus: string
  mode: LearningReminderMode
  templateId: string
  available: boolean
}

export const DEFAULT_LEARNING_REMINDER: LearningReminderSettings = {
  enabled: false,
  reminderTime: '19:00',
  lastDeliveryStatus: '',
  mode: 'one_time',
  templateId: '',
  available: false
}

export async function fetchLearningReminder(): Promise<LearningReminderSettings> {
  if (!isApiEnabled() || !getAuthToken()) return DEFAULT_LEARNING_REMINDER
  const payload = await apiRequest<{ reminder: LearningReminderSettings }>('/api/user/reminder')
  return payload.reminder
}

export async function saveLearningReminder(input: {
  enabled: boolean
  reminderTime: string
}): Promise<LearningReminderSettings> {
  const payload = await apiRequest<{ reminder: LearningReminderSettings }>('/api/user/reminder', {
    method: 'PUT',
    body: input
  })
  return payload.reminder
}
