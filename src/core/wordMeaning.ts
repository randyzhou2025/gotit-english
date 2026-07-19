export interface WordMeaningLine {
  partOfSpeech: string
  meaning: string
}

const VERB_LIKE_SEGMENT = /(?:做|化|定|与……|使|让|给|把|被|挨|受|成$|出$|束$|述$|牢$|进$|动$)/

export function parsePartOfSpeechTags(partOfSpeech: string): string[] {
  return partOfSpeech
    .split(/[;；]/)
    .map(tag => tag.trim())
    .filter(Boolean)
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
  return VERB_LIKE_SEGMENT.test(segment)
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

  if (segments.length === 3 && /^n/i.test(firstTag) && /adj/i.test(secondTag)) {
    return [
      { partOfSpeech: firstTag, meaning: segments[0] ?? '' },
      { partOfSpeech: secondTag, meaning: segments.slice(1).join('；') }
    ]
  }

  if (segments.length === 3 && /^v/i.test(firstTag) && /^n/i.test(secondTag)) {
    return [
      { partOfSpeech: firstTag, meaning: segments.slice(0, 2).join('；') },
      { partOfSpeech: secondTag, meaning: segments[2] ?? '' }
    ]
  }

  const joinedTags = tags.join('; ')
  const isNounVerb = /^n\.?\s*;?\s*v/i.test(joinedTags)
  const isVerbNoun = /^v\.?\s*;?\s*n/i.test(joinedTags)

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

  const chunkSize = Math.floor(segments.length / tags.length)
  let offset = 0

  return tags.map((tag, index) => {
    const count = index === tags.length - 1 ? segments.length - offset : chunkSize
    const slice = segments.slice(offset, offset + count)
    offset += count
    return { partOfSpeech: tag, meaning: slice.join('；') }
  })
}
