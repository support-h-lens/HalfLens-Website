import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/cinematicFrameScheduler.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { CinematicFrameScheduler } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
let now = 0, nextId = 1
const timers = new Map(), raf = new Map()
globalThis.performance = { now: () => now }
globalThis.window = Object.assign(new EventTarget(), {
  __HLENS_CINEMATIC_DIAGNOSTICS__: true,
  setTimeout: (fn, delay) => { const id = nextId++; timers.set(id, { fn, at: now + delay }); return id },
  clearTimeout: id => timers.delete(id),
  requestAnimationFrame: fn => { const id = nextId++; raf.set(id, fn); return id },
  cancelAnimationFrame: id => raf.delete(id),
})
globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
const tick = () => { now += 16; const jobs = [...raf.values()]; raf.clear(); jobs.forEach(fn => fn(now)) }
const advance = ms => {
  now += ms
  for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn() }
}
class Video extends EventTarget {
  time = 2 / 48
  readyState = 4
  seeking = false
  paused = true
  writes = []
  callbacks = new Map()
  get currentTime() { return this.time }
  set currentTime(value) {
    assert.equal(this.seeking, false, 'Must not interrupt a pending decode/network seek')
    this.time = value
    this.writes.push(value)
    this.seeking = true
  }
  pause() { this.paused = true }
  finish(notify = true) { this.seeking = false; if (notify) this.dispatchEvent(new Event('seeked')) }
  requestVideoFrameCallback(fn) { const id = nextId++; this.callbacks.set(id, fn); return id }
  cancelVideoFrameCallback(id) { this.callbacks.delete(id) }
  present(time = this.time) { const jobs = [...this.callbacks.values()]; this.callbacks.clear(); jobs.forEach(fn => fn(now, { mediaTime: time })) }
}
const frame = p => Math.round((2 / 48 + (10.020833 - .05 - 2 / 48) * p) * 48)
const lastFrame = video => Math.round(video.writes.at(-1) * 48)
function setup(fallback = false) {
  const video = new Video()
  if (fallback) video.requestVideoFrameCallback = undefined
  const scheduler = new CinematicFrameScheduler({ video, frameRate: 48, firstTime: 2 / 48, lastTime: 10.020833 - .05 })
  return { video, scheduler }
}
function test(name, fn) {
  timers.clear(); raf.clear(); now = 0
  fn()
  console.log(`PASS ${name}`)
}
test('coalesces a burst directly to the latest frame, with no catch-up steps', () => {
  const { video, scheduler } = setup()
  scheduler.setProgress(.1); scheduler.setProgress(.9); scheduler.setProgress(.2); tick()
  assert.equal(video.writes.length, 1); assert.equal(lastFrame(video), frame(.2))
  scheduler.setProgress(.8); scheduler.setProgress(.7); tick()
  assert.equal(video.writes.length, 1)
  video.finish(); video.present(); tick()
  assert.equal(lastFrame(video), frame(.7)); scheduler.destroy()
})
test('missing presentation callbacks do not block subsequent seeks', () => {
  const { video, scheduler } = setup()
  scheduler.setProgress(.4); tick(); video.finish()
  scheduler.setProgress(.1); advance(33); tick()
  assert.equal(video.writes.length, 2); assert.equal(lastFrame(video), frame(.1)); scheduler.destroy()
})
test('watchdog recovers a lost seeked event but never aborts a real pending seek', () => {
  const { video, scheduler } = setup()
  scheduler.setProgress(.4); tick(); scheduler.setProgress(.8)
  for (let i = 0; i < 5; i++) { advance(150); tick() }
  assert.equal(video.writes.length, 1)
  video.finish(false); advance(150); advance(33); tick()
  assert.equal(lastFrame(video), frame(.8)); scheduler.destroy()
})
test('compositor handoff is bounded and always seeks the exact newest frame', () => {
  const { video, scheduler } = setup()
  scheduler.setProgress(.3); tick(); advance(35)
  scheduler.setProgress(.82); video.finish(); tick()
  assert.equal(video.writes.length, 1)
  advance(33); tick()
  assert.equal(lastFrame(video), frame(.82)); scheduler.destroy()
})
test('seeked-only browsers settle and repeated targets do not seek again', () => {
  const { video, scheduler } = setup(true)
  scheduler.setProgress(.3); tick(); video.finish(); tick()
  scheduler.setProgress(.3); tick()
  assert.equal(video.writes.length, 1); scheduler.destroy()
})
test('ignores invalid progress and clamps the boundaries', () => {
  const { video, scheduler } = setup()
  scheduler.setProgress(NaN); scheduler.setProgress(Infinity); tick()
  assert.equal(video.writes.length, 0)
  scheduler.setProgress(2); tick(); assert.equal(lastFrame(video), frame(1))
  video.finish(); video.present(); scheduler.setProgress(-2); tick(); assert.equal(lastFrame(video), frame(0)); scheduler.destroy()
})
test('destroy cancels callbacks, timers and pending work', () => {
  const { video, scheduler } = setup()
  scheduler.setProgress(.7); tick(); scheduler.destroy()
  const count = video.writes.length
  video.finish(); video.present(); scheduler.setProgress(.3); advance(1000); tick()
  assert.equal(video.writes.length, count)
  assert.equal(timers.size, 0); assert.equal(raf.size, 0); assert.equal(video.callbacks.size, 0)
})
