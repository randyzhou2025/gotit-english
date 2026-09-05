import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./ProfileScreen.vue', import.meta.url), 'utf8')

describe('profile screen layout', () => {
  it('renders a collapsed current week and expands to the 30-day calendar', () => {
    expect(source).toContain('学习日历')
    expect(source).toContain('近 30 天学习 {{ recentStudyDays }} 天')
    expect(source).toContain('v-for="item in displayedCalendarItems"')
    expect(source).toContain('const calendarExpanded = ref(false)')
    expect(source).toContain("calendarExpanded.value ? studyCalendarItems.value : currentWeekCalendarItems.value")
    expect(source).toContain("calendarExpanded.value ? calendarStartOffset.value : 0")
    expect(source).toContain('<view class="studyCalendarLegend">')
    expect(source).not.toContain('v-if="calendarExpanded" class="studyCalendarLegend"')
    expect(source).toContain("'isToday': item.isToday")
    expect(source).toContain("const calendarWeekLabels = ['一', '二', '三', '四', '五', '六', '日']")
    expect(source).toContain('Array.from({ length: 30 }')
    expect(source).toContain('calendarIntensity')
    expect(source).toContain('background: var(--calendar-level-1)')
    expect(source).toContain('background: var(--calendar-level-2)')
    expect(source).toContain('background: var(--calendar-level-3)')
    expect(source).toContain('background: var(--calendar-level-4)')
    expect(source).not.toContain('weeklyStudyBar')
  })

  it('removes the duplicated practice promo card', () => {
    expect(source).not.toContain('class="promoBanner"')
    expect(source).not.toContain('.promoBanner')
    expect(source).toContain('我的学习')
  })

  it('provides a generated score poster with save and WeChat share actions', () => {
    expect(source).toContain('class="scoreShareButton" role="button" aria-label="晒成绩" @tap="openScoreShare"')
    expect(source).toContain("uni.createCanvasContext('scorePosterCanvas'")
    expect(source).toContain('uni.canvasToTempFilePath')
    expect(source).toContain('uni.saveImageToPhotosAlbum')
    expect(source).toContain('open-type="share"')
    expect(source).toContain('微信分享')
    expect(source).toContain('pickScorePosterQuote')
    expect(source).toContain('formatScorePosterDate(new Date())')
    expect(source).not.toContain('发给同学')
    expect(source).not.toContain('今天也认真')
    expect(source).not.toContain('零准备 · 纸笔听写')
  })

  it('requires subscription authorization before enabling a timed reminder', () => {
    expect(source).toContain('class="reminderStrip" role="button" aria-label="设置学习提醒" @tap="openReminderSettings"')
    expect(source.indexOf('class="reminderStrip"')).toBeLessThan(source.indexOf('<text class="sectionTitle">工具和服务</text>'))
    expect(source).not.toContain('class="toolIcon toolReminderIcon"')
    expect(source).toContain('requestLearningReminderSubscription')
    expect(source).toContain('saveLearningReminder')
    expect(source).toContain("reminder.mode === 'long_term'")
    expect(source).toContain('续期提醒（再授权 1 天）')
    expect(source).toContain('勾选“总是保持以上选择”')
    expect(source).toContain('renewLearningReminder')
  })

  it('keeps avatar and nickname editable without decorative affordances', () => {
    expect(source).toContain('open-type="chooseAvatar"')
    expect(source).toContain('@tap="startNicknameEdit"')
    expect(source).not.toContain('avatarEditBadge')
    expect(source).not.toContain('nicknameEditIcon')
  })

  it('shows profile edit hint until avatar or nickname is customized', () => {
    expect(source).toContain('showProfileEditHint')
    expect(source).toContain('shouldShowProfileEditHint')
    expect(source).toContain('点击头像或昵称可修改')
  })

  it('reuses the home theme switch from tools and services', () => {
    expect(source).toContain('@tap="switchToNextVisualTheme"')
    expect(source).toContain(':aria-label="`切换主题，当前${activeVisualTheme.name}`"')
    expect(source).toContain('class="toolThemeSwatch"')
    expect(source).toContain('activeVisualTheme, activeVisualThemeStyle, switchToNextVisualTheme')
    expect(source).not.toContain('grid-template-columns: repeat(3, 1fr)')
  })
})
