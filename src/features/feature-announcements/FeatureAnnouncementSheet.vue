<template>
  <view class="featureAnnouncementLayer" role="dialog" aria-modal="true" :aria-label="announcement.badge">
    <view class="featureAnnouncementScrim" :style="scrimStyle" @tap="requestDismiss('scrim')" />

    <view
      class="featureAnnouncementSheet"
      :class="{ isDragging, isClosing }"
      :style="sheetStyle"
      @touchstart="handleTouchStart"
      @touchmove.stop.prevent="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
    >
      <view class="featureAnnouncementHandle" aria-hidden="true" />
      <view
        class="featureAnnouncementClose"
        hover-class="featureAnnouncementClosePressed"
        hover-stay-time="80"
        role="button"
        aria-label="关闭新功能通知"
        @tap.stop="requestDismiss('close')"
      >
        <view class="featureAnnouncementCloseLine one" />
        <view class="featureAnnouncementCloseLine two" />
      </view>

      <view v-if="showImage" class="featureAnnouncementHero">
        <image
          class="featureAnnouncementHeroImage"
          :src="announcement.imageSrc"
          :alt="announcement.imageAlt || ''"
          mode="aspectFill"
          @error="imageFailed = true"
        />
      </view>
      <view v-else class="featureAnnouncementHero isFallback" aria-hidden="true">
        <view class="featureAnnouncementFallbackBook back" />
        <view class="featureAnnouncementFallbackBook front" />
        <view class="featureAnnouncementFallbackCard one" />
        <view class="featureAnnouncementFallbackCard two" />
      </view>

      <view class="featureAnnouncementBadge"><view class="featureAnnouncementBadgeDot" />{{ announcement.badge }}</view>
      <text class="featureAnnouncementTitle">{{ announcement.title }}</text>
      <text class="featureAnnouncementDescription">{{ announcement.description }}</text>

      <view v-if="announcement.highlights.length > 0" class="featureAnnouncementHighlights">
        <view
          v-for="(highlight, index) in announcement.highlights.slice(0, 2)"
          :key="`${announcement.id}-${highlight.title}`"
          class="featureAnnouncementHighlight"
        >
          <view :class="['featureAnnouncementHighlightIcon', index === 1 && 'isSecondary']">{{ highlight.icon }}</view>
          <view class="featureAnnouncementHighlightCopy">
            <text class="featureAnnouncementHighlightTitle">{{ highlight.title }}</text>
            <text class="featureAnnouncementHighlightDescription">{{ highlight.description }}</text>
          </view>
        </view>
      </view>

      <view
        class="featureAnnouncementPrimary"
        hover-class="featureAnnouncementPrimaryPressed"
        hover-stay-time="80"
        role="button"
        :aria-label="announcement.primaryAction.label"
        @tap.stop="requestPrimary"
      >
        <text>{{ announcement.primaryAction.label }}</text>
      </view>
      <view
        class="featureAnnouncementSecondary"
        hover-class="featureAnnouncementSecondaryPressed"
        hover-stay-time="80"
        role="button"
        :aria-label="announcement.secondaryLabel || '稍后再说'"
        @tap.stop="requestDismiss('secondary')"
      >
        <text>{{ announcement.secondaryLabel || '稍后再说' }}</text>
      </view>
      <text v-if="announcement.footnote" class="featureAnnouncementFootnote">{{ announcement.footnote }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  FeatureAnnouncement,
  FeatureAnnouncementDismissReason
} from './types'

interface TouchPoint {
  clientY: number
}

interface TouchLikeEvent {
  touches?: ArrayLike<TouchPoint>
  changedTouches?: ArrayLike<TouchPoint>
}

const props = defineProps<{
  announcement: FeatureAnnouncement
}>()

const emit = defineEmits<{
  dismiss: [reason: FeatureAnnouncementDismissReason, announcement: FeatureAnnouncement]
  primary: [announcement: FeatureAnnouncement]
}>()

const imageFailed = ref(false)
const isDragging = ref(false)
const isClosing = ref(false)
const dragOffset = ref(0)
const offscreenDistance = ref(720)
let touchStartY = 0
let touchStartOffset = 0
let lastTouchY = 0
let lastTouchAt = 0
let releaseVelocity = 0
let springTimer: ReturnType<typeof setTimeout> | null = null

const showImage = computed(() => Boolean(props.announcement.imageSrc) && !imageFailed.value)
const sheetStyle = computed(() => `transform: translate3d(0, ${dragOffset.value.toFixed(2)}px, 0);`)
const scrimStyle = computed(() => {
  const visibleRatio = Math.max(0, Math.min(1, 1 - Math.max(0, dragOffset.value) / offscreenDistance.value))
  return `opacity: ${(0.42 * visibleRatio).toFixed(3)};`
})

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  } catch {
    return false
  }
}

