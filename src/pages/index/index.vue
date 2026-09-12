<template>
  <PracticeShell tab-screen="home" />
</template>

<script setup lang="ts">
import { useWeappShare } from '@/app/useWeappShare'
import PracticeShell from '@/components/PracticeShell.vue'

useWeappShare()
</script>

<script lang="ts">
export default {
  // 原生页需显式注册滚动事件，首页标题栏才能按滚动位置渐显遮罩。
  onPageScroll() {},
  onShareAppMessage() {},
  onShareTimeline() {}
}
</script>
