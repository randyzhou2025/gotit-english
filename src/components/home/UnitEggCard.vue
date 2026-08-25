<template>
  <view
    :class="[
      'unitEggCard',
      `template${egg.template}`,
      showOrnament && 'hasOrnament',
      isDense && 'isDense'
    ]"
    role="note"
    aria-label="单元发现"
  >
    <view class="unitEggTopline">
      <text class="unitEggLabel">✦ 单元发现</text>
      <text class="unitEggGuide">{{ guideText }}</text>
    </view>

    <template v-if="egg.template === 'A'">
      <view :class="['unitEggCorrection', correctionIsLong && 'isLong']">
        <text class="unitEggWrong">{{ correctionParts[0] }} ×</text>
        <text class="unitEggArrow">→</text>
        <text class="unitEggRight">{{ correctionParts[1] }} ✓</text>
      </view>
      <text class="unitEggNote">{{ noteText }}</text>
    </template>

    <template v-else-if="egg.template === 'B' || egg.template === 'J'">
      <view class="unitEggContrast">
        <text :class="['unitEggContrastWord', egg.template === 'J' && 'isEd']">{{ contrastParts[0] }}</text>
        <text class="unitEggContrastMark">{{ egg.template === 'J' ? '↔' : 'VS' }}</text>
        <text :class="['unitEggContrastWord', 'isRight', egg.template === 'J' && 'isIng']">{{ contrastParts[1] }}</text>
      </view>
      <view class="unitEggContrastNotes">
        <text class="unitEggContrastNote">{{ contrastNotes[0] }}</text>
        <text class="unitEggContrastSpacer" />
        <text class="unitEggContrastNote isRight">{{ contrastNotes[1] }}</text>
      </view>
    </template>

    <template v-else-if="egg.template === 'C'">
      <view class="unitEggPronunciation">
        <text class="unitEggKeyword">{{ egg.keyword }}</text>
        <text class="unitEggPhonetic">{{ pronunciationText }}</text>
        <view
          :class="['unitEggAudio', audioPlaying && 'isPlaying']"
          hover-class="unitEggAudioPressed"
          hover-stay-time="80"
          role="button"
          :aria-label="audioPlaying ? `${egg.keyword} 正在播放` : `播放 ${egg.keyword} 发音`"
          @tap.stop="emit('play-audio', egg.keyword)"
        >
          <view v-if="audioPlaying" class="unitEggAudioBars" aria-hidden="true">
            <view class="unitEggAudioBar one" />
            <view class="unitEggAudioBar two" />
            <view class="unitEggAudioBar three" />
          </view>
          <view v-else class="unitEggAudioTriangle" aria-hidden="true" />
        </view>
      </view>
      <text class="unitEggNote">{{ noteText }}</text>
    </template>

    <template v-else-if="egg.template === 'E'">
      <view class="unitEggFormula">
        <template v-for="(part, index) in formulaParts" :key="`${part}-${index}`">
          <text :class="['unitEggFormulaPart', part === '→' && 'isArrow', part === '+' && 'isOperator']">{{ part }}</text>
        </template>
      </view>
      <text class="unitEggNote">{{ noteText }}</text>
    </template>

    <template v-else-if="egg.template === 'G' || egg.template === 'I'">
      <view :class="['unitEggFlow', flowParts.length > 3 && 'isCompact']">
        <template v-for="(part, index) in flowParts" :key="`${part}-${index}`">
          <text v-if="index > 0" class="unitEggArrow">→</text>
          <text class="unitEggFlowPart">{{ part }}</text>
        </template>
      </view>
      <text class="unitEggNote">{{ noteText }}</text>
    </template>

    <template v-else>
      <view class="unitEggFocus">
        <text class="unitEggKeyword">{{ focusWord }}</text>
        <text v-if="focusMeta" class="unitEggFocusMeta">{{ focusMeta }}</text>
      </view>
      <text class="unitEggNote">{{ noteText }}</text>
    </template>

    <view v-if="showOrnament" class="unitEggOrnament" aria-hidden="true">
      <text class="unitEggOrnamentLetters">Aa</text>
      <view class="unitEggOrnamentRule one" />
      <view class="unitEggOrnamentRule two" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getUnitEggContrastNotes, type UnitEgg } from '@/core/unitEggs'

