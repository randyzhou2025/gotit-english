<template>
  <WordMatchGame v-if="ready" />
  <view v-else class="wordMatchBoot" :style="screenStyle">
    <image
      class="wordMatchBootBackdrop"
      src="/static/themes/word-match-forest.jpg"
      mode="aspectFill"
      aria-hidden="true"
    />
    <view class="wordMatchBootScrim" aria-hidden="true" />
    <view class="wordMatchBootNav" />
    <view class="wordMatchBootStatus" />
    <view class="wordMatchBootBoard">
      <view v-for="index in 12" :key="index" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import {
  ensurePracticeSessionReady,
  isPracticeSessionReady,
  usePracticeSession
} from '@/app/usePracticeSession'
import {
  buildWeappShareAppMessage,
  buildWeappShareTimeline,
  showWeappShareMenu,
  type WeappShareOptions
} from '@/app/useWeappShare'
import { buildUnitChallengePath } from '@/app/unitChallenge'
import { useVisualTheme } from '@/app/useVisualTheme'
import { createClassmateShare } from '@/core/classmates'
import WordMatchGame from '@/features/word-match/WordMatchGame.vue'

const ready = ref(isPracticeSessionReady())
const preparedSharePath = ref('')
const { activeVisualThemeStyle } = useVisualTheme()
const screenStyle = computed(() => activeVisualThemeStyle.value)

function currentShare(): WeappShareOptions {
  try {
    const unit = usePracticeSession().selectedUnit.value
    if (!unit) return {}
    const title = `我刚完成 ${unit.unitName} 单词消消乐，你也来挑战`
    return {
      title,
      timelineTitle: title,
      path: preparedSharePath.value || buildUnitChallengePath('')
    }
  } catch {
    return {}
  }
}

async function prepareShare() {
  const unit = usePracticeSession().selectedUnit.value
  if (!unit) return
  try {
    const share = await createClassmateShare({
      publisherId: unit.publisherId,
      bookId: unit.bookId,
      unitId: unit.unitId,
      unitName: unit.unitName
    }, 'WORD_MATCH_CHALLENGE')
    preparedSharePath.value = share?.path ?? ''
  } catch (error) {
    console.warn('[word-match] share preparation failed', error)
  }
}

onShareAppMessage(() => buildWeappShareAppMessage(currentShare()))
onShareTimeline(() => buildWeappShareTimeline(currentShare()))

onBeforeMount(async () => {
  try {
    await ensurePracticeSessionReady()
    ready.value = true
    showWeappShareMenu()
    void prepareShare()
  } catch (error) {
    console.error('[word-match] session bootstrap failed', error)
    uni.showToast({ title: '词库加载失败，请检查网络', icon: 'none' })
    uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
  }
})
</script>

<script lang="ts">
export default {
  onShareAppMessage() {},
  onShareTimeline() {}
}
</script>

<style scoped lang="scss">
.wordMatchBoot {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 54px 16px 20px;
  overflow: hidden;
  background-color: #123d2b;
}

.wordMatchBootBackdrop,
.wordMatchBootScrim {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.wordMatchBootScrim {
  background: linear-gradient(180deg, rgba(3, 31, 20, 0.68), rgba(9, 47, 32, 0.18), rgba(2, 22, 15, 0.54));
}

.wordMatchBootNav,
.wordMatchBootStatus,
.wordMatchBootBoard,
.wordMatchBootBoard > view {
  position: relative;
  z-index: 1;
}

.wordMatchBootNav,
.wordMatchBootStatus,
.wordMatchBootBoard > view {
  border-radius: 14px;
  border: 1px solid rgba(232, 202, 112, 0.38);
  background: rgba(255, 250, 228, 0.66);
  opacity: 0.72;
}

.wordMatchBootNav { width: 42%; height: 24px; margin: 0 auto 26px; }
.wordMatchBootStatus { height: 36px; }
.wordMatchBootBoard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 58px; }
.wordMatchBootBoard > view { height: 76px; }
</style>
