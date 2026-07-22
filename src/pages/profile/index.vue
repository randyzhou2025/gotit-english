<template>
  <ProfileScreen v-if="ready" />
  <view v-else class="bootScreen">
    <text class="bootText">加载中…</text>
  </view>
</template>

<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { ensurePracticeSessionReady, isPracticeSessionReady } from '@/app/usePracticeSession'
import ProfileScreen from '@/components/ProfileScreen.vue'

const ready = ref(isPracticeSessionReady())

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
  background: #f3f4f6;
}

.bootText {
  color: #777;
  font-size: 14px;
  font-weight: 700;
}
</style>
