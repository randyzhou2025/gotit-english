<template>
  <view class="worksheetScreen" :style="screenStyle">
    <FixedPageHeader>
      <view class="worksheetNav">
        <button class="backButton" aria-label="返回" @tap="goBack"><view class="backIcon" /></button>
        <text class="navTitle">{{ navTitle }}</text>
      </view>
      <view v-if="stage !== 'done'" class="steps">
        <view v-for="(label, index) in stepLabels" :key="label" :class="['step', stepIndex === index && 'isActive']">
          <text class="stepNumber">{{ index + 1 }}</text><text>{{ label }}</text>
        </view>
      </view>
    </FixedPageHeader>

    <view v-if="loading || loadError" class="bootState">
      <text class="sectionTitle">{{ loading ? '正在加载教材词库' : '暂时无法加载词库' }}</text>
      <text v-if="loadError" class="muted">{{ loadError }}</text>
      <button v-if="loadError" class="secondaryButton" @tap="loadBook">重新加载</button>
    </view>

    <scroll-view v-else-if="stage === 'scope'" scroll-y class="scopeScroll" :show-scrollbar="false">
      <view class="sectionHeading">
        <text class="sectionTitle">选择范围</text>
      </view>
      <view class="bookCard">
        <image v-if="!coverFailed" class="bookCover" :src="bookCover" mode="aspectFit" @error="coverFailed = true" />
        <view v-else class="coverFallback">课本</view>
        <view class="bookCopy"><text class="muted">{{ currentUnit?.publisherName }}</text><text class="bookTitle">{{ currentUnit?.bookName }}</text></view>
        <text class="bookTag">当前教材</text>
      </view>
      <view class="listHeading"><text class="listTitle">选择单元</text><button class="textButton" @tap="toggleAllUnits">{{ allUnitsSelected ? '取消全选' : '全选本册' }}</button></view>
      <view class="unitList">
        <view v-for="unit in bookUnits" :key="unit.unitId" class="unitRow" hover-class="rowPressed" role="checkbox" :aria-checked="selectedUnitIds.includes(unit.unitId)" :aria-label="unit.unitName" @tap="toggleUnit(unit)">
          <text class="unitName">{{ unit.unitName }}</text><text class="unitCount">{{ unit.words.length }}词</text>
          <view :class="['checkbox', selectedUnitIds.includes(unit.unitId) && 'isChecked']"><text v-if="selectedUnitIds.includes(unit.unitId)">✓</text></view>
        </view>
      </view>
    </scroll-view>

    <view v-else-if="stage === 'words'" class="wordsStage">
      <view class="sectionHeading wordsHeading">
        <text class="sectionTitle">选择单词</text>
        <view class="listHeading"><text class="selectedCount">已选 {{ selectedWords.length }} / {{ sourceWords.length }} 词</text><button class="textButton mutedButton" @tap="selectedWordIds = []">清空已选</button></view>
      </view>
      <scroll-view scroll-x class="filterScroll" :show-scrollbar="false">
        <view class="filterChips">
          <button :class="['filterChip', unitFilter === '' && 'isActive']" @tap="setFilter('')">全部</button>
          <button v-for="unit in selectedUnits" :key="unit.unitId" :class="['filterChip', unitFilter === unit.unitId && 'isActive']" @tap="setFilter(unit.unitId)">{{ unit.unitName }}</button>
        </view>
      </scroll-view>
      <view class="searchBox"><view class="searchIcon" /><input v-model="query" class="searchInput" placeholder="搜英文或中文释义" aria-label="搜索单词或释义" confirm-type="search" /></view>
      <view class="wordListHeading"><text class="muted small">{{ unitFilter ? selectedUnits.find(unit => unit.unitId === unitFilter)?.unitName : '按课本顺序显示' }}</text><button class="textButton" @tap="selectVisible">全选当前列表</button></view>
      <scroll-view scroll-y class="wordScroll" :show-scrollbar="false">
        <view v-if="!visibleWords.length" class="emptyList"><text class="listTitle">没有找到匹配的词</text><text class="muted">试试英文拼写或中文释义</text></view>
        <view v-for="word in visibleWords" :key="word.id" class="wordRow" hover-class="rowPressed" role="checkbox" :aria-checked="selectedWordSet.has(word.id)" :aria-label="word.word" @tap="toggleWord(word.id)">
          <view :class="['checkbox', selectedWordSet.has(word.id) && 'isChecked']"><text v-if="selectedWordSet.has(word.id)">✓</text></view>
          <view class="wordCopy"><text class="wordEnglish">{{ word.word }}</text><text class="wordMeaning">{{ word.meaning }}</text></view>
          <text class="wordUnit">{{ word.unitName }}</text>
        </view>
      </scroll-view>
    </view>

    <view v-else-if="stage === 'preview'" class="previewStage">
      <view class="listHeading previewHeading"><text class="previewTitle">{{ selectedUnits.length }}个单元 · {{ selectedWords.length }}个词</text><button class="settingsButton" @tap="openSettings">设置</button></view>
      <view class="modeTabs" role="group" aria-label="默写方向"><button v-for="option in modeOptions" :key="option.value" :class="['modeTab', mode === option.value && 'isActive']" :aria-pressed="mode === option.value" @tap="switchMode(option.value)">{{ option.label }}</button></view>
      <view class="paperTabs"><button :class="['paperTab', previewKind === 'questions' && 'isActive']" @tap="switchPreview('questions')">默写卷 {{ questionPages.length }}页</button><button :class="['paperTab', previewKind === 'answers' && 'isActive']" @tap="switchPreview('answers')">答案 {{ answerPages.length }}页</button></view>
      <view class="paperWrap">
        <image v-if="previewImage && !previewLoading && !previewError" class="previewPaper" :src="previewImage" mode="aspectFit" aria-label="A4卷面预览，点击放大" @tap="zoomPreview" />
        <view v-if="previewLoading || previewError" class="paperStatus"><text class="muted">{{ previewLoading ? '正在排版…' : previewError }}</text><button v-if="previewError" class="textButton" @tap="renderPreview">重新预览</button></view>
        <button v-if="previewImage && !previewLoading && !previewError" class="zoomButton" aria-label="放大查看卷面" @tap="zoomPreview">放大</button>
      </view>
      <view class="pager"><button class="pagerButton" :disabled="previewPage === 0" aria-label="上一页" @tap="previewPage -= 1">‹</button><text>{{ previewPage + 1 }} / {{ displayedPages.length }}</text><button class="pagerButton" :disabled="previewPage >= displayedPages.length - 1" aria-label="下一页" @tap="previewPage += 1">›</button></view>
    </view>

    <scroll-view v-else class="doneScroll" scroll-y :show-scrollbar="false">
      <view class="doneHeading"><view class="successIcon">✓</view><text class="sectionTitle">PDF 已生成</text></view>
      <view class="fileCard"><view class="fileIcon">▤</view><view class="fileCopy"><text class="fileTitle">{{ title }}</text><text class="muted">{{ selectedWords.length }}词 · {{ modeLabel }} · 默写卷{{ questionPages.length }}页 + 答案{{ answerPages.length }}页</text><text class="small muted">PDF文档 · A4打印</text></view></view>
      <view class="donePreviews"><view v-for="kind in paperKinds" :key="kind" class="donePreview"><image :src="thumbnails[kind]" mode="aspectFit" @tap="zoomThumbnail(kind)" /><text class="muted">{{ kind === 'questions' ? modeLabel : '答案' }}</text></view></view>
      <button class="primaryButton" @tap="openPdf">打开 PDF</button>
      <button class="secondaryButton shareButton" @tap="sharePdf">{{ shareLabel }}</button>
      <button class="textButton editAgain" @tap="stage = 'words'">返回调整选词</button>
    </scroll-view>

    <view v-if="!loading && !loadError && stage !== 'done'" class="footer">
      <view v-if="stage === 'scope'" class="footerSummary"><text>已选 {{ selectedUnits.length }} 个单元</text><text class="muted small">共{{ sourceWords.length }}个词可挑选</text></view>
      <text v-if="stage === 'words'" class="footerWords">{{ selectedWords.length ? `已选 ${selectedWords.length} 词，来自${selectedUnits.length}个单元` : '还没选词，请勾选或全选当前列表' }}</text>
      <button v-if="stage === 'scope'" class="primaryButton" :disabled="!selectedUnits.length" @tap="stage = 'words'">下一步，选择单词</button>
      <button v-else-if="stage === 'words'" class="primaryButton" :disabled="!selectedWords.length" @tap="stage = 'preview'">预览默写卷</button>
      <button v-else class="primaryButton" @tap="generatePdf">生成 PDF · 共{{ pages.length }}页</button>
    </view>

    <view v-if="settingsOpen" class="overlay settingsOverlay" @tap="settingsOpen = false">
      <view class="settingsSheet" @tap.stop>
        <view class="sheetHandle" /><view class="listHeading"><text class="sectionTitle">卷面设置</text><button class="closeButton" aria-label="关闭卷面设置" @tap="settingsOpen = false">×</button></view>
        <text class="fieldLabel">卷子标题</text><input v-model="draftTitle" class="titleInput" maxlength="20" aria-label="卷子标题" />
        <text class="fieldLabel orderLabel">题目顺序</text><view class="orderOptions"><button :class="['orderOption', draftOrder === 'sequence' && 'isActive']" @tap="draftOrder = 'sequence'">课本顺序</button><button :class="['orderOption', draftOrder === 'shuffle' && 'isActive']" @tap="draftOrder = 'shuffle'">打乱顺序</button></view>
        <button class="primaryButton" @tap="applySettings">应用设置</button>
      </view>
    </view>

    <view v-if="exportStatus !== 'idle'" class="overlay" @tap.stop>
      <view class="exportDialog">
        <view :class="['dialogIcon', exportStatus === 'error' && 'errorIcon']">{{ exportStatus === 'error' ? '↻' : '▤' }}</view>
        <text class="dialogTitle">{{ exportStatus === 'error' ? '这次没有生成成功' : '正在生成默写卷' }}</text>
        <text class="dialogMeta">{{ exportStatus === 'error' ? exportError : exportProgress }}</text>
        <view v-if="exportStatus === 'generating'" class="progressTrack"><view class="progressFill" :style="{ width: `${completedPages / Math.max(1, pages.length) * 100}%` }" /></view>
        <button v-else class="primaryButton" @tap="generatePdf">重新生成</button>
        <button class="textButton cancelButton" @tap="cancelExport">{{ exportStatus === 'error' ? '返回卷面预览' : '取消，返回预览' }}</button>
      </view>
    </view>
    <!-- #ifdef MP-WEIXIN -->
    <canvas :id="CANVAS_ID" type="2d" class="renderCanvas" />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeMount, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import FixedPageHeader from '@/components/FixedPageHeader.vue'
