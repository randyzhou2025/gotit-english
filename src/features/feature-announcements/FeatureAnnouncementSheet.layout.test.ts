import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const componentSource = fs.readFileSync(new URL('./FeatureAnnouncementSheet.vue', import.meta.url), 'utf8')
const shellSource = fs.readFileSync(new URL('../../components/PracticeShellInner.vue', import.meta.url), 'utf8')

describe('feature announcement sheet', () => {
  it('keeps content configuration outside the reusable sheet', () => {
    expect(componentSource).toContain('announcement.title')
    expect(componentSource).toContain('announcement.highlights.slice(0, 2)')
    expect(componentSource).not.toContain('中考 2000 词')
  })

  it('supports close, secondary, scrim and continuous swipe dismissal', () => {
    expect(componentSource).toContain("requestDismiss('close')")
    expect(componentSource).toContain("requestDismiss('secondary')")
    expect(componentSource).toContain("requestDismiss('scrim')")
    expect(componentSource).toContain("requestClose('swipe')")
    expect(componentSource).toContain('@touchstart="handleTouchStart"')
    expect(componentSource).toContain('@touchmove.stop.prevent="handleTouchMove"')
    expect(componentSource).toContain('@touchend="handleTouchEnd"')
    expect(componentSource).not.toContain('@touchstart.stop="handleTouchStart"')
    expect(componentSource).not.toContain('@touchend.stop="handleTouchEnd"')
    expect(componentSource).toContain('dragOffset.value = rawOffset >= 0 ? rawOffset : rawOffset * 0.18')
  })

  it('uses interruptible spring motion and respects reduced motion', () => {
    expect(componentSource).toContain('function stopSpring()')
    expect(componentSource).toContain('function springTo(')
    expect(componentSource).toContain("matchMedia?.('(prefers-reduced-motion: reduce)')")
  })

  it('executes the primary action immediately instead of waiting for exit motion', () => {
    expect(componentSource).toContain("emit('primary', props.announcement)")
    expect(componentSource).not.toContain("requestClose('close', () => emit('primary'")
  })

  it('is connected at the shared shell layer', () => {
    expect(shellSource).toContain('<FeatureAnnouncementSheet')
    expect(shellSource).toContain(':announcement="activeFeatureAnnouncement"')
    expect(shellSource).toContain('featureAnnouncementsEnabled.value')
    expect(shellSource).toContain('hideNativeTabBarIfAvailable()')
    expect(shellSource).toContain('fail: () => {}')
  })
})
