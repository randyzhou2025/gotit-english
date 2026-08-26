import fs from 'node:fs'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// Execute the page's actual export handler with mocked native PDF APIs.
const source = fs.readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
const script = /<script setup lang="ts">([\s\S]*?)<\/script>/.exec(source)![1]!
const ast = ts.createSourceFile('index.ts', script, ts.ScriptTarget.Latest, true)
const handler = ast.statements.find(statement => (
  ts.isFunctionDeclaration(statement) && statement.name?.text === 'exportPdf'
))!
const compiled = ts.transpileModule(handler.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 }
}).outputText

function setupExport() {
  const deps = {
    exporting: { value: false },
    sourceWords: { value: [{}] },
    selectedUnit: { value: { unitId: 'rj:required-1:u1' } },
    exportMode: { value: 'wordlist' },
    shuffled: { value: false },
    exportPages: { value: [{}, {}] },
    exportProgress: { value: '正在生成…' },
    trackAnalyticsEvent: vi.fn(),
    drawExportPage: vi.fn().mockResolvedValue(undefined),
    canvasToJpeg: vi.fn().mockResolvedValue('/tmp/export.jpg'),
    writeAndOpenPdf: vi.fn().mockResolvedValue(undefined),
    submitWordlistExport: vi.fn().mockResolvedValue({ earned: 2 }),
    uni: { showToast: vi.fn() },
    console: { warn: vi.fn(), error: vi.fn() }
  }
  const exportPdf = new Function(...Object.keys(deps), `${compiled}; return exportPdf`)(
    ...Object.values(deps)
  ) as () => Promise<void>
  return { ...deps, exportPdf }
}

describe('wordlist export learning power', () => {
  it.each(['wordlist', 'chinese', 'english'])('awards once per successful %s export, not per PDF page', async mode => {
    const page = setupExport()
    page.exportMode.value = mode
    page.shuffled.value = true
    await page.exportPdf()

    expect(page.drawExportPage).toHaveBeenCalledTimes(2)
    expect(page.writeAndOpenPdf).toHaveBeenCalledOnce()
    expect(page.submitWordlistExport).toHaveBeenCalledExactlyOnceWith({
      exportId: expect.stringMatching(/^export-/), unitId: 'rj:required-1:u1'
    })
    expect(page.exporting.value).toBe(false)
  })

  it('waits for the PDF to open successfully before submitting any score', async () => {
    const page = setupExport()
    let finishOpening!: () => void
    page.writeAndOpenPdf.mockReturnValue(new Promise<void>(resolve => { finishOpening = resolve }))
    const exporting = page.exportPdf()
    await vi.waitFor(() => expect(page.writeAndOpenPdf).toHaveBeenCalledOnce())
    expect(page.submitWordlistExport).not.toHaveBeenCalled()
    finishOpening()
    await exporting
    expect(page.submitWordlistExport).toHaveBeenCalledOnce()
  })

  it.each(['drawExportPage', 'canvasToJpeg', 'writeAndOpenPdf'] as const)('does not award points if %s fails', async action => {
    const page = setupExport()
    page[action].mockRejectedValue(new Error('PDF failed'))
    await page.exportPdf()
    expect(page.submitWordlistExport).not.toHaveBeenCalled()
    expect(page.uni.showToast).toHaveBeenCalledOnce()
    expect(page.exporting.value).toBe(false)
  })

  it('does not block export completion on a pending score request', async () => {
    const page = setupExport()
    page.submitWordlistExport.mockReturnValue(new Promise(() => {}))
    await page.exportPdf()
    expect(page.exporting.value).toBe(false)
    expect(page.exportProgress.value).toBe('正在生成…')
    expect(page.uni.showToast).not.toHaveBeenCalled()
  })

  it('keeps a scoring failure out of the successful export flow', async () => {
    const page = setupExport()
    page.submitWordlistExport.mockRejectedValue(new Error('API offline'))
    await page.exportPdf()
    expect(page.console.warn).toHaveBeenCalledOnce()
    expect(page.console.error).not.toHaveBeenCalled()
    expect(page.uni.showToast).not.toHaveBeenCalled()
    expect(page.exporting.value).toBe(false)
  })

  it('skips busy or empty exports and uses a new id for each completed export', async () => {
    const page = setupExport()
    page.exporting.value = true
    await page.exportPdf()
    expect(page.submitWordlistExport).not.toHaveBeenCalled()
    page.exporting.value = false
    page.sourceWords.value = []
    await page.exportPdf()
    expect(page.submitWordlistExport).not.toHaveBeenCalled()
    page.sourceWords.value = [{}]
    await page.exportPdf()
    await page.exportPdf()
    const calls = page.submitWordlistExport.mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0]![0].exportId).not.toBe(calls[1]![0].exportId)
  })
})
