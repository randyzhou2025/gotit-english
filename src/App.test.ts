import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

describe('app startup lifecycle', () => {
  it('keeps launch local and delegates foreground networking to the ready-gated scheduler', () => {
    expect(source).toMatch(/onLaunch\(\(\) => \{\s*initializeVisualTheme\(\)\s*void ensurePracticeSessionReady\(\)\s*\}\)/)
    expect(source).toMatch(/onShow\(\(\) => \{[\s\S]*beginAppForegroundCycle\(\)[\s\S]*\}\)/)
    expect(source).not.toContain('fetchPublicConfig')
    expect(source).not.toContain('submitAppOpen')
    expect(source).not.toContain('scheduleDeferredStartupSync')
  })
})
