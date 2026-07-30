import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outputPath = path.join(root, 'src', 'data', 'wordbank.generated.json')

const bookIds = [
  ['必修第一册', 'required-1'],
  ['必修第二册', 'required-2'],
  ['必修第三册', 'required-3'],
  ['选择性必修第一册', 'selective-required-1'],
  ['选择性必修第二册', 'selective-required-2'],
  ['选择性必修第三册', 'selective-required-3'],
  ['选择性必修第四册', 'selective-required-4']
]

const swjSheetMeta = [
  ['必修第一册', 'required-1'],
  ['必修第二册', 'required-2'],
  ['必修第三册', 'required-3'],
  ['选必第一册', 'selective-required-1'],
  ['选必第二册', 'selective-required-2'],
  ['选必第三册', 'selective-required-3'],
  ['选必第四册', 'selective-required-4']
]

const rjBookIds = bookIds

const rjJuniorDir = path.join('初中课本', '人教版')
const rjJuniorBookMeta = [
  ['人教版初中英语七年级上册_词汇表.xlsx', '七年级上册', 'grade-7-1'],
  ['人教版初中英语七年级下册_词汇表.xlsx', '七年级下册', 'grade-7-2'],
  ['人教版初中英语八年级上册_词汇表.xlsx', '八年级上册', 'grade-8-1'],
  ['人教版初中英语八年级下册_词汇表.xlsx', '八年级下册', 'grade-8-2'],
  ['人教版初中英语九年级全一册_词汇表.xlsx', '九年级全一册', 'grade-9']
]

const kpJuniorDir = path.join('初中课本', '科普版')
const kpJuniorBookMeta = [
  ['科普版初中英语七年级上册_词汇表.xlsx', '七年级上册', 'grade-7-1'],
  ['科普版初中英语七年级下册_词汇表.xlsx', '七年级下册', 'grade-7-2'],
  ['科普版初中英语八年级上册_词汇表.xlsx', '八年级上册', 'grade-8-1'],
  ['科普版初中英语八年级下册_词汇表.xlsx', '八年级下册', 'grade-8-2'],
  ['科普版初中英语九年级上册_词汇表.xlsx', '九年级上册', 'grade-9-1'],
  ['科普版初中英语九年级下册_词汇表.xlsx', '九年级下册', 'grade-9-2']
]

const yljJuniorDir = path.join('初中课本', '译林版')
const yljJuniorBookMeta = [
  ['译林版初中英语七年级上册_词汇表.xlsx', '七年级上册', 'grade-7-1'],
  ['译林版初中英语七年级下册_词汇表.xlsx', '七年级下册', 'grade-7-2'],
  ['译林版初中英语八年级上册_词汇表.xlsx', '八年级上册', 'grade-8-1'],
  ['译林版初中英语八年级下册_词汇表.xlsx', '八年级下册', 'grade-8-2'],
  ['译林版初中英语九年级上册_词汇表.xlsx', '九年级上册', 'grade-9-1'],
  ['译林版初中英语九年级下册_词汇表.xlsx', '九年级下册', 'grade-9-2']
]

const shjxJuniorDir = path.join('初中课本', '沪教版(上海新版)')
const shjxJuniorBookMeta = [
  ['沪教版（上海新版）初中英语六年级上册_词汇表.xlsx', '六年级上册', 'grade-6-1'],
  ['沪教版（上海新版）初中英语六年级下册_词汇表.xlsx', '六年级下册', 'grade-6-2'],
  ['沪教版（上海新版）初中英语七年级上册_词汇表.xlsx', '七年级上册', 'grade-7-1'],
  ['沪教版（上海新版）初中英语七年级下册_词汇表.xlsx', '七年级下册', 'grade-7-2'],
  ['沪教版（上海新版）初中英语八年级上册_词汇表.xlsx', '八年级上册', 'grade-8-1'],
  ['沪教版（上海新版）初中英语八年级下册_词汇表.xlsx', '八年级下册', 'grade-8-2']
]

const wyxJuniorDir = path.join('初中课本', '外研社版（新版）')
const wyxJuniorBookMeta = [
  ['外研社版（新版）初中英语七年级上册_词汇表.xlsx', '七年级上册', 'grade-7-1'],
  ['外研社版(新版)初中英语七年级下册_词汇表.xlsx', '七年级下册', 'grade-7-2'],
  ['外研社版(新版)初中英语八年级上册_词汇表.xlsx', '八年级上册', 'grade-8-1'],
  ['外研社版(新版)初中英语八年级下册_词汇表.xlsx', '八年级下册', 'grade-8-2']
]

