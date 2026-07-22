<template>
  <view class="bottomNav">
    <view class="bottomNavInner">
      <view :class="['bottomNavItem', active === 'home' && 'isActive']" @tap="goHome">
        <view class="bottomNavIconWrap">
          <image
            class="bottomNavIcon"
            :src="active === 'home' ? '/static/tabbar/home-active.png' : '/static/tabbar/home.png'"
            mode="aspectFit"
          />
        </view>
        <text class="bottomNavLabel">首页</text>
      </view>
      <view :class="['bottomNavItem', active === 'weakbook' && 'isActive']" @tap="goWeakbook">
        <view class="bottomNavIconWrap">
          <image
            class="bottomNavIcon"
            :src="active === 'weakbook' ? '/static/tabbar/weakbook-active.png' : '/static/tabbar/weakbook.png'"
            mode="aspectFit"
          />
        </view>
        <text class="bottomNavLabel">生词本</text>
        <text v-if="(weakbookCount ?? 0) > 0" class="bottomNavBadge">{{ badgeText }}</text>
      </view>
      <view :class="['bottomNavItem', active === 'profile' && 'isActive']" @tap="goProfile">
        <view class="bottomNavIconWrap">
          <image
            class="bottomNavIcon"
            :src="active === 'profile' ? '/static/tabbar/profile-active.png' : '/static/tabbar/profile.png'"
            mode="aspectFit"
          />
        </view>
        <text class="bottomNavLabel">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  active: 'home' | 'weakbook' | 'profile'
  weakbookCount?: number
}>()

const badgeText = computed(() => String(Math.min(props.weakbookCount ?? 0, 99)))

function goHome() {
  if (props.active === 'home') return
  uni.switchTab({ url: '/pages/index/index' })
}

function goWeakbook() {
  if (props.active === 'weakbook') return
  uni.switchTab({ url: '/pages/weakbook/index' })
}

function goProfile() {
  if (props.active === 'profile') return
  uni.switchTab({ url: '/pages/profile/index' })
}
</script>

<style scoped lang="scss">
.bottomNav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  padding: 8px 18px calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid #edf2f4;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 -10px 28px rgba(30, 58, 78, 0.08);
  backdrop-filter: blur(16px);
}

.bottomNavInner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-width: 430px;
  margin: 0 auto;
}

.bottomNavItem {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 6px 8px 5px;
  border-radius: 16px;
}

.bottomNavItem.isActive {
  background: rgba(28, 176, 246, 0.08);
}

.bottomNavIconWrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
}

.bottomNavIcon {
  width: 29px;
  height: 29px;
}

.bottomNavLabel {
  margin-top: 3px;
  color: #8a9298;
  font-size: 11px;
  font-weight: 850;
  line-height: 1;
}

.bottomNavItem.isActive .bottomNavLabel {
  color: #1cb0f6;
  font-weight: 950;
}

.bottomNavBadge {
  position: absolute;
  top: 4px;
  right: calc(50% - 28px);
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: #ff4b4b;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  line-height: 1.4;
  text-align: center;
}
</style>
