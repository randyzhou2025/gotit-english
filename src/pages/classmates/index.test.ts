import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
const pages = JSON.parse(fs.readFileSync(new URL('../../pages.json', import.meta.url), 'utf8')) as {
  tabBar: { list: Array<{ pagePath: string; text: string; iconPath: string }> }
}

describe('classmates page MVP', () => {
  it('adds the classmates tab without changing the other tab destinations', () => {
    expect(pages.tabBar.list.map(item => item.text)).toEqual(['首页', '同学', '生词本', '我的'])
    expect(pages.tabBar.list[1]).toEqual(expect.objectContaining({
      pagePath: 'pages/classmates/index',
      iconPath: 'static/tabbar/classmates.png'
    }))
  })

  it('contains feed, cheer, leaderboard and every invite entry', () => {
    expect(source).toContain('同学动态')
    expect(source).toContain('👏 加油')
    expect(source).toContain('本周排行榜')
    expect(source).toContain('周一重新开始')
    expect(source).toContain('邀请同学')
    expect(source).toContain('邀请同学一起学')
    expect(source).toContain('再获得 {{ leaderboard.pointsToOvertakePrevious }} 学习力，就能超过上一名')
  })

  it('keeps the first version focused on learning actions', () => {
    expect(source).not.toContain('聊天')
    expect(source).not.toContain('评论')
    expect(source).not.toContain('私信')
    expect(source).not.toContain('积分商城')
  })
})