const swjSourceFile = '沪外教高中英语教材_全7册词汇扩展版.xlsx'
const rjSourceFile = '人教版高中英语教材_全7册词汇扩展版.xlsx'
const shjSourceFile = '沪教版高中英语教材_全7册词汇扩展版.xlsx'
const shjExampleFallbackFile = '沪教版高中英语教材_Words_by_unit汇总_终版_增加经典例句及翻译.xlsx'
const bsdSourceFile = path.join('高中课本', '北师大版高中英语全7册_词汇表.xlsx')
const yljSourceFile = path.join('高中课本', '译林版高中英语全7册_词汇表.xlsx')
const wySourceFile = path.join('高中课本', '外研社版高中英语全7册_词汇表.xlsx')

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

function optionalField(value) {
  return clean(value) || undefined
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

function buildShjExampleLookup() {
  const sourcePath = path.join(root, 'doc', shjExampleFallbackFile)
  if (!fs.existsSync(sourcePath)) return new Map()

  const workbook = XLSX.readFile(sourcePath)
  const lookup = new Map()

  for (const [sheetName, bookId] of bookIds) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    for (const row of rows.slice(3)) {
      const unitNumber = toUnitNumber(row[0])
      const word = clean(row[1])
      if (!unitNumber || !word) continue

      const exampleSentence = clean(row[5])
      const exampleTranslation = clean(row[6])
      if (!exampleSentence && !exampleTranslation) continue

      lookup.set(`${bookId}:${unitNumber}:${word.toLowerCase()}`, {
        exampleSentence,
        exampleTranslation
      })
    }
  }

  return lookup
}

