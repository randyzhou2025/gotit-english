<template>
  <view class="homeV2">
    <view class="homeV2Header">
      <view class="homeV2TitleGroup">
        <text class="homeV2Title">课本单词通</text>
        <view
          class="homeV2ThemeSwitch"
          hover-class="homeV2ThemeSwitchPressed"
          hover-stay-time="80"
          role="button"
          :aria-label="`切换主题，当前${visualThemeName}`"
          @tap.stop="emit('switch-theme')"
        >
          <view class="homeV2ThemeSwatch" aria-hidden="true" />
          <text>{{ visualThemeName }}</text>
        </view>
      </view>
      <view class="homeV2HeaderActions">
        <view
          class="homeV2Feedback"
          hover-class="homeV2FeedbackPressed"
          hover-stay-time="80"
          role="button"
          aria-label="意见反馈"
          @tap="emit('feedback')"
        >
          <view class="homeV2FeedbackBubble">
            <view class="homeV2FeedbackDot" />
            <view class="homeV2FeedbackDot" />
            <view class="homeV2FeedbackDot" />
          </view>
          <view class="homeV2FeedbackTail" />
        </view>
      </view>
    </view>

    <view class="homeV2CourseCard">
      <view class="homeV2CourseMain" @tap="emit('change-course')">
        <view :class="['homeV2BookCover', bookCoverVisible && 'hasImage']">
          <image
            v-if="bookCoverVisible"
            class="homeV2BookCoverImage"
            :src="bookCoverSource"
            mode="aspectFill"
            @error="emit('book-cover-error')"
          />
          <view v-else class="homeV2BookCoverFallback">
            <text>{{ selectedUnit?.bookName?.slice(0, 2) || '课本' }}</text>
            <text class="homeV2BookCoverEnglish">ENGLISH</text>
          </view>
        </view>

        <view class="homeV2CourseCopy">
          <text class="homeV2CourseLabel">当前教材</text>
          <text class="homeV2CourseTitle">{{ selectedUnit?.bookName }} · {{ courseUnitName }}</text>
          <text class="homeV2CoursePublisher">{{ selectedUnit?.publisherName }}</text>
        </view>

        <view class="homeV2Switch">
          <text>切换</text>
          <text class="homeV2Chevron">›</text>
        </view>
      </view>

      <view class="homeV2ProgressBlock">
        <view class="homeV2ProgressTop">
          <text class="homeV2ProgressTitle">学习进度</text>
          <text class="homeV2ProgressPercent">{{ unitMasteryPercent }}%</text>
        </view>
        <view class="homeV2ProgressTrack">
          <view class="homeV2ProgressFill" :style="{ width: `${unitMasteryPercent}%` }" />
        </view>
        <text class="homeV2ProgressMeta">{{ unitMasteryLabel }} 词已掌握</text>
      </view>

      <view class="homeV2WordlistRow" @tap="emit('open-unit-words')">
        <view class="homeV2WordlistIcon" aria-hidden="true">
          <view class="homeV2WordlistLine one" />
          <view class="homeV2WordlistLine two" />
          <view class="homeV2WordlistLine three" />
        </view>
        <text class="homeV2WordlistTitle">本单元词表</text>
        <text class="homeV2WordlistCount">{{ unitWordCount }}词</text>
        <text class="homeV2Chevron">›</text>
      </view>
    </view>

    <view class="homeV2DictationCard" @tap="emit('start-dictation')">
      <view class="homeV2DictationContent">
        <text :class="['homeV2DictationTitle', longDictationHeadline && 'isCompact']">{{ dictationHeadline }}</text>
        <text class="homeV2DictationMeta">{{ remainingDictationMeta }}</text>
        <text class="homeV2DictationHint">{{ dictationHint }}</text>
      </view>

      <view class="homeV2DictationButton">
        <view class="homeV2Wave" aria-hidden="true">
          <view class="homeV2WaveBar one" />
          <view class="homeV2WaveBar two" />
          <view class="homeV2WaveBar three" />
          <view class="homeV2WaveBar four" />
        </view>
        <text>开始听写</text>
      </view>
    </view>

    <view class="homeV2QuickGrid">
      <view class="homeV2QuickCard isExport" @tap="emit('export-wordlist')">
        <view class="homeV2ExportIcon" aria-hidden="true">
          <view class="homeV2ExportLine one" />
          <view class="homeV2ExportLine two" />
          <view class="homeV2ExportArrow" />
        </view>
        <view class="homeV2QuickCopy">
          <text class="homeV2QuickTitle">导出｜打印词表</text>
          <text class="homeV2QuickMeta">
            <text class="homeV2QuickMetaPart">词汇表 · 默写表 </text>
            <text class="homeV2QuickMetaPart">一键生成</text>
          </text>
        </view>
        <text class="homeV2QuickChevron">›</text>
      </view>

      <view class="homeV2QuickCard isWordMatch" @tap="emit('open-word-match')">
        <view class="homeV2MatchIcon" aria-hidden="true"><text>消</text></view>
        <view class="homeV2QuickCopy">
          <text class="homeV2QuickTitle">单词消消乐</text>
          <text class="homeV2QuickMeta">中英配对 · 越玩越熟本 Unit 单词</text>
        </view>
        <text class="homeV2QuickChevron">›</text>
      </view>
    </view>

    <UnitEggCard
      v-if="unitEgg"
      :egg="unitEgg"
      :audio-playing="unitEggAudioPlaying"
      @play-audio="emit('play-unit-egg-audio', $event)"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { estimateDictationSeconds, formatEstimatedMinutes } from '@/core/dictation'
