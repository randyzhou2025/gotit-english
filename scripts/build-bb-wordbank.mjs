import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { sanitizeWordDetailTuple } from './sanitize-word-detail-fields.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const docPath = path.join(root, 'doc', '初高中英语必背词汇_2000词_3500词.xlsx')
const cdnDir = path.join(root, 'generated', 'wordbank')
const manifestPath = path.join(root, 'src', 'data', 'wordbank.manifest.json')
const generatedPath = path.join(root, 'src', 'data', 'wordbank.generated.json')

const WORDS_PER_UNIT = 50
const JUNIOR_RANDOM_SEED = 'bb-junior-random-v1'
const SENIOR_RANDOM_SEED = 'bb-senior-random-v1'

const TIER_JUNIOR_CORE = '初中核心1600'
const TIER_JUNIOR_EXT = '初中拓展400'

function clean(value) {
  return String(value ?? '').trim()
}

function normalizeWord(raw) {
  return clean(raw)
    .replace(/[（(][^）)]*[）)]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizeWordForSlug(rawWord) {
  return clean(rawWord)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*\.\.\.\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'word'
}

function stripLeadingIrregularVerbNote(meaning) {
  let result = clean(meaning)
  while (true) {
    const match = result.match(/^[（(][^）)]*,[^）)]*[a-zA-Z][^）)]*[）)]/)
    if (!match) break
    result = result.slice(match[0].length).trim()
  }
  return result
}

function computeDifficulty(word) {
  const base = word.replace(/\s+/g, '').length
  const multiPart = /[\s-]/.test(word) ? 2 : 0
  const longWord = base >= 10 ? 2 : base >= 7 ? 1 : 0
  return Math.min(5, Math.max(1, 1 + multiPart + longWord))
}

function isPhraseEntry(word) {
  return /\s/.test(clean(word))
}

function hashSeed(seed) {
  let h = 2166136261
  for (const char of seed) {
    h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  }
  return h >>> 0
}

function seededShuffle(items, seed) {
  const arr = [...items]
  let state = hashSeed(seed)
  for (let index = arr.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const swapIndex = state % (index + 1)
    ;[arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]]
  }
  return arr
}

function chunk(items, size) {
  const groups = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}

function scoreTuple(tuple) {
  let score = 0
  for (let index = 2; index <= 13; index += 1) {
    if (clean(tuple[index])) score += 1
  }
  return score
}

function unitSegment(unit) {
  return unit.key ?? String(unit.number)
}

