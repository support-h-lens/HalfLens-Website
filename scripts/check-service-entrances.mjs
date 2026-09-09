import assert from 'node:assert/strict'
import { chromium, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189/'
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    for (const forceFallback of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      if (forceFallback) await page.addInitScript(() => {
        const supports = CSS.supports.bind(CSS)
        CSS.supports = (...args) => args[0].startsWith('animation-timeline') ? false : supports(...args)
      })
      await page.goto(base, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      await page.locator('[data-service-entrance="ready"]').waitFor()
      const sample = () => page.locator('.service-item__frame').first().evaluate(frame => {
        const style = getComputedStyle(frame)
        const rect = frame.getBoundingClientRect()
        return {
          mode: frame.dataset.serviceMotion,
          opacity: Number(style.opacity),
          y: new DOMMatrixReadOnly(style.transform).m42,
          rail: new DOMMatrixReadOnly(getComputedStyle(frame.querySelector('.service-item__rail')).transform).m11,
          overflow: [...frame.querySelectorAll('h3, p, a, .service-item__rail')].some(node => {
            const box = node.getBoundingClientRect()
            return box.left < rect.left - 1 || box.right > rect.right + 1
          }),
        }
      })
      const position = async progress => {
        await page.evaluate(progress => {
          const frame = document.querySelector('.service-item__frame')
          let top = 0
          for (let node = frame; node; node = node.offsetParent) top += node.offsetTop
          scrollTo({ top: top - innerHeight + Math.min(frame.offsetHeight, innerHeight) * progress, behavior: 'instant' })
        }, progress)
        await page.waitForTimeout(180)
        return sample()
      }
      const early = await position(.1)
      const middle = await position(.5)
      const final = await position(1.1)
      assert.ok(early.y > middle.y + 10 && middle.y > final.y + 1, JSON.stringify({ early, middle, final }))
      assert.ok(early.opacity < middle.opacity && middle.opacity < final.opacity)
      assert.ok(early.rail < middle.rail && middle.rail <= final.rail)
      assert.ok(Math.abs(final.y) < .1 && final.opacity > .99)
      assert.ok(!early.overflow && !middle.overflow && !final.overflow, 'Text and rail stay inside the moving card')
      const reversed = await position(.5)
      assert.ok(Math.abs(reversed.y - middle.y) < 1, 'Reverse scroll retraces the same entrance')
      await page.waitForTimeout(800)
      assert.ok(Math.abs((await sample()).y - reversed.y) < .1, 'No time-based catch-up after scroll stops')
      const again = await position(.1)
      assert.ok(Math.abs(again.y - early.y) < 1, 'Returning to a card does not leave its entrance stuck')

      await page.locator('.service-item__link').first().focus()
      const focused = await sample()
      assert.equal(focused.y, 0)
      assert.equal(focused.opacity, 1)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => !document.querySelector('[data-service-motion]'))
      await page.waitForTimeout(100)
      const reduced = await page.locator('.service-item__frame').evaluateAll(frames => frames.map(frame => ({
        transform: getComputedStyle(frame).transform, opacity: getComputedStyle(frame).opacity, style: frame.getAttribute('style'), animation: getComputedStyle(frame).animationName,
      })))
      assert.ok(reduced.every(frame => frame.transform === 'none' && frame.opacity === '1'), JSON.stringify(reduced))
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.locator('[data-service-entrance="ready"]').waitFor()
      assert.deepEqual(errors, [])
      console.log(`PASS ${engine.name()} ${early.mode}: scroll-linked movement, rail/text containment, repeated reversal, no timer drift, focus, live reduced motion`)
      await page.close()
    }
  } finally { await browser.close() }
}
