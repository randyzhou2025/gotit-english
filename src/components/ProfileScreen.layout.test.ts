import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./ProfileScreen.vue', import.meta.url), 'utf8')

describe('profile screen layout', () => {
  it('renders a 30-day study calendar with intensity and today states', () => {
    expect(source).toContain('学习日历')
    expect(source).toContain('近 30 天学习 {{ recentStudyDays }} 天')
    expect(source).toContain('v-for="item in studyCalendarItems"')
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
