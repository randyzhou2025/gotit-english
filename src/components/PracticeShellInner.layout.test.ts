import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./PracticeShellInner.vue', import.meta.url), 'utf8')

describe('practice shell full-page layout', () => {
  it('keeps every routed practice screen on the paper background', () => {
    const routedScreenClasses = [
      'isHomeScreen',
      'isCourseSetupScreen',
      'isCheckupSetupScreen',
      'isCheckupScreen',
      'isSpellingScreen',
      'isCheckupReportScreen',
      'isDictationSetupScreen',
      'isDictationWordScreen',
      'isDictationPlayerScreen',
      'isDictationReportScreen',
      'isDictationRewardScreen',
      'isWeakbookScreen',
      'isUnitWordScreen',
      'isWordDetailScreen'
    ]

    for (const className of routedScreenClasses) {
      expect(source).toContain(`.screen.${className}`)
    }

    expect(source).toContain('background: var(--page-bg) !important;')
    expect(source).toContain('min-height: 100dvh;')
  })

  it('keeps dictation progress below the centered title instead of in the capsule area', () => {
    expect(source).toContain('.screen.isDictationPlayerScreen .playerProgressMeta')
    expect(source).toContain('position: static;')
    expect(source).toContain('text-align: center;')
  })

  it('uses the approved weakbook hierarchy', () => {
    expect(source).toContain('class="weakbookGuideBanner"')
    expect(source).toContain('class="weakbookGuideTop"')
    expect(source).toContain('待复习')
    expect(source).toContain('已选 {{ selectedWeakWordCount }} 个 · 听写正确后自动移除')
    expect(source).toContain("allWeakWordsSelected ? '取消全选' : '全选'")
    expect(source).toContain('.weakbookGuideBanner')
    expect(source).toContain('background: var(--accent);')
    expect(source).toContain('background: #fffdf8;')
    expect(source).toContain('color: var(--accent);')
    expect(source).toContain('class="weakbookContextActions"')
    expect(source).toContain('<text>听写已选</text>')
    expect(source).toContain('class="weakbookWordSource"')
    expect(source).toContain('@tap="confirmSelectedWeakWordsKnown"')
    expect(source).toContain('确认把所有单词标记为认识？')
    expect(source).toContain('确认把 ${count} 个单词标记为认识？')
    expect(source).toContain('class="weakbookSelectionHitArea"')
    expect(source).toContain('width: 94px;')
    expect(source).not.toContain('class="weakbookCheckupButton"')
    expect(source).not.toContain('startSelectedWeakCheckupPage')
    expect(source).not.toContain('class="weakbookToolbar"')
    expect(source).not.toContain('class="weakbookSummary"')
    expect(source).not.toContain('class="weakbookQuickActions"')
  })

  it('uses the approved paper dictation hierarchy and copy', () => {
    expect(source).toContain('class="dictationPaperNumber"')
    expect(source).toContain('class="dictationReplayHint"')
    expect(source).toContain('class="dictationSpeakerMark"')
    expect(source).toContain('class="dictationSpeakerWave isInner"')
    expect(source).toContain('class="dictationSpeakerWave isOuter"')
    expect(source).not.toContain('class="dictationSpeakerIcon"')
    expect(source).toContain('点一下再听一遍')
    expect(source).toContain('这个词没想起来')
    expect(source).toContain('<text class="transportLabel">下一词</text>')
    expect(source).toContain('class="playerBottomInfo"')
    expect(source).toContain('屏幕会保持常亮，静音模式下仍可播放。')
    expect(source).toContain('min-height: 320px;')
    expect(source).toContain('max-height: none;')
    expect(source).toContain('flex: 0 0 58px;')
    expect(source).toContain('min-width: 58px;')
    expect(source).toContain('color: var(--muted);')
  })

  it('keeps recognition dictation in one editorial card instead of duplicating the audio card', () => {
    expect(source).toContain("isDictationRecognitionMode && 'isRecognitionMode'")
    expect(source).toContain('v-if="!isDictationRecognitionMode"')
    expect(source).toContain('.dictationPlayerScreen.isRecognitionMode .dictationRecognitionWordCard')
  })

  it('uses the latest editorial heading and continuous-list hierarchy for dictation word selection', () => {
    const pickerStart = source.indexOf('<view v-else-if="activeScreen === \'dictationWords\'"')
    const pickerEnd = source.indexOf('activeScreen === \'dictation\' && currentDictationEntry', pickerStart)
    const pickerMarkup = source.slice(pickerStart, pickerEnd)

    expect(source).toContain('class="wordPickerHeadingMark"')
    expect(source).toContain('<text class="wordPickerTitle">本轮听写</text>')
    expect(source).toContain('class="wordPickerCountValue"')
    expect(source).toContain('class="wordPickerFixedArea"')
    expect(source).toContain('class="pageBodyScroll wordPickerListScroll"')
    expect(source).toContain('class="wordPickerScrollContent"')
    expect(source).toContain('.screen.isDictationWordScreen .wordPickerList')
    expect(source).toContain('.screen.isDictationWordScreen .wordPickRow:last-child')
    expect(source).toContain('.screen.isDictationWordScreen .wordPickerListScroll')
    expect(source).toContain('flex: 1 1 0;')
    expect(source).toContain('height: 0;')
    expect(pickerMarkup.indexOf('class="wordPickerFixedArea"')).toBeLessThan(pickerMarkup.indexOf('class="pageBodyScroll wordPickerListScroll"'))
    const fixedAreaStart = pickerMarkup.indexOf('class="wordPickerFixedArea"')
    const fixedAreaEnd = pickerMarkup.indexOf('class="pageBodyScroll wordPickerListScroll"')
    const fixedAreaMarkup = pickerMarkup.slice(fixedAreaStart, fixedAreaEnd)
    expect(fixedAreaMarkup).not.toContain('class="wordPickerToolbar"')
    expect(pickerMarkup.indexOf('class="pageBodyScroll wordPickerListScroll"')).toBeLessThan(pickerMarkup.indexOf('class="wordPickerToolbar"'))
    expect(pickerMarkup.indexOf('class="wordPickerToolbar"')).toBeLessThan(pickerMarkup.indexOf('class="wordPickerList"'))
    expect(pickerMarkup.indexOf('</scroll-view>')).toBeLessThan(pickerMarkup.indexOf('wordPickerConfirm'))
    expect(source).toContain('padding-bottom: calc(94px + env(safe-area-inset-bottom));')
    expect(source).toContain('box-shadow: 0 12px 28px rgba(23, 107, 80, 0.2);')
  })

  it('keeps the resume function while aligning dictation setup with the latest design system', () => {
    expect(source).toContain('class="dictationIntroMark"')
    expect(source).toContain('手机负责报词，你只管写。')
    expect(source).toContain('v-if="dictationInProgress" class="resumeDictationButton"')
    expect(source).toContain('.screen.isDictationSetupScreen .resumeDictationButton')
  })

  it('keeps unit-word meanings optional and uses quiet recognition states', () => {
    expect(source).toContain('const unitWordMeaningVisible = ref(false)')
    expect(source).toContain('role="switch"')
    expect(source).toContain(':aria-checked="unitWordMeaningVisible"')
    expect(source).toContain('v-if="unitWordMeaningVisible" class="unitWordMeaning"')
    expect(source).toContain('已掌握 {{ masteredUnitWordCount }}/{{ unitWordCount }} 词')
    expect(source).toContain('<text>认识</text>')
    expect(source).toContain('<text>不熟</text>')
    expect(source).toContain('.screen.isUnitWordScreen .unitWordRow.isMastered')
    expect(source).toContain('text-decoration: line-through;')
    expect(source).toContain('.screen.isUnitWordScreen .unitWordRow.isReview')
    expect(source).toContain('background: rgba(247, 231, 227, 0.58);')
  })

  it('uses the approved dictation report hierarchy and copy', () => {
    expect(source).toContain('class="dictationSummaryTitle"')
    expect(source).toContain('个词已完成')
    expect(source).toContain('class="dictationReportLegend"')
    expect(source).toContain('点击右侧可切换结果')
    expect(source).toContain("item.isForgotten ? '待巩固' : '掌握'")
    expect(source).toContain('待巩固的词会留在生词本，之后可再听一轮。')
    expect(source).not.toContain('本次听写清单')
  })

  it('uses the approved reward hierarchy and actions', () => {
    expect(source).toContain('class="rewardStamp"')
    expect(source).toContain('今天又向前了一点')
    expect(source).toContain('class="rewardStatsStrip"')
    expect(source).toContain('class="rewardUnitProgressCard"')
    expect(source).toContain('class="rewardNextStepCard"')
    expect(source).toContain('v-if="dictationReward.newlyMasteredCount > 0"')
    expect(source).toContain('class="rewardConfettiLayer"')
    expect(source).toContain('v-for="piece in rewardConfettiPieces"')
    expect(source).toContain('@keyframes rewardConfettiBurst')
    expect(source).toContain('@keyframes rewardBurstRing')
    expect(source).toContain('--burst-x:')
    expect(source).toContain('prefers-reduced-motion: reduce')
    expect(source).toContain('再听一轮生词')
    expect(source).toContain("'再听一轮生词' : '回到听写'")
    expect(source).toContain('min-height: 86px;')
    expect(source).toContain('font-size: 34px;')
    expect(source).toContain('padding-top: 58px;')
    expect(source).toContain('margin: 6px 0 8px;')
    expect(source).not.toContain('class="rewardMedal"')
    expect(source).not.toContain('class="rewardStatGrid"')
  })

  it('returns to dictation setup when there are no weak words to replay', () => {
    const functionStart = source.indexOf('function restartDictationFromReward()')
    const functionEnd = source.indexOf('\nfunction beginDictation()', functionStart)
    const restartFunction = source.slice(functionStart, functionEnd)

    expect(restartFunction).toContain('startForgottenDictationPage()')
    expect(restartFunction).toContain('finishDictationRewardInSession()')
    expect(restartFunction).toContain("navigateBackToPrevious('dictationSetup')")
    expect(restartFunction).not.toContain('beginDictation()')
  })

  it('keeps the paper header and current-learning label free of legacy color bars', () => {
    expect(source).toContain('.screen.isSplitScreen .pageChrome')
    expect(source).toContain('.screen.isHomeScreen .homeUnitLabel')
    expect(source).toContain('background: transparent !important;')
    expect(source).toContain('align-self: flex-start;')
  })

  it('keeps the home hierarchy balanced instead of stretching the daily word', () => {
    expect(source).toContain('class="homeHeroTags"')
    expect(source).toContain('教材同步')
    expect(source).toContain('自动听写')
    expect(source).toContain('生词复习')
    expect(source).toContain('flex: 0 0 154px;')
    expect(source).toContain('flex-basis: 96px;')
    expect(source).not.toContain('今日听写建议')
  })

  it('lets compact home screens scroll clear of the fixed bottom navigation', () => {
    expect(source).toContain('.screen.isHomeScreen.hasBottomNav')
    expect(source).toContain('height: auto;')
    expect(source).toContain('overflow-y: visible;')
    expect(source).toContain('padding-bottom: calc(92px + env(safe-area-inset-bottom));')
  })

  it('uses the editorial number face and baseline layout for home statistics', () => {
    expect(source).toContain('.screen.isHomeScreen .homeCourseStatNumber')
    expect(source).toContain('font-family: var(--font-word);')
    expect(source).toContain('class="homeCourseStats"')
    expect(source).toContain('总单词')
    expect(source).toContain('已掌握')
    expect(source).not.toContain('class="homeTodayCard"')
  })

  it('uses explicit mini-program-safe spacing for the active course card', () => {
    expect(source).toContain('.screen.isHomeScreen .homeCourseMain')
    expect(source).toContain('display: flex;')
    expect(source).toContain('.screen.isHomeScreen .homeCourseCopy')
    expect(source).toContain('gap: 6px;')
    expect(source).toContain('margin-left: 16px;')
  })

  it('keeps the embedded course metrics large and uses the approved daily-word typography and sound mark', () => {
    expect(source).toContain('min-height: 104px;')
    expect(source).toContain('font-size: 36px;')
    expect(source).toContain('font-size: 41px;')
    expect(source).toContain('font-weight: 500;')
    expect(source).toContain('class="homeDailySpeakerMark"')
    expect(source).toContain('class="homeDailySpeakerWave isInner"')
    expect(source).toContain('class="homeDailySpeakerWave isOuter"')
    expect(source).not.toContain('homeDailySpeakerGlyph')
    expect(source).not.toContain('◖))')
  })

  it('supports real textbook covers and prioritizes randomized home recommendations', () => {
    expect(source).toContain('buildTextbookCoverUrl(unit.publisherId, unit.bookId)')
    expect(source).toContain('class="homeBookCoverImage"')
    expect(source).toContain('@error="homeBookCoverFailed = true"')
    expect(source).toContain('if (savedWeakWords.value.length > 0)')
    expect(source).toContain('word.difficulty >= HIGH_DIFFICULTY_THRESHOLD')
    expect(source).toContain('Math.floor(Math.random() * source.length)')
    expect(source).toContain('chooseRandomHomeRecommendedWord(true)')
  })

  it('plays the British pronunciation by default for the home recommendation', () => {
    expect(source).toContain("const accent: Accent = hasPlayableAudio(entry, 'uk') ? 'uk' : 'us'")
  })

  it('shows a real example sentence below the home recommendation when available', () => {
    expect(source).toContain('v-if="homeRecommendedWord.exampleSentence"')
    expect(source).toContain('class="homeDailyExample"')
    expect(source).toContain('{{ homeRecommendedWord.exampleSentence }}')
    expect(source).not.toContain('暂无例句')
  })

  it('keeps unit-word filters fixed, shows complete words, and exposes two row shortcuts', () => {
    expect(source).toContain('class="unitWordFixedTools"')
    expect(source).toContain('class="pageBodyScroll unitWordScroll"')
    expect(source).toContain('class="unitWordQuickActions"')
    expect(source).toContain("'isMastery'")
    expect(source).toContain("'isWeakbook'")
    expect(source).toContain('<text>认识</text>')
    expect(source).toContain('<text>不熟</text>')
    expect(source).toContain('min-height: 65px;')
    expect(source).toContain('flex: 0 0 52px;')
    expect(source).toContain('grid-template-columns: minmax(0, 1fr);')
    expect(source).toContain('overflow-wrap: anywhere;')
    expect(source).not.toContain('筛选：{{ activeUnitWordFilterLabel }}')
  })
})
