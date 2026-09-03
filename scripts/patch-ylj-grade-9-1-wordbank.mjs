import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { enrichMissingPhrase } from './phrase-enrichment.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publisherId = 'ylj'
const bookId = 'grade-9-1'
const bookName = '九年级上册'
const newWorkbookPath = path.join(
  root,
  'doc',
  '初中课本',
  '译林版',
  '译林版初中英语九年级上册_词汇表_新版.xlsx'
)
const extensionFile = path.join(root, 'doc', '初中课本', '译林版初中英语全6册_增加学习扩展字段.xlsx')
const yljPath = path.join(root, 'generated', 'wordbank', 'ylj.json')
const generatedPath = path.join(root, 'src', 'data', 'wordbank.generated.json')
const manifestPath = path.join(root, 'src', 'data', 'wordbank.manifest.json')

function clean(value) {
  return String(value ?? '').trim()
}

function optionalField(value) {
  return clean(value) || undefined
}

function isPhraseEntry(word) {
  return /\s/.test(clean(word))
}

function normalizeWordKey(rawWord) {
  return clean(rawWord)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*\.\.\.\s*/g, ' ')
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

function parseUnit(rawUnit) {
  const unitNumber = Number(String(rawUnit).match(/\d+/)?.[0] || 0)
  if (!unitNumber) throw new Error(`Unsupported unit label: ${rawUnit}`)
  return {
    number: unitNumber,
    key: String(unitNumber),
    label: `Unit ${unitNumber}`
  }
}

function buildColumnIndex(headerRow) {
  const columns = {}
  for (const [index, cell] of headerRow.entries()) {
    const key = clean(cell)
    if (key) columns[key] = index
  }
  return columns
}

function cell(row, columns, name) {
  const index = columns[name]
  if (index === undefined) return ''
  return clean(row[index])
}

function buildWordTuple(row, columns, rowNumber, word, slug) {
  return [
    word,
    cell(row, columns, '音标'),
    cell(row, columns, '词性'),
    stripLeadingIrregularVerbNote(cell(row, columns, '释义')),
    computeDifficulty(word),
    slug,
    rowNumber,
    optionalField(cell(row, columns, '经典例句')),
    optionalField(cell(row, columns, '例句翻译')),
    optionalField(cell(row, columns, '常用词组')),
    optionalField(cell(row, columns, '词形变化')),
    optionalField(cell(row, columns, '词根词缀')),
    optionalField(cell(row, columns, '同源词')),
    optionalField(cell(row, columns, '反义词'))
  ]
}

function applyExtension(tuple, extension) {
  if (!extension) return tuple
  if (!tuple[7] && extension.exampleSentence) tuple[7] = extension.exampleSentence
  if (!tuple[8] && extension.exampleTranslation) tuple[8] = extension.exampleTranslation
  if (!tuple[9] && extension.commonPhrases) tuple[9] = extension.commonPhrases
  if (!tuple[10] && extension.wordForms) tuple[10] = extension.wordForms
  if (!tuple[11] && extension.etymology) tuple[11] = extension.etymology
  if (!tuple[12] && extension.cognates) tuple[12] = extension.cognates
  if (!tuple[13] && extension.antonyms) tuple[13] = extension.antonyms
  return tuple
}

function buildExtensionLookup() {
  if (!fs.existsSync(extensionFile)) return new Map()

  const workbook = XLSX.readFile(extensionFile)
  const sheet = workbook.Sheets[bookName]
  if (!sheet) return new Map()

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const headerRowIndex = rows.findIndex(row => clean(row[0]) === '单元' && clean(row[1]) === '英文')
  if (headerRowIndex < 0) return new Map()

  const columns = buildColumnIndex(rows[headerRowIndex] ?? [])
  const lookup = new Map()

  for (const row of rows.slice(headerRowIndex + 1)) {
    const word = cell(row, columns, '英文')
    if (!word || isPhraseEntry(word)) continue

    const unitMeta = parseUnit(row[columns['单元'] ?? 0])
    lookup.set(`${unitMeta.number}:${normalizeWordKey(word)}`, {
      exampleSentence: optionalField(cell(row, columns, '经典例句')),
      exampleTranslation: optionalField(cell(row, columns, '例句翻译')),
      commonPhrases: optionalField(cell(row, columns, '常用词组')),
      wordForms: optionalField(cell(row, columns, '词形变化')),
      etymology: optionalField(cell(row, columns, '词根词缀')),
      cognates: optionalField(cell(row, columns, '同源词')),
      antonyms: optionalField(cell(row, columns, '反义词'))
    })
  }

  return lookup
}

