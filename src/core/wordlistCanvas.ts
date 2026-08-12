import type { WordEntry } from './types'
import type { WordlistExportMode, WordlistExportPage } from './wordlistExport'

/** Drawing coordinate space: A4 at 150 DPI. All layout constants live in it. */
export const WORDLIST_CANVAS_WIDTH = 1240
export const WORDLIST_CANVAS_HEIGHT = 1754

// Rasterise at 2x for a 300 DPI page. Going further breaks one of two platform
// limits: 4096 on either dimension (2.5x would be 4385 tall) and 16.7M pixels.
export const WORDLIST_EXPORT_SCALE = 2
export const WORDLIST_BUFFER_WIDTH = WORDLIST_CANVAS_WIDTH * WORDLIST_EXPORT_SCALE
export const WORDLIST_BUFFER_HEIGHT = WORDLIST_CANVAS_HEIGHT * WORDLIST_EXPORT_SCALE

const TABLE_WIDTH = 545
const HEADER_HEIGHT = 44
const ROW_HEIGHT = 68
const COLUMN_WIDTHS = [42, 174, 289, 40]
const TABLE_ORIGINS = [68, 627]
const TABLE_TOP = 142

export interface WordlistPageContent {
  page: WordlistExportPage
  pageIndex: number
  pageCount: number
  mode: WordlistExportMode
  title: string
  subtitle: string
  totalWords: number
}

export function wordlistCellWord(word: WordEntry, mode: WordlistExportMode): string {
  return mode === 'chinese' ? '' : word.word
}

export function wordlistCellMeaning(word: WordEntry, mode: WordlistExportMode): string {
  return mode === 'english' ? '' : word.meaning
}

function drawLine(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color = '#ccd8d2'
) {
  context.beginPath()
  context.strokeStyle = color
  context.lineWidth = 1
  context.moveTo(startX, startY)
  context.lineTo(endX, endY)
  context.stroke()
}

export function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number
): string {
  if (context.measureText(value).width <= maxWidth) return value

  let result = ''
  for (const character of value) {
    if (context.measureText(`${result}${character}...`).width > maxWidth) break
    result += character
  }
  return `${result}...`
}

export function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  if (!value) return []

  const lines: string[] = []
  let current = ''
  for (const character of value) {
    const next = `${current}${character}`
    if (current && context.measureText(next).width > maxWidth) {
      lines.push(current)
      current = character
      if (lines.length === maxLines) break
    } else {
      current = next
    }
  }

  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length === maxLines && lines.join('').length < value.length) {
    lines[maxLines - 1] = fitText(context, `${lines[maxLines - 1]}...`, maxWidth)
  }
  return lines
}

function drawTable(
  context: CanvasRenderingContext2D,
  words: Array<WordEntry | null>,
  columnIndex: number,
  pageIndex: number,
  mode: WordlistExportMode,
  x: number,
  y: number
) {
  const boundaries = COLUMN_WIDTHS.reduce<number[]>((result, width) => {
    result.push((result[result.length - 1] ?? x) + width)
    return result
  }, [x])

  context.fillStyle = '#dfeee7'
  context.fillRect(x, y, TABLE_WIDTH, HEADER_HEIGHT)
  context.fillStyle = '#36534a'
  context.font = '700 18px sans-serif'
  context.textBaseline = 'middle'
  context.textAlign = 'center'
  const headerCenters = COLUMN_WIDTHS.map((width, index) => boundaries[index]! + width / 2)
  ;['序', '单词', '释义', '□'].forEach((label, index) => {
    context.fillText(label, headerCenters[index]!, y + HEADER_HEIGHT / 2)
  })

  words.forEach((word, rowIndex) => {
    const rowY = y + HEADER_HEIGHT + rowIndex * ROW_HEIGHT
    if (rowIndex % 2 === 1) {
      context.fillStyle = '#f6f1e7'
      context.fillRect(x, rowY, TABLE_WIDTH, ROW_HEIGHT)
    }

    if (!word) return
    const rowNumber = pageIndex * 40 + columnIndex * 20 + rowIndex + 1

    context.fillStyle = '#718078'
    context.font = '600 16px sans-serif'
    context.textAlign = 'center'
    context.fillText(String(rowNumber), x + COLUMN_WIDTHS[0]! / 2, rowY + ROW_HEIGHT / 2)

    context.fillStyle = '#17342c'
    context.font = '700 20px sans-serif'
    context.textAlign = 'left'
    context.fillText(
      fitText(context, wordlistCellWord(word, mode), COLUMN_WIDTHS[1]! - 20),
      boundaries[1]! + 10,
      rowY + ROW_HEIGHT / 2
    )

    context.font = '400 16px sans-serif'
    // Set explicitly rather than inheriting from the word above: a centred meaning
    // spills left into the word column, which is how this broke on Android.
    context.textAlign = 'left'
    const meaningLines = wrapText(
      context,
      wordlistCellMeaning(word, mode),
      COLUMN_WIDTHS[2]! - 18
    )
    const lineHeight = 20
    const firstLineY = rowY + ROW_HEIGHT / 2 - ((meaningLines.length - 1) * lineHeight) / 2
    meaningLines.forEach((line, lineIndex) => {
      context.fillText(line, boundaries[2]! + 9, firstLineY + lineIndex * lineHeight)
    })

    context.fillStyle = '#8b9892'
    context.font = '400 21px sans-serif'
    context.textAlign = 'center'
    context.fillText('□', boundaries[3]! + COLUMN_WIDTHS[3]! / 2, rowY + ROW_HEIGHT / 2)
  })

  context.strokeStyle = '#8eb5a5'
  context.lineWidth = 2
  context.strokeRect(x, y, TABLE_WIDTH, HEADER_HEIGHT + ROW_HEIGHT * 20)
  for (let rowIndex = 0; rowIndex <= 20; rowIndex += 1) {
    const rowY = y + HEADER_HEIGHT + rowIndex * ROW_HEIGHT
    drawLine(context, x, rowY, x + TABLE_WIDTH, rowY)
  }
  boundaries.slice(1, -1).forEach(boundary => {
    drawLine(context, boundary, y, boundary, y + HEADER_HEIGHT + ROW_HEIGHT * 20)
  })
}

export function drawWordlistPage(
  context: CanvasRenderingContext2D,
  content: WordlistPageContent
) {
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, WORDLIST_CANVAS_WIDTH, WORDLIST_CANVAS_HEIGHT)

  context.fillStyle = '#17342c'
  context.font = '800 34px sans-serif'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(content.title, 68, 68)

  context.fillStyle = '#718078'
  context.font = '500 20px sans-serif'
  context.textAlign = 'left'
  context.fillText(content.subtitle, 68, 108)
  context.textAlign = 'right'
  context.fillText(`共 ${content.totalWords} 词`, WORDLIST_CANVAS_WIDTH - 68, 108)

  drawTable(
    context, content.page.left, 0, content.pageIndex, content.mode, TABLE_ORIGINS[0]!, TABLE_TOP
  )
  drawTable(
    context, content.page.right, 1, content.pageIndex, content.mode, TABLE_ORIGINS[1]!, TABLE_TOP
  )

  context.fillStyle = '#718078'
  context.font = '500 17px sans-serif'
  context.textAlign = 'left'
  context.fillText('课本单词通 · 纸上默写更专注', 68, 1635)
  context.textAlign = 'right'
  context.fillText(
    `第 ${content.pageIndex + 1}/${content.pageCount} 页`,
    WORDLIST_CANVAS_WIDTH - 68,
    1635
  )
}