import { ensurePracticeSessionReady } from '@/app/usePracticeSession'
import { useVisualTheme } from '@/app/useVisualTheme'
import { useWeappShare } from '@/app/useWeappShare'
import { buildTextbookCoverUrl } from '@/core/textbookCover'
import { trackAnalyticsEvent } from '@/core/analytics'
import type { UnitGroup, WordEntry } from '@/core/types'
import { buildWorksheetPages, shuffleWorksheetWords, worksheetBookUnits, worksheetDefaultTitle, worksheetSelection, WORKSHEET_HEIGHT, WORKSHEET_WIDTH, type WorksheetPage, type WorksheetMode } from '@/core/worksheet'
import { drawWorksheetPage } from '@/core/worksheetCanvas'
import { WORDLIST_BUFFER_HEIGHT, WORDLIST_BUFFER_WIDTH } from '@/core/wordlistCanvas'
import { buildJpegPdf, type JpegPdfPage } from '@/core/wordlistExport'

useWeappShare()
const { activeVisualThemeStyle } = useVisualTheme()
const instance = getCurrentInstance()
const CANVAS_ID = 'worksheetExportCanvas'
const stage = ref<'scope' | 'words' | 'preview' | 'done'>('scope')
const loading = ref(true)
const loadError = ref('')
const currentUnit = shallowRef<UnitGroup>()
const bookUnits = shallowRef<UnitGroup[]>([])
const selectedUnitIds = ref<string[]>([])
const selectedWordIds = ref<string[]>([])
const unitFilter = ref('')
const query = ref('')
const order = ref<'sequence' | 'shuffle'>('sequence')
const orderedWords = shallowRef<WordEntry[]>([])
const customTitle = ref('')
const settingsOpen = ref(false)
const draftTitle = ref('')
const draftOrder = ref<'sequence' | 'shuffle'>('sequence')
const coverFailed = ref(false)
const navTop = ref(44)
const navHeight = ref(32)
const mode = ref<WorksheetMode>('zh-en')
const modeOptions = [{ value: 'zh-en' as const, label: '中译英' }, { value: 'en-zh' as const, label: '英译中' }]
const modeLabel = computed(() => mode.value === 'zh-en' ? '中译英' : '英译中')
// #ifdef H5
navTop.value = 16
// #endif
const screenStyle = computed(() => `${activeVisualThemeStyle.value} padding-top: ${navTop.value}px; --capsule-h: ${navHeight.value}px;`)
const stepLabels = ['选范围', '选单词', '预览']
const paperKinds = ['questions', 'answers'] as const
const stepIndex = computed(() => stage.value === 'scope' ? 0 : stage.value === 'words' ? 1 : 2)
const navTitle = computed(() => ({ scope: '生成默写卷', words: '挑选单词', preview: '卷面预览', done: '默写卷已生成' })[stage.value])
const bookCover = computed(() => currentUnit.value ? buildTextbookCoverUrl(currentUnit.value.publisherId, currentUnit.value.bookId) : '')
const selectedUnits = computed(() => bookUnits.value.filter(unit => selectedUnitIds.value.includes(unit.unitId)))
const sourceWords = computed(() => selectedUnits.value.flatMap(unit => unit.words))
const selectedWordSet = computed(() => new Set(selectedWordIds.value))
const selectedWords = computed(() => worksheetSelection(bookUnits.value, selectedUnitIds.value, selectedWordIds.value))
const allUnitsSelected = computed(() => bookUnits.value.length > 0 && selectedUnits.value.length === bookUnits.value.length)
const visibleWords = computed(() => {
  const search = query.value.trim().toLowerCase()
  return sourceWords.value.filter(word => (!unitFilter.value || word.unitId === unitFilter.value)
    && (!search || `${word.word} ${word.meaning}`.toLowerCase().includes(search)))
})
const title = computed(() => customTitle.value || worksheetDefaultTitle(bookUnits.value, selectedUnitIds.value))
const subtitle = computed(() => {
  const book = currentUnit.value
  const range = allUnitsSelected.value ? '' : selectedUnits.value.map(unit => unit.unitName).join('、')
  return [book?.publisherName, book?.bookName, range].filter(Boolean).join(' · ')
})
const pages = computed(() => buildWorksheetPages(orderedWords.value, mode.value))
const questionPages = computed(() => pages.value.filter(page => page.kind === 'questions'))
const answerPages = computed(() => pages.value.filter(page => page.kind === 'answers'))
const previewKind = ref<'questions' | 'answers'>('questions')
const previewPage = ref(0)
const displayedPages = computed(() => previewKind.value === 'questions' ? questionPages.value : answerPages.value)
const previewImage = ref('')
const previewLoading = ref(false)
const previewError = ref('')
const thumbnails = ref({ questions: '', answers: '' })
const exportStatus = ref<'idle' | 'generating' | 'error'>('idle')
const completedPages = ref(0)
const exportProgress = ref('')
const exportError = ref('')
let jobToken = 0
let previewToken = 0
let disposed = false
let renderQueue: Promise<unknown> = Promise.resolve()
let pdfPath = ''
let pdfName = ''
let browserPdfUrl = ''
const temporaryImages = new Set<string>()
interface ExportCanvas { width: number; height: number; getContext(type: '2d'): CanvasRenderingContext2D | null }
let canvas: ExportCanvas | null = null
const shareLabel = ref('转发文件')
// #ifdef H5
shareLabel.value = '保存 PDF'
// #endif