function loadNewEditionRows() {
  if (!fs.existsSync(newWorkbookPath)) {
    throw new Error(`Missing workbook: ${newWorkbookPath}`)
  }

  const workbook = XLSX.readFile(newWorkbookPath)
  const sheet = workbook.Sheets[bookName]
  if (!sheet) throw new Error(`Missing sheet: ${bookName}`)

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const headerRowIndex = rows.findIndex(row => clean(row[0]) === '单元' && clean(row[1]) === '英文')
  if (headerRowIndex < 0) throw new Error('Could not find header row')

  const columns = buildColumnIndex(rows[headerRowIndex] ?? [])
  const entries = []

  for (const [rowIndex, row] of rows.slice(headerRowIndex + 1).entries()) {
    const word = cell(row, columns, '英文')
    const meaning = cell(row, columns, '释义')
    if (!word && !meaning) continue
    if (!word || !meaning) {
      throw new Error(`Row ${headerRowIndex + rowIndex + 2} has incomplete word data`)
    }
    if (isPhraseEntry(word)) continue

    entries.push({
      unitMeta: parseUnit(row[columns['单元'] ?? 0]),
      row,
      columns,
      rowNumber: headerRowIndex + rowIndex + 2,
      word,
      norm: normalizeWordKey(word)
    })
  }

  return entries
}

function cloneTuple(tuple) {
  return tuple.map(value => value ?? undefined)
}

function preserveAudioForMovedWord(tuple, previousUnitKey, nextUnitKey) {
  const copy = cloneTuple(tuple)
  if (previousUnitKey && previousUnitKey !== nextUnitKey) {
    copy[14] = `${publisherId}/${bookId}/unit-${previousUnitKey}/${copy[5]}`
  }
  return copy
}

function trimTuple(tuple) {
  const copy = [...tuple]
  while (copy.length > 0 && (copy[copy.length - 1] === null || copy[copy.length - 1] === undefined)) {
    copy.pop()
  }
  return copy
}

function indexExistingBook(book) {
  const byNorm = new Map()

  for (const unit of book.units ?? []) {
    for (const tuple of unit.words ?? []) {
      byNorm.set(normalizeWordKey(tuple[0]), {
        tuple: cloneTuple(tuple),
        unitKey: unit.key ?? String(unit.number)
      })
    }
  }

  return byNorm
}