const props = withDefaults(defineProps<{
  egg: UnitEgg
  audioPlaying?: boolean
}>(), {
  audioPlaying: false
})

const emit = defineEmits<{
  'play-audio': [keyword: string]
}>()

function stripOuterPunctuation(value: string): string {
  return value
    .trim()
    .replace(/^[：:，,；;。\s]+/, '')
    .replace(/[。；;\s]+$/, '')
    .replace(/[“”"]/g, '')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const correctionParts = computed<[string, string]>(() => {
  const withoutHint = props.egg.core.replace(/（[^）]+）/g, '').trim()
  const parts = withoutHint.split(/\s*→\s*/).map(part => part.replace(/[×✓]\s*$/g, '').trim())
  return [parts[0] || props.egg.keyword, parts[1] || props.egg.keyword]
})

const correctionIsLong = computed(() => correctionParts.value.some(part => part.length > 10))

const contrastParts = computed<[string, string]>(() => {
  const parts = props.egg.core.split(/\s+(?:vs\.?|VS\.?)\s+|\s*↔\s*/i).map(part => part.trim())
  if (parts.length >= 2) return [parts[0] ?? props.egg.keyword, parts.slice(1).join(' ')]
  return [props.egg.keyword, props.egg.compare || props.egg.keyword]
})

const contrastNotes = computed(() => {
  const leftWord = contrastParts.value[0]
  const rightWord = contrastParts.value[1]
  return getUnitEggContrastNotes(props.egg.explanation, leftWord, rightWord)
})

const formulaParts = computed(() => props.egg.core
  .split(/\s*(→|\+)\s*/)
  .map(part => part.trim())
  .filter(Boolean))

const flowParts = computed(() => props.egg.core
  .split(/\s*→\s*/)
  .map(part => part.trim())
  .filter(Boolean))

const pronunciationText = computed(() => {
  const coreWithoutWord = props.egg.core.replace(new RegExp(`^${escapeRegExp(props.egg.keyword)}\\s*`, 'i'), '').trim()
  return coreWithoutWord || props.egg.phonetic
})

const guideText = computed(() => (
  props.egg.title === '这个搭配很容易丢分'
    ? '这个搭配值得记住'
    : props.egg.title
))

const focusWord = computed(() => {
  if (props.egg.template === 'D' || props.egg.template === 'H') return props.egg.keyword
  return props.egg.core || props.egg.keyword
})

const focusMeta = computed(() => {
  if (props.egg.template !== 'H') return ''
  return props.egg.core.replace(new RegExp(`^${escapeRegExp(props.egg.keyword)}[：:]?\\s*`, 'i'), '').trim()
})

const noteText = computed(() => {
  if (props.egg.template === 'A') {
    const hint = /（([^）]+)）/.exec(props.egg.core)?.[1]
    return hint ? `注意 ${hint}` : props.egg.memory
  }

  if (props.egg.template === 'E') {
    return stripOuterPunctuation(props.egg.explanation.split(/[。；;]/)[0] ?? props.egg.explanation)
  }

  if (props.egg.template === 'G') {
    return stripOuterPunctuation(props.egg.explanation.split(/同根词一起记/)[0] ?? props.egg.explanation)
  }

  if (props.egg.template === 'H') {
    return stripOuterPunctuation(props.egg.explanation.replace(/。先看句子位置[\s\S]*$/, ''))
  }

  if (props.egg.template === 'I') {
    const reminder = props.egg.explanation.split(/[；;]/).find(part => /不要|别/.test(part))
    return stripOuterPunctuation(reminder ?? props.egg.memory)
  }

  return stripOuterPunctuation(props.egg.explanation)
})

const isDense = computed(() => {
  const mainLength = props.egg.template === 'D' || props.egg.template === 'H'
    ? focusWord.value.length + focusMeta.value.length
    : props.egg.core.length
  return mainLength > 34 || noteText.value.length > 55
})

const showOrnament = computed(() => {
  if (!['C', 'D', 'F', 'H'].includes(props.egg.template)) return false
  return props.egg.core.length + noteText.value.length < 58
})
</script>

<style scoped lang="scss">
.unitEggCard {
  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(38px, 1fr) auto;
  row-gap: 6px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 11px 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 7px 18px rgba(23, 52, 44, 0.07);
  color: var(--ink);
}

.unitEggCard.hasOrnament {
  padding-right: 82px;
}

.unitEggTopline {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.unitEggLabel {
  flex: 0 0 auto;
  color: #74663d;
  font-size: 12px;
  line-height: 18px;
  font-weight: 850;
}

.unitEggGuide {
  min-width: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  line-height: 18px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unitEggCorrection,
.unitEggPronunciation,
.unitEggFormula,
.unitEggFlow,
.unitEggFocus,
.unitEggContrast {
  display: flex;
  align-self: center;
  align-items: center;
  min-width: 0;
  gap: 10px;
  white-space: nowrap;
}

.unitEggWrong,
.unitEggRight {
  display: inline-flex;
  flex: 0 1 auto;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  min-height: 34px;
  padding: 0 10px;
  overflow: hidden;
  border-radius: 10px;
  font-size: 16px;
  line-height: 1;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unitEggCorrection {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr);
  gap: 6px;
}

.unitEggCorrection.isLong .unitEggWrong,
.unitEggCorrection.isLong .unitEggRight {
  padding-right: 6px;
  padding-left: 6px;
  font-size: 14px;
}

.unitEggWrong {
  border: 1px solid #efcec8;
  background: #fff3ef;
  color: #bc4d43;
}

.unitEggRight {
  border: 1px solid #c8dfd4;
  background: #eff8f3;
  color: var(--accent);
}

.unitEggArrow {
  flex: 0 0 auto;
  color: #89958f;
  font-size: 20px;
  line-height: 1;
  font-weight: 650;
}

.unitEggNote {
  display: block;
  max-height: 34px;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 17px;
  font-weight: 650;
  white-space: normal;
}

.unitEggCard.isDense .unitEggNote {
  font-size: 11px;
  line-height: 15px;
}

.unitEggContrast {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px minmax(0, 1fr);
  align-self: center;
  gap: 6px;
}

.unitEggContrastWord {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 38px;
  padding: 0 8px;
  overflow: hidden;
  border: 1px solid #d2e1da;
  border-radius: 10px;
  background: #f4f9f6;
  color: var(--accent);
  font-size: 16px;
  line-height: 1;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unitEggContrastWord.isRight {
  justify-content: center;
  text-align: right;
}

.unitEggContrastWord.isEd {
  color: var(--info);
}

.unitEggContrastWord.isIng {
  color: #9b592a;
}

.unitEggContrastMark {
  color: #9ca6a1;
  font-size: 13px;
  line-height: 1;
  font-weight: 850;
  text-align: center;
}

.unitEggContrastNotes {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px minmax(0, 1fr);
  align-items: start;
  gap: 6px;
  min-width: 0;
  max-height: 34px;
  overflow: hidden;
}

.unitEggContrastNote {
  min-width: 0;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 16px;
  font-weight: 650;
  white-space: normal;
}

.unitEggContrastNote.isRight {
  text-align: right;
}

.unitEggKeyword {
  flex: 0 0 auto;
  color: var(--ink);
  font-family: var(--font-word);
  font-size: 23px;
  line-height: 1;
  font-weight: 700;
}

.unitEggFocus {
  width: 100%;
  overflow: hidden;
  white-space: normal;
}

.unitEggFocus .unitEggKeyword {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: break-word;
  line-height: 1.18;
  white-space: normal;
  word-break: break-word;
}

.unitEggPhonetic {
  min-width: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 13px;
  line-height: 1;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unitEggAudio {
  display: flex;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #b8d4e2;
  border-radius: 999px;
  background: var(--info-soft);
}

.unitEggAudio.isPlaying {
  border-color: var(--info);
  background: #e2f1f7;
}

.unitEggAudioPressed {
  transform: scale(0.96);
}

.unitEggAudioTriangle {
  width: 0;
  height: 0;
  margin-left: 2px;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid var(--info);
}

.unitEggAudioBars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 16px;
}

.unitEggAudioBar {
  width: 3px;
  border-radius: 999px;
  background: var(--info);
  transform-origin: center;
  animation: unitEggAudioPulse 720ms ease-in-out infinite alternate;
}

.unitEggAudioBar.one { height: 8px; }
.unitEggAudioBar.two { height: 15px; animation-delay: 120ms; }
.unitEggAudioBar.three { height: 11px; animation-delay: 240ms; }

@keyframes unitEggAudioPulse {
  from { transform: scaleY(0.62); }
  to { transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
  .unitEggAudioBar {
    animation: none;
  }
}

.unitEggFormula {
  gap: 6px;
}

.unitEggFormulaPart,
.unitEggFlowPart,
.unitEggFocusMeta {
  min-width: 0;
  color: var(--accent);
  font-size: 15px;
  line-height: 1;
  font-weight: 800;
}

.unitEggFormulaPart:not(.isArrow):not(.isOperator) {
  padding: 9px 9px;
  border: 1px solid #d2e1da;
  border-radius: 6px;
  background: #f4f9f6;
}

.unitEggFormulaPart.isArrow,
.unitEggFormulaPart.isOperator {
  flex: 0 0 auto;
  color: #89958f;
  font-size: 18px;
  font-weight: 650;
}

.unitEggFlow {
  gap: 4px;
}

.unitEggFlowPart {
  flex: 1 1 auto;
  padding: 10px 7px;
  overflow: hidden;
  border: 1px solid #d2e1da;
  border-radius: 6px;
  background: #f4f9f6;
  font-size: 14px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unitEggFlow.isCompact .unitEggFlowPart {
  padding-right: 3px;
  padding-left: 3px;
  font-size: 11px;
}

.unitEggFocusMeta {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--accent-soft);
  font-size: 13px;
}

.unitEggOrnament {
  position: absolute;
  top: 50%;
  right: 16px;
  width: 50px;
  height: 62px;
  color: #bed2c8;
  pointer-events: none;
  transform: translateY(-38%);
}

.unitEggOrnamentLetters {
  position: absolute;
  top: 0;
  right: 0;
  color: #dbe9e2;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 30px;
  line-height: 1;
  font-weight: 700;
  transform: rotate(-7deg);
}

.unitEggOrnamentRule {
  position: absolute;
  right: 2px;
  height: 1px;
  border-radius: 999px;
  background: #c9dbd2;
  transform: rotate(-7deg);
}

.unitEggOrnamentRule.one {
  bottom: 13px;
  width: 40px;
}

.unitEggOrnamentRule.two {
  bottom: 6px;
  width: 29px;
}

@media (max-width: 360px) {
  .unitEggCard.hasOrnament {
    padding-right: 12px;
  }

  .unitEggOrnament {
    display: none;
  }

  .unitEggWrong,
  .unitEggRight {
    padding-right: 7px;
    padding-left: 7px;
    font-size: 14px;
  }

  .unitEggFormulaPart,
  .unitEggFlowPart {
    font-size: 11.5px;
  }

  .unitEggFocus .unitEggKeyword {
    font-size: 20px;
  }

}

@media (max-height: 820px) {
  .unitEggCard {
    grid-template-rows: auto minmax(32px, 1fr) auto;
    row-gap: 4px;
    padding: 9px 12px;
  }

  .unitEggLabel { font-size: 11px; line-height: 16px; }
  .unitEggGuide { font-size: 12px; line-height: 16px; }
  .unitEggWrong,
  .unitEggRight { min-height: 30px; font-size: 14px; }
  .unitEggContrastWord { min-height: 32px; font-size: 15px; }
  .unitEggNote { max-height: 30px; font-size: 11px; line-height: 14px; }
  .unitEggContrastNotes { max-height: 30px; }
  .unitEggContrastNote { font-size: 10.5px; line-height: 14px; }
}

@media (max-height: 720px) {
  .unitEggCard {
    grid-template-rows: auto minmax(26px, 1fr) auto;
    row-gap: 2px;
    padding: 7px 10px;
  }

  .unitEggGuide { font-size: 11px; }
  .unitEggWrong,
  .unitEggRight { min-height: 28px; padding: 0 6px; font-size: 12px; }
  .unitEggContrastWord { min-height: 28px; font-size: 13px; }
  .unitEggNote { max-height: 26px; font-size: 9px; line-height: 12px; }
  .unitEggContrastNote { font-size: 9px; line-height: 12px; }
}
</style>