function loadExcelWords() {
  if (!fs.existsSync(docPath)) {
    throw new Error(`Missing bb source workbook: ${docPath}`)
  }

  const workbook = XLSX.readFile(docPath)
  const sheet = workbook.Sheets['高中英语必背3500词']
  if (!sheet) {
    throw new Error('Missing sheet: 高中英语必背3500词')
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const headerRow = rows[3] ?? []
  const columns = {}
  for (const [index, cell] of headerRow.entries()) {
    const key = clean(cell)
    if (key) columns[key] = index
  }

  const cellAt = (row, name) => {
    const index = columns[name]
    if (index === undefined) return ''
    return clean(row[index])
  }

  const words = []
  for (let rowIndex = 4; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    if (!row) continue

    const english = cellAt(row, '英文')
    if (!english || english === '英文') continue

    const word = clean(english)
    if (!word || isPhraseEntry(word)) continue

    words.push({
      word,
      norm: normalizeWord(word),
      tier: cellAt(row, '层级'),
      rowNumber: rowIndex + 1,
      phonetic: cellAt(row, '音标'),
      partOfSpeech: cellAt(row, '词性'),
      meaning: stripLeadingIrregularVerbNote(cellAt(row, '中文释义')),
      exampleSentence: cellAt(row, '经典例句') || undefined,
      exampleTranslation: cellAt(row, '例句翻译') || undefined,
      commonPhrases: cellAt(row, '常用词组') || undefined,
      wordForms: cellAt(row, '词形变化') || undefined,
      etymology: cellAt(row, '词根词缀') || undefined
    })
  }

  return words
}

function loadTextbookReuseIndex() {
  const index = new Map()

  if (!fs.existsSync(cdnDir)) {
    return index
  }

  for (const fileName of fs.readdirSync(cdnDir)) {
    if (!fileName.endsWith('.json') || fileName === 'manifest.json' || fileName.startsWith('bb-')) {
      continue
    }

    const block = JSON.parse(fs.readFileSync(path.join(cdnDir, fileName), 'utf8'))
    for (const book of block.books ?? []) {
      for (const unit of book.units ?? []) {
        const segment = unitSegment(unit)
        for (const tuple of unit.words ?? []) {
          const word = clean(tuple[0])
          if (!word || isPhraseEntry(word)) continue

          const norm = normalizeWord(word)
          const slug = clean(tuple[5])
          const cdnKey = `${block.publisher.id}/${book.id}/unit-${segment}/${slug}`
          const score = scoreTuple(tuple)
          const existing = index.get(norm)
          if (!existing || score > existing.score) {
            index.set(norm, {
              tuple: tuple.slice(0, 14),
              cdnKey,
              score
            })
          }
        }
      }
    }
  }

  return index
}

function buildTupleFromExcel(entry) {
  const slug = slugify(normalizeWordForSlug(entry.word))
  return [
    entry.word,
    entry.phonetic,
    entry.partOfSpeech,
    entry.meaning,
    computeDifficulty(entry.word),
    slug,
    entry.rowNumber,
    entry.exampleSentence,
    entry.exampleTranslation,
    entry.commonPhrases,
    entry.wordForms,
    entry.etymology,
    undefined,
    undefined
  ]
}

function buildTupleForBb(entry, reuse) {
  const slug = slugify(normalizeWordForSlug(entry.word))
  if (reuse) {
    const tuple = sanitizeWordDetailTuple(reuse.tuple.map((value, index) => (
      index >= 7 ? value || undefined : value
    )))
    tuple[0] = entry.word
    tuple[5] = slug
    tuple[6] = entry.rowNumber
    tuple[14] = reuse.cdnKey
    return tuple
  }

  return sanitizeWordDetailTuple(buildTupleFromExcel(entry))
}

function trimTuple(tuple) {
  const copy = [...tuple]
  while (copy.length > 0 && (copy[copy.length - 1] === null || copy[copy.length - 1] === undefined)) {
    copy.pop()
  }
  return copy
}

function buildLexicon(entries, reuseIndex, stats) {
  const lexicon = {}

  for (const entry of entries) {
    const reuse = reuseIndex.get(entry.norm)
    if (reuse) stats.reused += 1
    else stats.new += 1

    const tuple = trimTuple(buildTupleForBb(entry, reuse))
    lexicon[tuple[5]] = tuple
  }

  return lexicon
}

function buildSlugUnits(entries, lexicon) {
  const groups = chunk(entries, WORDS_PER_UNIT)
  return groups.map((group, groupIndex) => {
    const unitNumber = groupIndex + 1
    const key = String(unitNumber).padStart(2, '0')
    const words = group.map(entry => {
      const slug = slugify(normalizeWordForSlug(entry.word))
      if (!lexicon[slug]) {
        throw new Error(`Missing lexicon entry for slug: ${slug}`)
      }
      return slug
    })

    return {
      number: unitNumber,
      key,
      label: `Unit ${unitNumber}`,
      words
    }
  })
}

function buildCompactPublisher(publisher, sourceWorkbook, entries, alphaEntries, randomEntries, reuseIndex, stats) {
  const lexicon = buildLexicon(entries, reuseIndex, stats)

  return {
    publisher,
    sourceWorkbook,
    lexicon,
    books: [
      {
        id: 'alpha',
        name: publisher.id === 'bb-junior' ? '中考2000词·顺序' : '高考3500词·顺序',
        order: 1,
        units: buildSlugUnits(alphaEntries, lexicon)
      },
      {
        id: 'random',
        name: publisher.id === 'bb-junior' ? '中考2000词·随机' : '高考3500词·随机',
        order: 2,
        units: buildSlugUnits(randomEntries, lexicon)
      }
    ]
  }
}

function countWords(block) {
  return block.books.reduce((sum, book) => (
    sum + book.units.reduce((unitSum, unit) => unitSum + unit.words.length, 0)
  ), 0)
}

function hashPublisherBlock(block) {
  return crypto.createHash('sha256').update(JSON.stringify(block)).digest('hex').slice(0, 4)
}

function buildPublisherVersionToken(block, builtAt = new Date()) {
  const wordCount = countWords(block)
  const date = builtAt.toISOString().slice(0, 10)
  const digest = hashPublisherBlock(block)
  return `${date}-w${wordCount}-${digest}`
}

function buildManifestPublisher(block) {
  return {
    publisher: block.publisher,
    sourceWorkbook: block.sourceWorkbook,
    books: block.books.map(book => ({
      id: book.id,
      name: book.name,
      order: book.order,
      units: book.units.map(unit => ({
        number: unit.number,
        key: unit.key,
        label: unit.label,
        wordCount: unit.words.length
      }))
    }))
  }
}

function main() {
  const allWords = loadExcelWords()
  const juniorWords = allWords.filter(entry => (
    entry.tier === TIER_JUNIOR_CORE || entry.tier === TIER_JUNIOR_EXT
  ))
  const reuseIndex = loadTextbookReuseIndex()

  if (juniorWords.length !== 2000) {
    throw new Error(`Expected 2000 junior words, got ${juniorWords.length}`)
  }
  if (allWords.length !== 3500) {
    throw new Error(`Expected 3500 senior words, got ${allWords.length}`)
  }

  const juniorStats = { reused: 0, new: 0 }
  const seniorStats = { reused: 0, new: 0 }

  const bbJunior = buildCompactPublisher(
    { id: 'bb-junior', name: '中考2000词' },
    path.basename(docPath),
    juniorWords,
    juniorWords,
    seededShuffle(juniorWords, JUNIOR_RANDOM_SEED),
    reuseIndex,
    juniorStats
  )

  const bbSenior = buildCompactPublisher(
    { id: 'bb-senior', name: '高考3500词' },
    path.basename(docPath),
    allWords,
    allWords,
    seededShuffle(allWords, SENIOR_RANDOM_SEED),
    reuseIndex,
    seniorStats
  )

  for (const [label, block, expectedUnits, expectedWords] of [
    ['bb-junior', bbJunior, 40, 2000],
    ['bb-senior', bbSenior, 70, 3500]
  ]) {
    const units = block.books.reduce((sum, book) => sum + book.units.length, 0)
    const words = countWords(block)
    if (units !== expectedUnits * 2) {
      throw new Error(`${label}: expected ${expectedUnits * 2} units, got ${units}`)
    }
    if (words !== expectedWords * 2) {
      throw new Error(`${label}: expected ${expectedWords * 2} word entries, got ${words}`)
    }
  }

  fs.mkdirSync(cdnDir, { recursive: true })
  fs.writeFileSync(path.join(cdnDir, 'bb-junior.json'), `${JSON.stringify(bbJunior)}\n`)
  fs.writeFileSync(path.join(cdnDir, 'bb-senior.json'), `${JSON.stringify(bbSenior)}\n`)

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  manifest.publishers = manifest.publishers.filter(entry => (
    entry.publisher.id !== 'bb-junior' && entry.publisher.id !== 'bb-senior'
  ))
  manifest.publishers.push(buildManifestPublisher(bbJunior))
  manifest.publishers.push(buildManifestPublisher(bbSenior))

  const builtAt = new Date()
  const allBlocks = manifest.publishers.map(entry => {
    if (entry.publisher.id === 'bb-junior') return bbJunior
    if (entry.publisher.id === 'bb-senior') return bbSenior
    return JSON.parse(fs.readFileSync(path.join(cdnDir, `${entry.publisher.id}.json`), 'utf8'))
  })
  manifest.version = allBlocks
    .map(block => `${block.publisher.id}:${buildPublisherVersionToken(block, builtAt)}`)
    .join('|')

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)
  fs.writeFileSync(path.join(cdnDir, 'manifest.json'), `${JSON.stringify(manifest)}\n`)

  const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'))
  generated.publishers = generated.publishers.filter(block => (
    block.publisher.id !== 'bb-junior' && block.publisher.id !== 'bb-senior'
  ))
  generated.publishers.push(bbJunior, bbSenior)
  fs.writeFileSync(generatedPath, `${JSON.stringify(generated)}\n`)

  for (const [label, block] of [['bb-junior', bbJunior], ['bb-senior', bbSenior]]) {
    const bytes = fs.statSync(path.join(cdnDir, `${label}.json`)).size
    console.log(
      `${label}: ${(bytes / 1024).toFixed(0)}KB, lexicon ${Object.keys(block.lexicon).length},`
      + ` layout entries ${countWords(block)}, reused ${label === 'bb-junior' ? juniorStats.reused : seniorStats.reused},`
      + ` new ${label === 'bb-junior' ? juniorStats.new : seniorStats.new}`
    )
  }
  console.log('textbook reuse index:', reuseIndex.size, 'unique words')
  console.log(`Updated ${path.relative(root, manifestPath)}`)
}

main()
