import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const gameSource = fs.readFileSync(new URL('./WordMatchGame.vue', import.meta.url), 'utf8')
const pageSource = fs.readFileSync(new URL('../../pages/word-match/index.vue', import.meta.url), 'utf8')
const shellSource = fs.readFileSync(new URL('../../components/PracticeShellInner.vue', import.meta.url), 'utf8')
const pagesSource = fs.readFileSync(new URL('../../pages.json', import.meta.url), 'utf8')
const shareEntrySource = fs.readFileSync(new URL('../../pages/share-entry/index.vue', import.meta.url), 'utf8')
const feedbackSource = fs.readFileSync(new URL('./feedback.ts', import.meta.url), 'utf8')
const wordMatchAssetUrls = [
  new URL('../../static/themes/word-match-forest.jpg', import.meta.url),
  new URL('../../static/audio/word-match-correct.mp3', import.meta.url),
  new URL('../../static/audio/word-match-wrong.mp3', import.meta.url)
]

describe('word match integration', () => {
  it('keeps the module behind one home entry event and a standalone route', () => {
    expect(shellSource).toContain("trackAnalyticsEvent('home_word_match_click'")
    expect(shellSource).toContain("uni.navigateTo({ url: '/pages/word-match/index' })")
    expect(pagesSource).toContain('"path": "pages/word-match/index"')
    expect(gameSource).not.toContain('trackAnalyticsEvent')
    expect(pageSource).not.toContain('trackAnalyticsEvent')
  })

  it('uses bounded tools and exposes the requested Unit challenge action', () => {
    expect(gameSource).toContain('const hintCount = ref(1)')
    expect(gameSource).toContain('const shuffleCount = ref(1)')
    expect(gameSource).toContain('open-type="share"')
    expect(gameSource).toContain('邀请同学挑战本 Unit')
    expect(pageSource).toContain("'WORD_MATCH_CHALLENGE'")
    expect(shareEntrySource).toContain("'/pages/word-match/index'")
  })

  it('keeps the final pair compact and only offers a real next round', () => {
    expect(gameSource).toContain('grid-auto-rows: 76px;')
    expect(gameSource).toContain('isFinalPair: visibleCards.length === 2')
    expect(gameSource).toContain('.wordMatchBoard.isFinalPair')
    expect(gameSource).toContain('v-if="hasNextRound"')
    expect(gameSource).toContain('currentRoundIndex.value < rounds.length - 1')
    expect(gameSource).not.toContain('学习力暂未结算')
    expect(gameSource).toContain('+${roundRewardScore.value} 学习力待同步')
    expect(gameSource).toContain('下次进入时自动补发，无需重玩')
    expect(gameSource).not.toContain('currentWaveIndex')
    expect(gameSource).not.toContain('第{{ currentWaveIndex')
    expect(gameSource).toContain('box-sizing: border-box;')
  })

  it('expands only truncated Chinese meanings without revealing the English word', () => {
    expect(gameSource).toContain("card.kind !== 'meaning' || card.fullMeaning === card.text")
    expect(gameSource).toContain('meaningPopover.value = pair.fullMeaning')
    expect(gameSource).toContain('{{ meaningPopover }}')
    expect(gameSource).not.toContain('meaningPopover.word')
    expect(gameSource).not.toContain('wordMatchMeaningWord')
  })

  it('coordinates visual, audio and haptic pair feedback', () => {
    expect(gameSource).toContain("showMatchFeedback('correct')")
    expect(gameSource).toContain("showMatchFeedback('wrong')")
    expect(gameSource).toContain('playWordMatchFeedback(kind)')
    expect(gameSource).toContain('wordMatchFeedbackToast')
    expect(gameSource).not.toContain('配对成功')
    expect(gameSource).toContain('wordMatchCardBurst')
    expect(gameSource).toContain('wordMatchEnergyFill')
  })

  it('starts quiet looping music for the game and stops it when the page hides', () => {
    expect(gameSource).toContain('startWordMatchBackgroundMusic()')
    expect(pageSource).toContain('onHide(stopWordMatchBackgroundMusic)')
    expect(pageSource).toContain('if (ready.value) startWordMatchBackgroundMusic()')
    expect(feedbackSource).toContain("${audioCdnBaseUrl}/word-match/bgm-v1.mp3")
    expect(feedbackSource).toContain('word-match-bgm-v1.mp3')
    expect(feedbackSource).toContain('getFileSystemManager')
    expect(feedbackSource).toContain('downloadBackgroundMusic')
    expect(feedbackSource).not.toContain("'/static/audio/word-match-bgm.mp3'")
  })

  it('offers a persistent sound toggle without disabling haptic feedback', () => {
    expect(gameSource).toContain("soundEnabled ? '关闭声音' : '打开声音'")
    expect(gameSource).toContain('setWordMatchSoundEnabled(soundEnabled.value)')
    expect(gameSource).toContain('class="wordMatchSpeaker"')
    expect(gameSource).toContain('wordMatchSpeakerSlash')
    expect(gameSource).toContain('left: 46px;')
    expect(gameSource).toContain('width: 26px;')
    expect(gameSource).not.toContain('right: 84px;')
  })

  it('keeps packaged word-match media within 200 KB while BGM stays on CDN', () => {
    const totalBytes = wordMatchAssetUrls.reduce((sum, url) => sum + fs.statSync(url).size, 0)
    expect(totalBytes).toBeLessThanOrEqual(200_000)
  })

  it('fills combo energy against the real round size and exposes the perfect-round bonus', () => {
    expect(gameSource).toContain('Math.min(combo.value, perfectComboTarget.value) / perfectComboTarget.value')
    expect(gameSource).toContain('连击额外+3学习力')
    expect(gameSource).toContain('errorCount.value === 0')
    expect(gameSource).toContain('bestCombo.value === perfectComboTarget.value')
    expect(gameSource).not.toContain('找到意思相同的两张卡')
    expect(gameSource).not.toContain('18 + combo.value * 18')
  })

  it('uses the enchanted trail game world without coupling it to shared pages', () => {
    expect(gameSource).toContain('class="wordMatchBackdrop"')
    expect(gameSource).toContain('src="/static/themes/word-match-forest.jpg"')
    expect(gameSource).toContain('mode="aspectFill"')
    expect(pageSource).toContain('class="wordMatchBootBackdrop"')
    expect(gameSource).not.toContain("url('/static/themes/word-match-forest.jpg')")
    expect(pageSource).not.toContain("url('/static/themes/word-match-forest.jpg')")
    expect(gameSource).toContain('wordMatchFirefly')
    expect(gameSource).toContain('连击能量')
    expect(shellSource).not.toContain('word-match-forest.jpg')
  })

  it('uses a compact pill toolbar with clear tool counts', () => {
    expect(gameSource).toContain('class="wordMatchToolDivider"')
    expect(gameSource).toContain('class="wordMatchToolBadge"')
    expect(gameSource).toContain('backdrop-filter: blur(14px) saturate(140%);')
  })

  it('adds every stuck word to the existing weakbook without duplicating saved words', () => {
    expect(gameSource).toContain('一键加入生词本')
    expect(gameSource).toContain('allStuckPairs.value.filter(pair => !savedIds.has(pair.wordId))')
    expect(gameSource).toContain('session.saveWeakWord(pair.wordId)')
    expect(gameSource).toContain('这些词已在生词本中')
  })
})
