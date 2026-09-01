import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = path.join(root, 'dist', 'build', 'mp-weixin')
const mediaExtensions = new Set([
  '.aac', '.bmp', '.gif', '.jpeg', '.jpg', '.m4a', '.mp3', '.ogg', '.png', '.svg', '.wav', '.webp'
])
const maxBytes = 180_000

function collectMediaFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectMediaFiles(filePath)
    return mediaExtensions.has(path.extname(entry.name).toLowerCase()) ? [filePath] : []
  })
}

if (!fs.existsSync(buildDir)) {
  console.error(`Missing WeChat build output: ${buildDir}`)
  process.exit(1)
}

const files = collectMediaFiles(buildDir)
  .map(filePath => ({ filePath, bytes: fs.statSync(filePath).size }))
  .sort((left, right) => right.bytes - left.bytes)
const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)

console.log(`WeChat image/audio budget: ${totalBytes}/${maxBytes} bytes (${files.length} files)`)
if (totalBytes > maxBytes) {
  for (const file of files) {
    console.error(`${file.bytes} ${path.relative(buildDir, file.filePath)}`)
  }
  process.exit(1)
}
