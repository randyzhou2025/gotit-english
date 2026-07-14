import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const wordbankPath = path.join(root, 'src', 'data', 'wordbank.generated.json')
const manifestPath = path.join(root, 'src', 'data', 'audio.generated.json')
const outputDir = path.resolve(root, process.env.AUDIO_OUTPUT_DIR || 'generated/audio')
const execFileAsync = promisify(execFile)

const provider = process.env.AUDIO_PROVIDER || 'edge'
const speechKey = process.env.AZURE_SPEECH_KEY || ''
const speechRegion = process.env.AZURE_SPEECH_REGION || ''
const cdnBaseUrl = (process.env.AUDIO_CDN_BASE_URL || '').replace(/\/+$/, '')
const localBaseUrl = (process.env.AUDIO_LOCAL_BASE_URL ?? '/generated/audio').replace(/\/+$/, '')
const voiceUk = process.env.AUDIO_VOICE_UK || 'en-GB-SoniaNeural'
const voiceUs = process.env.AUDIO_VOICE_US || 'en-US-JennyNeural'
const voiceZh = process.env.AUDIO_VOICE_ZH || 'zh-CN-XiaoxiaoNeural'
const limit = Number(process.env.AUDIO_LIMIT || 0)
const concurrency = Math.max(1, Number(process.env.AUDIO_CONCURRENCY || 2))
const pythonCommand = process.env.PYTHON || 'python3'
const edgeRate = process.env.AUDIO_EDGE_RATE || '+0%'
const edgeVolume = process.env.AUDIO_EDGE_VOLUME || '+0%'
const edgePitch = process.env.AUDIO_EDGE_PITCH || '+0Hz'
const skipSynthesis = process.env.AUDIO_SKIP_SYNTHESIS === '1'
const writeManifest = process.env.AUDIO_WRITE_MANIFEST !== '0'
const forceSynthesis = process.env.AUDIO_FORCE === '1'
const maxRetries = Math.max(1, Number(process.env.AUDIO_RETRIES || 3))

