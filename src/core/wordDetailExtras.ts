export interface WordDetailPhraseLine {
  phrase: string
  gloss?: string
}

export interface WordDetailMemoryLine {
  label: '词根词缀' | '同源词' | '反义词'
  text: string
}

const WORD_FORM_PLACEHOLDER_PATTERNS = [
  /^通常无规则比较级和最高级$/,
  /^通常不作词形变化$/,
  /^通常无比较级和最高级$/,
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

export function isWordFormPlaceholderLine(line: string): boolean {
  const text = line.trim()
  if (!text) return true
  if (CONCRETE_FORM_PATTERN.test(text)) return false
  if (WORD_FORM_PLACEHOLDER_PATTERNS.some(pattern => pattern.test(text))) return true
  if (/^[a-z]+\.\s*通常无比较级和最高级$/.test(text)) return true
  if (/^[a-z]+\.\s*；?\s*通常/.test(text)) return true
  if (/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.)\s*通常/.test(text)) return true
  if (/^通常/.test(text) && !/[：:]\s*\S/.test(text)) return true
  return false
}

export function parseWordDetailPhrases(value?: string): WordDetailPhraseLine[] {
  if (!value?.trim()) return []

  return value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const separator = line.includes('｜') ? '｜' : line.includes('|') ? '|' : null
      if (!separator) return { phrase: line }

      const [phrase, gloss] = line.split(separator).map(part => part.trim())
      if (!phrase) return null
      return { phrase, gloss: gloss || undefined }
    })
    .filter((line): line is WordDetailPhraseLine => line !== null)
}

export function parseWordDetailWordForms(value?: string): string[] {
  if (!value?.trim()) return []

  return value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line && !isWordFormPlaceholderLine(line))
}

export function buildWordDetailMemoryLines(entry: {
  etymology?: string
  cognates?: string
  antonyms?: string
}): WordDetailMemoryLine[] {
  const lines: WordDetailMemoryLine[] = []

  const etymology = entry.etymology?.trim()
  if (etymology) {
    lines.push({ label: '词根词缀', text: etymology })
  }

  for (const text of splitMemoryLines(entry.cognates)) {
    lines.push({ label: '同源词', text })
  }

  for (const text of splitMemoryLines(entry.antonyms)) {
    lines.push({ label: '反义词', text })
  }

  return lines
}

function splitMemoryLines(value?: string): string[] {
  if (!value?.trim()) return []
  return value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
}
