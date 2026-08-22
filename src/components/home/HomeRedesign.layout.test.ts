import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const homeSource = fs.readFileSync(new URL('./HomeRedesign.vue', import.meta.url), 'utf8')
const eggSource = fs.readFileSync(new URL('./UnitEggCard.vue', import.meta.url), 'utf8')
const shellSource = fs.readFileSync(new URL('../PracticeShellInner.vue', import.meta.url), 'utf8')
const bootSource = fs.readFileSync(new URL('../PracticeShell.vue', import.meta.url), 'utf8')
const featureFlagSource = fs.readFileSync(new URL('../../app/featureFlags.ts', import.meta.url), 'utf8')

describe('redesigned home', () => {
  it('stays reversible behind one explicit feature flag', () => {
    expect(featureFlagSource).toContain('HOME_REDESIGN_V2_ENABLED = true')
    expect(shellSource).toContain('v-if="HOME_REDESIGN_V2_ENABLED"')
    expect(shellSource).toContain('<view v-else class="sectionStack homeScreen">')
  })

  it('keeps all existing home destinations connected', () => {
    expect(homeSource).toContain("emit('change-course')")
    expect(homeSource).toContain("emit('open-unit-words')")
    expect(homeSource).toContain("emit('start-dictation')")
    expect(homeSource).toContain("emit('export-wordlist')")
    expect(homeSource).toContain("emit('review-weak-words')")
    expect(homeSource).toContain("emit('play-unit-egg-audio', $event)")
    expect(shellSource).toContain('@review-weak-words="openWeakbook"')
    expect(shellSource).toContain('@play-unit-egg-audio="playUnitEggAudio"')
  })

  it('uses the approved primary and export copy', () => {
    expect(homeSource).toContain('{{ remainingDictationMeta }}')
    expect(homeSource).toContain('剩余${remainingWordCount.value}词 · 全部听写约${estimatedMinutes} · 自动播报')
    expect(homeSource).not.toContain('Math.min(20')
    expect(shellSource).toContain('estimateDictationSeconds(')
    expect(homeSource).toContain('导出｜打印词表')
    expect(homeSource).toContain('词汇表 · 默写表 ')
    expect(homeSource).toContain('一键生成')
  })

  it('moves the enlarged egg below the core actions', () => {
    const eggPosition = homeSource.indexOf('<UnitEggCard')
    const quickActionsPosition = homeSource.indexOf('<view class="homeV2QuickGrid">')

    expect(quickActionsPosition).toBeGreaterThan(-1)
    expect(eggPosition).toBeGreaterThan(quickActionsPosition)
    expect(eggSource).toContain('grid-template-rows: auto minmax(38px, 1fr) auto;')
    expect(eggSource).toContain('height: 100%;')
    expect(eggSource).toContain('overflow: hidden;')
  })

  it('uses the full 15 Pro Max viewport without leaking into the native tab bar', () => {
    expect(shellSource).toContain("HOME_REDESIGN_V2_ENABLED && 'isHomeV2Screen'")
    expect(shellSource).toContain('.screen.isHomeV2Screen')
    expect(shellSource).toContain('height: 100dvh;')
    expect(shellSource).toContain('overflow: hidden;')
    expect(homeSource).toContain('height: calc(100vh - var(--capsule-top, 44px) - 92px - env(safe-area-inset-bottom));')
    expect(homeSource).toContain('grid-template-rows: 44px 230px 145px 90px 140px;')
    expect(homeSource).toContain('align-content: space-between;')
    expect(homeSource).toContain('box-sizing: border-box;')
    expect(bootSource.indexOf('homeV2BootEgg')).toBeGreaterThan(bootSource.indexOf('homeV2BootQuickGrid'))
  })

  it('contains no decorative study sketch in the primary dictation action', () => {
    expect(homeSource).not.toContain('homeV2StudySketch')
    expect(homeSource).not.toContain('homeV2SketchPaper')
    expect(homeSource).not.toContain('homeV2SketchPencil')
  })

  it('gives learning progress its own row inside the enlarged course card', () => {
    expect(homeSource).toContain('class="homeV2ProgressBlock"')
    expect(homeSource).toContain('class="homeV2ProgressTitle">学习进度')
    expect(homeSource).toContain('{{ unitMasteryPercent }}%')
    expect(homeSource).toContain('{{ unitMasteryLabel }} 词已掌握')
    expect(homeSource).not.toMatch(/\.homeV2ProgressBlock\s*\{[^}]*border-top:/s)
  })

  it('balances the dictation action without adding another illustration', () => {
    expect(homeSource).toMatch(/\.homeV2DictationContent\s*\{[^}]*text-align: center;/s)
    expect(homeSource).not.toContain('homeV2DictationRule')
  })

  it('matches contrast explanations by whole words instead of substrings', () => {
    expect(eggSource).toContain('getUnitEggContrastNotes')
  })

  it('adds decoration only when content has room and removes it on narrow screens', () => {
    expect(eggSource).toContain('showOrnament')
    expect(eggSource).toContain("['C', 'D', 'F', 'H'].includes")
    expect(eggSource).toContain('.unitEggCard.hasOrnament')
    expect(eggSource).toContain('.unitEggOrnament')
    expect(eggSource).toContain('display: none;')
  })

  it('keeps phrase eggs stacked and decorates only when content has room', () => {
    expect(eggSource).not.toContain('unitEggPhrase')
    expect(eggSource).not.toContain('splitPhrase')
    expect(eggSource).toContain("['C', 'D', 'F', 'H'].includes")
    expect(eggSource).toContain('props.egg.core.length + noteText.value.length < 58')
  })

  it('makes pronunciation audio real and keeps long corrections inside the card', () => {
    expect(eggSource).toContain("emit('play-audio', egg.keyword)")
    expect(homeSource).toContain(':audio-playing="unitEggAudioPlaying"')
    expect(eggSource).toContain('grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr)')
    expect(eggSource).toContain('correctionIsLong')
    expect(eggSource).not.toContain("['A', 'C', 'D', 'F', 'H'].includes")
  })

  it('uses the discovery title and dynamic dictation states', () => {
    expect(eggSource).toContain('✦ 单元发现')
    expect(eggSource).toContain('这个搭配值得记住')
    expect(homeSource).toContain('今天已完成 ${props.todayDictationWordCount} 词 ✓')
    expect(homeSource).toContain('继续 ${unitName.value} 听写')
    expect(homeSource).toContain('<text>开始听写</text>')
  })

  it('aligns the ing explanation with the right-hand word', () => {
    expect(eggSource).toContain('unitEggContrastNote isRight')
    expect(eggSource).toContain('.unitEggContrastNote.isRight')
    expect(eggSource).toContain('text-align: right;')
  })
})
