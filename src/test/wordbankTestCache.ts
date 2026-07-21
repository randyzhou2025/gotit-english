import fs from 'node:fs'
import path from 'node:path'
import type { CompactPublisherBlock } from '@/core/wordbankLoader'

const WORDBANK_CACHE_PREFIX = 'gotit:wordbank:data:'
const WORDBANK_PUBLISHER_VERSION_PREFIX = 'gotit:wordbank:publisher-version:'
const WORDBANK_VERSION_KEY = 'gotit:wordbank:version'
const WORDBANK_MANIFEST_KEY = 'gotit:wordbank:manifest'
const WORDBANK_PUBLISHER_IDS_KEY = 'gotit:wordbank:publisher-ids'

function publisherVersionToken(manifestVersion: string, publisherId: string): string {
  const segment = manifestVersion
    .split('|')
    .find(part => part.startsWith(`${publisherId}:`))

  return segment ?? `${publisherId}:${manifestVersion}`
}

export function seedWordbankTestCache(storage: Map<string, unknown>) {
  const root = process.cwd()
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'src/data/wordbank.manifest.json'), 'utf8')
  ) as { version: string; publishers: Array<{ publisher: { id: string } }> }

  storage.set(WORDBANK_VERSION_KEY, manifest.version)
  storage.set(WORDBANK_MANIFEST_KEY, JSON.stringify(manifest))

  const publisherIds: string[] = []

  for (const entry of manifest.publishers) {
    const publisherId = entry.publisher.id
    publisherIds.push(publisherId)
    const block = JSON.parse(
      fs.readFileSync(path.join(root, 'generated/wordbank', `${publisherId}.json`), 'utf8')
    ) as CompactPublisherBlock
    storage.set(
      `${WORDBANK_PUBLISHER_VERSION_PREFIX}${publisherId}`,
      publisherVersionToken(manifest.version, publisherId)
    )
    storage.set(`${WORDBANK_CACHE_PREFIX}${publisherId}`, JSON.stringify(block))
  }

  storage.set(WORDBANK_PUBLISHER_IDS_KEY, JSON.stringify(publisherIds))
}
