import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./ProfileScreen.vue', import.meta.url), 'utf8')

describe('profile screen layout', () => {
  it('renders seven daily bars with the current day highlighted', () => {
    expect(source).toContain('本周学习')
    expect(source).toContain('共 {{ weeklyStudyTotal }} 分钟')
    expect(source).toContain('v-for="(item, index) in weeklyStudyItems"')
    expect(source).toContain("index === currentWeekdayIndex && 'isToday'")
    expect(source).toContain("const weekLabels = ['一', '二', '三', '四', '五', '六', '日']")
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
})
