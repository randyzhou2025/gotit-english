import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const OUT_DIR = path.resolve('src/static/tabbar')
const SIZE = 81
const INACTIVE = '#8E8E93'
const ACTIVE = '#1CB0F6'

const icons = {
  home: {
    inactive: `
      <path d="M40.5 17 L58.5 32.5 V64.5 C58.5 66.71 56.71 68.5 54.5 68.5 H26.5 C24.29 68.5 22.5 66.71 22.5 64.5 V32.5 Z" fill="none" stroke="${INACTIVE}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M34.5 48.5 H46.5 V68.5 H34.5 Z" fill="none" stroke="${INACTIVE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    `,
    active: `
      <path d="M40.5 15.5 L60.5 31.5 V64.5 C60.5 66.71 58.71 68.5 56.5 68.5 H24.5 C22.29 68.5 20.5 66.71 20.5 64.5 V31.5 Z" fill="${ACTIVE}"/>
      <rect x="33.5" y="47.5" width="14" height="21" rx="7" fill="#ffffff"/>
    `
  },
  weakbook: {
    inactive: `
      <rect x="21" y="18" width="17" height="45" rx="4" fill="none" stroke="${INACTIVE}" stroke-width="3.2"/>
      <rect x="43" y="18" width="17" height="45" rx="4" fill="none" stroke="${INACTIVE}" stroke-width="3.2"/>
      <path d="M29.5 18 V63" stroke="${INACTIVE}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M51.5 18 V63" stroke="${INACTIVE}" stroke-width="2.4" stroke-linecap="round"/>
    `,
    active: `
      <rect x="21" y="18" width="17" height="45" rx="4" fill="${ACTIVE}"/>
      <rect x="43" y="18" width="17" height="45" rx="4" fill="${ACTIVE}"/>
      <path d="M29.5 18 V63" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M51.5 18 V63" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
    `
  },
  dictation: {
    inactive: `
      <path d="M24 29 H31.5 L41.5 23 V58 L31.5 52 H24 Z" fill="none" stroke="${INACTIVE}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M48 31 C53.5 40.5 53.5 40.5 48 50" fill="none" stroke="${INACTIVE}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M54.5 24.5 C62.5 40.5 62.5 40.5 54.5 56.5" fill="none" stroke="${INACTIVE}" stroke-width="3.2" stroke-linecap="round"/>
    `,
    active: `
      <path d="M24 29 H31.5 L41.5 23 V58 L31.5 52 H24 Z" fill="${ACTIVE}" stroke="${ACTIVE}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M48 31 C53.5 40.5 53.5 40.5 48 50" fill="none" stroke="${ACTIVE}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M54.5 24.5 C62.5 40.5 62.5 40.5 54.5 56.5" fill="none" stroke="${ACTIVE}" stroke-width="3.4" stroke-linecap="round"/>
    `
  }
}

function svgMarkup(body) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; background: transparent; }
      svg { display: block; }
    </style>
  </head>
  <body>
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 81 81" xmlns="http://www.w3.org/2000/svg">${body}</svg>
  </body>
</html>`
}

async function renderIcon(page, body, outputPath) {
  await page.setContent(svgMarkup(body), { waitUntil: 'domcontentloaded', timeout: 10000 })
  const svg = await page.$('svg')
  await svg.screenshot({
    path: outputPath,
    omitBackground: true
  })
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    args: ['--no-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 })

  for (const [name, variants] of Object.entries(icons)) {
    await renderIcon(page, variants.inactive, path.join(OUT_DIR, `${name}.png`))
    await renderIcon(page, variants.active, path.join(OUT_DIR, `${name}-active.png`))
    console.log(`generated ${name}`)
  }

  await browser.close()
  console.log(`done -> ${OUT_DIR}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
