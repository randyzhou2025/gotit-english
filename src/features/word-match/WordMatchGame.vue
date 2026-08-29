<template>
  <view class="wordMatchScreen" :style="screenStyle">
    <image
      class="wordMatchBackdrop"
      src="/static/themes/word-match-forest.jpg"
      mode="aspectFill"
      aria-hidden="true"
    />
    <view class="wordMatchBackdropScrim" aria-hidden="true" />
    <view class="wordMatchAtmosphere" aria-hidden="true">
      <view v-for="index in 7" :key="index" class="wordMatchFirefly" />
    </view>

    <view class="wordMatchNav">
      <view class="wordMatchBack" role="button" aria-label="返回" @tap="goBack"><text>‹</text></view>
      <text class="wordMatchTitle">单词消消乐</text>
    </view>

    <view v-if="!unit || rounds.length === 0" class="wordMatchEmpty">
      <text class="wordMatchEmptyTitle">这个 Unit 暂时无法生成配对</text>
      <text class="wordMatchEmptyCopy">请返回首页切换其他 Unit 后再试</text>
      <view class="wordMatchPrimaryButton" @tap="goBack"><text>返回首页</text></view>
    </view>

    <template v-else-if="!roundCompleted">
      <view class="wordMatchStatus">
        <text>当前 {{ unit.unitName }}</text>
        <text>第{{ currentRoundIndex + 1 }}轮 / 共{{ rounds.length }}轮</text>
        <text>完成 +2 学习力</text>
      </view>

      <view class="wordMatchPrompt">
        <view :class="['wordMatchComboHud', combo >= 2 && 'isHot']">
          <view class="wordMatchComboTop">
            <text class="wordMatchCombo">{{ combo >= 2 ? `Combo ×${combo}` : '连击能量' }}</text>
            <text class="wordMatchComboBonus">{{ perfectComboTarget }}连击额外+3学习力</text>
            <text class="wordMatchRoundProgress">{{ matchedPairCount }}/{{ currentRound?.wordCount ?? 0 }}</text>
          </view>
          <view class="wordMatchEnergyTrack">
            <view class="wordMatchEnergyFill" :style="{ width: `${comboEnergyPercent}%` }" />
          </view>
        </view>
      </view>

      <view
        class="wordMatchBoard"
        :class="{
          isSparse: visibleCards.length <= 6,
          isFinalPair: visibleCards.length === 2
        }"
      >
        <view
          v-for="card in visibleCards"
          :key="card.id"
          :class="[
            'wordMatchCard',
            card.kind === 'word' ? 'isWord' : 'isMeaning',
            selectedCardId === card.id && 'isSelected',
            correctPairId === card.pairId && 'isCorrect',
            wrongCardIds.includes(card.id) && 'isWrong',
            hintPairId === card.pairId && 'isHinted'
          ]"
          role="button"
          :aria-label="card.kind === 'word' ? `英文 ${card.text}` : `中文释义 ${card.text}`"
          @tap="selectCard(card)"
          @longpress="showFullMeaning(card)"
        >
          <view v-if="correctPairId === card.pairId" class="wordMatchCardBurst" aria-hidden="true">
            <text v-for="index in 6" :key="index">✦</text>
          </view>
          <text class="wordMatchCardText">{{ card.text }}</text>
          <text v-if="card.kind === 'meaning' && card.fullMeaning !== card.text" class="wordMatchMore">…</text>
        </view>
        <view
          v-if="feedbackKind"
          :key="feedbackSerial"
          class="wordMatchFeedbackToast isWrong"
        >
          <text>再试一次</text>
        </view>
      </view>

      <view v-if="lastMatchedText" class="wordMatchMatchedBar">
        <text>{{ lastMatchedText }}</text>
      </view>

      <view class="wordMatchTools">
        <view
          :class="['wordMatchTool', hintCount === 0 && 'isDisabled']"
          role="button"
          @tap="useHint"
        >
          <view class="wordMatchToolIcon isHint">
            <text>?</text>
            <text class="wordMatchToolBadge">{{ hintCount }}</text>
          </view>
          <text class="wordMatchToolTitle">提示</text>
        </view>
        <view class="wordMatchToolDivider" />
        <view
          :class="['wordMatchTool', shuffleCount === 0 && 'isDisabled']"
          role="button"
          @tap="useShuffle"
        >
          <view class="wordMatchToolIcon isShuffle">
            <text>⇄</text>
            <text class="wordMatchToolBadge">{{ shuffleCount }}</text>
          </view>
          <text class="wordMatchToolTitle">洗牌</text>
        </view>
      </view>
    </template>

    <view v-else class="wordMatchResult">
      <view class="wordMatchLaurel"><text>本轮完成</text></view>
      <view class="wordMatchReward">
        <text class="wordMatchRewardMain">{{ rewardHeadline }}</text>
        <text class="wordMatchRewardMeta">{{ rewardMeta }}</text>
      </view>

      <view class="wordMatchResultStats">
        <view><text class="wordMatchStatLabel">用时</text><text class="wordMatchStatValue">{{ elapsedLabel }}</text></view>
        <view><text class="wordMatchStatLabel">完成配对</text><text class="wordMatchStatValue">{{ currentRound?.wordCount ?? 0 }}/{{ currentRound?.wordCount ?? 0 }}</text></view>
        <view><text class="wordMatchStatLabel">错误点击</text><text class="wordMatchStatValue">{{ errorCount }}</text></view>
        <view><text class="wordMatchStatLabel">最高连击</text><text class="wordMatchStatValue">{{ bestCombo }}</text></view>
      </view>

      <view class="wordMatchUnitProgress">
        <view class="wordMatchUnitProgressTop">
          <text>本单元进度</text>
          <text>{{ completedRoundCount }}/{{ rounds.length }}轮</text>
        </view>
        <view class="wordMatchUnitProgressTrack">
          <view class="wordMatchUnitProgressFill" :style="{ width: `${unitProgressPercent}%` }" />
        </view>
      </view>

      <view v-if="stuckPairs.length > 0" class="wordMatchStuck">
        <view class="wordMatchStuckHeader">
          <text class="wordMatchStuckTitle">刚才容易卡住的词</text>
          <view
            :class="['wordMatchStuckSave', allStuckWordsSaved && 'isSaved']"
            role="button"
            @tap="saveStuckWords"
          >
            <text>{{ allStuckWordsSaved ? '已加入生词本' : '一键加入生词本' }}</text>
          </view>
        </view>
        <view v-for="pair in stuckPairs" :key="pair.id" class="wordMatchStuckRow">
          <text class="wordMatchStuckWord">{{ pair.word }}</text>
          <text class="wordMatchStuckMeaning">{{ pair.fullMeaning }}</text>
        </view>
      </view>

      <view class="wordMatchResultActions">
        <view class="wordMatchPrimaryButton" @tap="goToDictation"><text>去听写本单元</text></view>
        <view v-if="hasNextRound" class="wordMatchSecondaryButton" @tap="continueNextRound"><text>继续下一轮</text></view>
        <!-- #ifdef MP-WEIXIN -->
        <button class="wordMatchShareButton" open-type="share">邀请同学挑战本 Unit</button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="wordMatchShareButton" @tap="showShareHint"><text>邀请同学挑战本 Unit</text></view>
        <!-- #endif -->
      </view>
    </view>

    <view v-if="meaningPopover" class="wordMatchMeaningMask" @tap="meaningPopover = null">
      <view class="wordMatchMeaningPopover" @tap.stop>
        <text class="wordMatchMeaningFull">{{ meaningPopover }}</text>
        <view class="wordMatchMeaningClose" @tap="meaningPopover = null"><text>知道了</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePracticeSession } from '@/app/usePracticeSession'