import type { DictationMode, DictationRepeatCount, UnitGroup } from '@/core/types'
import { getUnitEggForDate } from '@/core/unitEggs'
import UnitEggCard from '@/components/home/UnitEggCard.vue'

const props = defineProps<{
  selectedUnit?: UnitGroup
  bookCoverSource: string
  bookCoverVisible: boolean
  unitWordCount: number
  masteredUnitWordCount: number
  dictationIntervalSeconds: number
  dictationMode: DictationMode
  dictationRepeatCount: DictationRepeatCount
  unitMasteryLabel: string
  unitMasteryPercent: number
  todayDictationWordCount: number
  unitEggAudioPlaying: boolean
  visualThemeName: string
}>()

const emit = defineEmits<{
  feedback: []
  'change-course': []
  'open-unit-words': []
  'start-dictation': []
  'export-wordlist': []
  'open-word-match': []
  'switch-theme': []
  'play-unit-egg-audio': [keyword: string]
  'book-cover-error': []
}>()

const unitEgg = ref<Awaited<ReturnType<typeof getUnitEggForDate>>>(null)
let unitEggLoadRevision = 0

watch(
  () => props.selectedUnit?.unitId,
  async (unitId) => {
    const revision = ++unitEggLoadRevision
    unitEgg.value = null
    if (!unitId) return

    const nextUnitEgg = await getUnitEggForDate(unitId)
    if (revision === unitEggLoadRevision) {
      unitEgg.value = nextUnitEgg
    }
  },
  { immediate: true }
)

const unitName = computed(() => props.selectedUnit?.unitName || '当前单元')
const courseUnitName = computed(() => (props.selectedUnit?.unitName || '').replace(/\s+/g, '\u00a0'))
const dictationHeadline = computed(() => {
  if (props.todayDictationWordCount > 0) return `今天已完成 ${props.todayDictationWordCount} 词 ✓`
  if (props.masteredUnitWordCount > 0) return `继续 ${unitName.value} 听写`
  return `开始 ${unitName.value} 听写`
})
const dictationHint = computed(() => props.todayDictationWordCount > 0 ? '继续听写' : '放下屏幕，拿起纸笔')
const longDictationHeadline = computed(() => dictationHeadline.value.length > 14)
const remainingWordCount = computed(() => Math.max(0, props.unitWordCount - props.masteredUnitWordCount))
const remainingDictationMeta = computed(() => {
  if (remainingWordCount.value === 0) return '本单元已掌握 · 可重新听写'

  const estimatedSeconds = estimateDictationSeconds(
    remainingWordCount.value,
    props.dictationMode,
    props.dictationIntervalSeconds,
    props.dictationRepeatCount
  )
  const estimatedMinutes = formatEstimatedMinutes(estimatedSeconds).replace(' ', '')
  return `剩余${remainingWordCount.value}词 · 全部听写约${estimatedMinutes} · 自动播报`
})
</script>