function clean(value) {
  return String(value ?? '').trim()
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

function isPhraseEntry(word) {
  return /\s/.test(clean(word))
}

function toUnitNumber(value) {
  const raw = clean(value)
  const match = raw.match(/\d+/)
  return match ? Number(match[0]) : 0
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

function computeDifficulty(word) {
  const base = word.replace(/\s+/g, '').length
  const multiPart = /[\s-]/.test(word) ? 2 : 0
  const longWord = base >= 10 ? 2 : base >= 7 ? 1 : 0
  return Math.min(5, Math.max(1, 1 + multiPart + longWord))
}

function parseRjUnit(rawUnit) {
  const unitLabel = clean(rawUnit)
  const lower = unitLabel.toLowerCase()

  if (lower.includes('welcome')) {
    return { number: 0, key: 'welcome', label: 'Welcome Unit' }
  }

  const unitNumber = toUnitNumber(unitLabel)
  if (!unitNumber) {
    throw new Error(`Unsupported unit label: ${unitLabel}`)
  }

  return {
    number: unitNumber,
    key: String(unitNumber),
    label: `Unit ${unitNumber}`
  }
}

function normalizeWordForSlug(rawWord) {
  return clean(rawWord)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*\.\.\.\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSwjUnits(rawUnit) {
  const raw = clean(rawUnit)
  const parts = raw.split(/[;；]/).map(part => part.trim()).filter(Boolean)

  if (parts.length === 0) {
    throw new Error(`Unsupported unit value: ${rawUnit}`)
  }

  return parts.map(part => parseNumericUnit(part))
}

function parseNumericUnit(rawUnit) {
  const unitNumber = toUnitNumber(rawUnit)
  if (!unitNumber) {
    throw new Error(`Unsupported unit value: ${rawUnit}`)
  }

  return {
    number: unitNumber,
    key: String(unitNumber),
    label: `Unit ${unitNumber}`
  }
}

function parseWyxUnit(rawUnit) {
  const unitLabel = clean(rawUnit)
  if (/^starter$/i.test(unitLabel)) {
    return {
      number: 0,
      key: 'starter',
      label: 'Starter'
    }
  }

  return parseNumericUnit(unitLabel)
}

function findJuniorHeaderRowIndex(rows) {
  for (let index = 0; index < Math.min(rows.length, 8); index += 1) {
    const columns = buildColumnIndex(rows[index] ?? [])
    if (columns['单元'] != null && columns['英文'] != null && columns['释义'] != null) {
      return index
    }
  }

  throw new Error('Could not find header row with 单元/英文/释义 columns')
}

function unitSortKey(unit) {
  return unit.number
}

function upsertUnit(units, unitMeta) {
  const existing = units.find(unit => unit.key === unitMeta.key)
  if (existing) return existing

  const unit = {
    number: unitMeta.number,
    key: unitMeta.key,
    label: unitMeta.label,
    words: []
  }
  units.push(unit)
  return unit
}

function buildShjPublisher() {
  const sourcePath = path.join(root, 'doc', shjSourceFile)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source workbook: ${sourcePath}`)
  }

  const workbook = XLSX.readFile(sourcePath)
  const exampleLookup = buildShjExampleLookup()
  const books = []

  for (const [bookIndex, [sheetName, bookId]] of bookIds.entries()) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      throw new Error(`Missing sheet: ${sheetName}`)
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    const columns = buildColumnIndex(rows[2] ?? [])
    const units = []

    for (const [rowIndex, row] of rows.slice(3).entries()) {
      const unitMeta = parseNumericUnit(row[columns['单元'] ?? 0])
      const word = clean(row[columns['英文'] ?? 1])
      const meaning = cell(row, columns, '释义')
      if (!word && !meaning) continue

      if (!word || !meaning) {
        throw new Error(`${sheetName} row ${rowIndex + 4} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const targetUnit = upsertUnit(units, unitMeta)
      const wordSlug = slugify(word)
      const tuple = buildWordTuple(row, columns, rowIndex + 4, word, wordSlug)
      const fallback = exampleLookup.get(`${bookId}:${unitMeta.number}:${word.toLowerCase()}`)
      if (fallback) {
        if (!tuple[7]) tuple[7] = fallback.exampleSentence || undefined
        if (!tuple[8]) tuple[8] = fallback.exampleTranslation || undefined
      }
      targetUnit.words.push(tuple)
    }

    books.push({
      id: bookId,
      name: sheetName,
      order: bookIndex + 1,
      units: units.sort((a, b) => unitSortKey(a) - unitSortKey(b))
    })
  }

  return {
    publisher: { id: 'shj', name: '沪教版' },
    sourceWorkbook: path.basename(sourcePath),
    books
  }
}

function buildSwjPublisher() {
  const sourcePath = path.join(root, 'doc', swjSourceFile)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source workbook: ${sourcePath}`)
  }

  const workbook = XLSX.readFile(sourcePath)
  const books = []

  for (const [bookIndex, [sheetName, bookId]] of swjSheetMeta.entries()) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      throw new Error(`Missing sheet: ${sheetName}`)
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    const columns = buildColumnIndex(rows[2] ?? [])
    const units = []

    for (const [rowIndex, row] of rows.slice(3).entries()) {
      const word = cell(row, columns, '英文')
      const meaning = cell(row, columns, '释义')
      if (!word && !meaning) continue
      if (!word || !meaning) {
        throw new Error(`${sheetName} row ${rowIndex + 4} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const wordSlug = slugify(normalizeWordForSlug(word))
      for (const unitMeta of parseSwjUnits(row[columns['单元'] ?? 0])) {
        const targetUnit = upsertUnit(units, unitMeta)
        targetUnit.words.push(buildWordTuple(row, columns, rowIndex + 4, word, wordSlug))
      }
    }

    books.push({
      id: bookId,
      name: sheetName.replace(/^选必/, '选择性必修'),
      order: bookIndex + 1,
      units: units.sort((a, b) => unitSortKey(a) - unitSortKey(b))
    })
  }

  return {
    publisher: { id: 'swj', name: '沪外教版' },
    sourceWorkbook: path.basename(sourcePath),
    books
  }
}