import { useVisualTheme } from '@/app/useVisualTheme'
import type { WordMatchCard, WordMatchPair } from './core'
import { buildWordMatchRounds, createRoundCards, shuffleCards } from './core'
import {
  submitWordMatchRound,
  syncPendingWordMatchRewards,
  type WordMatchRoundAward
} from './api'
import {
  disposeWordMatchFeedback,
  playWordMatchFeedback,
  prepareWordMatchFeedback
} from './feedback'
import {
  clearPendingWordMatchReward,
  completedWordMatchRounds,
  markWordMatchRoundCompleted,
  nextWordMatchRound,
  queuePendingWordMatchReward
} from './progress'

const session = usePracticeSession()
const { activeVisualThemeStyle } = useVisualTheme()
const unit = session.selectedUnit.value
const rounds = unit ? buildWordMatchRounds(unit.words) : []

const currentRoundIndex = ref(unit ? nextWordMatchRound(unit.unitId, rounds.length) : 0)
const cards = ref<WordMatchCard[]>([])
const selectedCardId = ref('')
const correctPairId = ref('')
const wrongCardIds = ref<string[]>([])
const hintPairId = ref('')
const hintCount = ref(1)
const shuffleCount = ref(1)
const combo = ref(0)
const bestCombo = ref(0)
const errorCount = ref(0)
const roundCompleted = ref(false)
const startedAt = ref(Date.now())
const elapsedSeconds = ref(0)
const lastMatchedText = ref('')
const stuckPairIds = ref<string[]>([])
const award = ref<WordMatchRoundAward | null>(null)
const rewardPending = ref(false)
const rewardSyncPending = ref(false)
const meaningPopover = ref<string | null>(null)
const feedbackKind = ref<'wrong' | ''>('')
const feedbackSerial = ref(0)
const capsuleTop = ref(44)
const timers = new Set<ReturnType<typeof setTimeout>>()

