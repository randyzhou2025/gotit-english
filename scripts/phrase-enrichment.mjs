import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const PREPOSITIONS = new Set([
  'on', 'in', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'into',
  'through', 'over', 'under', 'between', 'without', 'within', 'during', 'before',
  'after', 'above', 'below', 'across', 'against', 'along', 'around', 'behind',
  'beyond', 'near', 'off', 'onto', 'upon', 'out', 'up', 'down', 'as'
])

const DETERMINERS = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her',
  'our', 'their', 'its', 'some', 'any', 'each', 'every', 'no', 'another', 'such'
])

const AUX_OR_LIGHT = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'has', 'have', 'had', 'do', 'does', 'did',
  'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must',
  'get', 'gets', 'got', 'getting', 'make', 'makes', 'made', 'making',
  'take', 'takes', 'took', 'taking', 'give', 'gives', 'gave', 'giving',
  'go', 'goes', 'went', 'going', 'come', 'comes', 'came', 'coming',
  'need', 'needs', 'needed', 'want', 'wants', 'wanted'
])

const PHRASE_SOURCE_FILES = [
  '高中课本/人教版高中英语教材_全7册词汇扩展版.xlsx',
  '高中课本/沪教版高中英语教材_全7册词汇扩展版.xlsx',
  '高中课本/沪外教高中英语教材_全7册词汇扩展版.xlsx',
  '高中课本/北师大版高中英语全7册_增加学习扩展字段.xlsx',
  '高中课本/译林版高中英语全7册_增加学习扩展字段.xlsx',
  '高中课本/外研社版高中英语全7册_增加学习扩展字段.xlsx'
]

/** 高频词的经典固定搭配（无例句/词库命中时的兜底） */
const CLASSIC_FALLBACKS = {
  campus: 'on campus',
  effort: 'make an effort',
  expectation: 'beyond expectations',
  schedule: 'on schedule',
  injury: 'suffer an injury',
  tradition: 'local tradition',
  apply: 'apply for sth',
  senior: 'senior students',
  stressful: 'be stressful',
  laptop: 'carry a laptop',
  hardware: 'computer hardware',
  expert: 'an expert in',
  certificate: 'receive a certificate',
  attractive: 'be attractive to',
  intend: 'intend to do sth',
  recreation: 'for recreation',
  province: 'in ... Province',
  downtown: 'go downtown',
  teen: 'teenagers',
  chat: 'have a chat',
  forward: 'look forward to',
  ahead: 'go ahead',
  besides: 'besides ...',
  sort: 'a sort of',
  quality: 'quality of sth',
  leisure: 'leisure time',
  benefit: 'benefit from',
  disease: 'suffer from a disease',
  inspiration: 'draw inspiration from',
  audience: 'target audience',
  moment: 'at the moment',
  contact: 'keep in contact with',
  organisation: 'international organisation',
  organization: 'international organization',
  favour: 'do sb a favour',
  favor: 'do sb a favor',
  licence: 'a driving licence',
  license: 'a driving license',
  endeavour: 'make every endeavour',
  endeavor: 'make every endeavor',
  mould: 'bread mould',
  mold: 'bread mold'
}

const MIN_MEANINGFUL_SCORE = 4

const CLASSIC_MODIFIERS = new Set([
  'local', 'senior', 'public', 'private', 'national', 'international', 'daily', 'human',
  'computer', 'knee', 'head', 'back', 'heart', 'physical', 'mental', 'social', 'cultural',
  'economic', 'political', 'medical', 'traditional', 'modern', 'online', 'digital', 'global',
  'personal', 'professional', 'academic', 'target', 'driving', 'bread'
])

let aggregatedPhraseBank = null

function clean(value) {
  return String(value ?? '').trim()
}

