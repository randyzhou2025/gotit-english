<template>
  <ProfileScreen v-if="ready" />
  <view v-else class="bootScreen" :style="activeVisualThemeStyle">
    <text class="bootText">加载中…</text>
  </view>
</template>

<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { ensurePracticeSessionReady, isPracticeSessionReady } from '@/app/usePracticeSession'
import { useVisualTheme } from '@/app/useVisualTheme'
import {
  buildWeappShareAppMessage,
  buildWeappShareTimeline,
  showWeappShareMenu,
  type WeappShareOptions
} from '@/app/useWeappShare'
import { getCachedDashboard } from '@/core/studyStats'
import ProfileScreen from '@/components/ProfileScreen.vue'

function currentScoreShare(): WeappShareOptions {
  const dashboard = getCachedDashboard()
  let imageUrl = ''
  try {
    imageUrl = String(uni.getStorageSync('gotit:profile:scoreShareImage') || '')
  } catch {
    // 分享图片仍未生成时使用小程序默认分享图。
  }
  return {
    title: `我今天学了 ${dashboard?.todayWords ?? 0} 个单词，已坚持 ${dashboard?.streakDays ?? 0} 天`,
    path: '/pages/index/index',
    imageUrl
  }
}

onShareAppMessage(() => buildWeappShareAppMessage(currentScoreShare()))
onShareTimeline(() => buildWeappShareTimeline(currentScoreShare()))
onMounted(showWeappShareMenu)

const ready = ref(isPracticeSessionReady())
const { activeVisualThemeStyle } = useVisualTheme()

onBeforeMount(async () => {
  if (ready.value) return
  try {
    await ensurePracticeSessionReady()
    ready.value = true
  } catch (error) {
    console.error('[profile] session bootstrap failed', error)
    uni.showToast({ title: '加载失败，请检查网络', icon: 'none' })
  }
})
</script>

<style scoped lang="scss">
.bootScreen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--page-bg);
}

.bootText {
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}
</style>
