<template>
  <view class="exportScreen" :style="screenStyle">
    <view class="exportNav">
      <view class="navBack" @tap="goBack">
        <view class="chevronLeft" />
      </view>
      <view class="navCopy">
        <text class="navTitle">导出词表</text>
        <text class="navMeta">{{ unitTitle }} · 共 {{ sourceWords.length }} 词 {{ exportPages.length }} 页</text>
      </view>
    </view>

    <scroll-view scroll-y class="exportScroll" :show-scrollbar="false">
      <view class="previewStage">
        <view class="previewPaper">
          <view class="paperHeader">
            <view>
              <text class="paperTitle">{{ previewTitle }}</text>
              <text class="paperSubtitle">{{ unitTitle }}</text>
            </view>
          </view>

          <view class="previewTables">
            <view
              v-for="(column, columnIndex) in previewColumns"
              :key="columnIndex"
              class="previewTable"
            >
              <view class="previewTableHeader">
                <text class="previewNumber">序</text>
                <text class="previewWord">单词</text>
                <text class="previewMeaning">释义</text>
                <text class="previewCheck">□</text>
              </view>
              <view
                v-for="(word, rowIndex) in column"
                :key="`${columnIndex}-${rowIndex}`"
                :class="['previewRow', rowIndex % 2 === 1 && 'isTinted']"
              >
                <text class="previewNumber">{{ word ? previewRowNumber(columnIndex, rowIndex) : '' }}</text>
                <text class="previewWord">{{ previewWord(word, columnIndex) }}</text>
                <text class="previewMeaning">{{ previewMeaning(word, columnIndex) }}</text>
                <text class="previewCheck">{{ word ? '□' : '' }}</text>
              </view>
            </view>
          </view>

          <view class="paperFooter">
            <text>课本单词通 · 纸上默写更专注</text>
            <text>第 1/{{ exportPages.length }} 页</text>
          </view>
        </view>
      </view>

      <view class="exportControls">
        <view class="modeGrid">
          <view
            v-for="option in modeOptions"
            :key="option.value"
            :class="['modeOption', exportMode === option.value && 'isActive']"
            @tap="exportMode = option.value"
          >
            <text class="modeTitle">{{ option.label }}</text>
            <text v-if="option.subtitle" class="modeSubtitle">{{ option.subtitle }}</text>
          </view>
        </view>

        <view class="shuffleRow" @tap="toggleShuffle">
          <view>
            <text class="shuffleTitle">乱序导出</text>
            <text class="shuffleMeta">打乱当前 Unit 的单词顺序</text>
          </view>
          <view :class="['shuffleSwitch', shuffled && 'isActive']">
            <view class="shuffleThumb" />
          </view>
        </view>

        <view
          :class="['exportButton', exporting && 'isDisabled']"
          @tap="exportPdf"
        >
          <text>{{ exporting ? exportProgress : '导出 PDF 词表' }}</text>
        </view>
        <text class="exportHint">导出后将在微信文档中打开，可通过右上角保存或转发。</text>
      </view>
    </scroll-view>

    <canvas
      :id="CANVAS_ID"
      :canvas-id="CANVAS_ID"
      class="exportCanvas"
      :width="CANVAS_WIDTH"
      :height="CANVAS_HEIGHT"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeMount, onMounted, ref } from 'vue'
import {
  ensurePracticeSessionReady,
  isPracticeSessionReady,
  usePracticeSession
} from '@/app/usePracticeSession'
import type { WordEntry } from '@/core/types'
import {
  buildJpegPdf,
  buildWordlistExportFilename,
  buildWordlistExportPages,
  type JpegPdfPage,
  type WordlistExportMode
} from '@/core/wordlistExport'

const CANVAS_ID = 'wordlistExportCanvas'
const CANVAS_WIDTH = 1240
const CANVAS_HEIGHT = 1754
const instance = getCurrentInstance()

