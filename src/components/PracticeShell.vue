<template>
  <PracticeShellInner
    v-if="ready"
    v-bind="$attrs"
    class="practiceShellInner"
  />
  <view
    v-else
    :class="['practiceBoot', 'screen', isTabRoot && 'hasBottomNav', HOME_REDESIGN_V2_ENABLED && 'isHomeV2Screen']"
    :style="screenStyle"
  >
    <view v-if="HOME_REDESIGN_V2_ENABLED" class="homeV2Boot">
      <view class="homeV2BootHeader">
        <view class="bootSkeletonBlock homeV2BootTitle" />
        <view class="bootSkeletonBlock homeV2BootFeedback" />
      </view>
      <view class="bootSkeletonBlock homeV2BootCourse" />
      <view class="bootSkeletonBlock homeV2BootDictation" />
      <view class="homeV2BootQuickGrid">
        <view class="bootSkeletonBlock homeV2BootQuick" />
        <view class="bootSkeletonBlock homeV2BootQuick" />
      </view>
      <view class="bootSkeletonBlock homeV2BootEgg" />
    </view>

    <view v-else class="homeScreen">
      <view class="homeHero">
        <view class="homeHeroMain">
          <view class="homeHeroTitle">课本单词通</view>
          <view class="homeHeroSubtitle">别急着背更多，先把课本里的单词真正掌握</view>
        </view>
        <view class="homeHeroTags">
          <text class="homeHeroTag">教材同步</text>
          <text class="homeHeroTag">自动听写</text>
          <text class="homeHeroTag">生词复习</text>
        </view>
      </view>

      <view class="homeUnitCard bootSkeletonCard">
        <view class="bootSkeletonLine bootSkeletonLineShort" />
        <view class="bootSkeletonLine bootSkeletonLineTitle" />
        <view class="bootSkeletonLine bootSkeletonLineMedium" />
        <view class="bootSkeletonBlock bootSkeletonPill" />
        <view class="bootSkeletonRow">
          <view class="bootSkeletonBlock bootSkeletonStat" />
          <view class="bootSkeletonBlock bootSkeletonStat" />
        </view>
        <view class="bootSkeletonBlock bootSkeletonSwitch" />
      </view>

      <view class="homeDictationStage">
        <view class="bootSkeletonBlock bootSkeletonDictation" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, ref, useAttrs } from 'vue'
import {
  ensurePracticeSessionReady,
  isPracticeSessionReady
} from '@/app/usePracticeSession'
import { HOME_REDESIGN_V2_ENABLED } from '@/app/featureFlags'
import PracticeShellInner from '@/components/PracticeShellInner.vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
const ready = ref(isPracticeSessionReady())
const miniProgramCapsuleTop = ref(44)

const isTabRoot = computed(() => typeof attrs['tab-screen'] === 'string')

const screenStyle = computed(() => (
  `padding-top: ${miniProgramCapsuleTop.value}px;`
  + ` --capsule-top: ${miniProgramCapsuleTop.value}px;`
))

function updateMiniProgramNavInset() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect?.()
    if (menuButton && menuButton.top > 0) {
      miniProgramCapsuleTop.value = menuButton.top
    }
  } catch {
    // Ignore inset lookup failures in preview contexts.
  }
}

onMounted(() => {
  updateMiniProgramNavInset()
})

onBeforeMount(async () => {
  if (ready.value) return

  try {
    await ensurePracticeSessionReady()
    ready.value = true
  } catch (error) {
    console.error('[PracticeShell] session bootstrap failed', error)
    if (isPracticeSessionReady()) {
      ready.value = true
      return
    }
    uni.showToast({ title: '词库加载失败，请检查网络', icon: 'none' })
  }
})
</script>

<style scoped lang="scss">
.practiceShellInner {
  animation: practiceShellFadeIn 220ms ease;
}

@keyframes practiceShellFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.screen {
  box-sizing: border-box;
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(16px + env(safe-area-inset-top)) 18px calc(26px + env(safe-area-inset-bottom));
  background: var(--page-bg);
  background-color: var(--page-bg);
}

/* #ifdef MP-WEIXIN */
.screen {
  max-width: none;
  min-height: 100vh;
  padding-right: 18px;
  padding-bottom: 26px;
  padding-left: 18px;
  overflow-x: hidden;
}

.screen.hasBottomNav {
  padding-bottom: calc(86px + env(safe-area-inset-bottom));
}
/* #endif */

.homeScreen {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.homeV2Boot {
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: 44px 230px 145px 90px 140px;
  align-content: space-between;
  min-height: 0;
}

.homeV2BootHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}

.homeV2BootTitle {
  width: 142px;
  height: 27px;
}

.homeV2BootFeedback {
  width: 42px;
  height: 42px;
  border-radius: 999px;
}

.homeV2BootEgg {
  box-sizing: border-box;
  height: 100%;
  border-radius: 14px;
}

.homeV2BootCourse {
  box-sizing: border-box;
  height: 100%;
  border-radius: 18px;
}

.homeV2BootDictation {
  box-sizing: border-box;
  height: 100%;
  border-radius: 18px;
}

.homeV2BootQuickGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.homeV2BootQuick {
  box-sizing: border-box;
  height: 100%;
  border-radius: 16px;
}

.screen.isHomeV2Screen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}

@media (max-height: 820px) {
  .homeV2Boot {
    grid-template-rows: 42px 190px 132px 72px 120px;
  }
}

@media (max-height: 720px) {
  .homeV2Boot {
    grid-template-rows: 40px 170px 122px 68px 100px;
  }
}

.homeHero {
  position: relative;
  z-index: 0;
  margin: -16px -18px 0;
  padding: 22px 22px 46px;
  background: transparent;
}

/* #ifdef MP-WEIXIN */
.homeHero {
  margin-top: calc(-1 * var(--capsule-top, 44px));
  padding-top: calc(var(--capsule-top, 44px) + 6px);
}
/* #endif */

.homeHeroMain {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

/* #ifdef MP-WEIXIN */
.homeHeroMain {
  padding-right: 96px;
}
/* #endif */

.homeHeroTitle {
  color: var(--ink);
  font-size: 32px;
  font-weight: 900;
  line-height: 1.08;
}

.homeHeroSubtitle {
  margin-top: 8px;
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.homeHeroTags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.homeHeroTag {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
}

.homeUnitCard {
  padding: 18px;
  border: 2px solid #e5e5e5;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(30, 58, 78, 0.06);
}

.homeDictationStage {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.bootSkeletonCard {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bootSkeletonLine,
.bootSkeletonBlock {
  border-radius: 12px;
  background: linear-gradient(90deg, #eef2f4 0%, #f8fafb 45%, #eef2f4 100%);
  background-size: 200% 100%;
  animation: bootSkeletonPulse 1.2s ease-in-out infinite;
}

.bootSkeletonLine {
  height: 12px;
}

.bootSkeletonLineShort {
  width: 28%;
}

.bootSkeletonLineTitle {
  width: 72%;
  height: 18px;
}

.bootSkeletonLineMedium {
  width: 42%;
}

.bootSkeletonPill {
  height: 34px;
}

.bootSkeletonRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bootSkeletonStat {
  height: 72px;
}

.bootSkeletonSwitch {
  height: 54px;
}

.bootSkeletonDictation {
  width: 168px;
  height: 168px;
  border-radius: 999px;
}

@keyframes bootSkeletonPulse {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}
</style>
