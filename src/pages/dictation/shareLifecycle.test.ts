import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const rewardSource = fs.readFileSync(new URL('./reward.vue', import.meta.url), 'utf8')
const setupSource = fs.readFileSync(new URL('./setup.vue', import.meta.url), 'utf8')

describe('dictation share page lifecycle', () => {
  it('registers the share lifecycle directly on each native page', () => {
    expect(rewardSource).toContain('onShareAppMessage(() => buildWeappShareAppMessage(')
    expect(rewardSource).toContain('onShareTimeline(() => buildWeappShareTimeline(')
    expect(setupSource).toContain('useWeappShare()')
    expect(rewardSource).not.toContain('onShareAppMessage() {}')
    expect(rewardSource).not.toContain('onShareTimeline() {}')
  })

  it('sends a cold reward-page launch back to the home tab', () => {
    expect(rewardSource).toContain('isPracticeSessionReady()')
    expect(rewardSource).toContain('usePracticeSession().dictationReward.value')
    expect(rewardSource).toContain("uni.switchTab({ url: '/pages/index/index' })")
  })
})
