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

const swjSourceFile = '沪外教高中英语教材_全7册词汇扩展版.xlsx'
const rjSourceFile = '人教版高中英语教材_全7册词汇扩展版.xlsx'
const shjSourceFile = '沪教版高中英语教材_全7册词汇扩展版.xlsx'
const shjExampleFallbackFile = '沪教版高中英语教材_Words_by_unit汇总_终版_增加经典例句及翻译.xlsx'

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
    cell(row, columns, '释义'),
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
    const columns = buildColumnIndex(rows[2] ?? [])
    const units = []

    for (const [rowIndex, row] of rows.slice(3).entries()) {
      const word = cell(row, columns, '英文')
      const meaning = cell(row, columns, '释义')
      if (!word && !meaning) continue

      if (!word || !meaning) {
        throw new Error(`${bookName} row ${rowIndex + 4} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const unitMeta = parseUnit(row[columns['单元'] ?? 0])
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

const publishers = [
  buildShjPublisher(),
  buildSwjPublisher(),
  buildRjPublisher(),
  buildKpJuniorPublisher()
]

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify({ publishers })}\n`)

for (const block of publishers) {
  const units = block.books.reduce((sum, book) => sum + book.units.length, 0)
  console.log(`${block.publisher.name} (${block.publisher.id}): ${countWords(block)} words, ${block.books.length} books, ${units} units`)
}

console.log(`Written to ${path.relative(root, outputPath)}`)
