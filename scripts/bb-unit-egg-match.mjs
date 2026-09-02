const JUNIOR_EGG_PUBLISHERS = new Set(['rj', 'wyx', 'shjx', 'ylj', 'kp'])
const SENIOR_EGG_PUBLISHERS = new Set(['rj', 'ylj', 'wy', 'bsd', 'swj', 'shj'])

export function allowedEggPublishersForBb(publisherId) {
  if (publisherId === 'bb-junior') return JUNIOR_EGG_PUBLISHERS
  if (publisherId === 'bb-senior') return SENIOR_EGG_PUBLISHERS
  return null
}

export function normalizeMatchKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function eggScore(egg) {
  let score = 0
  for (const field of ['title', 'core', 'explanation', 'memory', 'compare', 'phonetic']) {
    const text = String(egg[field] ?? '').trim()
    if (text) score += 2
    score += Math.min(text.length, 240) / 240
  }
  return score
}

function rememberEgg(seenKeywords, coveredWords, wordKey, egg, eggs) {
  const keyword = normalizeMatchKey(egg.keyword)
  if (!keyword || seenKeywords.has(keyword)) return false
  seenKeywords.add(keyword)
  coveredWords.add(wordKey)
  eggs.push(egg)
  return true
}

export function pickBestEgg(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  return [...candidates].sort((left, right) => eggScore(right) - eggScore(left))[0] ?? null
}

export function buildTextbookEggIndex(publisherPayloads, allowedPublisherIds) {
  const index = new Map()

  for (const [publisherId, payload] of publisherPayloads) {
    if (!allowedPublisherIds.has(publisherId)) continue

    for (const eggs of Object.values(payload.byUnit ?? {})) {
      for (const egg of eggs) {
        const key = normalizeMatchKey(egg.keyword)
        if (!key) continue
        if (!index.has(key)) index.set(key, [])
        index.get(key).push(egg)
      }
    }
  }

  return index
}

export function matchEggsForUnit(orderedWords, eggIndex) {
  const eggs = []
  const seenKeywords = new Set()
  const coveredWords = new Set()

  for (const word of orderedWords) {
    const key = normalizeMatchKey(word)
    if (!key || coveredWords.has(key)) continue

    const best = pickBestEgg(eggIndex.get(key))
    if (!best) continue
    rememberEgg(seenKeywords, coveredWords, key, best, eggs)
  }

  for (const word of orderedWords) {
    const key = normalizeMatchKey(word)
    if (!key || coveredWords.has(key)) continue

    let best = null
    for (const candidates of eggIndex.values()) {
      for (const egg of candidates) {
        const keyword = normalizeMatchKey(egg.keyword)
        if (seenKeywords.has(keyword)) continue
        if (normalizeMatchKey(egg.compare) !== key) continue
        if (!best || eggScore(egg) > eggScore(best)) best = egg
      }
    }
    if (!best) continue
    rememberEgg(seenKeywords, coveredWords, key, best, eggs)
  }

  return eggs
}

export function resolveUnitWords(block, book, unit) {
  const words = []

  for (const ref of unit.words ?? []) {
    const tuple = Array.isArray(ref) ? ref : block.lexicon?.[ref]
    if (!tuple) continue
    words.push(String(tuple[0] ?? '').trim())
  }

  return words
}

export function buildBbUnitId(publisherId, bookId, unit) {
  const segment = unit.key ?? String(unit.number)
  return `${publisherId}:${bookId}:u${segment}`
}
