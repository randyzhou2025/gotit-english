<template>
  <view class="grammarPage" :style="activeVisualThemeStyle">
    <view class="grammarContent">
      <view class="directoryHeading"><text class="gTitle">英语时态</text><button class="viewToggle" hover-class="gPressed" @tap="panoramic = !panoramic">{{ panoramic ? '分类列表' : '时态总表' }} ⇄</button></view>

      <view class="studyCard">
        <view class="studyHeading"><text class="studyLabel">当前在学时态</text><text v-if="isLessonComplete(progress, currentLesson.id)" class="studyMark">已学完</text></view>
        <button v-if="currentStats.practiced" class="gRestart heroRestart" aria-label="重新开始当前时态练习" title="重新开始" hover-class="gPressed" @tap="restartPractice(currentLesson.id)"><text>↻</text></button>
        <text class="studyTitle">{{ currentLesson.title }}</text>
        <text class="studyCopy">{{ shortMeaning[currentLesson.id] }}</text>
        <view class="gStats heroStats"><view><text class="gStatNumber">{{ currentStats.practiced }}<text class="gStatTotal">/{{ currentStats.total }}</text></text><text>已练</text></view><view><text class="gStatNumber">{{ currentStats.remaining }}</text><text>剩余（含错题）</text></view><view><text class="gStatNumber">{{ allStats.wrong }}</text><text>全部错题</text></view></view>
        <text v-if="!currentStats.remaining" class="completionCopy">练习已全部完成，做得很好！</text>
        <view class="gActions heroActions"><button class="gButton heroSecondary" hover-class="gPressed" @tap="openLesson(currentLesson.id)">学习</button><button class="gButton heroButton" hover-class="gPressed" @tap="openPractice(currentLesson.id)">{{ practiceLabel(currentLesson.id) }}</button><button class="gButton heroSecondary" :disabled="!allStats.wrong" hover-class="gPressed" @tap="openReview()">错题复习</button></view>
      </view>
      <template v-if="!panoramic">
        <view class="levelTabs">
          <button v-for="level in levels" :key="level" :class="['levelTab', selectedLevel === level && 'selected']" hover-class="gPressed" @tap="selectedLevel = level">{{ levelLabels[level] }}</button>
        </view>
        <text v-if="selectedLevel === 'basic'" class="levelAdvice">建议初中阶段掌握</text>
        <text v-else-if="selectedLevel === 'advanced'" class="levelAdvice">建议高中阶段掌握</text>
        <text v-else class="levelAdvice">建议先学前10种，再学这6种拓展时态</text>
        <view class="lessonList"><view v-for="(lesson, index) in shownLessons" :key="lesson.id" :class="['lessonRow', currentLesson.id === lesson.id && 'currentLessonRow']" role="button" :aria-label="`学习${lesson.title}`" hover-class="gPressed" @tap="openLesson(lesson.id)">
          <view class="gRow"><view class="lessonHeading"><text class="lessonNumber">{{ String(index + 1).padStart(2, '0') }}</text><text class="lessonTitle">{{ lesson.title }}</text></view><view class="lessonTrailing"><text v-if="isLessonComplete(progress, lesson.id)" class="gBadge">已学完</text><text class="lessonArrow">›</text></view></view>
          <text class="lessonProgress">已练 {{ stats(lesson.id).practiced }}/{{ stats(lesson.id).total }}题 · 剩余 {{ stats(lesson.id).remaining }}题<template v-if="stats(lesson.id).wrong"> · 错题 {{ stats(lesson.id).wrong }}题</template></text>
        </view></view>
      </template>
      <template v-else>
        <text class="gSubtitle">点击时态名称，查看用法和例句。</text>
        <view class="panorama"><view class="matrixCorner" /><text v-for="time in ['现在', '过去', '将来', '过去将来']" :key="time" class="matrixHeading">{{ time }}</text>
          <template v-for="(row, index) in panorama" :key="index"><text class="matrixHeading">{{ ['一般', '进行', '完成', '完成进行'][index] }}</text><view v-for="id in row" :key="id" :class="['matrixCell', getLesson(id)?.level]" hover-class="gPressed" @tap="openLesson(id)"><text>{{ getLesson(id)?.title }}</text><text v-if="isLessonComplete(progress, id)" class="matrixRead">已学完</text></view></template>
        </view>
        <view class="matrixLegend"><text>蓝色 · 基础6种</text><text>绿色 · 进阶4种</text><text>灰色 · 拓展6种</text></view>
      </template>

      <text class="gSection">综合练习</text>
      <view class="trainingList"><view v-for="entry in training" :key="entry.bank" class="trainingRow"><view class="restartHeading"><text class="trainingTitle">{{ entry.title }}</text><text class="gSubtitle">{{ entry.copy }}</text></view><button v-if="stats(entry.bank).practiced" class="gRestart" :aria-label="`重新开始${entry.title}`" title="重新开始" hover-class="gPressed" @tap="restartPractice(entry.bank)"><text>↻</text></button><text class="lessonProgress">已练 {{ stats(entry.bank).practiced }}/{{ stats(entry.bank).total }}题 · 剩余 {{ stats(entry.bank).remaining }}题</text><text v-if="!stats(entry.bank).remaining" class="gCompletion">练习已全部完成！</text><view class="gActions trainingActions"><button class="gButton" @tap="openPractice(entry.bank)">{{ practiceLabel(entry.bank) }}</button><button v-if="stats(entry.bank).wrong" class="gButton secondary" @tap="openReview(entry.bank)">错题 {{ stats(entry.bank).wrong }}题</button></view></view></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useGrammarTheme } from '@/features/grammar/useGrammarTheme'
