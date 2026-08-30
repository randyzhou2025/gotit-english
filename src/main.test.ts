import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./main.ts', import.meta.url), 'utf8')

describe('page ready network gate', () => {
  it('marks the first rendered page ready through the global page mixin', () => {
    expect(source).toContain("import { markAppPageReady } from '@/app/appNetworkLifecycle'")
    expect(source).toContain('app.mixin({ onReady: markAppPageReady })')
  })
})
