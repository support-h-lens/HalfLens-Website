import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, firefox, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189'
const out = new URL('../artifacts/work-archive/', import.meta.url)
await mkdir(out, { recursive: true })
const screenshot = (page, name) => page.screenshot({ path: new URL(`${name}.png`, out).pathname.replace(/^\/(\w:)/, '$1') })
const report = []
for (const engine of [chromium, firefox, webkit]) {
  const browser = await engine.launch({ headless: true })
  try {
    const profiles = engine === chromium
      ? [['desktop', 1440, 1000], ['wide', 1920, 1080], ['tablet', 768, 1024], ['phone', 390, 844], ['small', 320, 640], ['landscape', 844, 390]]
      : [['desktop', 1440, 1000], ['phone', 390, 844]]
    for (const [name, width, height] of profiles) {
      const touch = !['desktop', 'wide'].includes(name)
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, ...(engine !== firefox ? { isMobile: touch } : {}) })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      if (engine === chromium && name === 'desktop') {
        await page.goto(base, { waitUntil: 'load' })
        assert.equal(await page.locator('.project-index').count(), 0)
        await page.locator('.portfolio__archive-link').click()
        await page.waitForURL('**/work/')
      } else await page.goto(`${base}/work/`, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.locator('.work-filters__category').count(), 5)
      assert.equal(await page.locator('.project-index__row').count(), 5)
      assert.equal(await page.locator('.footer__wordmark').count(), 0)
      await screenshot(page, `${engine.name()}-${name}-opening`)
      const counts = {}
      for (const [id, expected] of [['creative-films', 1], ['photography', 0], ['motion-graphics', 1], ['media-coverage', 2], ['cinematic-ads', 1]]) {
        const filter = page.locator(`[data-category="${id}"]`)
        if (!touch) {
          await filter.hover()
          await page.waitForFunction(id => {
            const el = document.querySelector(`[data-category="${id}"]`)
            return getComputedStyle(el).backgroundColor === 'rgb(40, 51, 110)'
              && [...el.children].every(child => getComputedStyle(child).color === 'rgb(244, 244, 238)')
          }, id)
        }
        await filter.click()
        await page.waitForFunction(id => document.querySelector(`[data-category="${id}"]`).getAttribute('aria-pressed') === 'true', id)
        assert.equal(await page.locator('.work-filters__category[aria-pressed="true"]').count(), 1)
        assert.equal(await page.locator('.project-index__row').count(), expected, `${engine.name()}/${name}/${id}`)
        assert.ok((await page.locator('.work-filters__status').textContent()).includes(`${expected} من 5`))
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflow`)
        if (expected === 0) {
          assert.ok(await page.locator('.work-results__empty').isVisible())
          await screenshot(page, `${engine.name()}-${name}-empty`)
        }
        counts[id] = expected
      }
      await page.locator('.work-filters__all').click()
      assert.equal(await page.locator('.project-index__row').count(), 5)
      await page.waitForFunction(() => [...document.querySelectorAll('.work-filters__category')].every(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)'))
      // Native keyboard buttons announce state and leave focus at the filter.
      const motion = page.locator('[data-category="motion-graphics"]')
      await motion.focus()
      await page.keyboard.press('Enter')
      assert.equal(await page.locator('.project-index__row').count(), 1)
      assert.ok(await motion.evaluate(e => e === document.activeElement))
      await page.locator('.work-filters__all').click()
      const row = page.locator('.project-index__row').first()
      if (!touch) {
        await row.hover()
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.project-index__preview')).opacity === '1')
        await screenshot(page, `${engine.name()}-${name}-hover`)
        await page.mouse.move(0, 0)
        // Establish real keyboard modality; Firefox correctly does not give
        // mouse-initiated programmatic focus the :focus-visible treatment.
        await page.keyboard.press('Tab')
        await row.focus()
      } else await row.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.project-index__preview')).opacity === '1')
      await screenshot(page, `${engine.name()}-${name}-list`)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.locator('[data-category="media-coverage"]').click()
      assert.equal(await page.locator('.work-results__content').evaluate(e => getComputedStyle(e).animationName), 'none')
      await page.locator('.work-filters__all').click()
      assert.equal(await row.getAttribute('href'), 'https://www.youtube.com/watch?v=ZlY0tDv5sSY')
      assert.equal(await row.getAttribute('target'), '_blank')
      assert.equal(await row.getAttribute('rel'), 'noopener noreferrer')
      // Verify popup navigation without loading an external video in the test.
      await context.route('https://www.youtube.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Video destination</title>' }))
      const [popup] = await Promise.all([context.waitForEvent('page'), row.click()])
      await popup.waitForLoadState()
      assert.equal(popup.url(), 'https://www.youtube.com/watch?v=ZlY0tDv5sSY')
      await popup.close()
      assert.equal(await page.locator('.project-index__row').count(), 5)
      assert.deepEqual(errors, [])
      report.push({ engine: engine.name(), name, width, height, counts, errors })
      console.log(`PASS ${engine.name()} ${name}: five filters, empty state, reset, row links, keyboard, reduced motion, no overflow`)
      await context.close()
    }
    if (engine === chromium) {
      const context = await browser.newContext({ javaScriptEnabled: false })
      const page = await context.newPage()
      await page.goto(`${base}/work/`)
      assert.equal(await page.locator('.project-index__row').count(), 5)
      assert.ok(await page.locator('noscript').isVisible())
      await context.close()
      // CMS service labels override ambiguous legacy metadata and do not rely on
      // project slugs. Exercise future photography and overlapping service tags.
      const testPage = await browser.newPage()
      await testPage.goto('http://127.0.0.1:5188/work/')
      const categories = await testPage.evaluate(async () => {
        const { getProjectCategoryIds } = await import('/src/lib/workCategories.ts')
        const item = { category: 'فيلم فعالية', role: 'إنتاج', format: '4K' }
        return [
          getProjectCategoryIds({ ...item, services: ['تصوير فوتوغرافي'] }),
          getProjectCategoryIds({ ...item, services: ['إِعْلَان سِينمائي', 'موشن جرافيك 2D + 3D'] }),
          getProjectCategoryIds({ category: 'غير مصنف', role: '', format: '' }),
        ]
      })
      assert.deepEqual(categories, [['photography'], ['motion-graphics', 'cinematic-ads'], []])
      console.log('PASS server-rendered archive without JS; CMS tags, Arabic normalization, multi-category and unknown projects')
      await testPage.close()
    }
  } finally { await browser.close() }
}
await writeFile(new URL('report.json', out), JSON.stringify(report, null, 2))
