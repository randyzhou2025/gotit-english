import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
const canvasSource = fs.readFileSync(
  new URL('../../core/wordlistCanvas.ts', import.meta.url),
  'utf8'
)

describe('wordlist export canvas layout', () => {
  it('sizes the canvas element to match the export buffer 1:1', () => {
    expect(canvasSource).toContain('const WORDLIST_CANVAS_WIDTH = 1240')
    expect(canvasSource).toContain('const WORDLIST_CANVAS_HEIGHT = 1754')
    expect(canvasSource).toContain('const WORDLIST_EXPORT_SCALE = 2')
    expect(source).toContain('width: 2480px;')
    expect(source).toContain('height: 3508px;')
  })

  it('stays inside the platform limits an A4 raster can hit', () => {
    const scale = Number(/WORDLIST_EXPORT_SCALE = (\d+(?:\.\d+)?)/.exec(canvasSource)![1])
    const width = 1240 * scale
    const height = 1754 * scale

    // Either limit breaks the export silently, and Android degrades without an error.
    expect(Math.max(width, height)).toBeLessThanOrEqual(4096)
    expect(width * height).toBeLessThanOrEqual(16777216)
  })

  it('draws through Canvas 2D so the buffer size does not scale with devicePixelRatio', () => {
    expect(source).toContain('type="2d"')
    expect(source).toContain('node.width = WORDLIST_BUFFER_WIDTH')
    expect(source).toContain('node.height = WORDLIST_BUFFER_HEIGHT')
    expect(source).toContain("canvas.getContext('2d')")
    expect(source).toContain('canvas: exportCanvas')

    // The legacy context batches commands and replays them differently on Android.
    expect(source).not.toContain('createCanvasContext')
    expect(source).not.toContain('canvas-id')
    expect(source).not.toContain('context.draw(')
  })

  it('draws through the shared canvas module so the preview cannot drift from the PDF', () => {
    expect(source).toContain("from '@/core/wordlistCanvas'")
    expect(source).toContain('drawWordlistPage(context, {')
    expect(source).toContain('wordlistCellWord(word, exportMode.value)')
    expect(source).toContain('wordlistCellMeaning(word, exportMode.value)')
  })

  it('fits two complete 20-row tables inside the A4 canvas', () => {
    expect(canvasSource).toContain('const TABLE_WIDTH = 545')
    expect(canvasSource).toContain('const ROW_HEIGHT = 68')
    expect(canvasSource).toContain('const TABLE_ORIGINS = [68, 627]')
    expect(canvasSource).toContain('HEADER_HEIGHT + ROW_HEIGHT * 20')
  })

  it('keeps the wordlist label concise', () => {
    expect(source).toContain("{ value: 'wordlist', label: '单词表' }")
    expect(source).toContain("return '单词表'")
    expect(source).not.toContain('完整英文和释义')
  })

  it('shows an A4-shaped preview with all 20 rows sharing the available height', () => {
    expect(source).toContain('aspect-ratio: 210 / 297;')
    expect(source).toContain('max-width: 340px;')
    expect(source).toContain('flex: 1 1 0;')
    expect(source).not.toContain('height: 12px;')
  })

  it('keeps the export controls compact and separated from the preview', () => {
    expect(source).toContain('padding: 24px 22px calc(24px + env(safe-area-inset-bottom));')
    expect(source).toContain('min-height: 70px;')
    expect(source).toContain('min-height: 54px;')
    expect(source).toContain('min-height: 46px;')
  })

  it('fits the complete export action into narrow or low Android viewports', () => {
    expect(source).toContain('height: 100dvh;')
    expect(source).toContain('box-sizing: border-box;')
    expect(source).toContain('@media (max-width: 380px), (max-height: 800px)')
    expect(source).toContain('max-width: 300px;')
    expect(source).toContain('padding: 14px 18px calc(14px + env(safe-area-inset-bottom));')
    expect(source).toContain('min-height: 58px;')
    expect(source).toContain('min-height: 44px; margin-top: 10px;')
  })

  it('does not show the row and column count badge', () => {
    expect(source).not.toContain('paperBadge')
    expect(source).not.toContain('<text>2 列</text>')
    expect(source).not.toContain('<text>20 行</text>')
  })

  it('stretches table cell dividers across the full row height', () => {
    expect(source).toContain('align-self: stretch;')
    expect(source).toContain('align-items: center;')
    expect(source).toContain('height: 100%;')
  })
})
