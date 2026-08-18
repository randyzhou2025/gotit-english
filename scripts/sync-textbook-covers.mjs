import { execFileSync } from 'node:child_process'
import { copyFile, mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { buildCoversManifest } from './write-covers-manifest.mjs'

const projectRoot = resolve(import.meta.dirname, '..')
const catalogDir = join(projectRoot, 'assets/textbook-covers/official')
const appDir = join(projectRoot, 'src/static/textbook-covers')
const cdnDir = join(projectRoot, 'generated/textbook-covers')
const officialVersionUrl =
  'https://s-file-2.ykt.cbern.com.cn/zxx/ndrs/resources/tch_material/version/data_version.json'
const catalogWidth = 384
const catalogHeight = 504
const appWidth = 256
const appHeight = 336

const stageSlugs = new Map([
  ['初中', 'junior'],
  ['初中（五•四学制）', 'junior-5-4'],
  ['高中', 'senior'],
])

const publisherSlugs = new Map([
  ['人教版', 'rj'],
  ['冀教版', 'jj'],
  ['北师大版', 'bsd'],
  ['科普版', 'kp'],
  ['沪教版', 'shj'],
  ['沪外教版', 'swj'],
  ['译林版', 'ylj'],
  ['外研社版', 'wy'],
  ['外研社版（主编：陈琳）', 'wy-cl'],
  ['外研社版（主编：孙有中）', 'wy-syz'],
  ['教科版', 'jk'],
  ['教科外研社版', 'jk-wy'],
  ['鲁教版', 'lj'],
  ['重庆大学版', 'cqu'],
])

const tagName = (item, dimensionId) =>
  item.tag_list?.find((tag) => tag.tag_dimension_id === dimensionId)?.tag_name ?? ''

const sourceUrl = (item) =>
  item.custom_properties?.thumbnails?.[0] ??
  item.custom_properties?.preview?.Slide1 ??
  ''

const normalizedTitle = (item) => item.global_title?.['zh-CN'] ?? ''

const bookSlug = (grade, volume) => {
  if (grade === '高中年级') {
    const required = volume.match(/^必修\s*第([一二三四])册$/)
    if (required) return `required-${chineseNumber(required[1])}`

    const selective = volume.match(/^选择性必修\s*第([一二三四])册$/)
    if (selective) return `selective-required-${chineseNumber(selective[1])}`
  }

  const gradeNumber = grade.match(/^([六七八九])年级$/)
  if (!gradeNumber) throw new Error(`无法识别年级：${grade}`)

  const number = chineseNumber(gradeNumber[1])
  if (volume === '上册') return `grade-${number}-1`
  if (volume === '下册') return `grade-${number}-2`
  if (volume === '全一册') return `grade-${number}`
  throw new Error(`无法识别册次：${grade} ${volume}`)
}

const chineseNumber = (value) =>
  ({
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  })[value]

const fetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`请求失败 ${response.status}: ${url}`)
  return response.json()
}

const chooseNewest = (current, candidate) => {
  if (!current) return candidate

  const currentTime = Date.parse(current.update_time ?? '') || 0
  const candidateTime = Date.parse(candidate.update_time ?? '') || 0
  if (candidateTime !== currentTime) return candidateTime > currentTime ? candidate : current

  const currentIsTranscoded = sourceUrl(current).includes('/transcode/image/1.')
  const candidateIsTranscoded = sourceUrl(candidate).includes('/transcode/image/1.')
  if (candidateIsTranscoded !== currentIsTranscoded) return candidateIsTranscoded ? candidate : current

  return sourceUrl(candidate).localeCompare(sourceUrl(current)) > 0 ? candidate : current
}

const imageDimensions = (path) => {
  const output = execFileSync(
    'sips',
    ['-g', 'pixelWidth', '-g', 'pixelHeight', path],
    { encoding: 'utf8' },
  )
  const width = Number(output.match(/pixelWidth:\s*(\d+)/)?.[1])
  const height = Number(output.match(/pixelHeight:\s*(\d+)/)?.[1])
  if (!width || !height) throw new Error(`无法读取图片尺寸：${path}`)
  return { width, height }
}

const makeThumbnail = async (source, destination, width, height, quality) => {
  const { width: sourceWidth, height: sourceHeight } = imageDimensions(source)
  let workingSource = source
  let workingWidth = sourceWidth
  let workingHeight = sourceHeight
  let croppedSource

  if (sourceWidth / sourceHeight > 1.15) {
    croppedSource = `${destination}.front-cover.tmp.jpg`
    const frontWidth = Math.floor(sourceWidth / 2)
    await copyFile(source, croppedSource)
    execFileSync(
      'sips',
      [
        '-c',
        String(sourceHeight),
        String(frontWidth),
        '--cropOffset',
        '0',
        String(sourceWidth - frontWidth),
        croppedSource,
      ],
      { stdio: 'ignore' },
    )
    workingSource = croppedSource
    workingWidth = frontWidth
    workingHeight = sourceHeight
  }

  const scale = Math.min(width / workingWidth, height / workingHeight)
  const resizedWidth = Math.max(1, Math.round(workingWidth * scale))
  const resizedHeight = Math.max(1, Math.round(workingHeight * scale))

  execFileSync('sips', [
    '-s',
    'format',
    'jpeg',
    '-s',
    'formatOptions',
    String(quality),
    '-z',
    String(resizedHeight),
    String(resizedWidth),
    workingSource,
    '--out',
    destination,
  ])
  execFileSync('sips', [
    '-p',
    String(height),
    String(width),
    '--padColor',
    'F8F5ED',
    destination,
  ], { stdio: 'ignore' })
  if (croppedSource) await unlink(croppedSource)

  return { sourceWidth, sourceHeight }
}