import { lessons, levelLabels, panorama, getLesson } from '@/features/grammar/content'
import { exerciseStats, isLessonComplete, loadProgress, practiceButtonLabel } from '@/features/grammar/progress'
import { openPractice, openReview, openLesson, restartPractice } from '@/features/grammar/navigation'
import type { Bank, Level } from '@/features/grammar/types'

const { activeVisualThemeStyle } = useGrammarTheme()
const progress = ref(loadProgress())
const selectedLevel = ref<Level>('basic')
const levels: Level[] = ['basic', 'advanced', 'extended']
const panoramic = ref(false)
const shownLessons = computed(() => lessons.filter(l => l.level === selectedLevel.value))
const currentLesson = computed(() => getLesson(progress.value.currentLessonId) || lessons.find(l => !isLessonComplete(progress.value, l.id)) || lessons[0]!)
const currentStats = computed(() => stats(currentLesson.value.id))
const allStats = computed(() => stats('all'))
function stats(scope: string) { return exerciseStats(progress.value, scope) }
function practiceLabel(scope: string) { return practiceButtonLabel(progress.value, scope) }
const shortMeaning: Record<string, string> = {
  t01: '习惯、经常发生的事或客观事实', t02: '过去发生的事或存在的状态', t03: '将来的计划、决定或预测',
  t04: '现在或最近一段时间正在做的事', t05: '过去某个时刻正在做的事', t06: '过去的事对现在有影响，或状态持续到现在',
  t07: '过去说过：之后会发生的事', t08: '将来某个时刻正在做的事', t09: '过去某件事发生前，另一件事已经发生或完成',
  t10: '从过去开始，持续到现在或刚结束的活动', t11: '到过去某时，一个动作已持续一段时间', t12: '将来某个时间前已经完成的事',
  t13: '到将来某时，一个动作将持续多长时间', t14: '过去说过：之后某时正在做的事', t15: '过去说过：之后某时前会做完的事', t16: '过去说过：到之后某时会持续多久'
}
const training: Array<{ bank: Bank; title: string; copy: string }> = [
  { bank: 'mixed', title: '时态综合练习', copy: '44题 · 练习区分不同时态' },
  { bank: 'passage', title: '短文填空', copy: '2篇短文，12个空' },
  { bank: 'writing', title: '写作练习', copy: '10道题 · 按要求写句子' }
]
onShow(() => { progress.value = loadProgress() })
</script>
<style scoped lang="scss">
@use '@/features/grammar/grammar.scss';
.grammarPage { padding-top: 12px; padding-left: 16px; padding-right: 16px; }
.directoryHeading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }.directoryHeading .gTitle { font-size: 22px; line-height: 1.4; letter-spacing: 0; }
.studyCard { position: relative; padding: 16px; border-radius: 20px; background: var(--accent); color: var(--surface); }
.studyHeading { display: flex; align-items: center; gap: 8px; min-height: 18px; padding-right: 44px; }.studyLabel { font-size: 12px; line-height: 1.5; opacity: .9; } .studyMark { font-size: 11px; border: 1px solid currentColor; border-radius: 6px; padding: 2px 5px; }
.studyTitle { display: block; margin-top: 5px; font-size: 22px; font-weight: 750; line-height: 1.4; }
.studyCopy { display: block; font-size: 13px; line-height: 1.6; margin-top: 4px; opacity: .9; }
.heroStats { border-top: 1px solid rgba(255,255,255,.2); padding-top: 10px; margin-top: 12px; margin-bottom: 12px; }.heroStats > view { font-size: 11px; line-height: 1.5; }.heroStats .gStatNumber { color: inherit; font-size: 22px; line-height: 1.3; font-variant-numeric: tabular-nums; }.heroStats > view > text:last-child { opacity: .9; }
.heroButton { background: var(--surface); color: var(--accent); }.heroSecondary { background: transparent; color: var(--surface); border: 1px solid rgba(255,255,255,.5); }.heroActions { gap: 8px; }.heroActions .gButton { min-height: 44px; border-radius: 12px; font-size: 14px; padding: 10px 2px; white-space: nowrap; }.heroActions .gButton[disabled] { color: var(--surface); background: transparent; }.heroRestart { top: 8px; right: 8px; color: var(--surface); background: transparent; border: 0; }.completionCopy { display: block; font-size: 13px; line-height: 1.5; margin-bottom: 10px; }
.viewToggle { display: flex; align-items: center; min-height: 44px; margin: 0; background: transparent; border: 0; padding: 0; color: var(--accent); font-size: 13px; line-height: 1.5; }.viewToggle::after { border: 0; }
.levelTabs { display: flex; gap: 4px; margin-top: 20px; padding: 4px; border-radius: 14px; background: var(--surface-soft); border: 1px solid var(--line); }
.levelTab { flex: 1; min-width: 0; min-height: 44px; display: flex; align-items: center; justify-content: center; padding: 8px 2px; margin: 0; font-size: 13px; color: var(--ink-soft); background: transparent; line-height: 1.5; border-radius: 10px; }.levelTab::after { border: 0; }.levelTab.selected { background: var(--surface); color: var(--accent); font-weight: 750; }
.levelAdvice { display: block; margin: 8px 2px 10px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.lessonList { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.lessonRow { padding: 13px 14px; border-bottom: 1px solid var(--line); }.lessonRow:last-child { border-bottom: 0; }.lessonHeading { display: flex; align-items: center; gap: 10px; min-width: 0; }.lessonNumber { color: var(--muted); font-size: 12px; font-weight: 650; font-variant-numeric: tabular-nums; }.lessonTitle { font-size: 16px; font-weight: 700; line-height: 1.5; }.lessonProgress { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.6; }.currentLessonRow { background: var(--accent-soft); }.currentLessonRow .lessonNumber, .currentLessonRow .lessonTitle { color: var(--accent); }.lessonTrailing { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }.lessonArrow { color: var(--muted); font-size: 22px; line-height: 1; }.trainingActions .gButton { font-size: 14px; min-height: 44px; }
.trainingList { border-radius: 19px; background: var(--surface); border: 1px solid var(--line); overflow: hidden; }.trainingRow { position: relative; padding: 17px 18px; border-bottom: 1px solid var(--line); }.trainingRow:last-child { border: 0; }.trainingTitle { display: block; font-size: 15px; font-weight: 700; }.trainingRow .gSubtitle { margin-top: 4px; font-size: 12px; }.trainingActions { margin-top: 12px; }
.panorama { display: grid; grid-template-columns: 36px repeat(4, minmax(0, 1fr)); gap: 4px; margin-top: 18px; }.matrixHeading { display: flex; align-items: center; justify-content: center; text-align: center; color: var(--muted); font-size: 11px; line-height: 1.5; padding: 8px 0; }.matrixCell { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 83px; padding: 8px 4px; text-align: center; background: var(--surface-soft); border: 1px solid var(--line); border-radius: 10px; font-size: 12px; line-height: 1.8; }.matrixCell.basic { background: var(--info-soft); color: var(--info); }.matrixCell.advanced { background: var(--accent-soft); color: var(--accent); }.matrixRead { font-size: 9px; opacity: .7; }.matrixLegend { display: flex; justify-content: space-between; gap: 5px; margin-top: 10px; font-size: 10px; color: var(--muted); }
</style>
