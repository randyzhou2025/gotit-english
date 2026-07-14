import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const sourcePath = path.join(root, 'doc', '沪教版高中英语教材_Words_by_unit汇总.xlsx')
const outputPath = path.join(root, 'src', 'data', 'wordbank.generated.json')

const publisher = {
  id: 'shj',
  name: '沪教版'
}

const sheetMeta = [
  ['必修第一册', 'required-1'],
  ['必修第二册', 'required-2'],
  ['必修第三册', 'required-3'],
  ['选择性必修第一册', 'selective-required-1'],
  ['选择性必修第二册', 'selective-required-2'],
  ['选择性必修第三册', 'selective-required-3'],
  ['选择性必修第四册', 'selective-required-4']
]

function clean(value) {
  return String(value ?? '').trim()
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

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Missing source workbook: ${sourcePath}`)
}

const workbook = XLSX.readFile(sourcePath)
const words = []
const books = []

for (const [bookIndex, [sheetName, bookId]] of sheetMeta.entries()) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error(`Missing sheet: ${sheetName}`)
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const dataRows = rows.slice(3)
  const units = new Map()

  for (const [rowIndex, row] of dataRows.entries()) {
    const unitNumber = toUnitNumber(row[0])
    const word = clean(row[1])
    const phonetic = clean(row[2])
    const partOfSpeech = clean(row[3])
    const meaning = clean(row[4])

    if (!unitNumber && !word && !meaning) continue
    if (!unitNumber || !word || !meaning) {
      throw new Error(`${sheetName} row ${rowIndex + 4} has incomplete word data`)
    }

    const wordSlug = slugify(word)
    const unitId = `${publisher.id}:${bookId}:u${unitNumber}`
    const difficulty = computeDifficulty(word)
    words.push({
      id: `${unitId}:${wordSlug}`,
      publisherId: publisher.id,
      publisherName: publisher.name,
      bookId,
      bookName: sheetName,
      bookOrder: bookIndex + 1,
      unitId,
      unitNumber,
      unitName: `Unit ${unitNumber}`,
      word,
      phonetic,
      partOfSpeech,
      meaning,
      difficulty,
      audio: {
        status: 'pending',
        cdnKey: `${publisher.id}/${bookId}/unit-${unitNumber}/${wordSlug}`,
        ukUrl: '',
        usUrl: ''
      },
      source: {
        workbook: path.basename(sourcePath),
        sheet: sheetName,
        rowNumber: rowIndex + 4
      }
    })

    if (!units.has(unitNumber)) {
      units.set(unitNumber, {
        number: unitNumber,
        words: []
      })
    }

    units.get(unitNumber).words.push([
      word,
      phonetic,
      partOfSpeech,
      meaning,
      difficulty,
      wordSlug,
      rowIndex + 4
    ])
  }

  books.push({
    id: bookId,
    name: sheetName,
    order: bookIndex + 1,
    units: Array.from(units.values()).sort((a, b) => a.number - b.number)
  })
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify({
  publisher,
  sourceWorkbook: path.basename(sourcePath),
  books
})}\n`)

const units = new Set(words.map(word => word.unitId)).size
console.log(`Generated ${words.length} words across ${sheetMeta.length} books and ${units} units.`)
