import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/cinematicVideoStartup.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { CinematicVideoStartup } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
let next = 0, now = 0
const timers = new Map(), frames = new Map()
class Target extends EventTarget {
  listeners = new Map()
  addEventListener(type, handler, options) {
    super.addEventListener(type, handler, options)
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(handler)
  }
  removeEventListener(type, handler, options) {
    super.removeEventListener(type, handler, options)
    this.listeners.get(type)?.delete(handler)
  }
  get count() { return [...this.listeners.values()].reduce((n, handlers) => n + handlers.size, 0) }
}
const motion = Object.assign(new Target(), { matches: false })
const touch = Object.assign(new Target(), { matches: true })
globalThis.document = Object.assign(new Target(), { hidden: false })
globalThis.window = Object.assign(new Target(), {
  matchMedia: query => query.includes('reduced-motion') ? motion : touch,
  setTimeout: (fn, delay) => { const id = ++next; timers.set(id, { at: now + delay, fn }); return id },
  clearTimeout: id => timers.delete(id),
  requestAnimationFrame: fn => { const id = ++next; frames.set(id, fn); return id },
  cancelAnimationFrame: id => frames.delete(id),
})
const tick = () => { now += 16; const jobs = [...frames.values()]; frames.clear(); jobs.forEach(fn => fn(now)) }
const advance = ms => { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn() } }
class Video extends Target {
  currentSrc = 'film.mp4'; duration = 10; readyState = 4; seeking = false; paused = true; ended = false
  time = 0; plays = 0; loads = 0; mode = 'normal'; error = null
  get currentTime() { return this.time }
  set currentTime(time) { this.time = time; this.seeking = true }
  play() { this.plays++; if (this.mode === 'pending') return new Promise(() => {}); this.paused = false; return Promise.resolve() }
  pause() { this.paused = true }
  load() { this.loads++; this.error = null; this.seeking = false }
  finish() { this.seeking = false; this.dispatchEvent(new Event('seeked')) }
}
function setup(mode = 'normal') {
  timers.clear(); frames.clear(); now = 0; motion.matches = false; document.hidden = false
  const video = new Video(); video.mode = mode
  const states = { ready: 0, reset: 0, blocked: false, priming: false }
  const controller = new CinematicVideoStartup({ video, initialTime: 2 / 48,
    onReady: () => states.ready++, onReset: () => states.reset++,
    onBlocked: value => { states.blocked = value }, onPriming: value => { states.priming = value },
  })
  return { video, states, controller }
}
const prime = async video => { await Promise.resolve(); video.time += .03; tick(); video.finish() }
function clean(controller, video) {
  controller.destroy()
  assert.equal(timers.size, 0); assert.equal(frames.size, 0)
  assert.equal(window.count + document.count + motion.count + video.count, 0)
}

{
  const { video, states, controller } = setup()
  assert.equal(video.plays, 1, 'cached readyState=4 must still prime touch playback')
  await Promise.resolve(); tick()
  assert.equal(states.ready, 0, 'play promise alone is not evidence of clock advancement')
  await prime(video)
  assert.equal(states.ready, 1); assert.equal(video.paused, true)
  window.dispatchEvent(new Event('touchend'))
  assert.equal(video.plays, 1, 'ordinary scrolling cannot restart an initialized film')
  clean(controller, video)
  console.log('PASS cached frame, observed clock advancement, paused handoff, no gesture restart, cleanup')
}
{
  const { video, states, controller } = setup('pending')
  video.mode = 'normal'
  window.dispatchEvent(new Event('click'))
  await prime(video)
  assert.equal(video.plays, 2); assert.equal(states.ready, 1)
  clean(controller, video)
  console.log('PASS real input retries even before an earlier play promise settles')
}
{
  const { video, states, controller } = setup('pending')
  advance(6100)
  assert.equal(states.blocked, true); assert.equal(states.priming, false)
  video.mode = 'normal'; video.dispatchEvent(new Event('hlens:activate-video'))
  await prime(video)
  assert.equal(states.ready, 1); assert.equal(states.blocked, false)
  clean(controller, video)
  console.log('PASS pending play times out and a later user activation recovers')
}
{
  const { video, states, controller } = setup()
  await Promise.resolve(); video.time = .03; tick()
  assert.equal(video.seeking, true)
  advance(6100)
  assert.equal(states.blocked, true, 'initial paused seek also has a deadline')
  video.dispatchEvent(new Event('hlens:activate-video'))
  assert.equal(video.loads, 1, 'only explicit recovery may reset a stuck seek')
  await prime(video); assert.equal(states.ready, 1)
  clean(controller, video)
  console.log('PASS stalled initial seek is recoverable before the scroll scheduler exists')
}
{
  const { video, states, controller } = setup()
  await prime(video)
  video.time = 5
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange'))
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange'))
  await prime(video)
  assert.equal(states.ready, 2); assert.equal(video.currentTime, 5)
  video.error = { code: 3 }; video.dispatchEvent(new Event('error'))
  assert.equal(states.blocked, true)
  video.dispatchEvent(new Event('hlens:activate-video')); await prime(video)
  assert.equal(video.loads, 1); assert.equal(states.ready, 3)
  clean(controller, video)
  console.log('PASS app-return position preservation and explicit media-error recovery')
}
{
  const { video, states, controller } = setup()
  controller.destroy()
  await Promise.resolve(); video.time = 3; tick(); advance(7000)
  assert.equal(states.ready, 0)
  assert.equal(timers.size + frames.size, 0)
  assert.equal(window.count + document.count + motion.count + video.count, 0)
  console.log('PASS destroyed startup ignores late play promises and cancels all work')
}