const download = async (url, destination) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`封面下载失败 ${response.status}: ${url}`)
  await writeFile(destination, Buffer.from(await response.arrayBuffer()))
}

const main = async () => {
  const version = await fetchJson(officialVersionUrl)
  const indexUrls = version.urls.split(',')
  const parts = await Promise.all(indexUrls.map(fetchJson))
  const allItems = parts.flat()

  const filtered = allItems.filter((item) => {
    const stage = tagName(item, 'zxxxd')
    const publisher = tagName(item, 'zxxbb')
    const subject = tagName(item, 'zxxxk')
    return stageSlugs.has(stage) && publisherSlugs.has(publisher) && subject === '英语' && sourceUrl(item)
  })

  const unique = new Map()
  for (const item of filtered) {
    const key = [
      tagName(item, 'zxxxd'),
      tagName(item, 'zxxbb'),
      tagName(item, 'zxxnj'),
      tagName(item, 'zxxcc'),
    ].join('|')
    unique.set(key, chooseNewest(unique.get(key), item))
  }

  const records = [...unique.values()]
    .map((item) => {
      const stage = tagName(item, 'zxxxd')
      const publisher = tagName(item, 'zxxbb')
      const grade = tagName(item, 'zxxnj')
      const volume = tagName(item, 'zxxcc')
      const localBookSlug = bookSlug(grade, volume)
      const fileName = `${stageSlugs.get(stage)}-${publisherSlugs.get(publisher)}-${localBookSlug}.jpg`

      return {
        item,
        stage,
        publisher,
        grade,
        volume,
        bookSlug: localBookSlug,
        fileName,
        url: sourceUrl(item),
      }
    })
    .sort((a, b) =>
      [a.stage, a.publisher, a.grade, a.volume].join('|').localeCompare(
        [b.stage, b.publisher, b.grade, b.volume].join('|'),
        'zh-CN',
      ),
    )

  await mkdir(catalogDir, { recursive: true })
  await mkdir(appDir, { recursive: true })
  await mkdir(cdnDir, { recursive: true })
  const tempDir = await mkdtemp(join(tmpdir(), 'gotit-textbook-covers-'))

  const manifest = []
  for (const [index, record] of records.entries()) {
    const sourcePath = join(tempDir, `${index}-${basename(new URL(record.url).pathname)}`)
    const outputPath = join(catalogDir, record.fileName)
    await download(record.url, sourcePath)
    const dimensions = await makeThumbnail(
      sourcePath,
      outputPath,
      catalogWidth,
      catalogHeight,
      90,
    )

    manifest.push({
      stage: record.stage,
      publisher: record.publisher,
      grade: record.grade,
      volume: record.volume,
      title: normalizedTitle(record.item),
      officialContentId: record.item.id,
      officialUpdatedAt: record.item.update_time,
      sourceUrl: record.url,
      sourceWidth: dimensions.sourceWidth,
      sourceHeight: dimensions.sourceHeight,
      frontCoverCropped: dimensions.sourceWidth / dimensions.sourceHeight > 1.15,
      outputWidth: catalogWidth,
      outputHeight: catalogHeight,
      file: record.fileName,
    })
    process.stdout.write(`\r已生成 ${index + 1}/${records.length}`)
  }
  process.stdout.write('\n')

  const wordbank = JSON.parse(
    await readFile(join(projectRoot, 'generated/wordbank/manifest.json'), 'utf8'),
  )
  const appFiles = []
  for (const publisherEntry of wordbank.publishers) {
    const publisher = publisherEntry.publisher
    for (const book of publisherEntry.books) {
      const match = records.find(
        (record) =>
          record.publisher === publisher.name &&
          record.bookSlug === book.id &&
          (book.id.startsWith('grade-') ? record.stage === '初中' : record.stage === '高中'),
      )
      if (!match) throw new Error(`找不到项目教材对应封面：${publisher.name} ${book.name}`)

      const appFile = `${publisher.id}-${book.id}.jpg`
      const appPath = join(appDir, appFile)
      await makeThumbnail(
        join(catalogDir, match.fileName),
        appPath,
        appWidth,
        appHeight,
        88,
      )
      await copyFile(appPath, join(cdnDir, appFile))
      appFiles.push({
        publisherId: publisher.id,
        publisherName: publisher.name,
        bookId: book.id,
        bookName: book.name,
        file: appFile,
        catalogFile: match.fileName,
      })
    }
  }

  await writeFile(
    join(catalogDir, 'manifest.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        officialVersionUrl,
        officialModuleVersion: version.module_version,
        selection:
          '英语；初中、初中（五•四学制）、高中；同学段/版本/年级/册次保留更新时间最新的在线记录',
        output: { width: catalogWidth, height: catalogHeight, format: 'JPEG', quality: 90 },
        count: manifest.length,
        records: manifest,
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    join(appDir, 'manifest.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        output: { width: appWidth, height: appHeight, format: 'JPEG', quality: 88 },
        count: appFiles.length,
        records: appFiles,
      },
      null,
      2,
    )}\n`,
  )

  const cdnManifest = await buildCoversManifest(cdnDir)
  await writeFile(join(cdnDir, 'manifest.json'), `${JSON.stringify(cdnManifest, null, 2)}\n`)
  await rm(tempDir, { recursive: true, force: true })

  console.log(`官网英语教材封面：${manifest.length} 张`)
  console.log(`当前小程序教材封面：${appFiles.length} 张`)
  console.log(`完整目录：${catalogDir}`)
  console.log(`小程序目录：${appDir}`)
  console.log(`CDN 上传目录：${cdnDir}`)
}

await main()
