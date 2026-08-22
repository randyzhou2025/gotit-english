import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import XLSX from 'xlsx'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workbookPath = path.join(rootDir, 'doc', '课本单词通_六版高中英语_本单元彩蛋数据.xlsx')
const manifestPath = path.join(rootDir, 'src', 'data', 'wordbank.manifest.json')
const outputPath = path.join(rootDir, 'src', 'data', 'unit-eggs.generated.json')

const publisherIds = {
  人教版: 'rj',
  译林版: 'ylj',
  外研社版: 'wy',
  北师大版: 'bsd',
  沪外教版: 'swj',
  沪教版: 'shj'
}

const workbook = XLSX.readFile(workbookPath)
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const manifestPublishers = new Map(
  manifest.publishers.map(entry => [entry.publisher.id, entry])
)

function unitSegment(unitName) {
  if (unitName === 'Welcome Unit') return 'welcome'
  const match = /^Unit\s+(\d+)$/i.exec(unitName)
  if (!match) throw new Error(`Unsupported unit name: ${unitName}`)
  return match[1]
}

function text(value) {
  return String(value ?? '').trim()
}

function normalizeBookName(value) {
  return text(value).replace(/^选必/, '选择性必修')
}

const byUnit = {}
let recordCount = 0

for (const sheetName of workbook.SheetNames) {
  const publisherId = publisherIds[sheetName]
  if (!publisherId) throw new Error(`Unknown publisher sheet: ${sheetName}`)

  const publisher = manifestPublishers.get(publisherId)
  if (!publisher) throw new Error(`Publisher missing from wordbank manifest: ${publisherId}`)

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    range: 4
  })

  for (const row of rows) {
    const bookName = normalizeBookName(row['册次'])
    const unitName = text(row['单元'])
    if (!bookName || !unitName) continue

    const book = publisher.books.find(item => item.name === bookName)
    if (!book) {
      throw new Error(`${sheetName} ${bookName} is missing from the wordbank manifest`)
    }

    const segment = unitSegment(unitName)
    if (!book.units.some(unit => String(unit.key ?? unit.number) === segment)) {
      throw new Error(`${sheetName} ${bookName} ${unitName} is missing from the wordbank manifest`)
    }

    const unitId = `${publisherId}:${book.id}:u${segment}`
    const templateName = text(row['模板类型'])
    const template = templateName.slice(0, 1)
    if (!/^[A-J]$/.test(template)) {
      throw new Error(`Unsupported template type: ${templateName}`)
    }

    const sequence = Number(row['彩蛋序号'])
    const egg = {
      id: `${unitId}:egg${sequence}`,
      sequence,
      template,
      keyword: text(row['核心词/短语']),
      title: text(row['引导标题']),
      core: text(row['核心展示']),
      explanation: text(row['解释文案']),
      memory: text(row['记忆提示']),
      compare: text(row['对比词/词根']),
      phonetic: text(row['音标']),
      meaning: text(row['课本释义'])
    }

    if (!byUnit[unitId]) byUnit[unitId] = []
    byUnit[unitId].push(egg)
    recordCount += 1
  }
}

const sortedByUnit = Object.fromEntries(
  Object.entries(byUnit)
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([unitId, eggs]) => [unitId, eggs.sort((left, right) => left.sequence - right.sequence)])
)

const sourceHash = crypto
  .createHash('sha256')
  .update(fs.readFileSync(workbookPath))
  .digest('hex')
  .slice(0, 12)

const payload = {
  version: `sha256:${sourceHash}`,
  source: path.basename(workbookPath),
  unitCount: Object.keys(sortedByUnit).length,
  recordCount,
  byUnit: sortedByUnit
}

fs.writeFileSync(outputPath, `${JSON.stringify(payload)}\n`)
console.log(`Generated ${recordCount} unit eggs for ${payload.unitCount} units -> ${path.relative(rootDir, outputPath)}`)
