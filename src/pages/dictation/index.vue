<template>
  <view class="redirectScreen">
    <text>正在打开听写…</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

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
  color: #777;
  font-size: 14px;
  font-weight: 700;
  background: #f3f4f6;
}
</style>