const ready = ref(isPracticeSessionReady())
const exporting = ref(false)
const exportProgress = ref('正在生成…')
const exportMode = ref<WordlistExportMode>('wordlist')
const shuffled = ref(false)
const shuffledWords = ref<WordEntry[]>([])
const miniProgramNavTop = ref(16)
const miniProgramCapsuleTop = ref(44)
const miniProgramCapsuleHeight = ref(32)

const modeOptions: Array<{
  value: WordlistExportMode
  label: string
  subtitle?: string
}> = [
  { value: 'wordlist', label: '单词表' },
  { value: 'chinese', label: '中文词表', subtitle: '默写英文单词' },
  { value: 'english', label: '英文词表', subtitle: '默写中文释义' }
]

const session = computed(() => ready.value ? usePracticeSession() : null)
const selectedUnit = computed(() => session.value?.selectedUnit.value)
const sourceWords = computed(() => selectedUnit.value?.words ?? [])
const orderedWords = computed(() => shuffled.value ? shuffledWords.value : sourceWords.value)
const exportPages = computed(() => buildWordlistExportPages(orderedWords.value))
const previewColumns = computed(() => {
  const page = exportPages.value[0]
  return page ? [page.left, page.right] : [[], []]
})
const unitTitle = computed(() => {
  const unit = selectedUnit.value
  return unit ? `${unit.bookName} · ${unit.unitName}` : '当前 Unit'
})
const previewTitle = computed(() => {
  if (exportMode.value === 'chinese') return '中文词表 · 默写单词'
  if (exportMode.value === 'english') return '英文词表 · 默写释义'
  return '单词表'
})
const screenStyle = computed(() => (
  `padding-top: ${miniProgramCapsuleTop.value}px;`
  + ` --capsule-top: ${miniProgramCapsuleTop.value}px;`
  + ` --capsule-h: ${miniProgramCapsuleHeight.value}px;`
  + ` --nav-top: ${miniProgramNavTop.value}px;`
))

function updateMiniProgramNavInset() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect?.()
    if (menuButton && menuButton.top > 0) {
      miniProgramCapsuleTop.value = menuButton.top
      miniProgramCapsuleHeight.value = menuButton.height
      miniProgramNavTop.value = Math.max(8, menuButton.top - 8)
    }
  } catch {
    // Preview runtimes may not expose the WeChat capsule geometry.
  }
}

function goBack() {
  uni.navigateBack()
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = result[index]!
    result[index] = result[swapIndex]!
    result[swapIndex] = current
  }
  return result
}

function toggleShuffle() {
  shuffled.value = !shuffled.value
  if (shuffled.value) {
    shuffledWords.value = shuffle(sourceWords.value)
  }
}

function previewRowNumber(columnIndex: number, rowIndex: number): number {
  return columnIndex * 20 + rowIndex + 1
}

function previewWord(word: WordEntry | null, _columnIndex: number): string {
  if (!word) return ''
  if (exportMode.value === 'chinese') return ''
  return word.word
}

function previewMeaning(word: WordEntry | null, _columnIndex: number): string {
  if (!word) return ''
  if (exportMode.value === 'english') return ''
  return word.meaning
}

function drawLine(
  context: UniNamespace.CanvasContext,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color = '#ccd8d2'
) {
  context.beginPath()
  context.setStrokeStyle(color)
  context.setLineWidth(1)
  context.moveTo(startX, startY)
  context.lineTo(endX, endY)
  context.stroke()
}

