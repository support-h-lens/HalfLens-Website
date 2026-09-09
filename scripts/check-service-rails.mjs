import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, firefox, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189'
await mkdir('artifacts/service-rails', { recursive: true })
for (const engine of [chromium, firefox, webkit].filter(engine => !process.env.HLENS_BROWSER || engine.name() === process.env.HLENS_BROWSER)) {
  const browser = await engine.launch()
  try {
    const profiles = engine === chromium
      ? [['desktop', 1440, 1000], ['wide', 1920, 1080], ['laptop', 1280, 720], ['tablet', 768, 1024], ['phone', 390, 844], ['small-phone', 320, 640], ['landscape', 844, 390]]
      : [['desktop', 1440, 1000], ['phone', 390, 844], ['landscape', 844, 390]]
    for (const [name, width, height] of profiles) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(base, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() => document.querySelectorAll('.service-item__geometry > .service-item__rail').length === 5)
      if (width <= 720) {
        const surfaces = await page.locator('.service-item').evaluateAll(items => items.map(item => {
          const outer = getComputedStyle(item)
          const inner = getComputedStyle(item.querySelector('.service-item__geometry'))
          return {
            outerBackground: outer.backgroundImage,
            outerColor: outer.backgroundColor,
            outerBorders: [outer.borderTopWidth, outer.borderRightWidth, outer.borderBottomWidth, outer.borderLeftWidth],
            innerBackground: inner.backgroundImage,
            innerBorder: inner.borderTopWidth,
          }
        }))
        assert.ok(surfaces.every(surface => surface.outerBackground === 'none'
          && surface.outerColor === 'rgba(0, 0, 0, 0)'
          && surface.outerBorders.every(border => border === '0px')
          && surface.innerBackground !== 'none' && parseFloat(surface.innerBorder) > 0),
        `Mobile services must have only the inner card surface: ${JSON.stringify(surfaces)}`)
      }
      for (let index = 0; index < 5; index++) {
        for (const offset of [.8, .4, .05, -.3]) {
          await page.evaluate(({ index, offset }) => {
            dispatchEvent(new Event('pointerdown'))
            const item = document.querySelectorAll('.service-item')[index]
            scrollTo({ top: scrollY + item.getBoundingClientRect().top - innerHeight * offset, behavior: 'instant' })
          }, { index, offset })
          await page.waitForTimeout(90)
          if (offset === .05) {
            // A delayed WebKit paint can exceed 90ms. Observe the settled rail
            // instead of treating an arbitrary sleep as animation completion.
            await page.waitForFunction(index => {
              const item = document.querySelectorAll('.service-item')[index]
              const frame = item.querySelector('.service-item__geometry').getBoundingClientRect()
              const rail = item.querySelector('.service-item__rail').getBoundingClientRect()
              return frame.width - rail.width <= 3
            }, index, { timeout: 8000 })
          }
          const metrics = await page.locator('.service-item').nth(index).evaluate(item => {
            const geometry = item.querySelector('.service-item__geometry'), rail = item.querySelector('.service-item__rail')
            const g = geometry.getBoundingClientRect(), r = rail.getBoundingClientRect()
            const content = [...item.querySelectorAll('.service-item__number, .service-item__meta, h3, .service-item__copy, .service-item__link, .service-item__progress')].map(element => {
              const box = element.getBoundingClientRect()
              return { selector: element.className || element.tagName, left: box.left - g.left, right: g.right - box.right, top: box.top - g.top, bottom: g.bottom - box.bottom }
            })
            return { nested: rail.parentElement === geometry, left: r.left - g.left, right: g.right - r.right, frameWidth: g.width, lineWidth: r.width, clip: getComputedStyle(geometry).clipPath, content, overflow: document.documentElement.scrollWidth - innerWidth }
          })
          assert.ok(metrics.nested && metrics.clip !== 'none', 'The rail must inherit the frame clip')
          assert.ok(metrics.left >= -.75 && metrics.right >= -.75, `${engine.name()} ${name} service ${index + 1} rail exceeds frame: ${JSON.stringify(metrics)}`)
          assert.ok(metrics.overflow <= 1, `${name} horizontal overflow`)
          assert.ok(metrics.content.every(box => box.left >= 5 && box.right >= 5 && box.top >= 5 && box.bottom >= 5), `${engine.name()} ${name} service ${index + 1} text/control escaped frame: ${JSON.stringify(metrics.content)}`)
          if (offset === .05) {
            assert.ok(metrics.frameWidth - metrics.lineWidth <= 3, 'Settled rail should span both frame edges, minus its borders')
            if (index < 2 || index === 3) await page.screenshot({ path: `artifacts/service-rails/${engine.name()}-${name}-${index + 1}.png` })
          }
        }
      }
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => [...document.querySelectorAll('.service-item__rail')].every(rail => getComputedStyle(rail).transform === 'none'))
      const reduced = await page.locator('.service-item__rail').evaluateAll(rails => rails.map(rail => {
        const r = rail.getBoundingClientRect(), g = rail.parentElement.getBoundingClientRect()
        return { left: r.left - g.left, right: g.right - r.right, transform: getComputedStyle(rail).transform }
      }))
      assert.ok(reduced.every(rail => rail.left >= -.75 && rail.right >= -.75 && rail.transform === 'none'), JSON.stringify(reduced))
      const contentContained = await page.locator('.service-item').evaluateAll(items => items.every(item => {
        const frame = item.querySelector('.service-item__geometry').getBoundingClientRect()
        return [...item.querySelectorAll('.service-item__number, .service-item__meta, h3, .service-item__copy, .service-item__link, .service-item__progress')].every(element => {
          const box = element.getBoundingClientRect()
          const range = document.createRange()
          range.selectNodeContents(element)
          const glyphs = range.getBoundingClientRect()
          return box.left >= frame.left + 5 && box.right <= frame.right - 5 && box.top >= frame.top + 5 && box.bottom <= frame.bottom - 5
            && glyphs.left >= frame.left + 2 && glyphs.right <= frame.right - 2
        })
      }))
      assert.ok(contentContained, `${engine.name()} ${name}: reduced-motion text/glyph containment`)
      assert.deepEqual(errors, [])
      console.log(`PASS ${engine.name()} ${name}: all 5 cards contain rails, text and controls during entrance/settling/exit and reduced motion; no overflow/errors`)
      await page.close()
    }
    if (engine === chromium) {
      const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
      await page.goto('http://127.0.0.1:5189/', { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      const staticCards = await page.locator('.service-item__frame').evaluateAll(frames => frames.map(frame => {
        const box = frame.getBoundingClientRect()
        return [...frame.querySelectorAll('h3, .service-item__number, .service-item__meta, .service-item__copy, .service-item__link, .service-item__progress')].every(element => {
          const rect = element.getBoundingClientRect()
          return rect.left >= box.left + 5 && rect.right <= box.right - 5 && rect.top >= box.top + 5 && rect.bottom <= box.bottom - 5
        })
      }))
      assert.equal(staticCards.length, 5)
      assert.ok(staticCards.every(Boolean), 'No-JavaScript server-rendered cards must contain all content')
      await page.close()
      console.log('PASS server-rendered mobile cards contain all text and controls without JavaScript')
    }
  } finally { await browser.close() }
}