function buildJuniorBooksFromDir(relativeDir, bookMeta, parseUnit) {
  const books = []

  for (const [bookIndex, [fileName, bookName, bookId]] of bookMeta.entries()) {
    const sourcePath = path.join(root, 'doc', relativeDir, fileName)
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing source workbook: ${sourcePath}`)
    }

    const workbook = XLSX.readFile(sourcePath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      throw new Error(`Missing sheet in ${fileName}`)
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    const headerRowIndex = findJuniorHeaderRowIndex(rows)
    const columns = buildColumnIndex(rows[headerRowIndex] ?? [])
    const units = []

    for (const [rowIndex, row] of rows.slice(headerRowIndex + 1).entries()) {
      const word = cell(row, columns, '英文')
      const meaning = cell(row, columns, '释义')
      if (!word && !meaning) continue

      if (!word || !meaning) {
        throw new Error(`${bookName} row ${headerRowIndex + rowIndex + 2} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const unitMeta = parseUnit(row[columns['单元'] ?? 0])
      const targetUnit = upsertUnit(units, unitMeta)
      targetUnit.words.push(buildWordTuple(
        row,
        columns,
        headerRowIndex + rowIndex + 2,
        word,
        slugify(normalizeWordForSlug(word))
      ))
    }

    books.push({
      id: bookId,
      name: bookName,
      order: bookIndex + 1,
      units: units.sort((a, b) => unitSortKey(a) - unitSortKey(b))
    })
  }

  return books
}

function parseRjJuniorUnit(rawUnit) {
  const unitLabel = clean(rawUnit)
  const starterMatch = unitLabel.match(/^Starter Unit\s*(\d+)/i)
  if (starterMatch) {
    const number = Number(starterMatch[1])
    return {
      number: -1000 + number,
      key: `starter-${number}`,
      label: `Starter Unit ${number}`
    }
  }

  return parseNumericUnit(unitLabel)
}

function buildRjJuniorBooks() {
  return buildJuniorBooksFromDir(rjJuniorDir, rjJuniorBookMeta, parseRjJuniorUnit)
}

function buildKpJuniorPublisher() {
  return {
    publisher: { id: 'kp', name: '科普版' },
    sourceWorkbook: kpJuniorDir,
    books: buildJuniorBooksFromDir(kpJuniorDir, kpJuniorBookMeta, parseNumericUnit)
  }
}

function buildYljJuniorBooks() {
  return buildJuniorBooksFromDir(yljJuniorDir, yljJuniorBookMeta, parseNumericUnit)
}

function buildShjxJuniorPublisher() {
  return {
    publisher: { id: 'shjx', name: '沪教版(上海新版)' },
    sourceWorkbook: shjxJuniorDir,
    books: buildJuniorBooksFromDir(shjxJuniorDir, shjxJuniorBookMeta, parseNumericUnit)
  }
}

function buildWyxJuniorPublisher() {
  return {
    publisher: { id: 'wyx', name: '外研社版(新版)' },
    sourceWorkbook: wyxJuniorDir,
    books: buildJuniorBooksFromDir(wyxJuniorDir, wyxJuniorBookMeta, parseWyxUnit)
  }
}

function buildHighSchoolBooks(sourceFile) {
  const sourcePath = path.join(root, 'doc', sourceFile)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source workbook: ${sourcePath}`)
  }

  const workbook = XLSX.readFile(sourcePath)
  const books = []

  for (const [bookIndex, [sheetName, bookId]] of bookIds.entries()) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      throw new Error(`Missing sheet: ${sheetName}`)
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    const headerRowIndex = findJuniorHeaderRowIndex(rows)
    const columns = buildColumnIndex(rows[headerRowIndex] ?? [])
    const units = []

    for (const [rowIndex, row] of rows.slice(headerRowIndex + 1).entries()) {
      const word = cell(row, columns, '英文')
      const meaning = cell(row, columns, '释义')
      if (!word && !meaning) continue

      if (!word || !meaning) {
        throw new Error(`${sheetName} row ${headerRowIndex + rowIndex + 2} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const unitMeta = parseNumericUnit(row[columns['单元'] ?? 0])
      const targetUnit = upsertUnit(units, unitMeta)
      targetUnit.words.push(buildWordTuple(
        row,
        columns,
        headerRowIndex + rowIndex + 2,
        word,
        slugify(normalizeWordForSlug(word))
      ))
    }

    books.push({
      id: bookId,
      name: sheetName,
      order: bookIndex + 1,
      units: units.sort((a, b) => unitSortKey(a) - unitSortKey(b))
    })
  }

  return books
}

function buildBsdPublisher() {
  return {
    publisher: { id: 'bsd', name: '北师大版' },
    sourceWorkbook: path.basename(bsdSourceFile),
    books: buildHighSchoolBooks(bsdSourceFile)
  }
}