const currentRound = computed(() => rounds[currentRoundIndex.value])
const visibleCards = computed(() => cards.value)
const matchedPairCount = computed(() => Math.max(
  0,
  (currentRound.value?.wordCount ?? 0) - Math.ceil(cards.value.length / 2)
))
const perfectComboTarget = computed(() => currentRound.value?.wordCount ?? 0)
const comboEnergyPercent = computed(() => perfectComboTarget.value > 0
  ? Math.round((Math.min(combo.value, perfectComboTarget.value) / perfectComboTarget.value) * 100)
  : 0)
const perfectRound = computed(() => (
  perfectComboTarget.value > 0
  && errorCount.value === 0
  && bestCombo.value === perfectComboTarget.value
))
const roundRewardScore = computed(() => perfectRound.value ? 5 : 2)
const completedRoundIndexes = ref(unit ? completedWordMatchRounds(unit.unitId, rounds.length) : [])
const completedRoundCount = computed(() => completedRoundIndexes.value.length)
const hasNextRound = computed(() => currentRoundIndex.value < rounds.length - 1)
const unitProgressPercent = computed(() => rounds.length > 0
  ? Math.round((completedRoundCount.value / rounds.length) * 100)
  : 0)
const elapsedLabel = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60
  return minutes > 0 ? `${minutes}分${String(seconds).padStart(2, '0')}秒` : `${seconds}秒`
})
const allStuckPairs = computed(() => {
  const ids = new Set(stuckPairIds.value)
  return (currentRound.value?.pairs ?? [])
    .filter(pair => ids.has(pair.id))
})
const stuckPairs = computed(() => allStuckPairs.value.slice(0, 3))
const allStuckWordsSaved = computed(() => {
  const savedIds = new Set(session.savedWeakWords.value.map(word => word.id))
  return allStuckPairs.value.length > 0
    && allStuckPairs.value.every(pair => savedIds.has(pair.wordId))
})
const rewardHeadline = computed(() => {
  if (rewardPending.value) return '学习力同步中'
  if (rewardSyncPending.value) return `+${roundRewardScore.value} 学习力待同步`
  if (!award.value) return `本轮 +${roundRewardScore.value} 学习力`
  if (award.value.earned > 0) return `获得 +${award.value.earned} 学习力`
  if (award.value.duplicate) return '本轮今日已奖励'
  return '今日消消乐奖励已达上限'
})
const rewardMeta = computed(() => {
  if (rewardSyncPending.value) return '下次进入时自动补发，无需重玩'
  if (!award.value) return '每日最多通过消消乐获得 +20'
  return `今日消消乐 +${award.value.dailyEarned}/${award.value.dailyLimit}`
})
const screenStyle = computed(() => (
  `${activeVisualThemeStyle.value} --word-match-capsule-top:${capsuleTop.value}px;`
))

function later(callback: () => void, delay: number) {
  const timer = setTimeout(() => {
    timers.delete(timer)
    callback()
  }, delay)
  timers.add(timer)
}

function showMatchFeedback(kind: 'correct' | 'wrong') {
  playWordMatchFeedback(kind)
  if (kind === 'correct') return

  feedbackKind.value = 'wrong'
  feedbackSerial.value += 1
  const serial = feedbackSerial.value
  later(() => {
    if (feedbackSerial.value === serial) feedbackKind.value = ''
  }, 480)
}

function updateCapsuleTop() {
  try {
    const capsule = uni.getMenuButtonBoundingClientRect?.()
    if (capsule && capsule.top > 0) capsuleTop.value = capsule.top
  } catch {
    // Use the stable fallback in H5 and restricted preview contexts.
  }
}

function loadRoundCards() {
  cards.value = currentRound.value ? createRoundCards(currentRound.value) : []
  selectedCardId.value = ''
  correctPairId.value = ''
  wrongCardIds.value = []
  hintPairId.value = ''
}

function startRound(index: number) {
  currentRoundIndex.value = Math.max(0, Math.min(index, rounds.length - 1))
  hintCount.value = 1
  shuffleCount.value = 1
  combo.value = 0
  bestCombo.value = 0
  errorCount.value = 0
  roundCompleted.value = false
  startedAt.value = Date.now()
  elapsedSeconds.value = 0
  lastMatchedText.value = ''
  stuckPairIds.value = []
  award.value = null
  rewardPending.value = false
  rewardSyncPending.value = false
  feedbackKind.value = ''
  loadRoundCards()
}

function pairForCard(card: WordMatchCard): WordMatchPair | undefined {
  return currentRound.value?.pairs.find(pair => pair.id === card.pairId)
}

function addStuckPair(pairId: string) {
  if (!stuckPairIds.value.includes(pairId)) stuckPairIds.value.push(pairId)
}

