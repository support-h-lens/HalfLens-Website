import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const listeners = new Map(), timers = new Map(), properties = new Map()
let id = 0, touch = true, small = 700, large = 800, reads = 0, probes = 0, notifications = 0
const mediaListeners = new Set()
const style = {
  getPropertyValue: name => properties.get(name) || '',
  setProperty: (name, value) => properties.set(name, value),
  removeProperty: name => properties.delete(name),
}
const media = { get matches() { return touch }, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) }
globalThis.window = {
  innerHeight: 700,
  visualViewport: { scale: 1 },
  matchMedia: () => media,
  setTimeout: fn => { timers.set(++id, fn); return id },
  clearTimeout: key => timers.delete(key),
  dispatchEvent: () => { notifications++; return true },
  addEventListener: (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn) },
  removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
}
globalThis.document = {
  documentElement: { clientWidth: 393, style, dataset: {} },
  body: { append() { probes++ } },
  createElement: () => {
    const element = { style: {}, remove() { probes-- }, getBoundingClientRect() { reads++; return { height: element.style.height === '100svh' ? small : large } } }
    return element
  },
}
globalThis.CSS = { supports: () => true }
const code = ts.transpileModule(await readFile(new URL('../src/lib/stableViewport.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText
const { installStableViewport, layoutViewportHeight, isLayoutPortrait } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const flush = () => { const work = [...timers.values()]; timers.clear(); work.forEach(fn => fn()) }
const resize = () => listeners.get('resize').forEach(fn => fn())
const stop = installStableViewport()
assert.equal(properties.get('--layout-svh'), '7px')
assert.equal(properties.get('--layout-vh'), '8px')
assert.equal(layoutViewportHeight(), 700)
assert.equal(isLayoutPortrait(), true)
assert.equal(probes, 0)
const initialReads = reads
for (const height of [820, 540, 320, 700]) {
  window.innerHeight = small = large = height
  resize()
  assert.equal(timers.size, 0)
  assert.equal(layoutViewportHeight(), 700)
}
assert.equal(reads, initialReads, 'Height-only events do not even remeasure layout')
document.documentElement.clientWidth = 852
small = large = 393
resize(); flush()
assert.equal(layoutViewportHeight(), 393)
assert.equal(isLayoutPortrait(), false)
window.visualViewport.scale = 2
document.documentElement.clientWidth = 426
resize()
assert.equal(timers.size, 0, 'Pinch zoom is not a layout change')
window.visualViewport.scale = 1
document.documentElement.clientWidth = 852
resize()
assert.equal(layoutViewportHeight(), 393)
touch = false
mediaListeners.forEach(fn => fn()); flush()
assert.equal(properties.size, 0, 'Desktop restores native CSS viewport units')
assert.equal(document.documentElement.dataset.layoutPortrait, undefined)
touch = true
document.documentElement.clientWidth = 393
small = large = 700
mediaListeners.forEach(fn => fn()); flush()
assert.equal(layoutViewportHeight(), 700)
document.documentElement.clientWidth = 852
resize()
assert.equal(timers.size, 1)
stop()
assert.equal(timers.size, 0)
assert.equal(properties.size, 0)
assert.equal(mediaListeners.size, 0)
assert.ok([...listeners.values()].every(set => set.size === 0))
assert.ok(notifications >= 4)
console.log('PASS stable layout units: toolbar/keyboard, true rotation, pinch zoom, pointer changes, desktop fallback and cleanup')
