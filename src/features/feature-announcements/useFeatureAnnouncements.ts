import { onBeforeUnmount, ref } from 'vue'
import {
  captureFeatureAnnouncementAudience,
  findNextFeatureAnnouncement,
  markFeatureAnnouncementSeen
} from './state'
import type { FeatureAnnouncement } from './types'

export function useFeatureAnnouncements(
  announcements: readonly FeatureAnnouncement[],
  delayMs = 600
) {
  const activeFeatureAnnouncement = ref<FeatureAnnouncement | null>(null)
  let pendingTimer: ReturnType<typeof setTimeout> | null = null

  captureFeatureAnnouncementAudience(announcements)

  function cancelFeatureAnnouncementShow() {
    if (pendingTimer) clearTimeout(pendingTimer)
    pendingTimer = null
  }

  function scheduleFeatureAnnouncementShow() {
    if (pendingTimer || activeFeatureAnnouncement.value) return
    if (!findNextFeatureAnnouncement(announcements)) return

    pendingTimer = setTimeout(() => {
      pendingTimer = null
      const nextAnnouncement = findNextFeatureAnnouncement(announcements)
      if (!nextAnnouncement) return

      markFeatureAnnouncementSeen(nextAnnouncement.id)
      activeFeatureAnnouncement.value = nextAnnouncement
    }, delayMs)
  }

  function hideActiveFeatureAnnouncement() {
    activeFeatureAnnouncement.value = null
  }

  onBeforeUnmount(cancelFeatureAnnouncementShow)

  return {
    activeFeatureAnnouncement,
    cancelFeatureAnnouncementShow,
    hideActiveFeatureAnnouncement,
    scheduleFeatureAnnouncementShow
  }
}