function selectCard(card: WordMatchCard) {
  if (correctPairId.value || wrongCardIds.value.length > 0) return
  if (selectedCardId.value === card.id) {
    if (card.kind === 'meaning') showFullMeaning(card)
    else selectedCardId.value = ''
    return
  }

  const selected = cards.value.find(item => item.id === selectedCardId.value)
  if (!selected || selected.kind === card.kind) {
    selectedCardId.value = card.id
    return
  }

  if (selected.pairId === card.pairId) {
    showMatchFeedback('correct')
    combo.value += 1
    bestCombo.value = Math.max(bestCombo.value, combo.value)
    correctPairId.value = card.pairId
    const pair = pairForCard(card)
    if (pair) lastMatchedText.value = `${pair.word}  ${pair.fullMeaning}`
    const clearsRound = cards.value.length === 2
    later(() => {
      cards.value = cards.value.filter(item => item.pairId !== card.pairId)
      selectedCardId.value = ''
      correctPairId.value = ''
      if (!clearsRound) return
      later(completeRound, 260)
    }, 420)
    later(() => { lastMatchedText.value = '' }, 1400)
    return
  }

  combo.value = 0
  showMatchFeedback('wrong')
  errorCount.value += 1
  wrongCardIds.value = [selected.id, card.id]
  addStuckPair(selected.pairId)
  addStuckPair(card.pairId)
  later(() => {
    wrongCardIds.value = []
    selectedCardId.value = ''
  }, 320)
}

function showFullMeaning(card: WordMatchCard) {
  if (card.kind !== 'meaning' || card.fullMeaning === card.text) return
  const pair = pairForCard(card)
  if (!pair) return
  meaningPopover.value = pair.fullMeaning
}

function useHint() {
  if (hintCount.value <= 0) {
    uni.showToast({ title: '本轮提示次数已用完', icon: 'none' })
    return
  }
  const pairId = cards.value[0]?.pairId
  if (!pairId) return
  hintCount.value -= 1
  hintPairId.value = pairId
  addStuckPair(pairId)
  later(() => { hintPairId.value = '' }, 1100)
}

function useShuffle() {
  if (shuffleCount.value <= 0) {
    uni.showToast({ title: '本轮洗牌次数已用完', icon: 'none' })
    return
  }
  shuffleCount.value -= 1
  selectedCardId.value = ''
  cards.value = shuffleCards(cards.value)
}

function saveStuckWords() {
  const savedIds = new Set(session.savedWeakWords.value.map(word => word.id))
  const newPairs = allStuckPairs.value.filter(pair => !savedIds.has(pair.wordId))
  for (const pair of newPairs) session.saveWeakWord(pair.wordId)
  uni.showToast({
    title: newPairs.length > 0 ? `已加入${newPairs.length}个生词` : '这些词已在生词本中',
    icon: 'none'
  })
}

async function completeRound() {
  if (!unit || !currentRound.value || roundCompleted.value) return
  elapsedSeconds.value = Math.max(1, Math.round((Date.now() - startedAt.value) / 1000))
  roundCompleted.value = true
  markWordMatchRoundCompleted(unit.unitId, currentRoundIndex.value)
  completedRoundIndexes.value = completedWordMatchRounds(unit.unitId, rounds.length)
  const rewardInput = {
    unitId: unit.unitId,
    roundIndex: currentRoundIndex.value,
    wordCount: currentRound.value.wordCount,
    bestCombo: bestCombo.value,
    errorCount: errorCount.value
  }
  queuePendingWordMatchReward(rewardInput)
  rewardPending.value = true
  rewardSyncPending.value = false
  try {
    award.value = await submitWordMatchRound(rewardInput)
    if (award.value) clearPendingWordMatchReward(rewardInput.unitId, rewardInput.roundIndex)
    else rewardSyncPending.value = true
  } catch (error) {
    console.warn('[word-match] learning power settlement failed', error)
    rewardSyncPending.value = true
  } finally {
    rewardPending.value = false
  }
}

function continueNextRound() {
  startRound((currentRoundIndex.value + 1) % rounds.length)
}

function goToDictation() {
  session.openDictationSetup({ scrollToTop: false })
  uni.navigateTo({ url: '/pages/dictation/setup' })
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}

function showShareHint() {
  uni.showToast({ title: '请在微信小程序中邀请同学', icon: 'none' })
}

onMounted(() => {
  updateCapsuleTop()
  prepareWordMatchFeedback()
  void syncPendingWordMatchRewards()
  if (rounds.length > 0) startRound(currentRoundIndex.value)
})

onBeforeUnmount(() => {
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
  disposeWordMatchFeedback()
})
</script>

<style scoped lang="scss">
.wordMatchScreen {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: var(--word-match-capsule-top, 44px) 16px calc(20px + env(safe-area-inset-bottom));
  overflow-x: hidden;
  background-color: #123d2b;
  color: #173d2e;
}

