import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  allowedEggPublishersForBb,
  buildBbUnitId,
  buildTextbookEggIndex,
  matchEggsForUnit,
  resolveUnitWords
} from './bb-unit-egg-match.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const wordbankDir = path.join(rootDir, 'generated', 'wordbank')
const cdnOutputDir = path.join(rootDir, 'generated', 'unit-eggs')
const manifestOutputPath = path.join(rootDir, 'src', 'data', 'unit-eggs.manifest.json')

const BB_PUBLISHERS = ['bb-junior', 'bb-senior']

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function loadTextbookPublisherPayloads() {
  const payloads = new Map()

  for (const fileName of fs.readdirSync(cdnOutputDir)) {
    if (!fileName.endsWith('.json') || fileName === 'manifest.json') continue
    if (fileName.startsWith('bb-')) continue

    const publisherId = fileName.slice(0, -'.json'.length)
    payloads.set(publisherId, readJson(path.join(cdnOutputDir, fileName)))
  }

  return payloads
}

function loadBbWordbank(publisherId) {
  const filePath = path.join(wordbankDir, `${publisherId}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing bb wordbank: ${filePath}. Run pnpm wordbank:bb first.`)
  }
  return readJson(filePath)
}

function buildBbPublisherPayload(publisherId, textbookPayloads) {
  const allowedPublishers = allowedEggPublishersForBb(publisherId)
  if (!allowedPublishers) {
    throw new Error(`Unsupported bb publisher: ${publisherId}`)
  }

  const block = loadBbWordbank(publisherId)
  const eggIndex = buildTextbookEggIndex(textbookPayloads, allowedPublishers)
  const byUnit = {}
  let recordCount = 0
  let emptyUnits = 0

  for (const book of block.books ?? []) {
    for (const unit of book.units ?? []) {
      const unitId = buildBbUnitId(publisherId, book.id, unit)
      let eggs = matchEggsForUnit(resolveUnitWords(block, book, unit), eggIndex)

      if (book.id === 'random' && eggs.length === 0) {
        const alphaUnitId = buildBbUnitId(publisherId, 'alpha', unit)
        eggs = byUnit[alphaUnitId] ? [...byUnit[alphaUnitId]] : []
      }

      if (eggs.length === 0) emptyUnits += 1
      byUnit[unitId] = eggs
      recordCount += eggs.length
    }
  }

  return {
    payload: {
      version: '',
      publisherId,
      byUnit
    },
    unitCount: Object.keys(byUnit).length,
    recordCount,
    emptyUnits
  }
}

function mergeManifest(existingManifest, bbStats, bbVersionToken) {
  const publishers = existingManifest.publishers.filter(entry => !BB_PUBLISHERS.includes(entry.id))
  for (const stat of bbStats) {
    publishers.push({
      id: stat.publisherId,
      unitCount: stat.unitCount,
      recordCount: stat.recordCount
    })
  }
  publishers.sort((left, right) => left.id.localeCompare(right.id, 'en'))

  const unitCount = publishers.reduce((sum, entry) => sum + entry.unitCount, 0)
  const recordCount = publishers.reduce((sum, entry) => sum + entry.recordCount, 0)

  return {
    version: `${existingManifest.version}|${bbVersionToken}`,
    source: `${existingManifest.source} + bb keyword match`,
    unitCount,
    recordCount,
    publishers
  }
}

function main() {
  if (!fs.existsSync(cdnOutputDir)) {
    throw new Error(`Missing unit eggs output dir: ${cdnOutputDir}. Run pnpm unit-eggs:build first.`)
  }

  const existingManifest = readJson(manifestOutputPath)
  const textbookPayloads = loadTextbookPublisherPayloads()
  const bbStats = []

  for (const publisherId of BB_PUBLISHERS) {
    const built = buildBbPublisherPayload(publisherId, textbookPayloads)
    bbStats.push({
      publisherId,
      unitCount: built.unitCount,
      recordCount: built.recordCount,
      emptyUnits: built.emptyUnits
    })

    const filePath = path.join(cdnOutputDir, `${publisherId}.json`)
    fs.writeFileSync(filePath, `${JSON.stringify(built.payload)}\n`)
  }

  const bbVersionToken = `bb:${crypto
    .createHash('sha256')
    .update(BB_PUBLISHERS.map(id => fs.readFileSync(path.join(cdnOutputDir, `${id}.json`))).join('|'))
    .digest('hex')
    .slice(0, 12)}`

  for (const publisherId of BB_PUBLISHERS) {
    const filePath = path.join(cdnOutputDir, `${publisherId}.json`)
    const payload = readJson(filePath)
    payload.version = bbVersionToken
    fs.writeFileSync(filePath, `${JSON.stringify(payload)}\n`)
  }

  const mergedManifest = mergeManifest(existingManifest, bbStats, bbVersionToken)
  fs.writeFileSync(manifestOutputPath, `${JSON.stringify(mergedManifest)}\n`)
  fs.writeFileSync(path.join(cdnOutputDir, 'manifest.json'), `${JSON.stringify(mergedManifest)}\n`)

  for (const stat of bbStats) {
    console.log(
      `${stat.publisherId}: ${stat.recordCount} eggs across ${stat.unitCount} units`
      + ` (${stat.emptyUnits} empty)`
    )
  }
  console.log(`Updated ${path.relative(rootDir, manifestOutputPath)}`)
}

main()
