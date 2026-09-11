import fs from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./FixedPageHeader.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!
const compiled = ts.transpileModule(script + '\nexports.styles = { spaceStyle, barStyle };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText

function fixture() {
  const hooks: Record<string, () => void> = {}
  let measurements = [{ top: -156, left: 18, width: 357 }, { height: 60 }, { scrollTop: 200 }]
  let queries = 0
  const query = {
    in: () => query, select: () => query, selectViewport: () => query,
    boundingClientRect: () => query, scrollOffset: () => query,
    exec: (callback: (rows: unknown[]) => void) => { queries++; callback(measurements) }
  }
  const lifecycle = {
    getCurrentInstance: () => ({ proxy: {} }), ref: (value: unknown) => ({ value }),
    computed: (get: () => unknown) => ({ get value() { return get() } }),
    nextTick: (callback: () => void) => Promise.resolve().then(callback),
    onMounted: (callback: () => void) => { hooks.mount = callback },
    onUpdated: (callback: () => void) => { hooks.update = callback },
    onBeforeUnmount: (callback: () => void) => { hooks.unmount = callback },
    onShow: (callback: () => void) => { hooks.show = callback }
  }
  const context = {
    exports: {} as { styles: { spaceStyle: { value: string }; barStyle: { value: string } } },
    require: () => lifecycle, defineProps: () => ({}),
    uni: {
      createSelectorQuery: () => query, getWindowInfo: () => ({ windowWidth: 393 }),
      onWindowResize: (callback: () => void) => { hooks.resize = callback }, offWindowResize: () => {}
    }
  }
  runInNewContext(compiled, context)
  return { hooks, styles: context.exports.styles, count: () => queries, set: (rows: typeof measurements) => { measurements = rows } }
}

describe('fixed page header layout', () => {
  it('waits for mounted layout and compensates for a restored page scroll position', async () => {
    const state = fixture()
    state.hooks.show!()
    await Promise.resolve()
    expect(state.count()).toBe(0)
    state.hooks.mount!()
    await Promise.resolve()
    expect(state.styles.barStyle.value).toContain('top: 44px')
    expect(state.styles.spaceStyle.value).toBe('height: 60px;')
  })

  it('updates reserved height without moving the header during page overscroll', async () => {
    const state = fixture()
    state.hooks.mount!()
    await Promise.resolve()
    state.set([{ top: 190, left: 18, width: 357 }, { height: 84 }, { scrollTop: 0 }])
    state.hooks.update!()
    await Promise.resolve()
    expect(state.styles.barStyle.value).toContain('top: 44px')
    expect(state.styles.spaceStyle.value).toBe('height: 84px;')
    state.hooks.update!()
    state.hooks.unmount!()
    await Promise.resolve()
    expect(state.count()).toBe(2)
  })
})
