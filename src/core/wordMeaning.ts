export interface WordMeaningLine {
  partOfSpeech: string
  meaning: string
}

const VERB_LIKE_SEGMENT = /(?:做|化|定|与……|使|让|给|把|被|挨|受|成$|出$|束$|述$|牢$|进$|动$|持续|点燃|拥有|比得上|评价|指责|讲课|闻到|发出)/

type TagKind =
  | 'adj'
  | 'adv'
  | 'prep'
  | 'verb'
  | 'link'
  | 'noun'
  | 'det'
  | 'pron'
  | 'num'
  | 'conj'
  | 'excl'
  | 'other'

export function parsePartOfSpeechTags(partOfSpeech: string): string[] {
  const tags: string[] = []
  let current = ''
  let depth = 0

  for (const char of partOfSpeech) {
    if (char === '（' || char === '(') {
      depth += 1
    } else if (char === '）' || char === ')') {
      depth = Math.max(0, depth - 1)
    } else if ((char === '；' || char === ';') && depth === 0) {
      if (current.trim()) tags.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) tags.push(current.trim())
  return tags
}

export function splitMeaningSegments(meaning: string): string[] {
  const segments: string[] = []
  let current = ''
  let depth = 0

  for (const char of meaning) {
    if (char === '（' || char === '(') {
      depth += 1
    } else if (char === '）' || char === ')') {
      depth = Math.max(0, depth - 1)
    } else if ((char === '；' || char === ';') && depth === 0) {
      if (current.trim()) segments.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) segments.push(current.trim())
  return segments
}

function segmentsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function isVerbLikeSegment(segment: string): boolean {
  const stripped = stripSegment(segment)
  if (/^(主修|专门研究)$/.test(stripped)) return true
  return VERB_LIKE_SEGMENT.test(segment) || /^(使|让|把|被|给|对|去|将|开|处|用)/.test(stripped)
}

function stripSegment(segment: string): string {
  return segment
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
}

function segmentParts(segment: string): string[] {
  return stripSegment(segment)
    .split(/[，,、]/)
    .map(part => part.trim())
    .filter(Boolean)
}

function isAdjectivalSegment(segment: string): boolean {
  const parts = segmentParts(segment)
  return parts.length > 0 && parts.every(part => /的$/.test(part))
}

function isAdverbialSegment(segment: string): boolean {
  const stripped = stripSegment(segment)
  const parts = segmentParts(segment)
  if (parts.length > 0 && parts.every(part => /地$/.test(part))) return true
  return /^(在附近|不远|向[东西南北左右]|朝[东西南北左右]|向……|在国外|向海外|也不|最终|首先|第一次|更$|最$)/.test(stripped)
}

function isPrepositionalSegment(segment: string): boolean {
  const stripped = stripSegment(segment)
  return /在……|之后$|^在/.test(stripped) && !isAdjectivalSegment(segment)
}

function tagKind(tag: string): TagKind {
  const t = tag.toLowerCase()
  if (/adj/.test(t)) return 'adj'
  if (/adv/.test(t)) return 'adv'
  if (/prep/.test(t)) return 'prep'
  if (/pron/.test(t)) return 'pron'
  if (/\bdet\b|determiner/.test(t)) return 'det'
  if (/link/.test(t)) return 'link'
  if (/conj/.test(t)) return 'conj'
  if (/excl|intj|interjection/.test(t)) return 'excl'
  if (/ordinal|\bnum\b/.test(t)) return 'num'
  if (/\bvt\b|\bvi\b|^vt\b|^vi\b|^v\.|^v\b|&\s*v/.test(t) || /^v/i.test(t.trim())) return 'verb'
  if (/^n/i.test(t.trim())) return 'noun'
  return 'other'
}

function scoreSegmentForKind(segment: string, kind: TagKind): number {
  const adj = isAdjectivalSegment(segment)
  const adv = isAdverbialSegment(segment)
  const prep = isPrepositionalSegment(segment)
  const verb = isVerbLikeSegment(segment)
  const mildAdj = /^(很好|好)$/.test(stripSegment(segment))

  switch (kind) {
    case 'adj':
      if (adj) return 5
      if (mildAdj) return 3
      return -4
    case 'adv':
      if (adv) return 5
      return -4
    case 'prep':
      if (prep) return 5
      return -4
    case 'verb':
      if (verb) return 5
      if (adj || adv) return -4
      return -1
    case 'link':
      if (/与……|相等/.test(segment)) return 5
      if (verb) return 2
      if (adj) return -4
      return -2
    case 'noun':
      if (adj || adv) return -4
      if (verb) return -2
      return 4
    case 'det':
      if (adj) return 4
      if (verb) return -4
      return 1
    case 'pron':
      if (adj || adv || verb) return -3
      return 1
    case 'num':
      if (/第|秒/.test(segment)) return 4
      return 0
    case 'conj':
      if (/而且|此外|也不/.test(segment)) return 4
      return 0
    case 'excl':
      return 1
    default:
      return 0
  }
}

function alignSegmentsToTags(tags: string[], segments: string[]): WordMeaningLine[] {
  const tagCount = tags.length
  const segmentCount = segments.length
  const kinds = tags.map(tagKind)
  const unreachable = Number.NEGATIVE_INFINITY
  const dp: number[][] = Array.from({ length: tagCount + 1 }, () => Array(segmentCount + 1).fill(unreachable))
  const prev: number[][] = Array.from({ length: tagCount + 1 }, () => Array(segmentCount + 1).fill(-1))
  const initialRow = dp[0]
  if (!initialRow) return []
  initialRow[0] = 0

  for (let tagIndex = 1; tagIndex <= tagCount; tagIndex += 1) {
    const scoreRow = dp[tagIndex]
    const previousIndexRow = prev[tagIndex]
    if (!scoreRow || !previousIndexRow) continue

    for (let end = 0; end <= segmentCount; end += 1) {
      for (let start = 0; start <= end; start += 1) {
        const previous = dp[tagIndex - 1]?.[start]
        if (previous === undefined || !Number.isFinite(previous)) continue

        let sliceScore = 0
        for (let index = start; index < end; index += 1) {
          const kind = kinds[tagIndex - 1]
          const segment = segments[index]
          if (!kind || segment === undefined) continue
          sliceScore += scoreSegmentForKind(segment, kind)
        }
        if (end > start) sliceScore += 0.4

        const candidate = previous + sliceScore
        const current = scoreRow[end] ?? unreachable
        if (candidate > current) {
          scoreRow[end] = candidate
          previousIndexRow[end] = start
        }
      }
    }
  }

  if (!Number.isFinite(dp[tagCount]?.[segmentCount] ?? unreachable)) {
    return []
  }

  const slices: string[][] = []
  let end = segmentCount
  for (let tagIndex = tagCount; tagIndex >= 1; tagIndex -= 1) {
    const start = prev[tagIndex]?.[end] ?? end
    slices.push(segments.slice(start, end))
    end = start
  }
  slices.reverse()

  return tags
    .map((partOfSpeech, index) => ({
      partOfSpeech,
      meaning: (slices[index] ?? []).join('；')
    }))
    .filter(line => line.meaning)
}

function splitTwoPartOfSpeech(tags: string[], segments: string[]): WordMeaningLine[] {
  const [firstTag, secondTag] = tags
  if (!firstTag || !secondTag) {
    return [{ partOfSpeech: tags.join('；'), meaning: segments.join('；') }]
  }

  for (let size = 1; size <= Math.floor(segments.length / 2); size += 1) {
    if (segmentsEqual(segments.slice(0, size), segments.slice(size, size * 2))) {
      return [
        { partOfSpeech: firstTag, meaning: segments.slice(0, size).join('；') },
        { partOfSpeech: secondTag, meaning: segments.slice(size).join('；') }
      ]
    }
  }

  const repeatIndex = segments.findIndex((segment, index) => index > 0 && segment === segments[0])
  if (repeatIndex > 0) {
    return [
      { partOfSpeech: firstTag, meaning: segments.slice(0, repeatIndex).join('；') },
      { partOfSpeech: secondTag, meaning: segments.slice(repeatIndex).join('；') }
    ]
  }

  if (segments.length === 2) {
    return tags.map((partOfSpeech, index) => ({
      partOfSpeech,
      meaning: segments[index] ?? ''
    }))
  }

  const firstIsAdj = /adj/i.test(firstTag)
  const secondIsAdj = /adj/i.test(secondTag)
  const firstIsNoun = /^n/i.test(firstTag)
  const secondIsNoun = /^n/i.test(secondTag)

  if (firstIsAdj && secondIsNoun) {
    const nounIndex = segments.findIndex(segment => !isAdjectivalSegment(segment))
    if (nounIndex > 0) {
      return [
        { partOfSpeech: firstTag, meaning: segments.slice(0, nounIndex).join('；') },
        { partOfSpeech: secondTag, meaning: segments.slice(nounIndex).join('；') }
      ]
    }
  }

  if (firstIsNoun && secondIsAdj) {
    const adjIndex = segments.findIndex(segment => isAdjectivalSegment(segment))
    if (adjIndex > 0) {
      return [
        { partOfSpeech: firstTag, meaning: segments.slice(0, adjIndex).join('；') },
        { partOfSpeech: secondTag, meaning: segments.slice(adjIndex).join('；') }
      ]
    }
  }

  if (segments.length === 3 && /^v/i.test(firstTag) && /^n/i.test(secondTag)) {
    return [
      { partOfSpeech: firstTag, meaning: segments.slice(0, 2).join('；') },
      { partOfSpeech: secondTag, meaning: segments[2] ?? '' }
    ]
  }

  const firstKind = tagKind(firstTag)
  const secondKind = tagKind(secondTag)
  const isNounVerb = firstKind === 'noun' && secondKind === 'verb'
  const isVerbNoun = firstKind === 'verb' && secondKind === 'noun'

  if (isNounVerb && segments.length === 4) {
    const splitAt = isVerbLikeSegment(segments[2] ?? '') ? 2 : 3
    return [
      { partOfSpeech: firstTag, meaning: segments.slice(0, splitAt).join('；') },
      { partOfSpeech: secondTag, meaning: segments.slice(splitAt).join('；') }
    ]
  }

  if (isVerbNoun && segments.length === 4) {
    return [
      { partOfSpeech: firstTag, meaning: segments.slice(0, 2).join('；') },
      { partOfSpeech: secondTag, meaning: segments.slice(2).join('；') }
    ]
  }

  const aligned = alignSegmentsToTags(tags, segments)
  if (aligned.length > 0) return aligned

  const midpoint = Math.ceil(segments.length / 2)
  return [
    { partOfSpeech: firstTag, meaning: segments.slice(0, midpoint).join('；') },
    { partOfSpeech: secondTag, meaning: segments.slice(midpoint).join('；') }
  ]
}

export function splitMeaningByPartOfSpeech(partOfSpeech: string, meaning: string): WordMeaningLine[] {
  const trimmedPartOfSpeech = partOfSpeech.trim()
  const trimmedMeaning = meaning.trim()
  const tags = parsePartOfSpeechTags(trimmedPartOfSpeech)
  const segments = splitMeaningSegments(trimmedMeaning)

  if (!trimmedMeaning) {
    return tags.length > 0
      ? tags.map(tag => ({ partOfSpeech: tag, meaning: '' }))
      : [{ partOfSpeech: trimmedPartOfSpeech, meaning: '' }]
  }

  if (tags.length <= 1) {
    return [{
      partOfSpeech: tags[0] ?? trimmedPartOfSpeech,
      meaning: trimmedMeaning
    }]
  }

  if (segments.length === 1) {
    return tags.map(tag => ({ partOfSpeech: tag, meaning: trimmedMeaning }))
  }

  if (segments.length === tags.length) {
    return tags.map((tag, index) => ({
      partOfSpeech: tag,
      meaning: segments[index] ?? ''
    }))
  }

  if (tags.length === 2) {
    return splitTwoPartOfSpeech(tags, segments)
  }

  for (let size = 1; size <= Math.floor(segments.length / 2); size += 1) {
    if (segmentsEqual(segments.slice(0, size), segments.slice(size, size * 2))) {
      const firstTag = tags[0]
      if (!firstTag) break

      return [
        { partOfSpeech: firstTag, meaning: segments.slice(0, size).join('；') },
        ...splitMeaningByPartOfSpeech(tags.slice(1).join('；'), segments.slice(size).join('；'))
      ]
    }
  }

  const aligned = alignSegmentsToTags(tags, segments)
  if (aligned.length > 0) return aligned

  const chunkSize = Math.max(1, Math.floor(segments.length / tags.length))
  let offset = 0

  return tags
    .map((tag, index) => {
      const count = index === tags.length - 1 ? segments.length - offset : chunkSize
      const slice = segments.slice(offset, offset + count)
      offset += count
      return { partOfSpeech: tag, meaning: slice.join('；') }
    })
    .filter(line => line.meaning)
}