function readTouchY(event: TouchLikeEvent): number | null {
  const point = event.touches?.[0] ?? event.changedTouches?.[0]
  return point && Number.isFinite(point.clientY) ? point.clientY : null
}

function stopSpring() {
  if (springTimer) clearTimeout(springTimer)
  springTimer = null
}

function springTo(target: number, initialVelocity = 0, onComplete?: () => void) {
  stopSpring()
  if (prefersReducedMotion()) {
    dragOffset.value = target
    onComplete?.()
    return
  }

  let position = dragOffset.value
  let velocity = initialVelocity
  let previousAt = Date.now()

  const step = () => {
    const now = Date.now()
    const deltaSeconds = Math.min(0.032, Math.max(0.008, (now - previousAt) / 1000))
    previousAt = now

    const stiffness = 320
    const damping = 34
    const acceleration = -stiffness * (position - target) - damping * velocity
    velocity += acceleration * deltaSeconds
    position += velocity * deltaSeconds
    dragOffset.value = position

    if (Math.abs(position - target) < 0.7 && Math.abs(velocity) < 8) {
      dragOffset.value = target
      springTimer = null
      onComplete?.()
      return
    }

    springTimer = setTimeout(step, 16)
  }

  springTimer = setTimeout(step, 16)
}

function requestClose(
  reason: FeatureAnnouncementDismissReason,
  onComplete?: () => void
) {
  if (isClosing.value) return
  isClosing.value = true
  isDragging.value = false
  springTo(offscreenDistance.value, Math.max(0, releaseVelocity), () => {
    onComplete?.()
    if (!onComplete) emit('dismiss', reason, props.announcement)
  })
}

function requestDismiss(reason: FeatureAnnouncementDismissReason) {
  releaseVelocity = 0
  requestClose(reason)
}

function requestPrimary() {
  if (isClosing.value) return
  isClosing.value = true
  stopSpring()
  emit('primary', props.announcement)
}

function handleTouchStart(event: TouchLikeEvent) {
  if (isClosing.value) return
  const clientY = readTouchY(event)
  if (clientY == null) return

  stopSpring()
  isDragging.value = true
  touchStartY = clientY
  touchStartOffset = dragOffset.value
  lastTouchY = clientY
  lastTouchAt = Date.now()
  releaseVelocity = 0
}

function handleTouchMove(event: TouchLikeEvent) {
  if (!isDragging.value || isClosing.value) return
  const clientY = readTouchY(event)
  if (clientY == null) return

  const rawOffset = touchStartOffset + clientY - touchStartY
  dragOffset.value = rawOffset >= 0 ? rawOffset : rawOffset * 0.18

  const now = Date.now()
  const elapsed = now - lastTouchAt
  if (elapsed > 0) releaseVelocity = ((clientY - lastTouchY) / elapsed) * 1000
  lastTouchY = clientY
  lastTouchAt = now
}

function handleTouchEnd() {
  if (!isDragging.value || isClosing.value) return
  isDragging.value = false

  if (dragOffset.value > 110 || releaseVelocity > 720) {
    requestClose('swipe')
    return
  }

  springTo(0, releaseVelocity)
}

onMounted(() => {
  try {
    offscreenDistance.value = Math.max(620, uni.getSystemInfoSync().windowHeight * 0.82)
  } catch {
    // The default covers desktop and restricted preview environments.
  }

  if (prefersReducedMotion()) {
    dragOffset.value = 0
    return
  }

  dragOffset.value = offscreenDistance.value
  springTo(0)
})

onBeforeUnmount(stopSpring)
</script>

<style scoped lang="scss">
.featureAnnouncementLayer {
  --announcement-accent: #176b50;
  --announcement-accent-strong: #10533d;
  --announcement-accent-soft: #e4efe9;
  --announcement-accent-shadow: rgba(23, 107, 80, 0.19);
  position: fixed;
  z-index: 2000;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  pointer-events: auto;
}

.featureAnnouncementScrim {
  position: absolute;
  inset: 0;
  background: #0e251d;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  will-change: opacity;
}

.featureAnnouncementSheet {
  position: relative;
  width: 100%;
  max-width: 430px;
  padding: 10px 20px calc(18px + env(safe-area-inset-bottom));
  overflow: hidden;
  border-radius: 29px 29px 0 0;
  background: var(--surface);
  box-shadow: 0 -18px 58px rgba(11, 39, 29, 0.22);
  will-change: transform;
}

.featureAnnouncementHandle {
  width: 39px;
  height: 4px;
  margin: 0 auto 8px;
  border-radius: 999px;
  background: #d6d9d4;
}

.featureAnnouncementClose {
  position: absolute;
  z-index: 2;
  top: 18px;
  right: 17px;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(242, 241, 236, 0.94);
}

.featureAnnouncementClosePressed {
  transform: scale(0.94);
  background: #e7e7e1;
}

