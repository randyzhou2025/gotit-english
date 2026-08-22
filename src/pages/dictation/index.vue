<template>
  <view class="redirectScreen" :style="activeVisualThemeStyle">
    <text>正在打开听写…</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { useVisualTheme } from '@/app/useVisualTheme'

const { activeVisualThemeStyle } = useVisualTheme()

onLoad(() => {
  uni.redirectTo({ url: '/pages/dictation/setup' })
})
</script>

<style scoped lang="scss">
.redirectScreen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  background: var(--page-bg);
}
</style>
