import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./feedback.ts', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../pages/feedback/index.vue', import.meta.url), 'utf8')

describe('feedback conversation client', () => {
  it('loads threads, unread count and follow-up replies', () => {
    expect(source).toContain("'/api/feedback/unread'")
    expect(source).toContain("'/api/feedback'")
    expect(source).toContain('`/api/feedback/${id}/replies`')
    expect(page).toContain('submitFeedbackReply')
    expect(page).toContain('管理员')
    expect(page).toContain('新回复')
  })
})
