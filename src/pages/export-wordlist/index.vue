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
      type="2d"
      class="exportCanvas"
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
import { useVisualTheme } from '@/app/useVisualTheme'
import { useWeappShare } from '@/app/useWeappShare'
import { trackAnalyticsEvent } from '@/core/analytics'
import type { WordEntry } from '@/core/types'
import {
  WORDLIST_BUFFER_HEIGHT,
  WORDLIST_BUFFER_WIDTH,
  WORDLIST_EXPORT_SCALE,
  drawWordlistPage,
  wordlistCellMeaning,
  wordlistCellWord
} from '@/core/wordlistCanvas'
import {
  buildJpegPdf,
  buildWordlistExportFilename,
  buildWordlistExportPages,
  type JpegPdfPage,
  type WordlistExportMode
} from '@/core/wordlistExport'

useWeappShare()
const { activeVisualThemeStyle } = useVisualTheme()

const CANVAS_ID = 'wordlistExportCanvas'
const EXPORT_JPEG_QUALITY = 0.92
const instance = getCurrentInstance()

interface ExportCanvasNode {
  width: number
  height: number
  getContext(contextType: '2d'): CanvasRenderingContext2D
}

let exportCanvas: ExportCanvasNode | null = null

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
  `${activeVisualThemeStyle.value} padding-top: ${miniProgramCapsuleTop.value}px;`
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
  return word ? wordlistCellWord(word, exportMode.value) : ''
}

function previewMeaning(word: WordEntry | null, _columnIndex: number): string {
  return word ? wordlistCellMeaning(word, exportMode.value) : ''
}

// The legacy canvas sized its buffer as CSS size x devicePixelRatio, which put an
// A4 page past the pixel budget Android silently degrades at. Canvas 2D lets us pin
// the buffer to the drawing coordinates instead, so DPR no longer multiplies it.
function resolveExportCanvas(): Promise<ExportCanvasNode> {
  if (exportCanvas) return Promise.resolve(exportCanvas)

  return new Promise((resolve, reject) => {
    uni.createSelectorQuery()
      .in(instance?.proxy)
      .select(`#${CANVAS_ID}`)
      .fields({ node: true, size: true }, () => {})
      .exec(result => {
        const node = (result?.[0] as { node?: ExportCanvasNode } | undefined)?.node
        if (!node) {
          reject(new Error('画布初始化失败，请重试'))
          return
        }
        node.width = WORDLIST_BUFFER_WIDTH
        node.height = WORDLIST_BUFFER_HEIGHT
        exportCanvas = node
        resolve(node)
      })
  })
}

async function drawExportPage(pageIndex: number): Promise<void> {
  const page = exportPages.value[pageIndex]
  if (!page) return

  const canvas = await resolveExportCanvas()
  const context = canvas.getContext('2d')
  // Overwrite rather than compose: some runtimes hand back a context already scaled
  // by devicePixelRatio, which would stack on top of the export scale.
  context.setTransform(
    WORDLIST_EXPORT_SCALE, 0, 0, WORDLIST_EXPORT_SCALE, 0, 0
  )

  drawWordlistPage(context, {
    page,
    pageIndex,
    pageCount: exportPages.value.length,
    mode: exportMode.value,
    title: previewTitle.value,
    subtitle: unitTitle.value,
    totalWords: sourceWords.value.length
  })
}

function canvasToJpeg(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvas: exportCanvas,
      x: 0,
      y: 0,
      width: WORDLIST_BUFFER_WIDTH,
      height: WORDLIST_BUFFER_HEIGHT,
      destWidth: WORDLIST_BUFFER_WIDTH,
      destHeight: WORDLIST_BUFFER_HEIGHT,
      fileType: 'jpg',
      quality: EXPORT_JPEG_QUALITY,
      success: result => resolve(result.tempFilePath),
      fail: reject
    } as UniNamespace.CanvasToTempFilePathOptions, instance?.proxy)
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
      width: WORDLIST_BUFFER_WIDTH,
      height: WORDLIST_BUFFER_HEIGHT
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

  const unit = selectedUnit.value
  trackAnalyticsEvent('wordlist_export_click', {
    mode: exportMode.value,
    shuffled: shuffled.value,
    unitId: unit?.unitId,
    bookId: unit?.bookId,
    publisherName: unit?.publisherName,
    bookName: unit?.bookName,
    unitName: unit?.unitName,
    wordCount: sourceWords.value.length,
    pageCount: exportPages.value.length
  })
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
  background: var(--surface);
}

.modeOption.isActive {
  border: 2px solid var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 5px 12px var(--ink-shadow);
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
  box-shadow: 0 8px 18px var(--accent-shadow);
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

/* Matches the Canvas 2D buffer 1:1 so the export crop reads the same whether the
   runtime measures it in CSS pixels or buffer pixels. */
.exportCanvas {
  position: fixed;
  top: 0;
  left: -2600px;
  width: 2480px;
  height: 3508px;
  pointer-events: none;
}
</style>

<script lang="ts">
export default {
  onShareAppMessage() {},
  onShareTimeline() {}
}
</script>