watch([selectedWords, order], () => {
  orderedWords.value = order.value === 'shuffle' ? shuffleWorksheetWords(selectedWords.value) : [...selectedWords.value]
  previewPage.value = 0
})
watch([stage, previewKind, previewPage, pages, title], () => {
  if (stage.value === 'preview' && exportStatus.value === 'idle') void renderPreview()
}, { flush: 'post' })

async function loadBook() {
  loading.value = true
  loadError.value = ''
  try {
    const session = await ensurePracticeSessionReady()
    const unit = session.selectedUnit.value
    if (!unit) throw new Error('请先返回首页选择教材，再进入默写卷')
    currentUnit.value = unit
    bookUnits.value = worksheetBookUnits(session.units.value, unit)
    selectedUnitIds.value = [unit.unitId]
    selectedWordIds.value = unit.words.map(word => word.id)
    orderedWords.value = [...unit.words]
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '词库加载失败，请检查网络'
  } finally { loading.value = false }
}

function toggleUnit(unit: UnitGroup) {
  if (selectedUnitIds.value.includes(unit.unitId)) {
    selectedUnitIds.value = selectedUnitIds.value.filter(id => id !== unit.unitId)
    const removed = new Set(unit.words.map(word => word.id))
    selectedWordIds.value = selectedWordIds.value.filter(id => !removed.has(id))
  } else {
    selectedUnitIds.value = [...selectedUnitIds.value, unit.unitId]
    selectedWordIds.value = [...selectedWordIds.value, ...unit.words.map(word => word.id)]
  }
  unitFilter.value = ''
}
function toggleAllUnits() {
  const clear = allUnitsSelected.value
  selectedUnitIds.value = clear ? [] : bookUnits.value.map(unit => unit.unitId)
  selectedWordIds.value = clear ? [] : bookUnits.value.flatMap(unit => unit.words.map(word => word.id))
  unitFilter.value = ''
}
function toggleWord(id: string) { selectedWordIds.value = selectedWordSet.value.has(id) ? selectedWordIds.value.filter(value => value !== id) : [...selectedWordIds.value, id] }
function selectVisible() {
  const additions = visibleWords.value.filter(word => !selectedWordSet.value.has(word.id))
  if (additions.length) selectedWordIds.value = [...selectedWordIds.value, ...additions.map(word => word.id)]
}
function setFilter(id: string) { unitFilter.value = id; query.value = '' }
function switchMode(nextMode: WorksheetMode) {
  if (nextMode === mode.value) return
  mode.value = nextMode
  previewPage.value = 0
}
function switchPreview(kind: 'questions' | 'answers') { previewKind.value = kind; previewPage.value = 0 }
function openSettings() { draftTitle.value = title.value; draftOrder.value = order.value; settingsOpen.value = true }
function applySettings() {
  const nextTitle = draftTitle.value.trim()
  if (!nextTitle) { uni.showToast({ title: '请填写卷子标题', icon: 'none' }); return }
  if (nextTitle !== title.value) customTitle.value = nextTitle
  order.value = draftOrder.value
  settingsOpen.value = false
}
function goBack() {
  if (exportStatus.value !== 'idle') { cancelExport(); return }
  if (settingsOpen.value) { settingsOpen.value = false; return }
  if (stage.value === 'words') { stage.value = 'scope'; return }
  if (stage.value === 'preview' || stage.value === 'done') { stage.value = 'words'; return }
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}

