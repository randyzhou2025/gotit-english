import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, nextTick, reactive, ref, watch } from 'vue'
import ts from 'typescript'

const shellSource = fs.readFileSync(new URL('../PracticeShellInner.vue', import.meta.url), 'utf8')
const homeSource = fs.readFileSync(new URL('./HomeRedesign.vue', import.meta.url), 'utf8')
const bootSource = fs.readFileSync(new URL('../PracticeShell.vue', import.meta.url), 'utf8')

function scriptOf(source: string) {
  return ts.createSourceFile('component.ts', source.split('<script setup lang="ts">')[1]!.split('</script>')[0]!, ts.ScriptTarget.Latest, true)
}

function evaluate(source: string, bindings: Record<string, unknown>, result = ''): any {
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
  }).outputText
  return new Function(...Object.keys(bindings), `${js}\n${result}`)(...Object.values(bindings))
}

describe('home startup work', () => {
  const scopes: ReturnType<typeof effectScope>[] = []

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    scopes.splice(0).forEach(scope => scope.stop())
    vi.useRealTimers()
  })

  it('passes only the four displayed Unit fields and keeps them reactive', () => {
    const script = scriptOf(shellSource)
    const declaration = script.statements.find(statement =>
      ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => item.name.getText(script) === 'homeUnitSummary'))
    expect(declaration).toBeDefined()

    const selectedUnit = ref({
      unitId: 'rj:required-1:u1', bookName: '必修第一册', unitName: 'Unit 1', publisherName: '人教版',
      words: Array.from({ length: 47 }, () => ({ word: 'test', meaning: '测试', exampleSentence: 'a'.repeat(200) }))
    })
    const summary = evaluate(declaration!.getText(script), { computed, selectedUnit }, 'return homeUnitSummary;')
    expect(Object.keys(summary.value).sort()).toEqual(['bookName', 'publisherName', 'unitId', 'unitName'])
    expect(JSON.stringify(summary.value).length).toBeLessThan(JSON.stringify(selectedUnit.value).length / 50)
    selectedUnit.value.unitName = 'Unit 2'
    expect(summary.value.unitName).toBe('Unit 2')
    expect(shellSource).toContain(':selected-unit="homeUnitSummary"')
    expect(homeSource).toContain("Pick<UnitGroup, 'unitId' | 'bookName' | 'unitName' | 'publisherName'>")
  })

  it('checks only the current cover on a ready home, and the list only on a visible selection page', async () => {
    const script = scriptOf(shellSource)
    const watchers = script.statements.filter(statement => ts.isExpressionStatement(statement)
      && ts.isCallExpression(statement.expression) && statement.expression.expression.getText(script) === 'watch'
      && statement.getText(script).includes('ensureTextbookCoverVersion'))
    expect(watchers).toHaveLength(2)
    const pageContentReady = ref(false)
    const shellVisible = ref(true)
    const activeScreen = ref('home')
    const selectedUnit = ref({ publisherId: 'rj', bookId: 'required-1' })
    const courseSetupPublisherId = ref('rj')
    const courseSetupBookOptions = ref([{ id: 'required-1' }, { id: 'required-2' }])
    const ensureTextbookCoverVersion = vi.fn()
    const scope = effectScope(); scopes.push(scope)
    scope.run(() => evaluate(watchers.map(statement => statement.getText(script)).join('\n'), {
      watch, pageContentReady, shellVisible, activeScreen, selectedUnit,
      courseSetupPublisherId, courseSetupBookOptions, ensureTextbookCoverVersion
    }))
    expect(ensureTextbookCoverVersion).not.toHaveBeenCalled()

    pageContentReady.value = true
    await nextTick()
    expect(ensureTextbookCoverVersion.mock.calls).toEqual([['rj', 'required-1']])
    ensureTextbookCoverVersion.mockClear()
    courseSetupBookOptions.value.push({ id: 'required-3' })
    await nextTick()
    expect(ensureTextbookCoverVersion).not.toHaveBeenCalled()

    activeScreen.value = 'courseSetup'
    await nextTick()
    expect(ensureTextbookCoverVersion.mock.calls).toEqual([
      ['rj', 'required-1'], ['rj', 'required-2'], ['rj', 'required-3']
    ])
    ensureTextbookCoverVersion.mockClear()
    shellVisible.value = false
    courseSetupPublisherId.value = 'ylj'
    await nextTick()
    expect(ensureTextbookCoverVersion).not.toHaveBeenCalled()
  })

  function mountHome() {
    const script = scriptOf(homeSource)
    const props = reactive({ selectedUnit: { unitId: 'rj:required-1:u1' }, contentReady: false })
    const getUnitEggForDate = vi.fn().mockResolvedValue({ id: 'egg-1' })
    const cleanups: Array<() => void> = []
    const scope = effectScope(); scopes.push(scope)
    const state = scope.run(() => evaluate(script.statements.filter(statement => !ts.isImportDeclaration(statement))
      .map(statement => statement.getText(script)).join('\n'), {
      computed, ref, watch, defineProps: () => props, defineEmits: () => vi.fn(),
      onBeforeUnmount: (cleanup: () => void) => cleanups.push(cleanup), getUnitEggForDate,
      estimateDictationSeconds: vi.fn(), formatEstimatedMinutes: vi.fn()
    }, 'return { unitEgg };'))
    return { props, getUnitEggForDate, state, unmount: () => { cleanups.forEach(cleanup => cleanup()); scope.stop() } }
  }

  it('does not parse or download eggs until content is ready and the delay has elapsed', async () => {
    const { props, getUnitEggForDate, state } = mountHome()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(getUnitEggForDate).not.toHaveBeenCalled()
    props.contentReady = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(299)
    expect(getUnitEggForDate).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(getUnitEggForDate).toHaveBeenCalledWith('rj:required-1:u1')
    expect(state.unitEgg.value).toEqual({ id: 'egg-1' })
  })

  it('cancels hidden/unmounted work and loads only the latest Unit on return', async () => {
    const home = mountHome()
    home.props.contentReady = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    home.props.contentReady = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(home.getUnitEggForDate).not.toHaveBeenCalled()
    home.props.selectedUnit.unitId = 'ylj:required-1:u2'
    home.props.contentReady = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(home.getUnitEggForDate.mock.calls).toEqual([['ylj:required-1:u2']])
    home.props.selectedUnit.unitId = 'ylj:required-1:u3'
    await nextTick()
    home.unmount()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(home.getUnitEggForDate).toHaveBeenCalledTimes(1)
  })

  it('ignores an in-flight egg result after leaving and preserves a loaded egg on return', async () => {
    const home = mountHome()
    let resolveEgg!: (egg: { id: string }) => void
    home.getUnitEggForDate.mockReturnValueOnce(new Promise(resolve => { resolveEgg = resolve }))
    home.props.contentReady = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    home.props.contentReady = false
    await nextTick()
    resolveEgg({ id: 'stale-egg' })
    await vi.advanceTimersByTimeAsync(0)
    expect(home.state.unitEgg.value).toBeNull()

    home.props.contentReady = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(home.state.unitEgg.value).toEqual({ id: 'egg-1' })
    home.props.contentReady = false
    await nextTick()
    home.props.contentReady = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(home.getUnitEggForDate).toHaveBeenCalledTimes(2)
    expect(home.state.unitEgg.value).toEqual({ id: 'egg-1' })
  })

  it('delays feedback on the home only, deduplicates readiness, and cancels it on hide', async () => {
    const script = scriptOf(shellSource)
    const watcher = script.statements.find(statement => ts.isExpressionStatement(statement)
      && ts.isCallExpression(statement.expression) && statement.expression.expression.getText(script) === 'watch'
      && statement.getText(script).includes('feedbackRefreshTimer'))
    expect(watcher).toBeDefined()
    const pageContentReady = ref(false)
    const shellVisible = ref(true)
    const activeScreen = ref('home')
    const refreshFeedbackUnread = vi.fn()
    const scope = effectScope(); scopes.push(scope)
    scope.run(() => evaluate(`let feedbackRefreshTimer = null;\n${watcher!.getText(script)}`, {
      watch, pageContentReady, shellVisible, activeScreen, refreshFeedbackUnread,
      isHostingPageActive: () => true
    }))
    await vi.advanceTimersByTimeAsync(5_000)
    expect(refreshFeedbackUnread).not.toHaveBeenCalled()
    pageContentReady.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(299)
    expect(refreshFeedbackUnread).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(refreshFeedbackUnread).toHaveBeenCalledTimes(1)
    pageContentReady.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(refreshFeedbackUnread).toHaveBeenCalledTimes(1)

    pageContentReady.value = false
    await nextTick()
    pageContentReady.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    pageContentReady.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(refreshFeedbackUnread).toHaveBeenCalledTimes(1)
    activeScreen.value = 'courseSetup'
    pageContentReady.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(refreshFeedbackUnread).toHaveBeenCalledTimes(1)
  })

  it('releases the app gate from the rendered shell instead of its skeleton', () => {
    expect(bootSource).toContain('deferAppPageReady()')
    expect(bootSource).toContain('@content-ready="markAppPageContentReady"')
    const start = shellSource.indexOf('function handlePageShow()')
    const show = shellSource.slice(start, shellSource.indexOf('\n}\n', start))
    expect(show).not.toContain('refreshFeedbackUnread()')
    expect(show).toContain('nextTick(')
    expect(show).toContain("emit('content-ready')")
  })

  it('signals readiness for a new user selection page only after the native render callback', async () => {
    const script = scriptOf(shellSource)
    const handler = script.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'handlePageShow')
    expect(handler).toBeDefined()
    const pageContentReady = ref(false)
    const shellVisible = ref(false)
    const emit = vi.fn()
    let finishRender!: () => void
    const rendered = new Promise<void>(resolve => { finishRender = resolve })
    const nativeTick = vi.fn(() => rendered)
    const handlePageShow = evaluate(`let pageShowRevision = 0;\n${handler!.getText(script)}`, {
      nextTick, instance: { proxy: { $nextTick: nativeTick } }, pageContentReady, shellVisible, emit,
      props: { routeScreen: 'courseSetup' }, isHostingPageActive: () => true,
      updateMiniProgramNavInset: vi.fn(), configureMiniProgramAudioPlayback: vi.fn(),
      refreshTodayDictationWordCount: vi.fn(), activateRouteScreen: vi.fn(), activateTabRoot: vi.fn(),
      syncNativeTabBar: vi.fn(), syncNativeWeakbookBadge: vi.fn()
    }, 'return handlePageShow;')
    handlePageShow()
    await nextTick()
    expect(nativeTick).toHaveBeenCalledTimes(1)
    expect(pageContentReady.value).toBe(false)
    expect(emit).not.toHaveBeenCalled()
    finishRender()
    await nextTick()
    expect(pageContentReady.value).toBe(true)
    expect(emit).toHaveBeenCalledWith('content-ready')
  })
})
