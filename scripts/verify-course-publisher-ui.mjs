import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const h5Dir = path.join(root, 'dist', 'build', 'h5')
const screenshotDir = path.join(root, '.tmp', 'course-publisher-verify')

const viewports = [
  { name: 'iPhone-SE', width: 375, height: 667, deviceScaleFactor: 2 },
  { name: 'iPhone-15', width: 390, height: 844, deviceScaleFactor: 3 },
  { name: 'iPhone-15-Pro-Max', width: 430, height: 932, deviceScaleFactor: 3 }
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function startStaticServer(dir, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      const filePath = path.join(dir, urlPath === '/' ? 'index.html' : urlPath)
      const safePath = path.normalize(filePath)
      if (!safePath.startsWith(dir)) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }

      fs.readFile(safePath, (err, data) => {
        if (err) {
          res.statusCode = 404
          res.end('Not found')
          return
        }

        const ext = path.extname(safePath)
        const types = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.svg': 'image/svg+xml'
        }
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
        res.end(data)
      })
    })

    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function clickByText(page, text) {
  const clicked = await page.evaluate(label => {
    const chips = [...document.querySelectorAll('.courseChip')]
    const chip = chips.find(node => (node.textContent || '').includes(label))
    if (chip) {
      chip.click()
      return true
    }

    const nodes = [...document.querySelectorAll('uni-view, view, div, span, button, uni-text, text')]
    const target = nodes.find(node => (node.textContent || '').trim() === label)
    if (!target) return false
    const host = target.closest('.courseChip') || target
    host.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    host.click?.()
    return true
  }, text)

  if (!clicked) throw new Error(`Could not click chip: ${text}`)
  await sleep(300)
}

async function waitForCourseSetup(page) {
  await page.waitForFunction(() => {
    const text = document.body?.innerText || ''
    return text.includes('学段') || text.includes('教材选择')
  }, { timeout: 45000 })
}

async function readPublisherStates(page) {
  return page.evaluate(() => {
    const titles = [...document.querySelectorAll('uni-text, text, span')]
      .map(node => (node.textContent || '').trim())
    const publisherIndex = titles.indexOf('教材版本')
    const publisherNames = ['人教版', '沪教版', '沪外教版', '科普版']
    const chips = [...document.querySelectorAll('.courseChip')]

    function isActive(el) {
      if (el.classList.contains('isActive')) return true
      const style = window.getComputedStyle(el)
      const borderOk = style.borderBottomColor === 'rgb(28, 176, 246)' || style.borderColor === 'rgb(132, 216, 255)'
      const colorOk = style.color === 'rgb(28, 176, 246)'
      return borderOk && colorOk
    }

    const publisherChips = chips.filter(chip => publisherNames.some(name => (chip.textContent || '').includes(name)))

    return {
      publisherSectionVisible: publisherIndex >= 0,
      publishers: publisherChips.map(chip => ({
        name: (chip.textContent || '').trim(),
        active: isActive(chip)
      }))
    }
  })
}

async function runScenario(page, label, steps) {
  for (const step of steps) await clickByText(page, step)
  await sleep(400)
  const state = await readPublisherStates(page)
  const active = state.publishers.filter(item => item.active).map(item => item.name)
  return { label, active, state }
}

async function main() {
  if (!fs.existsSync(h5Dir)) {
    throw new Error('Missing H5 build. Run `pnpm build:h5` first.')
  }

  const localManifest = path.join(h5Dir, 'generated', 'wordbank', 'manifest.json')
  if (!fs.existsSync(localManifest)) {
    throw new Error('Missing local wordbank assets in H5 build. Run `pnpm wordbank:build && pnpm build:h5` first.')
  }

  fs.mkdirSync(screenshotDir, { recursive: true })
  const port = 4173
  const server = await startStaticServer(h5Dir, port)
  const browser = await puppeteer.launch({ headless: 'new' })
  const failures = []

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage()
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
        isMobile: true,
        hasTouch: true
      })

      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' })
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.reload({ waitUntil: 'networkidle0' })
      await waitForCourseSetup(page)
      await sleep(500)

      const kpScenario = await runScenario(page, 'kp-to-senior', ['初中', '七年级', '科普版', '高中'])
      const screenshotPath = path.join(screenshotDir, `${viewport.name}-kp-to-senior.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })

      if (!kpScenario.active.includes('人教版')) {
        failures.push(`${viewport.name} kp→高中: expected 人教版 active, got ${kpScenario.active.join(', ') || '(none)'}`)
      }

      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.reload({ waitUntil: 'networkidle0' })
      await waitForCourseSetup(page)
      await sleep(500)

      const rjScenario = await runScenario(page, 'rj-to-senior', ['初中', '七年级', '人教版', '高中'])
      if (!rjScenario.active.includes('人教版')) {
        failures.push(`${viewport.name} rj→高中: expected 人教版 active, got ${rjScenario.active.join(', ') || '(none)'}`)
      }

      await page.close()
    }
  } finally {
    await browser.close()
    server.close()
  }

  if (failures.length > 0) {
    console.error('Publisher highlight verification failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log('Publisher highlight verification passed on all viewports.')
  console.log(`Screenshots: ${path.relative(root, screenshotDir)}/`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
