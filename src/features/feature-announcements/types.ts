export interface FeatureAnnouncementHighlight {
  icon: string
  title: string
  description: string
}

export type FeatureAnnouncementAction =
  | { type: 'navigateTo', url: string }
  | { type: 'switchTab', url: string }

export interface FeatureAnnouncement {
  id: string
  enabled: boolean
  existingUsersOnly: boolean
  badge: string
  title: string
  description: string
  imageSrc?: string
  imageAlt?: string
  highlights: FeatureAnnouncementHighlight[]
  primaryAction: FeatureAnnouncementAction & { label: string }
  secondaryLabel?: string
  footnote?: string
}

export type FeatureAnnouncementDismissReason = 'close' | 'secondary' | 'scrim' | 'swipe'
