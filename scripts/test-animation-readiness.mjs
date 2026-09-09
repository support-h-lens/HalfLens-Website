import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

let id = 0
const frames = new Map()
const listeners = new Map()
let touch = false
const queryListeners = new Set()
const timers = new Map()
const media = { get matches() { return touch }, addEventListener: (_, fn) => queryListeners.add(fn), removeEventListener: (_, fn) => queryListeners.delete(fn) }
globalThis.window = {
  refreshCount: 0,
  localRefreshCount: 0,
  innerWidth: 393,
  matchMedia: () => media,
  setTimeout: callback => { timers.set(++id, callback); return id },
  clearTimeout: key => timers.delete(key),
  requestAnimationFrame: callback => { frames.set(++id, callback); return id },
  cancelAnimationFrame: key => frames.delete(key),
  addEventListener: (type, callback) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback) },
  removeEventListener: (type, callback) => listeners.get(type)?.delete(callback),
}
globalThis.document = { readyState: 'complete', fonts: { ready: Promise.resolve() } }
const source = (await readFile(new URL('../src/lib/gsap.ts', import.meta.url), 'utf8'))
  .replace("import gsap from 'gsap'", 'const gsap = { registerPlugin() {} }')
  .replace("import { ScrollTrigger } from 'gsap/ScrollTrigger'", 'const ScrollTrigger = { config(options) { window.scrollConfig = options }, refresh(safe) { if (!safe) throw Error("Expected safe desktop refresh"); window.refreshCount++ }, getAll: () => [{ refresh() { window.localRefreshCount++ } }], update() {} }')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { refreshScrollTriggerWhenReady, installScrollRefreshPolicy } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
assert.equal(window.scrollConfig.ignoreMobileResize, true, 'touch toolbar resizing must not rebuild timelines')
const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()) }
const cleanups = Array.from({ length: 15 }, () => refreshScrollTriggerWhenReady())
await Promise.resolve()
assert.equal(frames.size, 1)
flush()
assert.equal(window.refreshCount, 1)
cleanups.forEach(cleanup => cleanup())
const canceled = Array.from({ length: 15 }, () => refreshScrollTriggerWhenReady())
canceled.forEach(cleanup => cleanup())
await Promise.resolve()
assert.equal(frames.size, 0)
flush()
assert.equal(window.refreshCount, 1)
document.readyState = 'loading'
const first = refreshScrollTriggerWhenReady(), second = refreshScrollTriggerWhenReady()
await Promise.resolve()
first()
assert.equal(frames.size, 1, 'one owner cannot cancel another owner')
flush()
assert.equal(window.refreshCount, 2)
second()
assert.equal(listeners.get('load').size, 0)
console.log('PASS 15 sections + font/load readiness coalesce into one refresh; cleanup cancels frames/listeners without cancelling other owners')
touch = true
document.readyState = 'complete'
const policy = installScrollRefreshPolicy()
assert.equal(window.scrollConfig.autoRefreshEvents, 'none')
const mobileReady = refreshScrollTriggerWhenReady()
await Promise.resolve()
flush()
assert.equal(window.refreshCount, 2, 'touch readiness must never invoke the global zero/restore refresh')
assert.equal(window.localRefreshCount, 1)
for (const height of [750, 600, 850, 450]) {
  window.innerHeight = height
  listeners.get('resize').forEach(fn => fn())
}
assert.equal(timers.size, 0, 'toolbar and keyboard height changes are not layout refreshes')
window.innerWidth = 852
listeners.get('resize').forEach(fn => fn())
assert.equal(timers.size, 1, 'real width/orientation changes still remeasure')
for (const callback of timers.values()) callback()
assert.equal(window.localRefreshCount, 2)
mobileReady()
policy()
assert.equal(timers.size, 0)
assert.equal(listeners.get('resize').size, 0)
assert.equal(queryListeners.size, 0)
console.log('PASS touch refresh never resets scroll; height-only resizes ignored; width changes measured; timers/listeners cleaned up')