.wordMatchBackdrop,
.wordMatchBackdropScrim {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.wordMatchBackdropScrim {
  background: linear-gradient(180deg, rgba(3, 31, 20, 0.72) 0%, rgba(8, 45, 30, 0.3) 24%, rgba(7, 39, 27, 0.12) 58%, rgba(2, 22, 15, 0.6) 100%);
}

.wordMatchAtmosphere {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.wordMatchFirefly {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffe68c;
  box-shadow: 0 0 7px 2px rgba(255, 230, 140, 0.72);
  opacity: 0.56;
}

.wordMatchFirefly:nth-child(1) { top: 18%; left: 5%; }
.wordMatchFirefly:nth-child(2) { top: 27%; right: 7%; animation-delay: 600ms; }
.wordMatchFirefly:nth-child(3) { top: 48%; left: 3%; animation-delay: 1.1s; }
.wordMatchFirefly:nth-child(4) { top: 62%; right: 5%; animation-delay: 1.55s; }
.wordMatchFirefly:nth-child(5) { bottom: 18%; left: 9%; animation-delay: 350ms; }
.wordMatchFirefly:nth-child(6) { right: 11%; bottom: 11%; animation-delay: 1.8s; }
.wordMatchFirefly:nth-child(7) { top: 36%; left: 49%; animation-delay: 900ms; }

.wordMatchNav,
.wordMatchEmpty,
.wordMatchStatus,
.wordMatchPrompt,
.wordMatchBoard,
.wordMatchMatchedBar,
.wordMatchTools,
.wordMatchResult {
  position: relative;
  z-index: 1;
}

.wordMatchNav {
  position: relative;
  display: flex;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;
}

.wordMatchBack {
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-left: -8px;
  border-radius: 14px;
  border: 1px solid rgba(241, 218, 143, 0.46);
  background: rgba(9, 49, 33, 0.46);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 6px 18px rgba(1, 22, 14, 0.2);
  color: #fff5cf;
  font-size: 36px;
  line-height: 1;
}

.wordMatchBack:active { transform: translateY(1px) scale(0.94); }

.wordMatchTitle {
  color: #fff5cf;
  font-size: 20px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-shadow: 0 2px 10px rgba(2, 26, 17, 0.6);
}

.wordMatchTitle::before,
.wordMatchTitle::after {
  color: #e8ca70;
  font-size: 11px;
  vertical-align: 2px;
}

.wordMatchTitle::before { margin-right: 10px; content: '✦'; }
.wordMatchTitle::after { margin-left: 10px; content: '✦'; }

.wordMatchStatus {
  overflow: hidden;
}

.wordMatchStatus {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 40px;
  margin-top: 8px;
  padding: 0 12px;
  border: 1px solid rgba(232, 202, 112, 0.48);
  border-radius: 15px;
  background: rgba(9, 52, 35, 0.68);
  box-shadow: 0 8px 22px rgba(1, 22, 14, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  color: rgba(255, 248, 222, 0.88);
  font-size: 11px;
  line-height: 1.2;
  font-weight: 800;
  backdrop-filter: blur(12px) saturate(130%);
}

.wordMatchStatus text:nth-child(2) { text-align: center; }
.wordMatchStatus text:last-child { color: #c7ff96; text-align: right; }

.wordMatchPrompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 7px 2px 6px;
  color: #fff6d7;
  font-size: 14px;
  font-weight: 850;
  text-shadow: 0 2px 8px rgba(2, 27, 18, 0.54);
}

.wordMatchComboHud {
  display: grid;
  grid-template-rows: auto 5px;
  width: 100%;
}

.wordMatchComboTop {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 42px;
  align-items: center;
  min-height: 22px;
}

.wordMatchCombo {
  color: rgba(255, 246, 215, 0.76);
  font-size: 12px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.wordMatchComboHud.isHot .wordMatchCombo {
  color: #ffd967;
  font-size: 17px;
  font-style: italic;
  text-shadow: 0 0 14px rgba(255, 213, 91, 0.78);
}

.wordMatchComboBonus {
  color: #ffe58b;
  font-size: 11px;
  line-height: 1;
  font-weight: 850;
  text-align: center;
  text-shadow: 0 1px 6px rgba(2, 27, 18, 0.48);
}

.wordMatchRoundProgress {
  color: rgba(255, 248, 222, 0.76);
  font-size: 11px;
  text-align: right;
}

.wordMatchEnergyTrack {
  height: 5px;
  overflow: hidden;
  border: 1px solid rgba(255, 246, 215, 0.28);
  border-radius: 999px;
  background: rgba(2, 30, 19, 0.46);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.32);
}

.wordMatchEnergyFill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #77e481, #d5ff78 72%, #fff0a4);
  box-shadow: 0 0 12px rgba(174, 255, 118, 0.76);
  transition: width 320ms cubic-bezier(0.22, 0.84, 0.32, 1);
}

.wordMatchBoard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 76px;
  gap: 9px;
  min-height: 331px;
  padding: 4px 0 6px;
}

.wordMatchBoard.isSparse { align-content: center; }
.wordMatchBoard.isFinalPair {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 66%;
  margin-right: auto;
  margin-left: auto;
}

.wordMatchFeedbackToast {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(255, 247, 215, 0.58);
  border-radius: 999px;
  box-shadow: 0 10px 28px rgba(1, 28, 18, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  color: #fff9df;
  font-size: 14px;
  font-weight: 900;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.wordMatchFeedbackToast.isWrong { background: rgba(166, 74, 67, 0.94); }

.wordMatchCard {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 9px 8px;
  overflow: hidden;
  border: 1px solid rgba(234, 211, 139, 0.6);
  border-radius: 13px;
  box-shadow: 0 8px 18px rgba(2, 31, 20, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.42);
  text-align: center;
  transition:
    transform 280ms cubic-bezier(0.22, 0.84, 0.32, 1),
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 220ms ease,
    opacity 180ms ease;
}

.wordMatchCard::before {
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 9px;
  content: '';
  pointer-events: none;
}

.wordMatchCard.isWord {
  border-color: rgba(135, 206, 176, 0.7);
  background: linear-gradient(155deg, rgba(49, 115, 91, 0.92), rgba(20, 73, 54, 0.94));
  color: #fffbea;
  text-shadow: 0 1px 5px rgba(1, 24, 15, 0.42);
}

.wordMatchCard.isMeaning {
  background:
    linear-gradient(145deg, rgba(255, 253, 239, 0.97), rgba(244, 235, 199, 0.95));
  color: #1a422f;
}

.wordMatchCard:active { transform: scale(0.95); }

.wordMatchCard.isSelected {
  border: 2px solid #96ff78;
  box-shadow: 0 10px 22px rgba(2, 31, 20, 0.28), 0 0 0 3px rgba(113, 255, 91, 0.24), 0 0 22px rgba(125, 255, 95, 0.72);
  transform: translateY(-3px) scale(1.018);
}

.wordMatchCard.isCorrect {
  border-color: #c8ff93;
  background: linear-gradient(145deg, #41a75d, #187547);
  box-shadow: 0 0 0 3px rgba(190, 255, 142, 0.26), 0 0 28px rgba(149, 255, 102, 0.82);
  color: #fffdea;
  transform: scale(0.96);
}

.wordMatchCard.isHinted {
  border: 2px solid #ffe17c;
  box-shadow: 0 0 0 3px rgba(255, 222, 103, 0.2), 0 0 24px rgba(255, 218, 82, 0.62);
  transform: translateY(-3px) scale(1.02);
}

.wordMatchCard.isWrong {
  border-color: #ff7b6c;
  box-shadow: 0 0 0 3px rgba(255, 111, 94, 0.2), 0 0 18px rgba(255, 93, 78, 0.48);
}

.wordMatchCardBurst {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.wordMatchCardBurst text {
  position: absolute;
  top: 50%;
  left: 50%;
  color: #fff3a4;
  font-size: 12px;
  opacity: 0;
  text-shadow: 0 0 8px rgba(255, 235, 123, 0.9);
}

.wordMatchCardBurst text:nth-child(1) { --burst-x: -48px; --burst-y: -24px; }
.wordMatchCardBurst text:nth-child(2) { --burst-x: 42px; --burst-y: -28px; }
.wordMatchCardBurst text:nth-child(3) { --burst-x: -52px; --burst-y: 18px; }
.wordMatchCardBurst text:nth-child(4) { --burst-x: 48px; --burst-y: 20px; }
.wordMatchCardBurst text:nth-child(5) { --burst-x: -12px; --burst-y: -38px; }
.wordMatchCardBurst text:nth-child(6) { --burst-x: 13px; --burst-y: 34px; }

.wordMatchCardText {
  position: relative;
  z-index: 2;
  display: -webkit-box;
  overflow: hidden;
  font-size: 15px;
  line-height: 1.25;
  font-weight: 800;
  word-break: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.wordMatchCard.isWord .wordMatchCardText { font-size: 14px; overflow-wrap: normal; word-break: keep-all; }
.wordMatchCard.isMeaning .wordMatchCardText { word-break: break-all; }

.wordMatchMore {
  position: absolute;
  top: 4px;
  right: 7px;
  color: #657b6e;
  font-size: 14px;
  line-height: 1;
  pointer-events: none;
}

.wordMatchMatchedBar {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  margin-top: 7px;
  padding: 6px 12px;
  border: 1px solid rgba(232, 202, 112, 0.38);
  border-radius: 11px;
  background: rgba(9, 52, 35, 0.7);
  box-shadow: 0 7px 18px rgba(1, 22, 14, 0.24);
  color: #fff6d7;
  font-size: 11px;
  line-height: 1.35;
  text-align: center;
}

.wordMatchTools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  align-items: center;
  box-sizing: border-box;
  width: 82%;
  max-width: 300px;
  height: 66px;
  margin-top: auto;
  margin-right: auto;
  margin-left: auto;
  padding: 6px 8px;
  border: 1px solid rgba(232, 202, 112, 0.58);
  border-radius: 999px;
  background: rgba(10, 55, 37, 0.82);
  box-shadow: 0 12px 30px rgba(1, 22, 14, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(14px) saturate(140%);
}

.wordMatchTool {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border-radius: 999px;
  color: #fff6d7;
  transition: transform 120ms ease, opacity 120ms ease, background-color 120ms ease;
}

.wordMatchTool:active { background: rgba(255, 246, 215, 0.1); transform: scale(0.94); }
.wordMatchTool.isDisabled { opacity: 0.42; }
.wordMatchToolDivider { width: 1px; height: 34px; background: rgba(255, 246, 215, 0.24); }
.wordMatchToolTitle { margin-left: 9px; font-size: 14px; font-weight: 850; }

.wordMatchToolIcon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(232, 202, 112, 0.5);
  background: linear-gradient(145deg, #fffbed, #eadca8);
  box-shadow: 0 5px 14px rgba(1, 22, 14, 0.28), inset 0 1px 0 #fff;
  font-size: 20px;
  line-height: 1;
  font-weight: 950;
}

.wordMatchToolIcon.isHint { color: #b7780b; }
.wordMatchToolIcon.isShuffle { color: #146d4e; font-size: 23px; }

.wordMatchToolBadge {
  position: absolute;
  right: -5px;
  bottom: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid #f4e9bd;
  border-radius: 50%;
  background: #13704e;
  color: #fffdf8;
  font-size: 10px;
  font-weight: 900;
}

.wordMatchEmpty,
.wordMatchResult {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: stretch;
}

.wordMatchEmpty { align-items: center; justify-content: center; padding: 40px 18px; text-align: center; }
.wordMatchEmptyTitle { font-size: 20px; font-weight: 900; }
.wordMatchEmptyCopy { margin: 10px 0 24px; color: var(--muted); font-size: 14px; }

.wordMatchLaurel {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  color: var(--accent);
  font-size: 27px;
  font-weight: 950;
}

.wordMatchReward {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 13px;
  padding: 12px;
  border-radius: 15px;
  background: #f1d995;
  color: #694f13;
}

.wordMatchRewardMain { font-size: 16px; font-weight: 950; }
.wordMatchRewardMeta { margin-top: 3px; font-size: 11px; font-weight: 750; }

.wordMatchResultStats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 14px;
}

.wordMatchResultStats > view {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 50px;
  padding: 0 13px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 5px 14px var(--ink-shadow);
}

.wordMatchStatLabel { color: var(--muted); font-size: 11px; font-weight: 700; }
.wordMatchStatValue { color: var(--ink); font-size: 15px; font-weight: 900; }

.wordMatchUnitProgress,
.wordMatchStuck {
  margin-top: 12px;
  padding: 13px 14px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: var(--surface);
  box-shadow: 0 5px 14px var(--ink-shadow);
}

.wordMatchUnitProgressTop { display: flex; justify-content: space-between; color: var(--ink-soft); font-size: 12px; font-weight: 850; }
.wordMatchUnitProgressTrack { height: 5px; margin-top: 9px; overflow: hidden; border-radius: 999px; background: var(--line); }
.wordMatchUnitProgressFill { height: 100%; border-radius: inherit; background: var(--accent); }
.wordMatchStuckHeader { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.wordMatchStuckTitle { color: var(--accent); font-size: 13px; font-weight: 900; }
.wordMatchStuckSave {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid var(--accent);
  border-radius: 999px;
  color: var(--accent);
  font-size: 11px;
  line-height: 1;
  font-weight: 850;
}
.wordMatchStuckSave:active { background: var(--accent-soft); transform: scale(0.97); }
.wordMatchStuckSave.isSaved { border-color: var(--line-strong); color: var(--muted); }
.wordMatchStuckRow { display: grid; grid-template-columns: 105px minmax(0, 1fr); gap: 10px; margin-top: 9px; }
.wordMatchStuckWord { color: var(--ink); font-size: 13px; font-weight: 850; }
.wordMatchStuckMeaning { color: var(--ink-soft); font-size: 11px; line-height: 1.35; }

.wordMatchResultActions { display: grid; gap: 9px; margin-top: auto; padding-top: 16px; }
.wordMatchPrimaryButton,
.wordMatchSecondaryButton,
.wordMatchShareButton {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  height: 50px;
  margin: 0;
  border: 0;
  border-radius: 15px;
  font-size: 15px;
  line-height: 1;
  font-weight: 900;
}

.wordMatchPrimaryButton { background: var(--accent); color: #fffdf8; }
.wordMatchSecondaryButton { border: 1px solid var(--line-strong); background: var(--surface); color: var(--accent); }
.wordMatchShareButton { height: 44px; background: transparent; color: var(--ink-soft); font-size: 13px; }
.wordMatchShareButton::after { border: 0; }
.wordMatchPrimaryButton:active,
.wordMatchSecondaryButton:active,
.wordMatchShareButton:active { transform: translateY(1px) scale(0.99); }

.wordMatchMeaningMask {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(17, 40, 34, 0.42);
}

.wordMatchMeaningPopover {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 330px;
  padding: 22px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: 0 22px 60px var(--accent-shadow);
}

.wordMatchMeaningFull { color: var(--ink); font-size: 15px; line-height: 1.65; font-weight: 700; }
.wordMatchMeaningClose { display: flex; align-items: center; justify-content: center; height: 46px; margin-top: 20px; border-radius: 14px; background: var(--accent); color: #fffdf8; font-size: 14px; font-weight: 900; }

@media (max-width: 360px) {
  .wordMatchScreen { padding-right: 12px; padding-left: 12px; }
  .wordMatchStatus { padding-right: 8px; padding-left: 8px; font-size: 10px; }
  .wordMatchBoard { gap: 7px; grid-auto-rows: 70px; min-height: 305px; }
  .wordMatchCard { padding: 7px 5px; }
  .wordMatchCardText { font-size: 13px; }
  .wordMatchCard.isWord .wordMatchCardText { font-size: 12px; }
}

@media (max-height: 760px) {
  .wordMatchScreen { padding-bottom: calc(12px + env(safe-area-inset-bottom)); }
  .wordMatchPrompt { min-height: 56px; padding-top: 4px; padding-bottom: 4px; }
  .wordMatchBoard { grid-auto-rows: 60px; gap: 7px; min-height: 395px; }
  .wordMatchTools { height: 58px; }
  .wordMatchTool { height: 46px; }
  .wordMatchToolIcon { width: 36px; height: 36px; font-size: 18px; }
}

@media (max-height: 700px) {
  .wordMatchScreen { padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
  .wordMatchNav { flex-basis: 42px; }
  .wordMatchTitle { font-size: 18px; }
  .wordMatchStatus { min-height: 36px; margin-top: 4px; }
  .wordMatchPrompt { min-height: 52px; }
  .wordMatchBoard { grid-auto-rows: 56px; gap: 6px; min-height: 376px; }
  .wordMatchCard { padding-top: 6px; padding-bottom: 6px; }
  .wordMatchTools { height: 54px; }
  .wordMatchTool { height: 44px; }
  .wordMatchToolIcon { width: 34px; height: 34px; }
}

@media (prefers-reduced-motion: no-preference) {
  .wordMatchFirefly { animation: wordMatchFirefly 2.4s ease-in-out infinite alternate; }
  .wordMatchComboHud.isHot .wordMatchCombo { animation: wordMatchComboPop 360ms cubic-bezier(0.18, 0.9, 0.3, 1.25) both; }
  .wordMatchCard.isCorrect { animation: wordMatchSuccess 420ms ease both; }
  .wordMatchCard.isWrong { animation: wordMatchWrong 300ms ease both; }
  .wordMatchCard.isHinted { animation: wordMatchHint 900ms ease both; }
  .wordMatchCard.isSelected { animation: wordMatchSelected 1.3s ease-in-out infinite alternate; }
  .wordMatchCardBurst text { animation: wordMatchBurst 430ms ease-out both; }
  .wordMatchFeedbackToast { animation: wordMatchFeedback 620ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
}

@media (prefers-reduced-motion: reduce) {
  .wordMatchCard { transition: none; }
  .wordMatchEnergyFill { transition: none; }
}

@keyframes wordMatchFirefly {
  from { opacity: 0.25; transform: scale(0.72); }
  to { opacity: 0.72; transform: scale(1.18); }
}

@keyframes wordMatchComboPop {
  0% { opacity: 0.68; transform: scale(0.88); }
  70% { opacity: 1; transform: scale(1.06); }
  100% { transform: scale(1); }
}

@keyframes wordMatchSelected {
  from { box-shadow: 0 10px 22px rgba(2, 31, 20, 0.28), 0 0 0 3px rgba(113, 255, 91, 0.18), 0 0 15px rgba(125, 255, 95, 0.48); }
  to { box-shadow: 0 10px 22px rgba(2, 31, 20, 0.28), 0 0 0 4px rgba(113, 255, 91, 0.3), 0 0 28px rgba(125, 255, 95, 0.82); }
}

@keyframes wordMatchBurst {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45); }
  24% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(-50% + var(--burst-x)), calc(-50% + var(--burst-y))) scale(1.15); }
}

@keyframes wordMatchSuccess {
  42% { transform: scale(1.055); }
  100% { transform: scale(0.94); opacity: 0.18; }
}

@keyframes wordMatchWrong {
  25% { transform: translateX(-4px); }
  50% { transform: translateX(4px); }
  75% { transform: translateX(-2px); }
}

@keyframes wordMatchHint {
  50% { transform: translateY(-3px) scale(1.035); }
}

@keyframes wordMatchFeedback {
  0% { opacity: 0; transform: translate(-50%, -42%) scale(0.88); }
  24% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
  72% { opacity: 1; transform: translate(-50%, -54%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -66%) scale(0.98); }
}
</style>