function buildYljPublisher() {
  const books = buildHighSchoolBooks(yljSourceFile)
  books.push(...buildYljJuniorBooks().map((book, index) => ({
    ...book,
    order: bookIds.length + index + 1
  })))

  return {
    publisher: { id: 'ylj', name: '译林版' },
    sourceWorkbook: path.basename(yljSourceFile),
    books
  }
}

function buildWyPublisher() {
  return {
    publisher: { id: 'wy', name: '外研社版' },
    sourceWorkbook: path.basename(wySourceFile),
    books: buildHighSchoolBooks(wySourceFile)
  }
}

function buildRjPublisher() {
  const sourcePath = path.join(root, 'doc', rjSourceFile)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source workbook: ${sourcePath}`)
  }

  const workbook = XLSX.readFile(sourcePath)
  const books = []

  for (const [bookIndex, [sheetName, bookId]] of rjBookIds.entries()) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      throw new Error(`Missing sheet: ${sheetName}`)
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    const columns = buildColumnIndex(rows[2] ?? [])
    const units = []

    for (const [rowIndex, row] of rows.slice(3).entries()) {
      const word = cell(row, columns, '英文')
      const meaning = cell(row, columns, '释义')
      if (!word && !meaning) continue

      if (!word || !meaning) {
        throw new Error(`${sheetName} row ${rowIndex + 4} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const unitMeta = parseRjUnit(row[columns['单元'] ?? 0])
      const targetUnit = upsertUnit(units, unitMeta)
      targetUnit.words.push(buildWordTuple(
        row,
        columns,
        rowIndex + 4,
        word,
        slugify(normalizeWordForSlug(word))
      ))
    }

    books.push({
      id: bookId,
      name: sheetName,
      order: bookIndex + 1,
      units: units.sort((a, b) => unitSortKey(a) - unitSortKey(b))
    })
  }

  books.push(...buildRjJuniorBooks().map((book, index) => ({
    ...book,
    order: rjBookIds.length + index + 1
  })))

  return {
    publisher: { id: 'rj', name: '人教版' },
    sourceWorkbook: path.basename(sourcePath),
    books
  }
}

function countWords(publisherBlock) {
  return publisherBlock.books.reduce((sum, book) => (
    sum + book.units.reduce((unitSum, unit) => unitSum + unit.words.length, 0)
  ), 0)
}

function hashPublisherBlock(publisherBlock) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(publisherBlock))
    .digest('hex')
    .slice(0, 4)
}

function buildPublisherVersionToken(publisherBlock, builtAt = new Date()) {
  const wordCount = countWords(publisherBlock)
  const date = builtAt.toISOString().slice(0, 10)
  const digest = hashPublisherBlock(publisherBlock)
  return `${date}-w${wordCount}-${digest}`
}

function buildManifestVersion(publisherBlocks, builtAt = new Date()) {
  return publisherBlocks
    .map(block => `${block.publisher.id}:${buildPublisherVersionToken(block, builtAt)}`)
    .join('|')
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

const publishers = [
  buildShjPublisher(),
  buildSwjPublisher(),
  buildRjPublisher(),
  buildBsdPublisher(),
  buildKpJuniorPublisher(),
  buildYljPublisher(),
  buildWyPublisher(),
  buildShjxJuniorPublisher(),
  buildWyxJuniorPublisher()
]

const manifestPath = path.join(root, 'src', 'data', 'wordbank.manifest.json')
const cdnDir = path.join(root, 'generated', 'wordbank')
const builtAt = new Date()
const manifest = {
  version: buildManifestVersion(publishers, builtAt),
  publishers: publishers.map(buildManifestPublisher)
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.mkdirSync(cdnDir, { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify({ publishers })}\n`)
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)

fs.writeFileSync(path.join(cdnDir, 'manifest.json'), `${JSON.stringify(manifest)}\n`)

for (const block of publishers) {
  const publisherPath = path.join(cdnDir, `${block.publisher.id}.json`)
  fs.writeFileSync(publisherPath, `${JSON.stringify(block)}\n`)
}

for (const block of publishers) {
  const units = block.books.reduce((sum, book) => sum + book.units.length, 0)
  console.log(`${block.publisher.name} (${block.publisher.id}): ${countWords(block)} words, ${block.books.length} books, ${units} units`)
}

console.log(`Written to ${path.relative(root, outputPath)}`)
console.log(`Written to ${path.relative(root, manifestPath)}`)
console.log(`Written ${publishers.length} publisher files to ${path.relative(root, cdnDir)}/`)
