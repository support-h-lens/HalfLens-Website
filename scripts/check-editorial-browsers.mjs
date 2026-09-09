import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { firefox, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const output = new URL('../artifacts/editorial-motion/', import.meta.url)
const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189/'
await mkdir(output, { recursive: true })
const report = []
for (const engine of [firefox, webkit]) {
  const browser = await engine.launch({ headless: true })
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: mobile, ...(engine === webkit ? { isMobile: mobile } : {}) })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.goto(base, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(800)
      await page.evaluate(() => scrollTo({ top: 300, behavior: 'instant' }))
      await page.waitForTimeout(200)
      const fine = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine) and (min-width: 721px)').matches)
      const prevented = await page.evaluate(() => {
        const e = new WheelEvent('wheel', { deltaY: 900, cancelable: true, bubbles: true })
        document.body.dispatchEvent(e)
        return e.defaultPrevented
      })
      const diagnostic = await page.evaluate(() => ({ body: getComputedStyle(document.body).overflowY, root: getComputedStyle(document.documentElement).overflowY, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, menu: document.body.className, app: document.querySelector('.portfolio-rise') !== null }))
      assert.equal(prevented, fine, `${engine.name()} interception ${JSON.stringify({ diagnostic, errors })}`)
      await page.waitForTimeout(700)
      if (fine) {
        await page.waitForFunction(() => Math.abs(scrollY - 432) < 3, null, { timeout: 4000 })
        const position = await page.evaluate(() => ({ y: scrollY, max: document.documentElement.scrollHeight, height: innerHeight, behavior: getComputedStyle(document.documentElement).scrollBehavior }))
        assert.ok(Math.abs(position.y - 432) < 3, `${engine.name()} wheel position: ${JSON.stringify(position)}`)
      }
      await page.locator('.scroll-cue').evaluate(e => e.click())
      await page.waitForFunction(() => location.hash === '#services', null, { timeout: 4000 })
      assert.equal(await page.evaluate(() => location.hash), '#services')
      const top = await page.locator('#services').evaluate(e => e.getBoundingClientRect().top)
      const header = await page.locator('.site-nav').evaluate(e => e.getBoundingClientRect().bottom)
      assert.ok(top >= header && top <= header + 50, `${engine.name()} header landing ${top}/${header}`)
      assert.equal(await page.locator('#story, .footer__wordmark').count(), 0)
      for (const selector of ['.service-item', '.portfolio-rise', '#clients', '#contact', 'footer']) {
        await page.locator(selector).first().evaluate(e => scrollTo({ top: e.getBoundingClientRect().top + scrollY - 112, behavior: 'instant' }))
        await page.waitForTimeout(250)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${engine.name()} ${selector} overflow`)
      }
      await page.locator('.footer__start').focus()
      assert.equal(await page.locator('.footer__reveal-content').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m42), 0)
      await page.screenshot({ path: new URL(`${engine.name()}-${mobile ? 'phone' : 'desktop'}-footer.png`, output).pathname.replace(/^\/(\w:)/, '$1') })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await page.locator('.footer__start').evaluate(e => e.click())
      await page.waitForFunction(() => location.hash === '#contact', null, { timeout: 4000 })
      assert.equal(await page.evaluate(() => location.hash), '#contact')
      assert.equal(await page.locator('.portfolio-rise__edge').evaluate(e => getComputedStyle(e).display), 'none')
      assert.deepEqual(errors, [])
      const result = { engine: engine.name(), mobile, fine, wheel: 'passed', anchors: 'passed', responsive: 'passed', footerFocus: 'passed', reducedMotion: 'passed', errors }
      report.push(result)
      console.log(`PASS ${JSON.stringify(result)}`)
      await context.close()
    }
  } finally { await browser.close() }
}
await writeFile(new URL('browser-report.json', output), JSON.stringify(report, null, 2))