function requiredEnv(name, value) {
  if (!value) {
    throw new Error(`Missing ${name}. Required for full audio generation.`)
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function voiceLocale(voiceName) {
  return voiceName.split('-').slice(0, 2).join('-')
}

function buildSsml(text, voiceName) {
  const locale = voiceLocale(voiceName)
  return [
    `<speak version="1.0" xml:lang="${locale}">`,
    `<voice xml:lang="${locale}" name="${voiceName}">`,
    escapeXml(text),
    '</voice>',
    '</speak>'
  ].join('')
}

async function synthesizeAzure(text, voiceName) {
  const response = await fetch(`https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'gotit-audio-generator'
    },
    body: buildSsml(text, voiceName)
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Azure TTS failed: ${response.status} ${body}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath)
    return stat.size > 100
  } catch {
    return false
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function synthesizeEdge(text, voiceName, filePath) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  await fs.rm(tempPath, { force: true })

  try {
    await execFileAsync(pythonCommand, [
      '-m',
      'edge_tts',
      '--voice',
      voiceName,
      '--rate',
      edgeRate,
      '--volume',
      edgeVolume,
      '--pitch',
      edgePitch,
      '--text',
      text,
      '--write-media',
      tempPath
    ], {
      maxBuffer: 1024 * 1024
    })

    if (!await fileExists(tempPath)) {
      throw new Error(`edge-tts wrote an empty audio file for ${voiceName}`)
    }

    await fs.rename(tempPath, filePath)
  } catch (error) {
    await fs.rm(tempPath, { force: true })
    throw error
  }
}

function flattenWords(raw) {
  const entries = []
  for (const book of raw.books) {
    for (const unit of book.units) {
      for (const [word, , , meaning, , slug] of unit.words) {
        const cdnKey = `${raw.publisher.id}/${book.id}/unit-${unit.number}/${slug}`
        entries.push({ word, meaning, cdnKey })
      }
    }
  }
  return entries
}

function audioUrl(cdnKey, variant) {
  const baseUrl = cdnBaseUrl || localBaseUrl
  if (!baseUrl) return ''
  return `${baseUrl}/${cdnKey}/${variant}.mp3`
}

async function ensureAudioFile(entry, variant, text, voiceName) {
  const filePath = path.join(outputDir, entry.cdnKey, `${variant}.mp3`)
  await fs.mkdir(path.dirname(filePath), { recursive: true })

  if (!forceSynthesis && await fileExists(filePath)) {
    return filePath
  }

  if (skipSynthesis) {
    throw new Error(`Missing audio file with AUDIO_SKIP_SYNTHESIS=1: ${filePath}`)
  }

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      if (provider === 'edge') {
        await synthesizeEdge(text, voiceName, filePath)
      } else {
        const audio = await synthesizeAzure(text, voiceName)
        await fs.writeFile(filePath, audio)
      }
      return filePath
    } catch (error) {
      if (attempt === maxRetries) throw error
      await wait(500 * attempt)
    }
  }

  return filePath
}

async function runPool(tasks, worker) {
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (nextIndex < tasks.length) {
      const index = nextIndex
      nextIndex += 1
      await worker(tasks[index], index)
    }
  })

  await Promise.all(workers)
}

async function ensureAudioSet(entry) {
  await ensureAudioFile(entry, 'uk', entry.word, voiceUk)
  await ensureAudioFile(entry, 'us', entry.word, voiceUs)
  await ensureAudioFile(entry, 'zh', entry.meaning, voiceZh)
}

async function assertEdgeAvailable() {
  if (provider !== 'edge') return

  try {
    await execFileAsync(pythonCommand, ['-m', 'edge_tts', '--version'], {
      maxBuffer: 1024 * 1024
    })
  } catch {
    throw new Error(`edge-tts is unavailable. Install it with: ${pythonCommand} -m pip install edge-tts`)
  }
}

async function main() {
  if (provider === 'azure') {
    requiredEnv('AZURE_SPEECH_KEY', speechKey)
    requiredEnv('AZURE_SPEECH_REGION', speechRegion)
  } else if (provider !== 'edge') {
    throw new Error(`Unsupported AUDIO_PROVIDER: ${provider}`)
  }

  await assertEdgeAvailable()

  const raw = JSON.parse(await fs.readFile(wordbankPath, 'utf8'))
  const words = flattenWords(raw).slice(0, limit > 0 ? limit : undefined)
  const items = {}

  await runPool(words, async (entry, index) => {
    await ensureAudioSet(entry)
    const hasAudioUrl = Boolean(audioUrl(entry.cdnKey, 'uk'))

    items[entry.cdnKey] = {
      status: hasAudioUrl ? 'ready' : 'pending',
      ukUrl: audioUrl(entry.cdnKey, 'uk'),
      usUrl: audioUrl(entry.cdnKey, 'us'),
      zhUrl: audioUrl(entry.cdnKey, 'zh')
    }

    if ((index + 1) % 25 === 0 || index + 1 === words.length) {
      console.log(`Generated audio ${index + 1}/${words.length}`)
    }
  })

  if (writeManifest) {
    await fs.writeFile(manifestPath, `${JSON.stringify({
      provider,
      cdnBaseUrl,
      localBaseUrl,
      assetBaseUrl: cdnBaseUrl || localBaseUrl,
      outputDir: path.relative(root, outputDir),
      voices: {
        uk: voiceUk,
        us: voiceUs,
        zh: voiceZh
      },
      generatedAt: new Date().toISOString(),
      items
    }, null, 2)}\n`)
  }

  console.log(`Audio files written to ${outputDir}`)
  if (writeManifest) {
    console.log(`Manifest written to ${manifestPath}`)
  } else {
    console.log('AUDIO_WRITE_MANIFEST=0, manifest not written.')
  }
  if (cdnBaseUrl) {
    console.log('Upload the output directory to the CDN path configured by AUDIO_CDN_BASE_URL.')
  } else if (localBaseUrl) {
    console.log(`Using local audio base URL: ${localBaseUrl}`)
  } else {
    console.log('AUDIO_CDN_BASE_URL and AUDIO_LOCAL_BASE_URL are empty. Manifest URLs remain pending.')
  }
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
