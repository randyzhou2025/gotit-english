<template>
  <PracticeShellInner v-if="ready" v-bind="$attrs" />
  <view v-else class="practiceBoot">
    <view class="practiceBootCard">
      <text class="practiceBootTitle">课本单词通</text>
      <text class="practiceBootHint">正在加载词库…</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { ensurePracticeSessionReady } from '@/app/usePracticeSession'
import PracticeShellInner from '@/components/PracticeShellInner.vue'

defineOptions({
  inheritAttrs: false
})

const ready = ref(false)

onBeforeMount(async () => {
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
.practiceBoot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--page-bg, #f3f4f6);
}

.practiceBootCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 32px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(30, 58, 78, 0.08);
}

.practiceBootTitle {
  color: #0d0f0e;
  font-size: 20px;
  font-weight: 900;
}

.practiceBootHint {
  color: #8a9298;
  font-size: 14px;
  font-weight: 700;
}
</style>