function fitText(
  context: UniNamespace.CanvasContext,
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

function wrapText(
  context: UniNamespace.CanvasContext,
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
  context: UniNamespace.CanvasContext,
  words: Array<WordEntry | null>,
  columnIndex: number,
  pageIndex: number,
  x: number,
  y: number
) {
  const tableWidth = 545
  const headerHeight = 44
  const rowHeight = 68
  const widths = [42, 174, 289, 40]
  const boundaries = widths.reduce<number[]>((result, width) => {
    result.push((result[result.length - 1] ?? x) + width)
    return result
  }, [x])

  context.setFillStyle('#dfeee7')
  context.fillRect(x, y, tableWidth, headerHeight)
  context.setFillStyle('#36534a')
  context.font = '700 18px sans-serif'
  context.setTextBaseline('middle')
  context.setTextAlign('center')
  const headerCenters = widths.map((width, index) => boundaries[index]! + width / 2)
  ;['序', '单词', '释义', '□'].forEach((label, index) => {
    context.fillText(label, headerCenters[index]!, y + headerHeight / 2)
  })

  words.forEach((word, rowIndex) => {
    const rowY = y + headerHeight + rowIndex * rowHeight
    if (rowIndex % 2 === 1) {
      context.setFillStyle('#f6f1e7')
      context.fillRect(x, rowY, tableWidth, rowHeight)
    }

    if (!word) return
    const rowNumber = pageIndex * 40 + columnIndex * 20 + rowIndex + 1
    const wordValue = previewWord(word, columnIndex)
    const meaningValue = previewMeaning(word, columnIndex)

    context.setFillStyle('#718078')
    context.font = '600 16px sans-serif'
    context.setTextAlign('center')
    context.fillText(String(rowNumber), x + widths[0]! / 2, rowY + rowHeight / 2)

    context.setFillStyle('#17342c')
    context.font = '700 20px sans-serif'
    context.setTextAlign('left')
    context.fillText(
      fitText(context, wordValue, widths[1]! - 20),
      boundaries[1]! + 10,
      rowY + rowHeight / 2
    )

    context.font = '400 16px sans-serif'
    const meaningLines = wrapText(context, meaningValue, widths[2]! - 18)
    const lineHeight = 20
    const firstLineY = rowY + rowHeight / 2 - ((meaningLines.length - 1) * lineHeight) / 2
    meaningLines.forEach((line, lineIndex) => {
      context.fillText(line, boundaries[2]! + 9, firstLineY + lineIndex * lineHeight)
    })

    context.setFillStyle('#8b9892')
    context.font = '400 21px sans-serif'
    context.setTextAlign('center')
    context.fillText('□', boundaries[3]! + widths[3]! / 2, rowY + rowHeight / 2)
  })

  context.setStrokeStyle('#8eb5a5')
  context.setLineWidth(2)
  context.strokeRect(x, y, tableWidth, headerHeight + rowHeight * 20)
  for (let rowIndex = 0; rowIndex <= 20; rowIndex += 1) {
    const rowY = y + headerHeight + rowIndex * rowHeight
    drawLine(context, x, rowY, x + tableWidth, rowY)
  }
  boundaries.slice(1, -1).forEach(boundary => {
    drawLine(context, boundary, y, boundary, y + headerHeight + rowHeight * 20)
  })
}

function drawExportPage(pageIndex: number): Promise<void> {
  const page = exportPages.value[pageIndex]
  if (!page) return Promise.resolve()

  const context = uni.createCanvasContext(CANVAS_ID, instance?.proxy)
  context.setFillStyle('#ffffff')
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  context.setFillStyle('#17342c')
  context.font = '800 34px sans-serif'
  context.setTextAlign('left')
  context.setTextBaseline('middle')
  context.fillText(previewTitle.value, 68, 68)

  context.setFillStyle('#718078')
  context.font = '500 20px sans-serif'
  context.fillText(unitTitle.value, 68, 108)
  context.setTextAlign('right')
  context.fillText(`共 ${sourceWords.value.length} 词`, CANVAS_WIDTH - 68, 108)

  drawTable(context, page.left, 0, pageIndex, 68, 142)
  drawTable(context, page.right, 1, pageIndex, 627, 142)

  context.setFillStyle('#718078')
  context.font = '500 17px sans-serif'
  context.setTextAlign('left')
  context.fillText('课本单词通 · 纸上默写更专注', 68, 1635)
  context.setTextAlign('right')
  context.fillText(
    `第 ${pageIndex + 1}/${exportPages.value.length} 页`,
    CANVAS_WIDTH - 68,
    1635
  )

  return new Promise(resolve => {
    context.draw(false, () => resolve())
  })
}

function canvasToJpeg(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId: CANVAS_ID,
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      destWidth: CANVAS_WIDTH,
      destHeight: CANVAS_HEIGHT,
      fileType: 'jpg',
      quality: 0.98,
      success: result => resolve(result.tempFilePath),
      fail: reject
    }, instance?.proxy)
  })
}

