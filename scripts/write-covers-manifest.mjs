import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const coversDir = join(projectRoot, 'generated/textbook-covers')

function parseCoverFileName(fileName) {
  const match = /^([a-z0-9]+)-(.+)\.jpg$/i.exec(fileName)
  if (!match) return null
  return {
    publisherId: match[1],
    bookId: match[2],
    file: fileName,
  }
}

async function hashFile(filePath) {
  const buffer = await readFile(filePath)
  return createHash('sha256').update(buffer).digest('hex').slice(0, 8)
}

export async function buildCoversManifest(sourceDir = coversDir) {
  const entries = await readdir(sourceDir)
  const records = []

  for (const fileName of entries) {
    if (!fileName.endsWith('.jpg')) continue
    const parsed = parseCoverFileName(fileName)
    if (!parsed) continue

    records.push({
      ...parsed,
      version: await hashFile(join(sourceDir, fileName)),
    })
  }

  records.sort((left, right) => (
    `${left.publisherId}:${left.bookId}`.localeCompare(`${right.publisherId}:${right.bookId}`)
  ))

  return {
    generatedAt: new Date().toISOString(),
    count: records.length,
    records,
  }
}

async function main() {
  const manifest = await buildCoversManifest()
  const outputPath = join(coversDir, 'manifest.json')
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Wrote ${manifest.count} cover versions to ${outputPath}`)
  console.log('Upload manifest.json together with changed JPGs to CDN (/generated/textbook-covers/).')
  console.log('Set Cache-Control: no-cache on manifest.json so clients pick up updates quickly.')
}

await main()
