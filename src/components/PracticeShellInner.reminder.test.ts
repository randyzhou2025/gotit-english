import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./PracticeShellInner.vue', import.meta.url), 'utf8')

describe('dictation reminder renewal', () => {
  it('only requests another one-time subscription after the user has enabled reminders', () => {
    expect(source).toContain('const reminder = getCachedLearningReminder()')
    expect(source).toContain("!reminder.enabled || !reminder.available || !reminder.templateId || reminder.mode !== 'one_time'")
    expect(source).toContain('if (reminderRenewalHandled.value) return')
    expect(source).toContain('requestLearningReminderSubscription(reminder.templateId)')
    expect(source).toContain('await renewLearningReminder(reminder.reminderTime)')
    expect(source).toContain('学习提醒已续期 1 天')
    expect(source.match(/await renewReminderAfterDictationIfEnabled\(\)/g)).toHaveLength(3)
  })
})