async function resolveCanvas(): Promise<ExportCanvas> {
  if (canvas) return canvas
  // #ifdef H5
  canvas = document.createElement('canvas')
  // #endif
  // #ifdef MP-WEIXIN
  await nextTick()
  canvas = await new Promise<ExportCanvas>((resolve, reject) => {
    uni.createSelectorQuery().in(instance?.proxy).select(`#${CANVAS_ID}`).fields({ node: true, size: true }, () => {}).exec(result => {
      const node = (result?.[0] as { node?: ExportCanvas } | undefined)?.node
      if (node) resolve(node)
      else reject(new Error('画布初始化失败，请重试'))
    })
  })
  // #endif
  if (!canvas) throw new Error('当前环境暂不支持生成 PDF，请在微信小程序中使用')
  canvas.width = WORDLIST_BUFFER_WIDTH
  canvas.height = WORDLIST_BUFFER_HEIGHT
  return canvas
}

function renderPage(page: WorksheetPage, pageIndex: number, pageCount: number, pageTitle: string, pageSubtitle: string): Promise<string> {
  // Preview and export share one 300-dpi canvas; serialize draws to prevent mixed pages.
  const task = renderQueue.catch(() => {}).then(async () => {
    if (disposed) throw new Error('页面已关闭')
    const node = await resolveCanvas()
    const context = node.getContext('2d')
    if (!context) throw new Error('画布初始化失败，请重试')
    context.setTransform(WORDLIST_BUFFER_WIDTH / WORKSHEET_WIDTH, 0, 0, WORDLIST_BUFFER_HEIGHT / WORKSHEET_HEIGHT, 0, 0)
    drawWorksheetPage(context, { page, pageIndex, pageCount, title: pageTitle, subtitle: pageSubtitle })
    // #ifdef H5
    return (node as HTMLCanvasElement).toDataURL('image/jpeg', 0.92)
    // #endif
    // #ifdef MP-WEIXIN
    return new Promise<string>((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvas: node, x: 0, y: 0, width: WORDLIST_BUFFER_WIDTH, height: WORDLIST_BUFFER_HEIGHT,
        destWidth: WORDLIST_BUFFER_WIDTH, destHeight: WORDLIST_BUFFER_HEIGHT, fileType: 'jpg', quality: 0.92,
        success: result => { temporaryImages.add(result.tempFilePath); resolve(result.tempFilePath) }, fail: reject
      } as UniNamespace.CanvasToTempFilePathOptions, instance?.proxy)
    })
    // #endif
    throw new Error('当前环境暂不支持生成 PDF')
  })
  renderQueue = task
  return task
}