<style scoped lang="scss">
.homeV2 {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: 44px 230px 145px 90px 140px;
  align-content: space-between;
  min-width: 0;
  min-height: 0;
}

/* #ifdef MP-WEIXIN */
.homeV2 {
  height: calc(100vh - var(--capsule-top, 44px) - 92px - env(safe-area-inset-bottom));
}
/* #endif */

.homeV2Header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}

/* #ifdef MP-WEIXIN */
.homeV2Header {
  padding-right: var(--home-action-right-inset, 88px);
}
/* #endif */

.homeV2Title {
  color: var(--accent-strong);
  font-size: 26px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.homeV2TitleGroup {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.homeV2HeaderActions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.homeV2ThemeSwitch {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface-soft);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.58);
  color: var(--accent-strong);
  font-size: 11px;
  line-height: 1;
  font-weight: 800;
  white-space: nowrap;
  backdrop-filter: blur(10px) saturate(115%);
  -webkit-backdrop-filter: blur(10px) saturate(115%);
}

.homeV2ThemeSwitchPressed {
  background: var(--surface);
  transform: translateY(1px);
}

.homeV2ThemeSwatch {
  width: 13px;
  height: 9px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 4px;
  background: var(--theme-switch-swatch);
  box-shadow: 0 1px 3px var(--ink-shadow);
}

.homeV2Feedback {
  position: relative;
  display: flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--accent-strong);
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 6px 14px var(--accent-shadow);
}

.homeV2FeedbackPressed {
  background: var(--accent-strong);
  transform: scale(0.97);
}

.homeV2FeedbackBubble {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 21px;
  height: 15px;
  border-radius: 6px;
  background: #fffdf8;
}

.homeV2FeedbackDot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: var(--accent);
}

.homeV2FeedbackTail {
  position: absolute;
  left: 11px;
  bottom: 10px;
  width: 7px;
  height: 7px;
  border-radius: 1px;
  background: #fffdf8;
  transform: rotate(45deg);
}

