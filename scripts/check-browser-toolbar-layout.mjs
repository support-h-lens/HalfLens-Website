import assert from 'node:assert/strict'
import { chromium, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5200/'
const baseline = process.env.HLENS_TOOLBAR_BASELINE === '1'
const forceFallback = process.env.HLENS_TOOLBAR_FALLBACK === '1'
for (const engine of baseline ? [chromium] : [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 700 }, isMobile: true, hasTouch: true })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    if (forceFallback) await page.addInitScript(() => {
      const supports = CSS.supports.bind(CSS)
      CSS.supports = (...args) => args[0].startsWith('animation-timeline') ? false : supports(...args)
    })
    await page.goto(base, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(600)
    const read = () => page.evaluate(() => {
      const element = document.querySelectorAll('.project__details')[3]
      const service = document.querySelectorAll('.service-item__frame')[1]
      const layoutTop = element => { let top = 0; for (let node = element; node; node = node.offsetParent) top += node.offsetTop; return top }
      return { viewport: innerHeight, y: scrollY, document: document.documentElement.scrollHeight,
        targetTop: layoutTop(element), screenTop: element.getBoundingClientRect().top,
        serviceTop: layoutTop(service), serviceHeight: service.offsetHeight,
        chaptersHeight: document.querySelector('.cinematic-story__chapters').offsetHeight,
        stable: document.documentElement.style.getPropertyValue('--layout-svh') }
    })
    await page.evaluate(() => {
      const element = document.querySelectorAll('.project__details')[3]
      scrollTo({ top: scrollY + element.getBoundingClientRect().top - 120, behavior: 'instant' })
    })
    await page.waitForTimeout(400)
    const before = await read()
    const samples = []
    // Unlike the older test, resize the actual CSS/layout viewport: this models
    // a third-party iOS browser/translation bar resizing its hosting web view.
    for (const height of [820, 610, 760, 540, 700]) {
      await page.setViewportSize({ width: 393, height })
      await page.waitForTimeout(400)
      const sample = await read()
      samples.push(sample)
      if (!baseline) {
        assert.ok(Math.abs(sample.targetTop - before.targetTop) <= 1, `Project moved in document: ${JSON.stringify({ before, sample })}`)
        assert.ok(Math.abs(sample.document - before.document) <= 1, 'Toolbar changes must not change document height')
        assert.ok(Math.abs(sample.screenTop - before.screenTop) <= 1, 'Reading position must not jump')
        assert.equal(sample.chaptersHeight, before.chaptersHeight, 'Camera timeline layout must not stretch')
      }
    }
    console.log(JSON.stringify({ engine: engine.name(), before, samples }))
    if (!baseline) {
      // Verify an in-progress card animation also keeps the SAME progress when
      // browser chrome changes; fixing document height alone is insufficient.
      await page.evaluate(() => {
        const card = document.querySelectorAll('.service-item__frame')[1]
        let top = 0
        for (let node = card; node; node = node.offsetParent) top += node.offsetTop
        scrollTo({ top: top - 700 + card.offsetHeight * .45, behavior: 'instant' })
      })
      await page.waitForTimeout(400)
      const cardState = () => page.locator('.service-item__frame').nth(1).evaluate(element => ({
        opacity: Number(getComputedStyle(element).opacity),
        y: new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
        top: element.getBoundingClientRect().top,
      }))
      const cardBefore = await cardState()
      for (const height of [820, 540, 700]) {
        await page.setViewportSize({ width: 393, height })
        await page.waitForTimeout(300)
        const current = await cardState()
        assert.ok(Math.abs(current.y - cardBefore.y) < .1 && Math.abs(current.opacity - cardBefore.opacity) < .01,
          `Toolbar remapped card animation: ${JSON.stringify({ cardBefore, current })}`)
        assert.ok(Math.abs(current.top - cardBefore.top) < 1)
      }
      const source = await page.locator('video').first().evaluate(video => video.currentSrc)
      // A short viewport caused by a keyboard must not choose the landscape
      // camera merely because CSS (orientation: portrait) changed its answer.
      await page.setViewportSize({ width: 393, height: 320 })
      await page.waitForTimeout(500)
      assert.equal(await page.locator('video').first().evaluate(video => video.currentSrc), source)
      assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutPortrait), 'true')
      await page.setViewportSize({ width: 393, height: 700 })
      await page.waitForTimeout(300)
      await page.setViewportSize({ width: 852, height: 393 })
      await page.waitForFunction(() => document.documentElement.dataset.layoutPortrait === 'false')
      assert.ok(Math.abs(await page.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue('--layout-svh'))) - 3.93) < .01)
      await page.setViewportSize({ width: 393, height: 700 })
      await page.waitForFunction(() => document.documentElement.dataset.layoutPortrait === 'true')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 393)
      console.log(`PASS ${engine.name()} ${forceFallback ? 'fallback' : 'native'}: real layout resizing, stable reading position and card progress, keyboard camera selection, genuine rotation`)
    }
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
}
