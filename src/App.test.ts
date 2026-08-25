import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

describe('app foreground scoring', () => {
  it('submits app opens without blocking the app lifecycle', () => {
    expect(source).toContain("import { submitAppOpen } from '@/core/classmates'")
    expect(source).toMatch(/onShow\(\(\) => \{[\s\S]*void submitAppOpen\(\)[\s\S]*\.catch\(\(\) => \{\}\)[\s\S]*\}\)/)
    expect(source).toContain('setCachedStreakDays(result.streakDays)')
  })
})