function buildUpdatedBook(existingBook, newRows, extensionLookup) {
  const existingByNorm = indexExistingBook(existingBook)
  const activeNorms = new Set(newRows.map(entry => entry.norm))
  const units = []
  const unitMap = new Map()
  const stats = {
    kept: 0,
    added: 0,
    moved: 0,
    retired: 0
  }

  for (const entry of newRows) {
    if (!unitMap.has(entry.unitMeta.key)) {
      const unit = {
        number: entry.unitMeta.number,
        key: entry.unitMeta.key,
        label: entry.unitMeta.label,
        words: [],
        retiredWords: []
      }
      unitMap.set(entry.unitMeta.key, unit)
      units.push(unit)
    }

    const targetUnit = unitMap.get(entry.unitMeta.key)
    const existing = existingByNorm.get(entry.norm)
    if (existing) {
      stats.kept += 1
      if (existing.unitKey !== entry.unitMeta.key) stats.moved += 1
      targetUnit.words.push(trimTuple(
        preserveAudioForMovedWord(existing.tuple, existing.unitKey, entry.unitMeta.key)
      ))
      continue
    }

    stats.added += 1
    const slug = slugify(normalizeWordForSlug(entry.word))
    const tuple = applyExtension(
      buildWordTuple(entry.row, entry.columns, entry.rowNumber, entry.word, slug),
      extensionLookup.get(`${entry.unitMeta.number}:${entry.norm}`)
    )
    enrichMissingPhrase(root, tuple)
    targetUnit.words.push(trimTuple(tuple))
  }

  for (const unit of existingBook.units ?? []) {
    const retiredWords = []
    for (const tuple of unit.words ?? []) {
      const norm = normalizeWordKey(tuple[0])
      if (activeNorms.has(norm)) continue
      retiredWords.push(cloneTuple(tuple))
      stats.retired += 1
    }

    const targetUnit = unitMap.get(unit.key ?? String(unit.number))
    if (targetUnit) {
      if (retiredWords.length > 0) targetUnit.retiredWords = retiredWords
      continue
    }

    if (retiredWords.length === 0) continue

    units.push({
      number: unit.number,
      key: unit.key,
      label: unit.label,
      words: [],
      retiredWords
    })
  }

  return {
    book: {
      ...existingBook,
      units: units.sort((left, right) => left.number - right.number)
    },
    stats
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
  return `${date}-w${wordCount}-${hashPublisherBlock(block)}`
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
        ...(unit.key ? { key: unit.key } : {}),
        ...(unit.label ? { label: unit.label } : {}),
        wordCount: unit.words.length
      }))
    }))
  }
}

function updateManifest(manifest, block) {
  const builtAt = new Date()
  const publishers = manifest.publishers.map(entry => (
    entry.publisher.id === publisherId ? buildManifestPublisher(block) : entry
  ))
  const allBlocks = JSON.parse(fs.readFileSync(generatedPath, 'utf8')).publishers
  const version = allBlocks
    .map(item => `${item.publisher.id}:${buildPublisherVersionToken(
      item.publisher.id === publisherId ? block : item,
      builtAt
    )}`)
    .join('|')

  return { version, publishers }
}

function main() {
  const ylj = JSON.parse(fs.readFileSync(yljPath, 'utf8'))
  const bookIndex = ylj.books.findIndex(book => book.id === bookId)
  if (bookIndex < 0) throw new Error(`Missing book ${bookId} in ${yljPath}`)

  const extensionLookup = buildExtensionLookup()
  const newRows = loadNewEditionRows()
  const { book, stats } = buildUpdatedBook(ylj.books[bookIndex], newRows, extensionLookup)
  ylj.books[bookIndex] = book

  fs.writeFileSync(yljPath, `${JSON.stringify(ylj)}\n`)

  const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'))
  const generatedIndex = generated.publishers.findIndex(item => item.publisher.id === publisherId)
  generated.publishers[generatedIndex] = ylj
  fs.writeFileSync(generatedPath, `${JSON.stringify(generated)}\n`)

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const nextManifest = updateManifest(manifest, ylj)
  fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest)}\n`)
  fs.writeFileSync(path.join(root, 'generated', 'wordbank', 'manifest.json'), `${JSON.stringify(nextManifest)}\n`)

  console.log(`${bookName} updated: kept ${stats.kept}, added ${stats.added}, moved ${stats.moved}, retired ${stats.retired}`)
  console.log(`Active words: ${book.units.reduce((sum, unit) => sum + unit.words.length, 0)}`)
  console.log(`Retired words: ${book.units.reduce((sum, unit) => sum + (unit.retiredWords?.length ?? 0), 0)}`)
  for (const unit of book.units) {
    console.log(`  ${unit.label}: ${unit.words.length} active${unit.retiredWords?.length ? `, ${unit.retiredWords.length} retired` : ''}`)
  }
}

main()