function escapeRegExp(value) {
  return clean(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function firstGloss(meaning) {
  const parts = clean(meaning)
    .split(/[；;]/)
    .map(part => part.replace(/^[（(][^）)]*[）)]\s*/, '').trim())
    .filter(Boolean)

  return (parts[0] ?? clean(meaning))
    .replace(/^[vti]+\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePos(partOfSpeech) {
  const raw = clean(partOfSpeech).split(/[；;]/)[0].toLowerCase()
  if (!raw) return ''
  if (raw.includes('adj')) return 'adj'
  if (raw.includes('adv')) return 'adv'
  if (raw.includes('prep')) return 'prep'
  if (raw.includes('conj')) return 'conj'
  if (raw.includes('pron')) return 'pron'
  if (raw.includes('n')) return 'n'
  if (raw.includes('v')) return 'v'
  return raw
}

function formatPhrase(english, gloss) {
  const phrase = clean(english)
  const note = firstGloss(gloss)
  if (!phrase) return undefined
  if (!note) return phrase
  return `${phrase}｜${note}`
}

function lemmaKey(word) {
  return clean(word).toLowerCase().replace(/[^a-z0-9' -]/g, '')
}

const NOUN_TAIL_WORDS = new Set([
  'time', 'service', 'services', 'quality', 'level', 'rate', 'control', 'management',
  'development', 'improvement', 'production', 'protection', 'education', 'training',
  'research', 'work', 'life', 'care', 'support', 'system', 'program', 'project',
  'plan', 'policy', 'rule', 'law', 'rights', 'skills', 'ability', 'experience',
  'knowledge', 'information', 'equipment', 'facilities', 'resources', 'materials',
  'issues', 'problems', 'benefits', 'effects', 'results', 'outcomes', 'changes',
  'growth', 'progress', 'success', 'failure', 'health', 'safety', 'security',
  'stress', 'pressure', 'effort', 'energy', 'power', 'strength', 'confidence',
  'interest', 'attention', 'focus', 'respect', 'trust', 'hope'
])

function withIndefiniteArticle(word) {
  return /^[aeiou]/i.test(clean(word)) ? `an ${word}` : `a ${word}`
}

function isAbstractNoun(word) {
  const key = lemmaKey(word)
  return /(?:tion|sion|ment|ness|ity|ence|ance|ure|ship|dom|hood|ism|age|ty)$/.test(key)
}

function wordFormMatches(token, word, pos) {
  const key = lemmaKey(word)
  const lower = token.toLowerCase()
  const posKind = normalizePos(pos)

  if (lower === key) return true
  if (posKind === 'n' && (lower === `${key}s` || lower === `${key}es`)) return true
  if (posKind === 'v') {
    if (lower === `${key}s` || lower === `${key}ed` || lower === `${key}ing`) return true
    if (key.endsWith('e') && lower === `${key.slice(0, -1)}ing`) return true
    if (key.endsWith('y') && lower === `${key.slice(0, -1)}ied`) return true
  }

  return false
}

function tokenizeExample(example) {
  const matches = clean(example).match(/[A-Za-z']+/g)
  return matches ?? []
}

function normalizeGeneratedPhrase(phrase) {
  return clean(phrase)
    .replace(/\bsomebody\b/gi, 'sb')
    .replace(/\bsomeone\b/gi, 'sb')
    .replace(/\bsomething\b/gi, 'sth')
    .replace(/\bone's\b/gi, "one's")
    .replace(/\s+/g, ' ')
    .trim()
}

function phraseEnglishOnly(phrase) {
  return clean(phrase).split('｜')[0]
}

function scorePhraseQuality(phrase, word, pos) {
  const english = phraseEnglishOnly(phrase).toLowerCase()
  const tokens = english.split(/\s+/).filter(Boolean)
  const key = lemmaKey(word)
  const posKind = normalizePos(pos)
  let score = 0

  if (!english || isWeakPhrase(english, word, pos)) return Number.NEGATIVE_INFINITY

  if (tokens.length === 1) {
    if (posKind === 'adv' || posKind === 'prep' || posKind === 'conj') score += 2
    else score -= 3
  }
  if (tokens.length >= 2 && tokens.length <= 5) score += 4
  if (tokens.length > 6) score -= 2

  if (tokens.some(token => PREPOSITIONS.has(token))) score += 3
  if (tokens.some(token => DETERMINERS.has(token))) score += 1
  if (/\b(sth|sb)\b/.test(english)) score += 2
  if (/^(have|has|had|make|take|give|lose|gain|build|develop|improve|keep|lack|need|show|express|boost|increase|reduce|raise|restore|regain|place|put|take|get|bring|carry|achieve|reach|meet|face|handle|deal with|suffer|experience|receive|offer|provide|apply for|look forward to|pay attention to)\b/.test(english)) {
    score += 3
  }

  if (posKind === 'adj' && tokens.includes('be')) score += 3
  if (posKind === 'v' && tokens.some(token => PREPOSITIONS.has(token))) score += 3
  if (posKind === 'n' && tokens.some(token => PREPOSITIONS.has(token))) score += 2

  if (tokens.some(token => wordFormMatches(token, word, pos))) {
    score += 1
  }

  return score
}

function isWeakPhrase(english, word, pos) {
  const phrase = normalizeGeneratedPhrase(english).toLowerCase()
  const tokens = phrase.split(/\s+/).filter(Boolean)
  const key = lemmaKey(word)
  const posKind = normalizePos(pos)

  if (!phrase) return true

  if (tokens.length === 1) {
    const token = tokens[0]
    if (token === key || token === `${key}s` || token === `${key}es`) {
      return posKind !== 'adv' && posKind !== 'prep' && posKind !== 'conj'
    }
  }

  if (tokens.length === 2) {
    const first = tokens[0]
    if (['my', 'your', 'his', 'her', 'our', 'their', 'its'].includes(first)) {
      return true
    }
  }

  const last = tokens[tokens.length - 1]
  if (AUX_OR_LIGHT.has(last) || DETERMINERS.has(last)) return true
  if (PREPOSITIONS.has(last)) {
    if (/\b(sth|sb|\.\.\.)\s*$/.test(phrase)) return false
    if (posKind === 'adj' && tokens[0] === 'be' && tokens.length === 3) return false
    if (posKind === 'v' && tokens[0] === key && tokens.length >= 3) return false
    if (tokens.length === 3 && PREPOSITIONS.has(tokens[0]) && wordFormMatches(tokens[1], word, pos)) return true
  }

  if (tokens.length >= 2 && AUX_OR_LIGHT.has(tokens[0]) && tokens.length <= 3) {
    const head = tokens.slice(1).join(' ')
    if (head === key || head === `${key}s`) return true
  }

  if (/\b(the|a|an|to|for|of|in|at|on|with|by|from)\s*$/.test(phrase)) return true
  if (phrase === `a ${key}` && isAbstractNoun(key)) return true
  if (/^a [aeiou]/.test(phrase)) return true

  return false
}

function isClassicFallbackPhrase(english, word) {
  const fallback = CLASSIC_FALLBACKS[lemmaKey(word)]
  if (!fallback) return false
  return phraseEnglishOnly(english).toLowerCase() === fallback.toLowerCase()
}

function isGenericTemplatePhrase(english, word) {
  const phrase = phraseEnglishOnly(english).toLowerCase()
  const key = lemmaKey(word)
  if (!phrase || !key) return true

  if (phrase === `a ${key}` || phrase === `an ${key}` || phrase === `the ${key}`) return true
  if (phrase === `be ${key}`) return true
  if (phrase === `${key} sth`) return true
  if (phrase === `${key}, ...`) return true

  return false
}

export function isMeaningfulPhrase(english, word, partOfSpeech) {
  const phrase = phraseEnglishOnly(english)
  const tokens = phrase.toLowerCase().split(/\s+/).filter(Boolean)
  if (!phrase || isGenericTemplatePhrase(phrase, word) || isWeakPhrase(phrase, word, partOfSpeech)) {
    return false
  }
  if (isClassicFallbackPhrase(phrase, word)) return true

  if (tokens.length === 2 && wordFormMatches(tokens[1], word, partOfSpeech) && !PREPOSITIONS.has(tokens[0])) {
    const first = tokens[0]
    const verbLike = /^(have|make|take|give|lose|gain|build|develop|improve|keep|lack|need|show|express|boost|increase|reduce|raise|restore|regain|put|get|bring|carry|achieve|reach|meet|face|handle|suffer|experience|receive|offer|provide|draw|do|pay|catch|miss|avoid|prevent|cause|create|help|support|maintain|protect|save|spend|apply|use|adopt|approve|try|attempt|manage|obtain|acquire|draw|maintain|strengthen|ruin|destroy|damage|harm|hurt|injure|kill|rescue|free|release|relieve|ease|calm|comfort|encourage|discourage|motivate|inspire|influence|affect|impact|change|alter|modify|adjust|adapt|transform|convert|move|transfer|deliver|send|publish|issue|announce|declare|state|claim|argue|prove|confirm|verify|check|test|examine|inspect|review|evaluate|assess|judge|rate|rank|score|grade|mark|measure|count|calculate|estimate|guess|predict|forecast|expect|anticipate|plan|design|prepare|arrange|organize|organise|schedule|book|reserve|order|request|ask|demand|insist|urge|persuade|convince|warn|remind|inform|notify|tell|explain|describe|introduce|present|show|demonstrate|highlight|emphasize|emphasise|stress|note|mention|refer|connect|link|associate|combine|mix|merge|join|separate|divide|split|cut|break|fix|repair|replace|remove|add|include|cover|involve|require|demand|expect|accept|reject|refuse|approve|oppose|fight|defend|attack|try|attempt|apply|receive)\b/.test(first)
    if (!CLASSIC_MODIFIERS.has(first) && !verbLike) return false
  }

  return scorePhraseQuality(phrase, word, partOfSpeech) >= MIN_MEANINGFUL_SCORE
}

function trimPhraseTokens(tokens) {
  const result = [...tokens]
  while (result.length > 1) {
    const last = result[result.length - 1].toLowerCase()
    if (PREPOSITIONS.has(last) || DETERMINERS.has(last) || AUX_OR_LIGHT.has(last)) {
      result.pop()
      continue
    }
    break
  }
  while (result.length > 1) {
    const first = result[0].toLowerCase()
    if (['according'].includes(first)) break
    if (AUX_OR_LIGHT.has(first) && !['be'].includes(first)) {
      result.shift()
      continue
    }
    break
  }
  return result
}

function findCollocationInExample(word, pos, example) {
  const text = clean(example)
  if (!text) return undefined

  const w = escapeRegExp(word)
  const posKind = normalizePos(pos)
  const candidates = []

  function add(raw, normalizer) {
    const phrase = normalizer ? normalizer(raw) : normalizeGeneratedPhrase(raw)
    if (phrase && !isWeakPhrase(phrase, word, pos)) {
      candidates.push(phrase)
    }
  }

  if (posKind === 'n') {
    for (const match of text.matchAll(new RegExp(`\\b(on|in|at|from|to|into|through|across|around|near|within|during|before|after)\\s+${w}\\b`, 'gi'))) {
      add(`${match[1].toLowerCase()} ${word}`)
    }
    for (const match of text.matchAll(new RegExp(`\\b(have|has|had|with|in|of)\\s+(?:\\w+\\s+){0,2}${w}\\b`, 'gi'))) {
      const head = match[1].toLowerCase()
      if (head === 'has' || head === 'had') add(`have ${word}`)
      else if (head === 'with') add(`with ${word}`)
      else if (head === 'in') add(`in ${word}`)
      else if (head === 'of') add(`${word} of sth`)
      else add(`have ${word}`)
    }
    for (const match of text.matchAll(new RegExp(`\\b(make|take|give|have|lose|gain|build|develop|improve|receive|offer|provide|need|require|reduce|cause|prevent|avoid|overcome|achieve|reach|meet|suffer|experience|face|handle|deal with|live up to)\\s+(?:a|an|the|\\w+\\s+)?${w}\\b`, 'gi'))) {
      add(`${match[1]} ${word}`, raw => {
        const verb = match[1].toLowerCase()
        if (['make', 'take', 'give', 'have'].includes(verb)) {
          return isAbstractNoun(word) ? `${verb} ${word}` : `${verb} ${withIndefiniteArticle(word)}`
        }
        return normalizeGeneratedPhrase(raw.replace(new RegExp(`\\b${w}\\b`, 'i'), word))
      })
    }
    for (const match of text.matchAll(new RegExp(`\\b${w}\\s+(\\w+)\\b`, 'gi'))) {
      if (NOUN_TAIL_WORDS.has(match[1].toLowerCase())) {
        add(`${word} ${match[1].toLowerCase()}`)
      }
    }
    for (const match of text.matchAll(new RegExp(`\\baccording to (?:the\\s+)?${w}\\b`, 'gi'))) {
      add(`according to the ${word}`)
    }
    for (const match of text.matchAll(new RegExp(`\\bbeyond (?:our|my|their|his|her|its|your|one's)\\s+${w}s?\\b`, 'gi'))) {
      add(`beyond one's ${word.endsWith('s') ? word : `${word}s`}`)
    }
    for (const match of text.matchAll(new RegExp(`\\bbecause of (?:a|an|the)\\s+(?:\\w+\\s+)?${w}\\b`, 'gi'))) {
      add(`because of a ... ${word}`)
    }
  }

  if (posKind === 'v') {
    for (const match of text.matchAll(new RegExp(`\\b${w}\\s+(to|for|on|with|about|from|in|at|of|into|through|over|against|off|up|down|out|around|by|as)\\b`, 'gi'))) {
      add(`${word} ${match[1].toLowerCase()} sth`)
    }
    for (const match of text.matchAll(new RegExp(`\\b${w}\\s+to\\s+\\w+\\b`, 'gi'))) {
      add(`${word} to do sth`)
    }
  }

  if (posKind === 'adj') {
    for (const match of text.matchAll(new RegExp(`\\b(is|are|was|were|be|been|being|am|seem|seems|seemed|look|looks|looked|feel|feels|felt|become|becomes|became|remain|remains|remained|stay|stays|stayed|prove|proves|proved|sound|sounds|sounded)\\s+${w}\\s+(to|for|about|of|in|on|at|with|from)\\b`, 'gi'))) {
      add(`be ${word} ${match[2].toLowerCase()} sb`)
    }
  }

  if (!candidates.length) return undefined

  const best = candidates
    .filter(candidate => isMeaningfulPhrase(candidate, word, pos))
    .sort((a, b) => scorePhraseQuality(a, word, pos) - scorePhraseQuality(b, word, pos))
    .pop()
  return best
}

function extractPhraseFromExample(word, example, pos, meaning) {
  const collocation = findCollocationInExample(word, pos, example)
  if (collocation) return formatPhrase(collocation, meaning)

  const tokens = tokenizeExample(example)
  const key = lemmaKey(word)
  const indices = []

  for (let index = 0; index < tokens.length; index += 1) {
    if (wordFormMatches(tokens[index], word, pos)) {
      indices.push(index)
    }
  }

  if (!indices.length) return undefined

  let best = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const index of indices) {
    let start = index
    let end = index

    while (start > 0 && index - start < 2) {
      const previous = tokens[start - 1].toLowerCase()
      if (PREPOSITIONS.has(previous) || DETERMINERS.has(previous) || previous === 'be') {
        start -= 1
      } else {
        break
      }
    }

    while (end < tokens.length - 1 && end - index < 1) {
      const next = tokens[end + 1].toLowerCase()
      if (PREPOSITIONS.has(next)) {
        end += 1
      } else {
        break
      }
    }

    const slice = trimPhraseTokens(tokens.slice(start, end + 1))
    const normalized = normalizeGeneratedPhrase(slice.join(' '))
    const candidateScore = scorePhraseQuality(normalized, word, pos)
    if (candidateScore > bestScore) {
      bestScore = candidateScore
      best = normalized
    }
  }

  if (!best || !isMeaningfulPhrase(best, word, pos)) return undefined
  return formatPhrase(best, meaning)
}

function expandPhraseLines(phrase) {
  return clean(phrase)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function pickBestPhrase(candidates, word, pos) {
  return candidates
    .flatMap(candidate => expandPhraseLines(candidate))
    .filter(candidate => isMeaningfulPhrase(candidate, word, pos))
    .sort((a, b) => scorePhraseQuality(a, word, pos) - scorePhraseQuality(b, word, pos))
    .pop()
}

function loadAggregatedPhraseBank(root) {
  if (aggregatedPhraseBank) return aggregatedPhraseBank

  aggregatedPhraseBank = new Map()

  for (const relativePath of PHRASE_SOURCE_FILES) {
    const sourcePath = path.join(root, 'doc', relativePath)
    if (!fs.existsSync(sourcePath)) continue

    const workbook = XLSX.readFile(sourcePath)
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) continue

      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      const headerRowIndex = rows.findIndex(row => clean(row[0]) === '单元' && clean(row[1]) === '英文')
      if (headerRowIndex < 0) continue

      const columns = {}
      for (const [index, cell] of rows[headerRowIndex].entries()) {
        const key = clean(cell)
        if (key) columns[key] = index
      }

      for (const row of rows.slice(headerRowIndex + 1)) {
        const word = clean(row[columns['英文']])
        const phrase = clean(row[columns['常用词组']])
        if (!word || !phrase) continue

        const key = lemmaKey(word)
        const partOfSpeech = clean(row[columns['词性']])
        const best = pickBestPhrase([phrase, aggregatedPhraseBank.get(key)].filter(Boolean), word, partOfSpeech)
        if (best) aggregatedPhraseBank.set(key, best)
      }
    }
  }

  return aggregatedPhraseBank
}

export function getAggregatedPhraseBank(root) {
  return loadAggregatedPhraseBank(root)
}

export function suggestClassicPhrase(root, word, partOfSpeech, meaning, exampleSentence) {
  const phraseBank = loadAggregatedPhraseBank(root)
  const key = lemmaKey(word)
  const bankPhrase = phraseBank.get(key)
  if (bankPhrase && isMeaningfulPhrase(bankPhrase, word, partOfSpeech)) {
    return bankPhrase.includes('｜') ? bankPhrase : formatPhrase(bankPhrase, meaning)
  }

  if (/\s/.test(word)) {
    return formatPhrase(word, firstGloss(meaning))
  }

  const extracted = extractPhraseFromExample(word, exampleSentence, partOfSpeech, meaning)
  if (extracted && isMeaningfulPhrase(extracted, word, partOfSpeech)) {
    return extracted
  }

  const fallback = CLASSIC_FALLBACKS[key]
  if (fallback) return formatPhrase(fallback, meaning)

  return undefined
}

export function enrichMissingPhrase(root, tuple) {
  const word = tuple[0]
  const partOfSpeech = tuple[2]
  const meaning = tuple[3]
  const exampleSentence = tuple[7]
  const existing = tuple[9]

  if (existing && !isMeaningfulPhrase(existing, word, partOfSpeech)) {
    tuple[9] = undefined
  }

  if (tuple[9]) return tuple

  const phrase = suggestClassicPhrase(root, word, partOfSpeech, meaning, exampleSentence)
  if (phrase && isMeaningfulPhrase(phrase, word, partOfSpeech)) {
    tuple[9] = phrase
  }

  return tuple
}
