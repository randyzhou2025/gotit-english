import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  storage: new Map<string, unknown>()
}))

vi.mock('@/core/userSession', () => ({
  apiRequest: mocks.apiRequest,
  getAuthToken: () => 'token',
  isApiEnabled: () => true
}))

function stubUni(requestSubscribeMessage?: (options: {
  tmplIds: string[]
  success: (result: Record<string, string>) => void
}) => void) {
  vi.stubGlobal('uni', {
    getStorageSync: (key: string) => mocks.storage.get(key),
    setStorageSync: (key: string, value: unknown) => mocks.storage.set(key, value),
    requestSubscribeMessage
  })
}

describe('learning reminder subscription credits', () => {
  afterEach(() => {
    mocks.apiRequest.mockReset()
    mocks.storage.clear()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('accepts the configured template through the native subscription API', async () => {
    stubUni((options) => options.success({ [options.tmplIds[0]!]: 'accept' }))
    const { requestLearningReminderSubscription } = await import('./learningReminder')

    await expect(requestLearningReminderSubscription('template-id')).resolves.toBe(true)
  })

  it('renews one credit on the server and caches the enabled preference', async () => {
    const reminder = {
      enabled: true,
      remainingCredits: 2,
      reminderTime: '19:00',
      lastDeliveryStatus: '',
      mode: 'one_time' as const,
      templateId: 'template-id',
      available: true
    }
    stubUni()
    mocks.apiRequest.mockResolvedValue({ reminder })
    const { getCachedLearningReminder, renewLearningReminder } = await import('./learningReminder')

    await expect(renewLearningReminder('19:00')).resolves.toEqual(reminder)
    expect(mocks.apiRequest).toHaveBeenCalledWith('/api/user/reminder/renew', {
      method: 'POST',
      body: { reminderTime: '19:00' }
    })
    expect(getCachedLearningReminder()).toEqual(reminder)
  })
})
