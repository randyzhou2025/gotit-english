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

const rjFileMeta = [
  ['人教版高中英语必修第一册_词汇表.xlsx', 'required-1', '必修第一册'],
  ['人教版高中英语必修第二册_词汇表.xlsx', 'required-2', '必修第二册'],
  ['人教版高中英语必修第三册_词汇表.xlsx', 'required-3', '必修第三册'],
  ['人教版高中英语选择性必修第一册_词汇表.xlsx', 'selective-required-1', '选择性必修第一册'],
  ['人教版高中英语选择性必修第二册_词汇表.xlsx', 'selective-required-2', '选择性必修第二册'],
  ['人教版高中英语选择性必修第三册_词汇表.xlsx', 'selective-required-3', '选择性必修第三册'],
  ['人教版高中英语选择性必修第四册_词汇表.xlsx', 'selective-required-4', '选择性必修第四册']
]

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
  const sourcePath = path.join(root, 'doc', '沪教版高中英语教材_Words_by_unit汇总_终版_增加经典例句及翻译.xlsx')
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
    const units = []

    for (const [rowIndex, row] of rows.slice(3).entries()) {
      const unitMeta = parseNumericUnit(row[0])
      const word = clean(row[1])
      const meaning = clean(row[4])
      if (!word && !meaning) continue

      if (!word || !meaning) {
        throw new Error(`${sheetName} row ${rowIndex + 4} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const targetUnit = upsertUnit(units, unitMeta)
      const wordSlug = slugify(word)
      targetUnit.words.push([
        word,
        clean(row[2]),
        clean(row[3]),
        meaning,
        computeDifficulty(word),
        wordSlug,
        rowIndex + 4,
        clean(row[5]),
        clean(row[6])
      ])
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
  const sourcePath = path.join(root, 'doc', '沪外教高中英语教材_Glossary汇总.xlsx')
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
    const units = []

    for (const [rowIndex, row] of rows.slice(3).entries()) {
      const word = clean(row[1])
      const meaning = clean(row[4])
      if (!word && !meaning) continue
      if (!word || !meaning) {
        throw new Error(`${sheetName} row ${rowIndex + 4} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const wordSlug = slugify(normalizeWordForSlug(word))
      for (const unitMeta of parseSwjUnits(row[0])) {
        const targetUnit = upsertUnit(units, unitMeta)
        targetUnit.words.push([
          word,
          clean(row[2]),
          clean(row[3]),
          meaning,
          computeDifficulty(word),
          wordSlug,
          rowIndex + 4,
          '',
          ''
        ])
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

function buildRjPublisher() {
  const sourceDir = path.join(root, 'doc', '人教版')
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing source directory: ${sourceDir}`)
  }

  const books = []

  for (const [bookIndex, [fileName, bookId, bookName]] of rjFileMeta.entries()) {
    const sourcePath = path.join(sourceDir, fileName)
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing source workbook: ${sourcePath}`)
    }

    const workbook = XLSX.readFile(sourcePath)
    const sheetName = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' })
    const units = []

    for (const [rowIndex, row] of rows.slice(3).entries()) {
      const word = clean(row[1])
      const meaning = clean(row[4])
      if (!word && !meaning) continue

      if (!word || !meaning) {
        throw new Error(`${fileName} row ${rowIndex + 4} has incomplete word data`)
      }
      if (isPhraseEntry(word)) continue

      const unitMeta = parseRjUnit(row[0])
      const targetUnit = upsertUnit(units, unitMeta)
      targetUnit.words.push([
        word,
        clean(row[2]),
        clean(row[3]),
        meaning,
        computeDifficulty(word),
        slugify(normalizeWordForSlug(word)),
        rowIndex + 4,
        '',
        ''
      ])
    }

    books.push({
      id: bookId,
      name: bookName,
      order: bookIndex + 1,
      units: units.sort((a, b) => unitSortKey(a) - unitSortKey(b))
    })
  }

  return {
    publisher: { id: 'rj', name: '人教版' },
    sourceWorkbook: 'doc/人教版/*.xlsx',
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
  buildRjPublisher()
]

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify({ publishers })}\n`)

for (const block of publishers) {
  const units = block.books.reduce((sum, book) => sum + book.units.length, 0)
  console.log(`${block.publisher.name} (${block.publisher.id}): ${countWords(block)} words, ${block.books.length} books, ${units} units`)
}

console.log(`Written to ${path.relative(root, outputPath)}`)
