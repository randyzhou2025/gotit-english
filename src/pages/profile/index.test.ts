import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

describe('profile score sharing', () => {
  it('registers native page share callbacks with the generated 5:4 cover', () => {
    expect(source).toContain('onShareAppMessage(() => buildWeappShareAppMessage(currentScoreShare()))')
    expect(source).toContain('onShareTimeline(() => buildWeappShareTimeline(currentScoreShare()))')
    expect(source).toContain("uni.getStorageSync('gotit:profile:scoreShareImage')")
    expect(source).toContain('onMounted(showWeappShareMenu)')
    expect(source).not.toContain('onShareAppMessage() {}')
    expect(source).not.toContain('onShareTimeline() {}')
  })
})
