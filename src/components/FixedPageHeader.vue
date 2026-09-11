<template>
  <view class="fixedPageHeaderSpace" :style="spaceStyle">
    <view class="fixedPageHeaderBar" :style="barStyle">
      <view v-if="ready" class="fixedPageHeaderSurface" :style="surfaceStyle" aria-hidden="true" />
      <view class="fixedPageHeaderContent"><slot /></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const props = defineProps<{ background?: string }>()
const instance = getCurrentInstance()
const ready = ref(false)
const height = ref(0)
const top = ref(0)
const left = ref(0)
const width = ref(0)
const viewportWidth = ref(0)
let pending = false
let disposed = false
let mounted = false
let resetPosition = false

const spaceStyle = computed(() => ready.value ? `height: ${height.value}px;` : '')
const barStyle = computed(() => ready.value
  ? `position: fixed; top: ${top.value}px; left: ${left.value}px; width: ${width.value}px;`
  : '')
// 背景覆盖状态栏及左右安全区，正文滚动时不会透出到标题背后。
const surfaceStyle = computed(() => `top: -${top.value}px; left: -${left.value}px; width: ${viewportWidth.value}px; background: ${props.background || 'var(--page-bg)'};`)

function measure() {
  if (!mounted || pending || disposed) return
  pending = true
  void nextTick(() => {
    if (disposed) { pending = false; return }
    const query = uni.createSelectorQuery().in(instance?.proxy)
    query.select('.fixedPageHeaderSpace').boundingClientRect()
    query.select('.fixedPageHeaderContent').boundingClientRect()
    query.selectViewport().scrollOffset(() => {})
    query.exec((results) => {
      pending = false
      if (disposed) return
      const [space, content, scroll] = results as [UniApp.NodeInfo, UniApp.NodeInfo, UniApp.NodeInfo]
      if (!space?.width || !content?.height) return
      if (!ready.value || resetPosition) {
        // 加回页面滚动量以恢复初始布局位置；平时只更新高度，避免下拉时重定位标题。
        top.value = Math.max(0, (space.top ?? 0) + (scroll?.scrollTop ?? 0))
        left.value = space.left ?? 0
        width.value = space.width
        viewportWidth.value = uni.getWindowInfo().windowWidth
        resetPosition = false
      }
      height.value = content.height
      ready.value = true
    })
  })
}

function onResize() {
  resetPosition = true
  measure()
}

onMounted(() => {
  mounted = true
  measure()
  uni.onWindowResize(onResize)
})
onShow(measure)
onUpdated(measure)
onBeforeUnmount(() => {
  disposed = true
  uni.offWindowResize(onResize)
})
</script>

<style scoped>
.fixedPageHeaderSpace { flex: 0 0 auto; min-width: 0; }
.fixedPageHeaderBar { position: relative; z-index: 30; }
.fixedPageHeaderContent { display: flex; flex-direction: column; min-width: 0; }
.fixedPageHeaderSurface { position: absolute; bottom: 0; z-index: -1; pointer-events: none; }
</style>
