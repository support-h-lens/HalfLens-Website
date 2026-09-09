import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

let id = 0
const frames = new Map()
const listeners = new Map()
globalThis.window = {
  refreshCount: 0,
  requestAnimationFrame: callback => { frames.set(++id, callback); return id },
  cancelAnimationFrame: key => frames.delete(key),
  addEventListener: (type, callback) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback) },
  removeEventListener: (type, callback) => listeners.get(type)?.delete(callback),
}
globalThis.document = { readyState: 'complete', fonts: { ready: Promise.resolve() } }
const source = (await readFile(new URL('../src/lib/gsap.ts', import.meta.url), 'utf8'))
  .replace("import gsap from 'gsap'", 'const gsap = { registerPlugin() {} }')
  .replace("import { ScrollTrigger } from 'gsap/ScrollTrigger'", 'const ScrollTrigger = { config(options) { window.scrollConfig = options }, refresh() { window.refreshCount++ } }')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { refreshScrollTriggerWhenReady } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
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