async function renderPreview() {
  const token = ++previewToken
  const page = displayedPages.value[previewPage.value]
  if (!page || disposed) return
  previewLoading.value = true
  previewError.value = ''
  try {
    const image = await renderPage(page, previewPage.value, displayedPages.value.length, title.value, subtitle.value)
    if (token === previewToken && !disposed) previewImage.value = image
  } catch (error) {
    if (token === previewToken && !disposed) previewError.value = '卷面加载失败，可以重新预览'
  } finally { if (token === previewToken && !disposed) previewLoading.value = false }
}
function zoomPreview() { if (previewImage.value) uni.previewImage({ urls: [previewImage.value] }) }
function zoomThumbnail(kind: 'questions' | 'answers') { uni.previewImage({ urls: [thumbnails.value[kind]] }) }

async function readJpeg(path: string): Promise<Uint8Array> {
  // #ifdef H5
  const encoded = path.slice(path.indexOf(',') + 1)
  return Uint8Array.from(atob(encoded), character => character.charCodeAt(0))
  // #endif
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({ filePath: path, success: result => resolve(new Uint8Array(result.data as ArrayBuffer)), fail: reject })
  })
  // #endif
  throw new Error('当前环境暂不支持读取 PDF 图片')
}

async function savePdf(bytes: Uint8Array, name: string): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  // #ifdef H5
  if (browserPdfUrl) URL.revokeObjectURL(browserPdfUrl)
  browserPdfUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
  return browserPdfUrl
  // #endif
  // #ifdef MP-WEIXIN
  const directory = (uni as typeof uni & { env?: { USER_DATA_PATH?: string } }).env?.USER_DATA_PATH
  if (!directory) throw new Error('当前环境不支持文件导出')
  const path = `${directory}/${name}`
  await new Promise<void>((resolve, reject) => { uni.getFileSystemManager().writeFile({ filePath: path, data: buffer, success: () => resolve(), fail: reject }) })
  return path
  // #endif
  throw new Error('当前环境暂不支持保存 PDF')
}

