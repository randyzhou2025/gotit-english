import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import XLSX from 'xlsx'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workbookConfigs = [
  {
    path: path.join(rootDir, 'doc', '课本单词通_五版初中英语_本单元彩蛋数据.xlsx'),
    publisherIds: {
      人教版: 'rj',
      外研社版: 'wyx',
      沪教版: 'shjx',
      译林版: 'ylj',
      科普版: 'kp'
    }
  },
  {
    path: path.join(rootDir, 'doc', '课本单词通_六版高中英语_本单元彩蛋数据.xlsx'),
    publisherIds: {
      人教版: 'rj',
      译林版: 'ylj',
      外研社版: 'wy',
      北师大版: 'bsd',
      沪外教版: 'swj',
      沪教版: 'shj'
    }
  },
  {
    path: path.join(rootDir, 'doc', '课本单词通_五版初中英语_本单元彩蛋数据_补充沪教外研九上.xlsx'),
    publisherIds: {
      外研社版: 'wyx',
      沪教版: 'shjx'
    },
    bookNames: ['九年级上册']
  }
]
const manifestPath = path.join(rootDir, 'src', 'data', 'wordbank.manifest.json')
const legacyOutputPath = path.join(rootDir, 'src', 'data', 'unit-eggs.generated.json')
const manifestOutputPath = path.join(rootDir, 'src', 'data', 'unit-eggs.manifest.json')
const cdnOutputDir = path.join(rootDir, 'generated', 'unit-eggs')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const manifestPublishers = new Map(
  manifest.publishers.map(entry => [entry.publisher.id, entry])
)

function unitSegment(unitName) {
  if (unitName === 'Welcome Unit') return 'welcome'
  if (unitName === 'Starter') return 'starter'
  const starterMatch = /^Starter Unit\s+(\d+)$/i.exec(unitName)
  if (starterMatch) return `starter-${starterMatch[1]}`
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
const eggIds = new Set()
let recordCount = 0

for (const workbookConfig of workbookConfigs) {
  const workbook = XLSX.readFile(workbookConfig.path)

  for (const sheetName of Object.keys(workbookConfig.publisherIds)) {
    const publisherId = workbookConfig.publisherIds[sheetName]
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      throw new Error(`Missing sheet ${sheetName} in ${path.basename(workbookConfig.path)}`)
    }

    const publisher = manifestPublishers.get(publisherId)
    if (!publisher) throw new Error(`Publisher missing from wordbank manifest: ${publisherId}`)

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      range: 4
    })

    for (const row of rows) {
      const bookName = normalizeBookName(row['册次'])
      const unitName = text(row['单元'])
      if (!bookName || !unitName) continue
      if (workbookConfig.bookNames?.length && !workbookConfig.bookNames.includes(bookName)) continue

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
      const eggId = `${unitId}:egg${sequence}`
      const egg = {
        id: eggId,
        sequence,
        data: {
          template,
          keyword: text(row['核心词/短语']),
          title: text(row['引导标题']),
          core: text(row['核心展示']),
          explanation: text(row['解释文案']),
          memory: text(row['记忆提示']),
          compare: text(row['对比词/词根']),
          phonetic: text(row['音标'])
        }
      }

      if (eggIds.has(eggId)) throw new Error(`Duplicate unit egg id: ${eggId}`)
      eggIds.add(eggId)

      if (!byUnit[unitId]) byUnit[unitId] = []
      byUnit[unitId].push(egg)
      recordCount += 1
    }
  }
}

const sortedByUnit = Object.fromEntries(
  Object.entries(byUnit)
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([unitId, eggs]) => [
      unitId,
      eggs
        .sort((left, right) => left.sequence - right.sequence)
        .map(egg => egg.data)
    ])
)

const sourceHash = crypto
  .createHash('sha256')
  .update(Buffer.concat(workbookConfigs.map(config => fs.readFileSync(config.path))))
  .digest('hex')
  .slice(0, 12)

const payload = {
  version: `sha256:${sourceHash}`,
  source: workbookConfigs.map(config => path.basename(config.path)).join(' + '),
  unitCount: Object.keys(sortedByUnit).length,
  recordCount,
  byUnit: sortedByUnit
}

const publisherPayloads = new Map()
for (const [unitId, eggs] of Object.entries(sortedByUnit)) {
  const publisherId = unitId.split(':')[0]
  if (!publisherPayloads.has(publisherId)) {
    publisherPayloads.set(publisherId, {})
  }
  publisherPayloads.get(publisherId)[unitId] = eggs
}

const publishers = [...publisherPayloads.entries()]
  .sort(([left], [right]) => left.localeCompare(right, 'en'))
  .map(([publisherId, publisherUnits]) => ({
    id: publisherId,
    unitCount: Object.keys(publisherUnits).length,
    recordCount: Object.values(publisherUnits).reduce((total, eggs) => total + eggs.length, 0)
  }))

const bundledManifest = {
  version: payload.version,
  source: payload.source,
  unitCount: payload.unitCount,
  recordCount: payload.recordCount,
  publishers
}

fs.rmSync(cdnOutputDir, { recursive: true, force: true })
fs.mkdirSync(cdnOutputDir, { recursive: true })
fs.writeFileSync(manifestOutputPath, `${JSON.stringify(bundledManifest)}\n`)
fs.writeFileSync(path.join(cdnOutputDir, 'manifest.json'), `${JSON.stringify(bundledManifest)}\n`)

for (const [publisherId, publisherUnits] of publisherPayloads) {
  const publisherPayload = {
    version: payload.version,
    publisherId,
    byUnit: publisherUnits
  }
  fs.writeFileSync(
    path.join(cdnOutputDir, `${publisherId}.json`),
    `${JSON.stringify(publisherPayload)}\n`
  )
}

fs.rmSync(legacyOutputPath, { force: true })

console.log(
  `Generated ${recordCount} unit eggs for ${payload.unitCount} units across ${publishers.length} publisher files`
)
console.log(`Bundled manifest -> ${path.relative(rootDir, manifestOutputPath)}`)
console.log(`CDN files -> ${path.relative(rootDir, cdnOutputDir)}`)
