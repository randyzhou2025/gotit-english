<template>
  <view>
    <slot />
  </view>
</template>

<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import {
  ensurePracticeSessionReady,
  refreshPracticeSessionIfWordbankUpdated
} from '@/app/usePracticeSession'

onLaunch(() => {
  void ensurePracticeSessionReady()
})

onShow(() => {
  void refreshPracticeSessionIfWordbankUpdated()
})
</script>

<style lang="scss">
page {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  background: var(--page-bg);
  color: var(--ink);
  font-family: var(--font-sans);
}

/* #ifdef H5 */
body,
uni-page-body,
#app {
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

view,
scroll-view,
text,
image,
input,
textarea,
button {
  box-sizing: border-box;
}
/* #endif */

/* #ifdef H5 */
uni-tabbar {
  --tabbar-blue: #1cb0f6;
  --tabbar-muted: #8a9298;
  --tabbar-line: #edf2f4;
}

uni-tabbar .uni-tabbar {
  min-height: 72px !important;
  padding: 8px 18px calc(8px + env(safe-area-inset-bottom)) !important;
  border-top: 1px solid var(--tabbar-line) !important;
  background: rgba(255, 255, 255, 0.97) !important;
  box-shadow: 0 -10px 28px rgba(30, 58, 78, 0.08);
  backdrop-filter: blur(16px);
}

uni-tabbar .uni-tabbar-border {
  display: none;
}

uni-tabbar .uni-tabbar__item {
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

uni-tabbar .uni-tabbar__bd {
  min-width: 74px;
  height: 56px;
  padding: 6px 8px 5px;
  transition: transform 160ms ease, opacity 160ms ease;
}

uni-tabbar .uni-tabbar__item:active .uni-tabbar__bd {
  transform: translateY(1px) scale(0.98);
}

uni-tabbar .uni-tabbar__icon {
  width: 29px !important;
  height: 29px !important;
  margin-top: 0 !important;
}

uni-tabbar .uni-tabbar__label {
  margin-top: 3px;
  color: var(--tabbar-muted);
  font-size: 11px !important;
  line-height: 1 !important;
  font-weight: 850;
}

@supports selector(:has(*)) {
  uni-tabbar .uni-tabbar__item:has(.uni-tabbar__label[style*="28, 176, 246"]) .uni-tabbar__label,
  uni-tabbar .uni-tabbar__item:has(.uni-tabbar__label[style*="28,176,246"]) .uni-tabbar__label,
  uni-tabbar .uni-tabbar__item:has(.uni-tabbar__label[style*="#1cb0f6"]) .uni-tabbar__label {
    color: var(--tabbar-blue) !important;
    font-weight: 950;
  }
}

@media (max-width: 374px) {
  uni-tabbar .uni-tabbar {
    padding-right: 10px !important;
    padding-left: 10px !important;
  }

  uni-tabbar .uni-tabbar__bd {
    min-width: 66px;
  }
}
/* #endif */
</style>
