import assert from 'node:assert/strict'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.route('**/scroll-timing-fixture', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><style>html{scroll-behavior:smooth}body{margin:0;height:20000px}header{position:fixed;top:0;height:100px}#target{position:absolute;top:2000px}#far{position:absolute;top:16000px}</style><header class="site-nav">Header</header><a href="#target" id="anchor">Target</a><a href="#far" id="far-link">Far</a><section id="target">Target</section><section id="far">Far target</section>` }))
  await page.goto('http://127.0.0.1:5188/scroll-timing-fixture')
  const result = await page.evaluate(async () => {
    const { installControlledScroll, scrollSettings } = await import('/src/lib/controlledScroll.ts')
    const frames = new Map(), writes = []
    let now = 0, nextId = 1
    const scroll = window.scrollTo.bind(window)
    window.requestAnimationFrame = fn => { const id = nextId++; frames.set(id, fn); return id }
    window.cancelAnimationFrame = id => frames.delete(id)
    Object.defineProperty(performance, 'now', { configurable: true, value: () => now })
    window.scrollTo = options => { writes.push({ ...options, now }); scroll(options) }
    const tick = elapsed => { now += elapsed; const jobs = [...frames.values()]; frames.clear(); jobs.forEach(fn => fn(now)) }
    const wheel = dy => document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true }))
    const reset = y => { window.dispatchEvent(new Event('pointerdown')); scroll({ top: y, behavior: 'instant' }); writes.length = 0 }
    const cleanup = installControlledScroll()
    reset(0); wheel(132); tick(1000 / 60)
    const frame60 = writes.at(-1)
    const before120 = scrollY
    tick(1000 / 120)
    const frame120 = writes.at(-1)
    reset(500)
    for (let i = 0; i < 40; i++) wheel(500)
    tick(1000 / 60)
    const capped = writes.at(-1)
    const beforeStall = scrollY
    tick(1000)
    const stalled = writes.at(-1)
    reset(0)
    document.getElementById('anchor').click()
    tick(1000 / 60) // Deferred menu-close / navigation start.
    const destination = 2000 - 112
    const duration = 680 + destination * .12
    tick(duration / 2)
    const halfway = writes.at(-1)
    tick(duration / 2)
    const finished = { y: scrollY, hash: location.hash, focus: document.activeElement.id, frames: frames.size }
    reset(0)
    document.getElementById('far-link').click(); tick(1000 / 60)
    tick(625)
    const farHalfway = writes.at(-1)
    tick(625)
    const farFinished = { y: scrollY, hash: location.hash }
    reset(500); wheel(132); cleanup()
    const queuedAfterCleanup = frames.size
    const beforeCleanupTick = scrollY
    tick(1000)
    const e = new WheelEvent('wheel', { deltaY: 132, bubbles: true, cancelable: true })
    document.body.dispatchEvent(e)
    return { settings: scrollSettings, frame60, frame120, before120, capped, stalled, beforeStall,
      halfway, destination, duration, finished, farHalfway, farFinished,
      queuedAfterCleanup, beforeCleanupTick, afterCleanupTick: scrollY, interceptedAfterCleanup: e.defaultPrevented,
      allInstant: writes.every(w => w.behavior === 'instant'), temporaryTabIndexAfterCleanup: document.getElementById('far').getAttribute('tabindex') }
  })
  assert.deepEqual(result.settings, { maxWheelDelta: 132, maxTargetLead: 680, maxSpeed: 2100, followStrength: .22, settleDistance: 1.5, minNavigationDuration: 680, maxNavigationDuration: 1250 })
  assert.ok(Math.abs(result.frame60.top - 132 * .22) < .01)
  assert.ok(Math.abs(result.frame120.top - (result.before120 + (132 - result.before120) * (1 - Math.pow(1 - .22, .5)))) < .01)
  assert.ok(Math.abs(result.capped.top - 535) < .01)
  assert.ok(Math.abs(result.stalled.top - result.beforeStall - 105) < .01)
  assert.ok(Math.abs(result.halfway.top - result.destination * .9375) < .01)
  assert.equal(result.finished.hash, '#target'); assert.equal(result.finished.focus, 'target')
  assert.ok(Math.abs(result.finished.y - result.destination) < 1)
  assert.ok(Math.abs(result.farHalfway.top - (16000 - 112) * .9375) < .01)
  assert.equal(result.farFinished.hash, '#far')
  assert.equal(result.queuedAfterCleanup, 0)
  assert.equal(result.beforeCleanupTick, result.afterCleanupTick)
  assert.equal(result.interceptedAfterCleanup, false)
  assert.equal(result.temporaryTabIndexAfterCleanup, null)
  assert.equal(result.allInstant, true)
  console.log('PASS exact settings, 60/120Hz follow, 2100px/s limit, 50ms stall cap, navigation duration/easing, header offset, focus and cleanup')
  console.log(JSON.stringify(result))
} finally { await browser.close() }