.featureAnnouncementCloseLine {
  position: absolute;
  width: 15px;
  height: 1.5px;
  border-radius: 2px;
  background: #6e7872;
}

.featureAnnouncementCloseLine.one { transform: rotate(45deg); }
.featureAnnouncementCloseLine.two { transform: rotate(-45deg); }

.featureAnnouncementHero {
  position: relative;
  height: 138px;
  overflow: hidden;
  border-radius: 18px;
  background: #fffdf8;
}

.featureAnnouncementHeroImage {
  width: 100%;
  height: 100%;
  mix-blend-mode: multiply;
}

.featureAnnouncementHero.isFallback {
  background: var(--announcement-accent-soft);
}

.featureAnnouncementFallbackBook,
.featureAnnouncementFallbackCard {
  position: absolute;
  bottom: 18px;
  border-radius: 6px;
}

.featureAnnouncementFallbackBook.back {
  left: 47%;
  width: 76px;
  height: 102px;
  background: #a8c7ba;
  transform: translateX(-20%);
}

.featureAnnouncementFallbackBook.front {
  left: 34%;
  width: 65px;
  height: 80px;
  background: var(--announcement-accent);
}

.featureAnnouncementFallbackCard {
  width: 52px;
  height: 62px;
  background: var(--surface);
  box-shadow: 0 4px 12px rgba(23, 52, 44, 0.08);
}

.featureAnnouncementFallbackCard.one { right: 28%; transform: rotate(9deg); }
.featureAnnouncementFallbackCard.two { right: 16%; transform: rotate(-5deg); }

.featureAnnouncementBadge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  margin-top: 7px;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--announcement-accent-soft);
  color: var(--announcement-accent);
  font-size: 11px;
  font-weight: 900;
}

.featureAnnouncementBadgeDot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c9a55b;
}

.featureAnnouncementTitle,
.featureAnnouncementDescription,
.featureAnnouncementHighlightTitle,
.featureAnnouncementHighlightDescription,
.featureAnnouncementFootnote {
  display: block;
}

.featureAnnouncementTitle {
  margin-top: 8px;
  color: var(--announcement-accent-strong);
  font-family: var(--font-word);
  font-size: 27px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.035em;
  white-space: pre-line;
}

.featureAnnouncementDescription {
  margin-top: 7px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
}

.featureAnnouncementHighlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 13px;
}

.featureAnnouncementHighlight {
  display: flex;
  min-width: 0;
  min-height: 72px;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 9px;
  border: 1px solid #dfe7e1;
  border-radius: 14px;
  background: var(--surface-soft);
}

.featureAnnouncementHighlightIcon {
  display: flex;
  flex: 0 0 28px;
  width: 28px;
  height: 35px;
  align-items: center;
  justify-content: center;
  border-radius: 5px 7px 7px 5px;
  background: var(--announcement-accent);
  box-shadow: 2px 2px 0 #bdd0c7;
  color: #fffdf8;
  font-family: var(--font-word);
  font-size: 12px;
  font-weight: 700;
}

.featureAnnouncementHighlightIcon.isSecondary { background: #6e9684; }

.featureAnnouncementHighlightCopy {
  min-width: 0;
  padding-top: 1px;
}

.featureAnnouncementHighlightTitle {
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.35;
  font-weight: 900;
  white-space: nowrap;
}

.featureAnnouncementHighlightDescription {
  margin-top: 5px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.4;
}

.featureAnnouncementPrimary {
  display: flex;
  height: 48px;
  margin-top: 14px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--announcement-accent);
  box-shadow: 0 8px 18px var(--announcement-accent-shadow);
  color: #fffdf8;
  font-size: 14px;
  font-weight: 900;
}

.featureAnnouncementPrimaryPressed {
  transform: scale(0.98);
  background: var(--announcement-accent-strong);
}

.featureAnnouncementSecondary {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 12px;
}

.featureAnnouncementSecondaryPressed { color: var(--ink-soft); }

.featureAnnouncementFootnote {
  margin: -2px 0 0;
  color: var(--muted-light);
  font-size: 10px;
  line-height: 1.4;
  text-align: center;
}

@media (max-height: 720px) {
  .featureAnnouncementHero { height: 104px; }
  .featureAnnouncementTitle { font-size: 24px; }
  .featureAnnouncementDescription { margin-top: 5px; }
  .featureAnnouncementHighlights { margin-top: 10px; }
  .featureAnnouncementPrimary { margin-top: 11px; }
  .featureAnnouncementFootnote { display: none; }
}

@media (max-width: 360px) {
  .featureAnnouncementSheet { padding-right: 16px; padding-left: 16px; }
  .featureAnnouncementHighlight { gap: 7px; padding-right: 7px; padding-left: 7px; }
  .featureAnnouncementHighlightTitle { font-size: 11px; }
}

@media (prefers-reduced-transparency: reduce) {
  .featureAnnouncementScrim {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
