import { readonly, ref } from 'vue'

const featureAnnouncementsEnabled = ref(false)

export function setFeatureAnnouncementsEnabled(enabled: boolean): void {
  featureAnnouncementsEnabled.value = enabled
}

export function useFeatureAnnouncementRemoteConfig() {
  return {
    featureAnnouncementsEnabled: readonly(featureAnnouncementsEnabled)
  }
}

export function resetFeatureAnnouncementRemoteConfigForTests(): void {
  featureAnnouncementsEnabled.value = false
}