async function writeAndOpenPdf(imagePaths: string[]) {
  const runtime = uni as typeof uni & {
    env?: { USER_DATA_PATH?: string }
  }
  const userDataPath = runtime.env?.USER_DATA_PATH
  if (!userDataPath) {
    throw new Error('当前环境不支持微信 PDF 文件导出')
  }

  const fileSystem = uni.getFileSystemManager()
  const jpegPages: JpegPdfPage[] = imagePaths.map(filePath => {
    const data = fileSystem.readFileSync(filePath)
    if (typeof data === 'string') {
      throw new Error('图片数据读取失败')
    }
    return {
      bytes: new Uint8Array(data),
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    }
  })
  const pdf = buildJpegPdf(jpegPages)
  const pdfBuffer = new ArrayBuffer(pdf.byteLength)
  new Uint8Array(pdfBuffer).set(pdf)
  const unit = selectedUnit.value
  const fileName = buildWordlistExportFilename(
    unit?.bookId ?? '',
    unit?.unitName ?? '',
    exportMode.value
  )
  const filePath = `${userDataPath}/${fileName}`

  await new Promise<void>((resolve, reject) => {
    fileSystem.writeFile({
      filePath,
      data: pdfBuffer,
      success: () => resolve(),
      fail: reject
    })
  })

  await new Promise<void>((resolve, reject) => {
    uni.openDocument({
      filePath,
      fileType: 'pdf',
      showMenu: true,
      success: () => resolve(),
      fail: reject
    })
  })
}

async function exportPdf() {
  if (exporting.value || sourceWords.value.length === 0) return

  exporting.value = true
  const imagePaths: string[] = []
  try {
    for (let pageIndex = 0; pageIndex < exportPages.value.length; pageIndex += 1) {
      exportProgress.value = `正在生成 ${pageIndex + 1}/${exportPages.value.length} 页`
      await drawExportPage(pageIndex)
      imagePaths.push(await canvasToJpeg())
    }
    exportProgress.value = '正在打开 PDF…'
    await writeAndOpenPdf(imagePaths)
  } catch (error) {
    console.error('[wordlist-export] PDF export failed', error)
    uni.showToast({
      title: error instanceof Error ? error.message : '导出失败，请稍后重试',
      icon: 'none',
      duration: 2600
    })
  } finally {
    exporting.value = false
    exportProgress.value = '正在生成…'
  }
}

onBeforeMount(async () => {
  if (ready.value) return
  try {
    await ensurePracticeSessionReady()
    ready.value = true
  } catch (error) {
    console.error('[wordlist-export] session bootstrap failed', error)
    uni.showToast({ title: '词库加载失败，请检查网络', icon: 'none' })
  }
})

onMounted(() => {
  updateMiniProgramNavInset()
})
</script>

<style scoped lang="scss">
.exportScreen {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background: var(--page-bg);
}

.exportNav {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: var(--capsule-h, 32px);
  padding: 0 54px;
}

.navBack {
  position: absolute;
  top: 50%;
  left: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--capsule-h, 32px);
  height: var(--capsule-h, 32px);
  transform: translateY(-50%);
}

.chevronLeft {
  width: 10px;
  height: 10px;
  border-width: 0 0 2px 2px;
  border-style: solid;
  border-color: var(--ink);
  transform: rotate(45deg);
}

