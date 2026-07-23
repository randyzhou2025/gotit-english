import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const productionEnvPath = path.join(root, '.env.production')

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing ${filePath}.`)
    process.exit(1)
  }

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (key) {
      process.env[key] = value
    }
  }
}

function assertProductionApiUrl(url) {
  if (!url) {
    console.error('VITE_API_BASE_URL is required in .env.production for release builds.')
    process.exit(1)
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    console.error(`Invalid VITE_API_BASE_URL in .env.production: ${url}`)
    process.exit(1)
  }

  if (parsed.protocol !== 'https:') {
    console.error(
      `Release builds must use HTTPS API URL (.env.production). Got: ${url}\n` +
      'Local LAN URLs belong in .env for dev only.'
    )
    process.exit(1)
  }

  const host = parsed.hostname
  const isPrivateHost =
    host === 'localhost'
    || host === '127.0.0.1'
    || host.startsWith('192.168.')
    || host.startsWith('10.')
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host)

  if (isPrivateHost) {
    console.error(
      `Release builds cannot use private/LAN API hosts (.env.production). Got: ${url}`
    )
    process.exit(1)
  }
}

function runStep(label, command, args) {
  console.log(`\n==> ${label}`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

loadEnv(productionEnvPath)
console.log(`Using production env: ${productionEnvPath}`)
console.log(`VITE_API_BASE_URL=${process.env.VITE_API_BASE_URL ?? '(missing)'}`)

if (!process.env.VITE_AUDIO_CDN_BASE_URL) {
  console.error('VITE_AUDIO_CDN_BASE_URL is required in .env.production for release builds.')
  process.exit(1)
}

assertProductionApiUrl(process.env.VITE_API_BASE_URL)

if (!process.env.AUDIO_CDN_BASE_URL) {
  process.env.AUDIO_CDN_BASE_URL = process.env.VITE_AUDIO_CDN_BASE_URL
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

runStep('Build wordbank', pnpm, ['wordbank:build'])
runStep('Typecheck', pnpm, ['typecheck'])
runStep('Unit tests', pnpm, ['test'])
//runStep('Verify audio CDN', pnpm, ['audio:verify-cdn'])
runStep('Build WeChat mini program', pnpm, ['build:weapp'])

const wordbankDir = path.join(root, 'generated', 'wordbank')
if (fs.existsSync(wordbankDir)) {
  const wordbankFiles = fs.readdirSync(wordbankDir).filter(name => name.endsWith('.json'))
  console.log('\nWordbank CDN files ready for upload:')
  for (const fileName of wordbankFiles) {
    console.log(`- ${path.join(wordbankDir, fileName)}`)
  }
  console.log('Upload them to your CDN under /generated/wordbank/ (see VITE_WORDBANK_CDN_BASE_URL).')
  console.log('Include manifest.json — set Cache-Control: no-cache on CDN for that file.')
}

console.log('\nRelease build ready: dist/build/mp-weixin')
console.log('Import that folder in WeChat DevTools, preview on device, then upload.')