async function generatePdf() {
  if (exportStatus.value === 'generating' || !pages.value.length) return
  const token = ++jobToken
  ++previewToken
  exportStatus.value = 'generating'
  completedPages.value = 0
  exportError.value = ''
  const exportPages = [...pages.value]
  const exportTitle = title.value
  const exportSubtitle = subtitle.value
  const images: JpegPdfPage[] = []
  const nextThumbnails = { questions: '', answers: '' }
  const counts = { questions: questionPages.value.length, answers: answerPages.value.length }
  const indices = { questions: 0, answers: 0 }
  trackAnalyticsEvent('wordlist_export_click', { mode: 'worksheet', direction: mode.value, shuffled: order.value === 'shuffle', publisherName: currentUnit.value?.publisherName, bookId: currentUnit.value?.bookId, bookName: currentUnit.value?.bookName, unitCount: selectedUnits.value.length, wordCount: selectedWords.value.length, pageCount: exportPages.length })
  try {
    for (const page of exportPages) {
      if (token !== jobToken || disposed) return
      exportProgress.value = `正在生成 ${completedPages.value + 1}/${exportPages.length} 页`
      const image = await renderPage(page, indices[page.kind]++, counts[page.kind], exportTitle, exportSubtitle)
      if (token !== jobToken || disposed) return
      if (!nextThumbnails[page.kind]) nextThumbnails[page.kind] = image
      images.push({ bytes: await readJpeg(image), width: WORDLIST_BUFFER_WIDTH, height: WORDLIST_BUFFER_HEIGHT })
      if (token !== jobToken || disposed) return
      completedPages.value += 1
      // Let the native UI paint progress and accept cancellation between pages.
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    if (token !== jobToken || disposed) return
    exportProgress.value = '正在整理 PDF 文件…'
    const bytes = buildJpegPdf(images)
    const book = `${currentUnit.value?.publisherId ?? 'publisher'}-${currentUnit.value?.bookId ?? 'textbook'}`.replace(/[^a-z0-9-]/gi, '-')
    // Replace this book's generated copy rather than accumulating full-book PDFs.
    const name = `${book}-worksheet-${mode.value}.pdf`
    const path = await savePdf(bytes, name)
    if (token !== jobToken || disposed) return
    pdfPath = path
    pdfName = name
    thumbnails.value = nextThumbnails
    exportStatus.value = 'idle'
    stage.value = 'done'
  } catch (error) {
    if (token !== jobToken || disposed) return
    console.error('[worksheet] PDF generation failed', error)
    exportError.value = '选词和排版都已保留，可以直接重试'
    exportStatus.value = 'error'
  }
}
function cancelExport() {
  jobToken += 1
  exportStatus.value = 'idle'
  stage.value = 'preview'
  void renderPreview()
}
function openPdf() {
  if (!pdfPath) return
  // #ifdef H5
  window.open(pdfPath, '_blank')
  return
  // #endif
  uni.openDocument({ filePath: pdfPath, fileType: 'pdf', showMenu: true, fail: () => uni.showToast({ title: '文件打开失败，请重试', icon: 'none' }) })
}
function sharePdf() {
  if (!pdfPath) return
  // #ifdef H5
  const link = document.createElement('a')
  link.href = pdfPath
  link.download = pdfName
  link.click()
  return
  // #endif
  // #ifdef MP-WEIXIN
  if (typeof uni.shareFileMessage === 'function') {
    uni.shareFileMessage({ filePath: pdfPath, fileName: pdfName, fail: (error: { errMsg?: string }) => {
      if (!error.errMsg?.includes('cancel')) uni.showToast({ title: '转发未成功，可打开文件后重试', icon: 'none' })
    } })
  } else openPdf()
  // #endif
}

onBeforeMount(loadBook)
function updateNavInset() {
  // #ifdef MP-WEIXIN
  const statusBarHeight = uni.getWindowInfo().statusBarHeight || 0
  if (statusBarHeight > 0) navTop.value = statusBarHeight + 8
  try {
    const capsule = uni.getMenuButtonBoundingClientRect?.()
    if (capsule && capsule.top > 0 && capsule.top >= statusBarHeight) {
      navTop.value = capsule.top
      navHeight.value = capsule.height || 32
    }
  } catch { /* Keep the status-bar inset when capsule geometry is unavailable. */ }
  // #endif
}
updateNavInset()
onBeforeUnmount(() => {
  disposed = true
  ++jobToken
  ++previewToken
  // #ifdef H5
  if (browserPdfUrl) URL.revokeObjectURL(browserPdfUrl)
  // #endif
  // #ifdef MP-WEIXIN
  for (const path of temporaryImages) uni.getFileSystemManager().unlink({ filePath: path, fail: () => {} })
  // #endif
})
</script>

<style scoped lang="scss">
.worksheetScreen { display: flex; flex-direction: column; box-sizing: border-box; height: 100vh; height: 100dvh; overflow: hidden; background: var(--page-bg); color: var(--ink); }
button { display: flex; align-items: center; justify-content: center; box-sizing: border-box; margin: 0; padding: 0; border: 0; font-family: inherit; line-height: normal; background: transparent; color: inherit; }
button::after { border: 0; }
button[disabled] { opacity: 1; }
.worksheetNav { position: relative; display: flex; align-items: center; justify-content: center; height: var(--capsule-h, 32px); padding: 0 88px; }
.navTitle { font-size: 18px; line-height: 1; font-weight: 800; text-align: center; }
.backButton { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; }
.backIcon { width: 10px; height: 10px; border: solid var(--ink); border-width: 0 0 2px 2px; transform: rotate(45deg); }
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 22px 20px 18px; }
.step { display: flex; align-items: center; justify-content: center; gap: 13px; padding: 9px 12px; border-radius: 10px; font-size: 12px; color: var(--muted); }
.step.isActive { background: var(--accent-soft); color: var(--accent); font-weight: 650; }
.stepNumber { font-size: 11px; }
.sectionTitle { display: block; font-size: 25px; line-height: 1.4; font-weight: 650; letter-spacing: -.5px; }
.muted { display: block; color: var(--muted); font-size: 12px; line-height: 1.6; }
.small { font-size: 11px; }
.sectionHeading { padding: 12px 20px 20px; }
.sectionHeading > .muted { margin-top: 9px; font-size: 13px; }
.scopeScroll { flex: 1; min-height: 0; }
.bookCard { display: flex; align-items: center; gap: 16px; margin: 0 20px 21px; padding: 13px 15px; border-radius: 18px; background: var(--surface); }
.bookCover, .coverFallback { flex-shrink: 0; width: 46px; height: 67px; }
.coverFallback { display: flex; align-items: center; justify-content: center; border-radius: 5px; background: var(--accent-soft); font-size: 13px; }
.bookCopy { min-width: 0; flex: 1; }
.bookTitle { display: block; margin-top: 6px; font-size: 20px; line-height: 1.3; font-weight: 650; }
.bookTag { align-self: center; flex-shrink: 0; color: var(--muted); font-size: 10px; }
.listHeading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.scopeScroll .listHeading { margin: 0 20px 8px; }
.listTitle { font-size: 17px; font-weight: 650; }
.textButton { display: flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 2px; font-size: 12px; color: var(--accent); }
.unitList { margin: 0 20px; padding: 0 16px; border-radius: 18px; overflow: hidden; background: var(--surface); }
.unitRow { display: flex; align-items: center; gap: 22px; min-height: 49px; border-bottom: 1px solid var(--line); }
.unitRow:last-child { border-bottom: 0; }
.unitName { flex: 1; font-size: 15px; font-weight: 500; }
.unitCount { font-size: 12px; color: var(--muted); }
.checkbox { display: flex; align-items: center; justify-content: center; flex: 0 0 22px; box-sizing: border-box; width: 22px; height: 22px; border: 1px solid var(--line-strong); border-radius: 6px; background: var(--surface); color: white; font-size: 15px; }
.checkbox.isChecked { background: var(--accent); border-color: var(--accent); }
.rowPressed { opacity: .65; }
.footer { flex: 0 0 auto; padding: 12px 20px calc(18px + env(safe-area-inset-bottom)); background: var(--page-bg); }
.footerSummary { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 22px; font-size: 15px; font-weight: 600; }
.footerSummary .muted { font-weight: 400; }
.primaryButton, .secondaryButton { display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 100%; height: 52px; border-radius: 15px; font-size: 16px; font-weight: 650; }
.primaryButton { background: var(--accent); color: #fff; }
.primaryButton:active { background: var(--accent-strong); }
.primaryButton[disabled] { background: var(--line); color: var(--muted); }
.secondaryButton { border: 1px solid var(--line-strong); background: var(--surface); color: var(--accent); }
.wordsStage { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 0 20px; }
.wordsHeading { padding: 12px 0 8px; }
.selectedCount { color: var(--accent); font-size: 14px; font-weight: 650; }
.mutedButton { color: var(--muted); }
.filterScroll { flex: 0 0 40px; width: 100%; white-space: nowrap; }
.filterChips { display: inline-flex; gap: 7px; }
.filterChip { flex: 0 0 auto; min-width: 82px; height: 30px; padding: 0 15px; border-radius: 10px; background: var(--surface-cool); color: var(--muted); font-size: 12px; }
.filterChip.isActive { background: var(--accent); color: white; font-weight: 600; }
.searchBox { display: flex; align-items: center; flex: 0 0 44px; gap: 13px; padding: 0 16px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
.searchIcon { position: relative; box-sizing: border-box; width: 14px; height: 14px; border: 1.5px solid var(--muted); border-radius: 50%; }
.searchIcon::after { content: ''; position: absolute; bottom: -4px; right: -3px; width: 6px; height: 1.5px; transform: rotate(45deg); background: var(--muted); }
.searchInput { flex: 1; min-width: 0; height: 40px; font-size: 14px; }
.wordListHeading { display: flex; justify-content: space-between; align-items: center; flex: 0 0 42px; }
.wordScroll { flex: 1; min-height: 0; border-radius: 17px; overflow: hidden; background: var(--surface); }
.wordRow { display: flex; align-items: center; gap: 14px; min-height: 60px; margin: 0 14px; border-bottom: 1px solid var(--line); }
.wordCopy { flex: 1; min-width: 0; padding: 8px 0; }
.wordEnglish { display: block; font-size: 16px; font-weight: 550; overflow-wrap: anywhere; }
.wordMeaning { display: block; margin-top: 3px; font-size: 11px; line-height: 1.4; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wordUnit { flex: 0 0 auto; max-width: 65px; font-size: 10px; color: var(--muted); }
.emptyList { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 220px; padding: 20px; }
.footerWords { display: block; margin: 3px 0 17px; font-size: 13px; line-height: 1.4; }
.previewStage { display: flex; flex: 1; min-height: 0; flex-direction: column; padding: 10px 20px 0; }
.previewHeading { flex: 0 0 auto; }
.previewTitle { font-size: 22px; line-height: 1.4; font-weight: 650; }
.settingsButton { flex-shrink: 0; padding: 10px 12px; border-radius: 11px; background: var(--surface); color: var(--accent); font-size: 12px; }
.modeTabs { display: flex; flex: 0 0 40px; gap: 8px; margin: 12px 0; }
.modeTab { flex: 1; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--muted); font-size: 14px; }
.modeTab.isActive { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 650; }
.paperTabs { display: flex; flex: 0 0 42px; box-sizing: border-box; padding: 4px; border-radius: 12px; background: var(--surface-cool); }
.paperTab { flex: 1; border-radius: 9px; font-size: 13px; color: var(--muted); }
.paperTab.isActive { background: var(--surface); color: var(--accent); font-weight: 600; }
.paperWrap { position: relative; flex: 1; min-height: 0; margin: 16px 0 5px; }
.previewPaper { position: absolute; inset: 0; width: 100%; height: 100%; }
.paperStatus { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.zoomButton { position: absolute; bottom: 5px; right: 0; padding: 10px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--accent); font-size: 11px; }
.pager { display: flex; align-items: center; justify-content: center; flex: 0 0 35px; gap: 32px; color: var(--muted); font-size: 12px; }
.pagerButton { width: 44px; height: 35px; font-size: 24px; color: var(--accent); }
.pagerButton[disabled] { color: var(--muted-light); }
.doneScroll { flex: 1; min-height: 0; box-sizing: border-box; padding: 23px 20px calc(20px + env(safe-area-inset-bottom)); }
.doneHeading { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 13px; }
.doneHeading .sectionTitle { font-size: 23px; }
.successIcon { display: flex; align-items: center; justify-content: center; width: 68px; height: 68px; margin: 8px 0 13px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-size: 34px; }
.fileCard { display: flex; align-items: center; gap: 16px; margin-top: 29px; padding: 20px 16px; border-radius: 18px; background: var(--surface); }
.fileIcon { display: flex; justify-content: center; align-items: center; flex: 0 0 45px; height: 58px; border-radius: 11px; background: var(--accent-soft); color: var(--accent); font-size: 27px; }
.fileCopy { min-width: 0; }
.fileTitle { display: block; font-size: 15px; line-height: 1.4; font-weight: 650; overflow-wrap: anywhere; }
.fileCopy .muted { margin-top: 6px; }
.donePreviews { display: flex; justify-content: center; gap: 30px; margin: 25px 0 24px; }
.donePreview { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.donePreview image { width: 120px; height: 170px; background: white; }
.shareButton { margin-top: 12px; }
.editAgain { width: 100%; margin-top: 10px; }
.overlay { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(11, 39, 27, .35); }
.settingsOverlay { align-items: flex-end; padding: 0; }
.settingsSheet { box-sizing: border-box; width: 100%; max-width: 520px; padding: 12px 24px calc(20px + env(safe-area-inset-bottom)); border-radius: 25px 25px 0 0; background: var(--surface); }
.sheetHandle { width: 48px; height: 5px; margin: 0 auto 15px; border-radius: 3px; background: var(--line-strong); }
.settingsSheet .sectionTitle { font-size: 22px; }
.closeButton { width: 40px; height: 40px; font-size: 26px; color: var(--muted); }
.fieldLabel { display: block; margin: 16px 0 12px; font-size: 13px; color: var(--muted); }
.titleInput { box-sizing: border-box; width: 100%; height: 49px; padding: 0 15px; border-radius: 12px; background: var(--surface-soft); font-size: 15px; }
.orderLabel { margin-top: 27px; }
.orderOptions { display: flex; gap: 12px; }
.orderOption { display: flex; flex: 1; align-items: center; justify-content: center; height: 45px; border: 1px solid transparent; border-radius: 12px; background: var(--surface-soft); color: var(--muted); font-size: 14px; }
.orderOption.isActive { border-color: var(--line-strong); background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.settingsSheet > .primaryButton { margin-top: 24px; }
.exportDialog { display: flex; flex-direction: column; align-items: center; box-sizing: border-box; width: 100%; max-width: 342px; padding: 25px 21px 18px; border-radius: 25px; background: var(--surface); }
.dialogIcon { display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; margin-bottom: 25px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-size: 30px; }
.errorIcon { background: #fff0e7; color: #a84432; }
.dialogTitle { font-size: 21px; font-weight: 650; }
.dialogMeta { margin: 18px 0 25px; font-size: 12px; line-height: 1.6; color: var(--muted); text-align: center; }
.progressTrack { width: 100%; height: 5px; border-radius: 3px; overflow: hidden; background: var(--line); }
.progressFill { height: 100%; background: var(--accent); }
.cancelButton { margin-top: 18px; min-height: 44px; }
.bootState { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 24px; text-align: center; }
.bootState .sectionTitle { font-size: 21px; }
.bootState .secondaryButton { max-width: 250px; margin-top: 15px; }
.renderCanvas { position: fixed; left: -10000px; top: -10000px; width: 1240px; height: 1754px; pointer-events: none; }
@media (max-width: 350px) { .sectionTitle { font-size: 22px; } .previewTitle { font-size: 19px; } .step { gap: 8px; padding: 9px; } .bookTag { display: none; } .donePreviews { gap: 20px; } .donePreview image { width: 105px; height: 149px; } }
</style>
