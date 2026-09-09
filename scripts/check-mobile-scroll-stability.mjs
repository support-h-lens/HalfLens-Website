import assert from 'node:assert/strict'
import { chromium, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189/'
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      window.__scrollWrites = []
      window.__nativeScrollTo = window.scrollTo.bind(window)
      window.scrollTo = (...args) => {
        if (window.__recordScroll) window.__scrollWrites.push({ args, y: scrollY })
        window.__nativeScrollTo(...args)
      }
    })
    await page.goto(base, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => Boolean(document.querySelector('video')?.currentSrc))
    await page.touchscreen.tap(190, 90)
    await page.evaluate(() => window.__nativeScrollTo({ top: 100, behavior: 'instant' }))
    await page.waitForFunction(() => document.querySelector('.cinematic-media-stage').classList.contains('is-video-ready'), null, { timeout: 25000 }).catch(async error => {
      console.log(await page.locator('video').first().evaluate(video => ({ source: video.currentSrc, time: video.currentTime, ready: video.readyState, seeking: video.seeking, paused: video.paused, error: video.error?.message, stage: video.parentElement.className })))
      throw error
    })
    await page.waitForTimeout(300)
    await page.evaluate(() => { window.__nativeScrollTo({ top: 2400, behavior: 'instant' }); window.__recordScroll = true })
    await page.waitForTimeout(400)
    // Safari toolbar/keyboard changes innerHeight without changing the small
    // viewport layout. Emulating device dimensions alone does not test this.
    const toolbar = await page.evaluate(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight')
      const originalHeight = innerHeight
      const video = document.querySelector('video')
      const before = { y: scrollY, time: video.currentTime, height: document.documentElement.scrollHeight }
      for (const height of [750, 650, 820, 490, 852]) {
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
        dispatchEvent(new Event('resize'))
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      if (descriptor) Object.defineProperty(window, 'innerHeight', descriptor)
      else Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight })
      return { before, after: { y: scrollY, time: video.currentTime, height: document.documentElement.scrollHeight }, writes: window.__scrollWrites }
    })
    assert.deepEqual(toolbar.writes, [], `${engine.name()}: toolbar change must not write page scroll`)
    assert.equal(toolbar.after.y, toolbar.before.y)
    assert.equal(toolbar.after.height, toolbar.before.height)
    assert.ok(Math.abs(toolbar.after.time - toolbar.before.time) < .1, 'Toolbar does not remap the camera timeline')

    await page.evaluate(() => document.querySelector('video').dispatchEvent(new Event('hlens:activate-video')))
    await page.waitForFunction(() => document.querySelector('.cinematic-media-stage').classList.contains('is-video-ready'))
    await page.waitForTimeout(600)
    assert.deepEqual(await page.evaluate(() => window.__scrollWrites), [], 'Decoder readiness must not zero/restore scroll')

    // Readiness/CMS refreshes and small repeated direction changes anywhere on
    // the page must not introduce a second scroll controller.
    for (const y of [2400, 2510, 2485, 2470, 2500, 7400, 7430, 7405, 12000, 12040, 12010]) {
      await page.evaluate(y => window.__nativeScrollTo({ top: y, behavior: 'instant' }), y)
      await page.waitForTimeout(80)
    }
    await page.evaluate(() => dispatchEvent(new Event('load')))
    await page.waitForTimeout(400)
    assert.deepEqual(await page.evaluate(() => window.__scrollWrites), [], 'Reversal and late load cause no synthetic scrolling')

    if (engine === chromium) {
      await page.evaluate(() => window.__nativeScrollTo({ top: 2600, behavior: 'instant' }))
      const cdp = await page.context().newCDPSession(page)
      for (const direction of [-1, 1, -1]) {
        const start = direction < 0 ? 690 : 230
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 185, y: start }] })
        for (let step = 1; step <= 10; step++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 185, y: start + direction * step * 30 }] })
          await page.waitForTimeout(16)
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await page.waitForTimeout(180)
      }
      assert.deepEqual(await page.evaluate(() => window.__scrollWrites), [], 'Native touch and inertia must remain write-free')
    }
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine.name()}: no scroll resets on camera readiness, toolbar/keyboard resize, load, small reversals${engine === chromium ? ', native touch flings' : ''}`)
  } finally { await browser.close() }
}