.navCopy {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.navTitle {
  color: var(--ink);
  font-size: 17px;
  line-height: 1.05;
  font-weight: 850;
}

.navMeta {
  max-width: 270px;
  margin-top: 4px;
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exportScroll {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 12px;
}

.previewStage {
  display: flex;
  justify-content: center;
  padding: 16px 14px 20px;
  background: #e9e7e1;
}

.previewPaper {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 340px;
  aspect-ratio: 210 / 297;
  padding: 15px 13px 12px;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(23, 52, 44, 0.09);
}

.paperHeader,
.paperFooter {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
}

.paperTitle,
.paperSubtitle {
  display: block;
}

.paperTitle {
  color: var(--ink);
  font-size: 11px;
  font-weight: 850;
}

.paperSubtitle {
  max-width: 235px;
  margin-top: 3px;
  overflow: hidden;
  color: var(--muted);
  font-size: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.previewTables {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  min-height: 0;
  margin-top: 9px;
}

.previewTable {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #8eb5a5;
}

.previewTableHeader,
.previewRow {
  display: grid;
  grid-template-columns: 17px 52px minmax(0, 1fr) 16px;
  align-items: center;
}

.previewTableHeader {
  flex: 0 0 17px;
  background: #dfeee7;
  color: var(--ink-soft);
  font-size: 5px;
  font-weight: 800;
}

.previewRow {
  flex: 1 1 0;
  min-height: 0;
  color: var(--ink);
  font-size: 4.5px;
}

.previewRow.isTinted {
  background: #f6f1e7;
}

.previewNumber,
.previewCheck,
.previewWord,
.previewMeaning {
  box-sizing: border-box;
  display: flex;
  align-self: stretch;
  align-items: center;
  min-width: 0;
  height: 100%;
}

.previewNumber,
.previewCheck {
  justify-content: center;
  text-align: center;
}

.previewNumber {
  color: var(--muted);
}

.previewWord,
.previewMeaning {
  padding: 0 3px;
  overflow: hidden;
  border-left: 1px solid rgba(142, 181, 165, 0.42);
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.previewWord {
  font-weight: 750;
}

.previewMeaning {
  border-right: 1px solid rgba(142, 181, 165, 0.42);
}

.paperFooter {
  margin-top: 8px;
  color: var(--muted);
  font-size: 5.5px;
}

.exportControls {
  padding: 24px 22px calc(24px + env(safe-area-inset-bottom));
  background: var(--surface);
}

.modeGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.modeOption {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70px;
  padding: 7px 5px;
  border: 1.5px solid var(--line-strong);
  border-radius: 12px;
  background: #fff;
}

.modeOption.isActive {
  border: 2px solid var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 5px 12px rgba(23, 107, 80, 0.08);
}

.modeTitle {
  color: var(--ink);
  font-size: 13px;
  line-height: 1;
  font-weight: 850;
}

.modeSubtitle {
  margin-top: 6px;
  color: var(--muted);
  font-size: 8.5px;
  line-height: 1.25;
  text-align: center;
}

.shuffleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  margin-top: 14px;
  padding: 8px 13px;
  border-radius: 12px;
  background: var(--surface-soft);
}

.shuffleTitle,
.shuffleMeta {
  display: block;
}

.shuffleTitle {
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
}

.shuffleMeta {
  margin-top: 4px;
  color: var(--muted);
  font-size: 8.5px;
}

.shuffleSwitch {
  position: relative;
  width: 40px;
  height: 24px;
  border-radius: 999px;
  background: #d7dad8;
  transition: background-color 160ms ease;
}

.shuffleThumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 5px rgba(23, 52, 44, 0.15);
  transition: transform 160ms ease;
}

.shuffleSwitch.isActive {
  background: var(--accent);
}

.shuffleSwitch.isActive .shuffleThumb {
  transform: translateX(16px);
}

.exportButton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  margin-top: 12px;
  border-radius: 13px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 850;
  box-shadow: 0 8px 18px rgba(23, 107, 80, 0.18);
}

.exportButton:active {
  background: var(--accent-strong);
  transform: translateY(1px);
}

.exportButton.isDisabled {
  opacity: 0.68;
}

.exportHint {
  display: block;
  margin-top: 7px;
  color: var(--muted);
  font-size: 8.5px;
  line-height: 1.4;
  text-align: center;
}

.exportCanvas {
  position: fixed;
  top: 0;
  left: -1400px;
  width: 1240px;
  height: 1754px;
  pointer-events: none;
}
</style>
