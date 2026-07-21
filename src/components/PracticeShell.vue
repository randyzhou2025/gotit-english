<template>
  <PracticeShellInner v-if="ready" v-bind="$attrs" class="practiceShellInner" />
  <view
    v-else
    :class="['practiceBoot', 'screen', isTabRoot && 'hasBottomNav']"
    :style="screenStyle"
  >
    <view class="homeScreen">
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
import { ensurePracticeSessionReady, isPracticeSessionReady } from '@/app/usePracticeSession'
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
  background: linear-gradient(180deg, #d4efe2 0%, #e8f5ee 22%, #f3f4f6 48%, #f3f4f6 100%) no-repeat;
  background-color: #f3f4f6;
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

.homeHero {
  position: relative;
  z-index: 0;
  margin: -16px -18px 0;
  padding: 22px 22px 46px;
  background: linear-gradient(150deg, #58cc02 0%, #34c2f2 100%);
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
  color: #fff;
  font-size: 32px;
  font-weight: 900;
  line-height: 1.08;
}

.homeHeroSubtitle {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.92);
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
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
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
