import type { FeatureAnnouncement } from './types'

/**
 * Add future homepage announcements here. Use a new stable id for each release;
 * changing copy without changing the id will not show the item again.
 */
export const FEATURE_ANNOUNCEMENTS: readonly FeatureAnnouncement[] = [
  {
    id: 'exam-vocabulary-collections-2026-09-v1',
    enabled: true,
    existingUsersOnly: true,
    badge: '新内容',
    title: '中高考核心词库\n现已上线',
    description: '不换学习方式，直接选择词库，即可自动听写、打印词表和反复巩固。',
    imageSrc: '/static/announcements/exam-vocabulary.webp',
    imageAlt: '中考和高考核心词库',
    highlights: [
      { icon: '中', title: '中考 2000 词', description: '覆盖初中核心词汇' },
      { icon: '高', title: '高考 3500 词', description: '按范围分组练习' }
    ],
    primaryAction: {
      type: 'navigateTo',
      url: '/pages/course/index',
      label: '选择新词库'
    },
    secondaryLabel: '稍后再说',
    footnote: '之后可在首页「切换教材」中找到'
  }
]
