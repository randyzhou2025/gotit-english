const STORED_PHRASE_PLACEHOLDER = /^—[（(]暂无高价值固定搭配[）)]$/

const STORED_ETYMOLOGY_PLACEHOLDERS = [
  /^—[（(]基础词或无高价值常用拆分[）)]$/,
  /^—[（(]基础词，无明显常用词根词缀拆分[）)]$/
]

const WORD_FORM_PLACEHOLDER_PATTERNS = [
  /^通常无规则比较级和最高级$/,
  /^通常不作词形变化$/,
  /^通常无比较级和最高级$/,
  /^通常无固定词形变化$/,
  /^通常不单独发生词形变化$/,
  /^通常用复数形式$/,
  /^通常作不可数名词，无复数形式$/,
  /^通常作复数或不可数名词使用$/,
  /^固定短语；通常不作词形变化$/,
  /^缩写形式；通常不作词形变化$/,
  /^副词；通常不作词形变化$/,
  /^介词；通常不作词形变化$/,
  /^连词；通常不作词形变化$/,
  /^专有名词；通常不作词形变化$/,
  /^构词成分；通常不单独发生词形变化$/
]

const CONCRETE_FORM_PATTERN = /(?:复数|第三人称单数|现在分词|过去式|过去分词|比较级|最高级|单数)[：:]\s*\S+/i

function clean(value) {
  return String(value ?? '').trim()
}

export function isStoredPhrasePlaceholder(value) {
  const text = clean(value)
  if (!text) return true
  return STORED_PHRASE_PLACEHOLDER.test(text)
}

export function isStoredWordFormPlaceholder(value) {
  const text = clean(value)
  if (!text) return true
  if (CONCRETE_FORM_PATTERN.test(text)) return false
  if (WORD_FORM_PLACEHOLDER_PATTERNS.some(pattern => pattern.test(text))) return true
  if (/^[a-z]+\.\s*通常无比较级和最高级$/.test(text)) return true
  if (/^[a-z]+\.\s*；?\s*通常/.test(text)) return true
  if (/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.)\s*通常/.test(text)) return true
  if (/^通常/.test(text) && !/[：:]\s*\S/.test(text)) return true
  return false
}

export function isStoredMemoryPlaceholder(value) {
  const text = clean(value)
  if (!text) return true
  if (STORED_ETYMOLOGY_PLACEHOLDERS.some(pattern => pattern.test(text))) return true
  if (/^—[（(].*(?:暂无|无高价值|基础词)[^）)]*[）)]$/.test(text)) return true
  return false
}

export function sanitizeWordDetailTuple(tuple) {
  const word = tuple[0]
  const partOfSpeech = tuple[2]
  const copy = [...tuple]

  if (isStoredPhrasePlaceholder(copy[9])) copy[9] = undefined
  if (isStoredWordFormPlaceholder(copy[10])) copy[10] = undefined
  if (isStoredMemoryPlaceholder(copy[11])) copy[11] = undefined
  if (isStoredMemoryPlaceholder(copy[12])) copy[12] = undefined
  if (isStoredMemoryPlaceholder(copy[13])) copy[13] = undefined

  return copy
}
