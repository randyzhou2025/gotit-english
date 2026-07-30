import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

describe('wordlist export canvas layout', () => {
  it('keeps the canvas coordinate space aligned with the exported JPEG size', () => {
    expect(source).toContain('const CANVAS_WIDTH = 1240')
    expect(source).toContain('const CANVAS_HEIGHT = 1754')
    expect(source).toContain('width: 1240px;')
    expect(source).toContain('height: 1754px;')
    expect(source).not.toContain('width: 620px;')
    expect(source).not.toContain('height: 877px;')
  })

  it('fits two complete 20-row tables inside the A4 canvas', () => {
    expect(source).toContain('const tableWidth = 545')
    expect(source).toContain('const rowHeight = 68')
    expect(source).toContain('headerHeight + rowHeight * 20')
    expect(source).toContain('drawTable(context, page.left, 0, pageIndex, 68, 142)')
    expect(source).toContain('drawTable(context, page.right, 1, pageIndex, 627, 142)')
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
