import { WORKSHEET_COLUMN_WIDTH, WORKSHEET_HEIGHT, WORKSHEET_PROMPT_WIDTH, WORKSHEET_WIDTH, type WorksheetPage } from './worksheet'
import { fitText } from './wordlistCanvas'

export interface WorksheetPageContent {
  page: WorksheetPage
  title: string
  subtitle: string
  pageIndex: number
  pageCount: number
}

export function drawWorksheetPage(context: CanvasRenderingContext2D, content: WorksheetPageContent) {
  const { page } = content
  const answer = page.kind === 'answers'
  const modeLabel = page.mode === 'zh-en' ? '中译英' : '英译中'
  const text = (value: string, x: number, y: number, size = 13, color = '#202329', weight = 400, maxWidth?: number) => {
    context.font = `${weight} ${size}px sans-serif`
    context.fillStyle = color
    if (maxWidth) context.fillText(value, x, y, maxWidth)
    else context.fillText(value, x, y)
  }
  context.fillStyle = '#fff'
  context.fillRect(0, 0, WORKSHEET_WIDTH, WORKSHEET_HEIGHT)
  context.textBaseline = 'alphabetic'
  context.textAlign = 'left'
  context.fillStyle = '#355a96'
  context.fillRect(50, 49, 70, 28)
  context.textAlign = 'center'
  text(modeLabel, 85, 68, 15, '#fff', 500)
  context.textAlign = 'left'
  context.font = '500 23px sans-serif'
  text(fitText(context, content.title + (answer ? ' · 答案' : ''), 608), 134, 72, 23, '#355a96', 500)
  context.font = '400 11px sans-serif'
  text(fitText(context, content.subtitle, 694), 50, 108, 11, '#6b7078')

  page.columns.forEach((column, columnIndex) => {
    const x = 50 + columnIndex * 364
    let y = 148
    for (const row of column) {
      text(String(row.number), x, y, 12, '#41454d')
      row.lines.forEach((value, index) => text(value, x + 26, y + index * 18, 13, '#202329', 400, answer ? 304 : WORKSHEET_PROMPT_WIDTH))
      if (!answer) {
        const last = row.lines[row.lines.length - 1] ?? ''
        const promptWidth = Math.min(context.measureText(last).width, WORKSHEET_PROMPT_WIDTH)
        const baseline = y + (row.lines.length - 1) * 18 + 4
        context.beginPath()
        context.strokeStyle = '#535861'
        context.lineWidth = 0.8
        context.moveTo(x + 26 + promptWidth + 10, baseline)
        context.lineTo(x + WORKSHEET_COLUMN_WIDTH, baseline)
        context.stroke()
      }
      y += row.height
    }
  })
  text('课本单词通版权所有，严禁盗用', 50, 1073, 11, '#62676f')
  context.textAlign = 'right'
  text(`${content.pageIndex + 1} / ${content.pageCount}`, 744, 1073, 10, '#777c84')
}
