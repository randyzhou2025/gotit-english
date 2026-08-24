export const UNIT_CHALLENGE_ROUTE = '/pages/share-entry/index'

export interface UnitChallengeShareContext {
  unitId: string
  bookName?: string
  unitName?: string
}

export type UnitChallengeQuery = Record<string, string | string[] | undefined>

function firstQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export function normalizeUnitChallengeId(value: string | string[] | undefined): string {
  const raw = firstQueryValue(value).trim()
  if (!raw) return ''

  try {
    return decodeURIComponent(raw).trim()
  } catch {
    return raw
  }
}

export function readUnitChallengeId(query: UnitChallengeQuery = {}): string {
  return normalizeUnitChallengeId(query.token)
}

export function buildUnitChallengePath(shareToken: string): string {
  const normalizedToken = shareToken.trim()
  if (!normalizedToken) return UNIT_CHALLENGE_ROUTE

  return `${UNIT_CHALLENGE_ROUTE}?token=${encodeURIComponent(normalizedToken)}`
}

export function buildUnitChallengeTitle(context: UnitChallengeShareContext): string {
  const unitLabel = context.unitName?.trim() || '这个 Unit'
  return `我刚完成 ${unitLabel}，你也来挑战一下`
}