.homeV2CourseCard {
  box-sizing: border-box;
  flex: 0 0 auto;
  height: 100%;
  padding: 10px 12px 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.homeV2CourseMain {
  display: flex;
  align-items: center;
  min-height: 104px;
}

.homeV2BookCover {
  display: flex;
  flex: 0 0 64px;
  flex-direction: column;
  justify-content: space-between;
  width: 64px;
  height: 96px;
  padding: 13px 10px;
  overflow: hidden;
  border: 1px solid #b7c8c0;
  border-radius: 6px 11px 11px 6px;
  background: #e7eee9;
  color: var(--accent);
  font-size: 16px;
  font-weight: 850;
  box-shadow: inset 5px 0 rgba(23, 107, 80, 0.12);
}

.homeV2BookCover.hasImage {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.homeV2BookCoverImage,
.homeV2BookCoverFallback {
  width: 100%;
  height: 100%;
}

.homeV2BookCoverImage {
  display: block;
  border-radius: 6px;
}

.homeV2BookCoverFallback {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.homeV2BookCoverEnglish {
  font-size: 8px;
  letter-spacing: 0.08em;
}

.homeV2CourseCopy {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  margin-left: 13px;
}

.homeV2CourseLabel {
  color: var(--accent);
  font-size: 12px;
  line-height: 1;
  font-weight: 850;
}

.homeV2CourseTitle {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  color: var(--ink);
  font-size: 17px;
  line-height: 1.16;
  font-weight: 900;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.homeV2CoursePublisher {
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1;
  font-weight: 650;
}

.homeV2ProgressBlock {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 64px;
  padding: 8px 0 7px;
}

.homeV2ProgressTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.homeV2ProgressTitle,
.homeV2ProgressPercent {
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1;
  font-weight: 800;
}

.homeV2ProgressPercent {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.homeV2ProgressTrack {
  width: 100%;
  height: 4px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7e4dc;
}

.homeV2ProgressFill {
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.homeV2ProgressMeta {
  margin-top: 5px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.homeV2Switch {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  margin-left: 8px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
}

.homeV2Chevron,
.homeV2QuickChevron {
  color: var(--muted);
  font-size: 28px;
  line-height: 1;
  font-weight: 400;
}

.homeV2WordlistRow {
  display: flex;
  align-items: center;
  min-height: 50px;
  margin-top: 0;
  border-top: 1px solid var(--line);
}

.homeV2WordlistIcon {
  position: relative;
  flex: 0 0 22px;
  width: 22px;
  height: 26px;
  border: 2px solid var(--accent);
  border-radius: 3px;
}

.homeV2WordlistLine {
  position: absolute;
  left: 5px;
  height: 2px;
  border-radius: 999px;
  background: var(--accent);
}

.homeV2WordlistLine.one { top: 6px; width: 10px; }
.homeV2WordlistLine.two { top: 11px; width: 8px; }
.homeV2WordlistLine.three { top: 16px; width: 11px; }

.homeV2WordlistTitle {
  flex: 1 1 auto;
  margin-left: 12px;
  color: var(--accent);
  font-size: 15px;
  line-height: 1;
  font-weight: 850;
}

.homeV2WordlistCount {
  margin-right: 12px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.homeV2DictationCard {
  position: relative;
  flex: 0 0 auto;
  box-sizing: border-box;
  height: 100%;
  padding: 16px 18px 12px;
  overflow: hidden;
  border-radius: 18px;
  background: var(--accent);
  box-shadow: 0 10px 24px var(--accent-shadow);
  color: #fffdf8;
}

.homeV2DictationCard:active {
  background: var(--accent-strong);
  transform: translateY(1px);
}

.homeV2DictationContent {
  position: relative;
  z-index: 2;
  max-width: 100%;
  text-align: center;
}

.homeV2DictationTitle {
  display: block;
  font-size: 22px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.homeV2DictationTitle.isCompact {
  font-size: 19px;
}

.homeV2DictationMeta {
  display: block;
  margin-top: 7px;
  color: rgba(255, 253, 248, 0.76);
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  white-space: nowrap;
}

.homeV2DictationHint {
  display: block;
  margin-top: 8px;
  color: rgba(255, 253, 248, 0.8);
  font-size: 12px;
  line-height: 1;
  font-weight: 650;
}

.homeV2DictationButton {
  position: absolute;
  right: 16px;
  bottom: 12px;
  left: 16px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  border-radius: 13px;
  background: #fffdf8;
  color: var(--accent);
  box-shadow: 0 6px 18px var(--ink-shadow);
  font-size: 18px;
  line-height: 1;
  font-weight: 900;
}

.homeV2Wave {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  margin-right: 13px;
}

.homeV2WaveBar {
  width: 4px;
  border-radius: 999px;
  background: var(--accent);
}

.homeV2WaveBar.one { height: 10px; }
.homeV2WaveBar.two { height: 18px; }
.homeV2WaveBar.three { height: 22px; }
.homeV2WaveBar.four { height: 14px; }

.homeV2QuickGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  height: 100%;
}

.homeV2QuickCard {
  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 10px;
  align-items: center;
  column-gap: 8px;
  min-width: 0;
  height: 100%;
  min-height: 0;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 6px 16px var(--ink-shadow);
}

.homeV2QuickCard.isExport,
.homeV2QuickCard.isWordMatch {
  background: var(--accent-soft);
}

.homeV2QuickCard:active {
  transform: translateY(1px);
}

.homeV2QuickCopy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.homeV2QuickChevron {
  color: var(--accent);
  font-size: 22px;
}

.homeV2QuickTitle {
  overflow: hidden;
  color: var(--accent);
  font-size: 13px;
  line-height: 1.15;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.homeV2QuickMeta {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.25;
  font-weight: 650;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.homeV2ExportIcon {
  position: relative;
  width: 22px;
  height: 27px;
  border: 2px solid var(--accent);
  border-radius: 3px;
}

.homeV2ExportLine {
  position: absolute;
  left: 4px;
  height: 2px;
  border-radius: 999px;
  background: var(--accent);
}

.homeV2ExportLine.one { top: 6px; width: 11px; }
.homeV2ExportLine.two { top: 11px; width: 8px; }

.homeV2ExportArrow {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--accent);
  border-bottom: 2px solid var(--accent);
}

.homeV2ExportArrow::before {
  position: absolute;
  right: 2px;
  bottom: 0;
  width: 2px;
  height: 12px;
  border-radius: 999px;
  background: var(--accent);
  content: '';
  transform: rotate(45deg);
  transform-origin: bottom;
}

.homeV2MatchIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid var(--accent);
  border-radius: 7px;
  color: var(--accent);
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
}

@media (max-width: 375px) {
  .homeV2TitleGroup {
    gap: 6px;
  }

  .homeV2Title {
    font-size: 24px;
  }

  .homeV2HeaderActions {
    gap: 6px;
  }

  .homeV2ThemeSwitch {
    height: 26px;
    padding-right: 7px;
    padding-left: 7px;
    font-size: 10px;
  }

  .homeV2Feedback {
    flex-basis: 40px;
    width: 40px;
    height: 40px;
  }

  .homeV2CourseCard {
    padding-right: 12px;
    padding-left: 12px;
  }

  .homeV2BookCover {
    flex-basis: 58px;
    width: 58px;
    height: 88px;
  }

  .homeV2CourseMain {
    min-height: 104px;
  }

  .homeV2CourseCopy {
    margin-left: 13px;
  }

  .homeV2CourseTitle {
    font-size: 17px;
  }

  .homeV2CourseProgressText {
    margin-top: 7px;
  }

  .homeV2Switch {
    margin-left: 8px;
  }

  .homeV2DictationCard { padding-right: 16px; padding-left: 16px; }

  .homeV2DictationTitle {
    font-size: 21px;
  }

  .homeV2DictationTitle.isCompact {
    font-size: 19px;
  }

  .homeV2DictationMeta {
    margin-top: 7px;
    font-size: 12px;
  }

  .homeV2DictationButton {
    right: 14px;
    bottom: 12px;
    left: 14px;
    height: 42px;
  }

  .homeV2QuickCard {
    min-height: 0;
    padding-right: 8px;
    padding-left: 8px;
  }

  .homeV2QuickTitle {
    font-size: 13px;
  }

  .homeV2QuickMeta {
    font-size: 9px;
  }

  .homeV2QuickCard.isExport .homeV2QuickMetaPart {
    display: block;
  }
}

@media (max-height: 820px) {
  .homeV2 {
    grid-template-rows: 42px 190px 132px 72px 120px;
  }

  .homeV2Header {
    min-height: 42px;
  }

  .homeV2CourseMain {
    min-height: 88px;
  }

  .homeV2BookCover {
    flex-basis: 58px;
    width: 58px;
    height: 82px;
  }

  .homeV2ProgressBlock {
    height: 48px;
    padding-top: 6px;
    padding-bottom: 5px;
  }

  .homeV2WordlistRow {
    min-height: 44px;
  }

  .homeV2DictationCard { padding-top: 13px; }

  .homeV2DictationHint {
    margin-top: 6px;
  }

  .homeV2DictationButton {
    height: 40px;
  }

  .homeV2QuickCard {
    min-height: 0;
    padding-top: 8px;
    padding-bottom: 8px;
  }
}

@media (max-height: 720px) {
  .homeV2 {
    grid-template-rows: 40px 170px 122px 68px 100px;
  }

  .homeV2CourseMain { min-height: 78px; }
  .homeV2BookCover { height: 72px; }
  .homeV2ProgressBlock { height: 42px; padding-top: 4px; padding-bottom: 4px; }
  .homeV2ProgressTitle,
  .homeV2ProgressPercent { font-size: 10px; }
  .homeV2ProgressTrack { margin-top: 4px; }
  .homeV2ProgressMeta { margin-top: 3px; font-size: 8px; }
  .homeV2WordlistRow { min-height: 40px; }
  .homeV2DictationTitle { font-size: 18px; }
  .homeV2DictationMeta { margin-top: 5px; font-size: 10px; }
  .homeV2DictationHint { margin-top: 5px; font-size: 10px; }
  .homeV2DictationButton { height: 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .homeV2ThemeSwitchPressed,
  .homeV2FeedbackPressed,
  .homeV2DictationCard:active,
  .homeV2QuickCard:active {
    transform: none;
  }
}
</style>
