import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium, webkit, firefox } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5200/'
const output = new URL('../artifacts/featured-work/', import.meta.url)
await mkdir(output, { recursive: true })
const profiles = [
  [320, 640], [393, 852], [430, 932], [768, 1024], [852, 393],
  [1024, 768], [1280, 720], [1440, 1000], [1920, 1080], [2560, 1440],
]

for (const engine of [chromium, webkit, firefox]) {
  const browser = await engine.launch()
  try {
    const sizes = process.env.HLENS_WORK_INTERACTIONS_ONLY === '1' ? [] : engine === firefox ? [[393, 852], [1440, 1000]] : profiles
    for (const [width, height] of sizes) {
      const touch = width < 1000
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch,
        ...(engine === firefox ? {} : { isMobile: touch }) })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(base, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.locator('.project').count(), 5)
      const metrics = []
      for (let index = 0; index < 5; index++) {
        const card = page.locator('.project').nth(index)
        await card.evaluate(el => {
          dispatchEvent(new Event('pointerdown'))
          scrollTo({ top: scrollY + el.getBoundingClientRect().top - 110, behavior: 'instant' })
        })
        await page.waitForTimeout(650)
        const box = await card.evaluate(el => {
          const visual = el.querySelector('.project__visual'), details = el.querySelector('.project__details')
          const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom } }
          const outside = [...el.querySelectorAll('h3, dt, dd, .project__status, .project__meta')].filter(node => {
            const range = document.createRange(); range.selectNodeContents(node)
            return [...range.getClientRects()].some(r => r.width && (r.left < -1 || r.right > innerWidth + 1))
          }).map(node => node.textContent)
          return { visual: rect(visual), details: rect(details), aspect: +visual.style.getPropertyValue('--project-media-aspect'),
            columns: getComputedStyle(el.querySelector('.project__layout')).gridTemplateColumns,
            outside, opacity: getComputedStyle(details).opacity, scrollWidth: document.documentElement.scrollWidth }
        })
        assert.ok(Math.abs(box.visual.width / box.visual.height - box.aspect) < .02, 'authored film ratio is preserved')
        assert.deepEqual(box.outside, [], 'Arabic text must fit without clipping')
        assert.ok(box.scrollWidth <= width + 1, 'no horizontal page overflow')
        assert.ok(+box.opacity > .99, 'credits are visible after arrival')
        if (width <= 980) assert.ok(box.details.y >= box.visual.bottom - 1, 'film precedes credits on touch widths')
        else assert.ok(box.visual.x >= box.details.right, 'every desktop project follows the same RTL composition')
        if (width <= 430) assert.ok(box.details.height <= 340, 'mobile credits must stay compact, including long clients/titles')
        metrics.push(box)
        if ((width === 393 || width === 1440) && index === 1) {
          await card.locator('img').evaluate(img => img.decode().catch(() => {}))
          await page.screenshot({ path: fileURLToPath(new URL(`${engine.name()}-${width}.png`, output)) })
        }
      }
      assert.equal(new Set(metrics.map(metric => metric.columns)).size, 1, 'middle project has no special oversized layout')
      assert.equal(await page.locator('.project__focus-frame, .project__edge-meta, .project__kicker').count(), 0)
      if (touch) assert.equal(await page.locator('.project-video__player').count(), 0, 'touch never starts hover embeds')

      // The thumbnail is a real watch link; credits remain a separate internal link.
      for (const link of await page.locator('.project-video__open').all()) {
        assert.match(await link.getAttribute('href'), /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//)
        assert.equal(await link.getAttribute('target'), '_blank')
        assert.equal(await link.getAttribute('rel'), 'noreferrer')
      }
      const detailLink = page.locator('.project__details').nth(1)
      await detailLink.focus()
      assert.ok(await detailLink.evaluate(el => el === document.activeElement && getComputedStyle(el).outlineStyle !== 'none'))
      await detailLink.press('Enter')
      await page.waitForURL('**/work/saudi-cup-closing-film/')
      assert.equal(await page.locator('h1').textContent(), 'الفيديو الختامي')
      assert.deepEqual(errors, [])
      console.log(`PASS ${engine.name()} ${width}x${height}: all 5 films, ratios, credits, uniform order, keyboard detail navigation`)
      await page.close()
    }

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    await page.goto(base, { waitUntil: 'load' })
    const link = page.locator('.project-video__open').first()
    await link.hover()
    assert.equal(await page.locator('.project-video__player').count(), 0, 'reduced motion disables hover autoplay')
    assert.equal(await page.locator('.project__details').first().evaluate(el => getComputedStyle(el).opacity), '1')
    console.log(`PASS ${engine.name()}: reduced-motion visibility and no hover autoplay`)
    await page.close()

    const interactive = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    // Keep player/network behavior deterministic. This validates our hover/link
    // wiring, not YouTube playback availability or a real mobile decoder.
    await interactive.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Player test double</body></html>' }))
    await interactive.context().route('https://www.youtube.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Watch destination test double</body></html>' }))
    await interactive.goto(base, { waitUntil: 'load' })
    const watch = interactive.locator('.project-video__open').first()
    await watch.hover()
    await interactive.waitForFunction(() => document.querySelector('.project-video--playing'))
    assert.equal(await interactive.locator('.project-video__player').count(), 1)
    await interactive.mouse.move(0, 0)
    await interactive.waitForFunction(() => !document.querySelector('.project-video--playing'))
    await watch.focus()
    const [popup] = await Promise.all([interactive.waitForEvent('popup'), watch.press('Enter')])
    assert.match(popup.url(), /^https:\/\/www.youtube.com\/watch\?v=/)
    await popup.close()
    await interactive.close()
    console.log(`PASS ${engine.name()}: hover preview start/stop and keyboard watch link (network test doubles)`)

    const stress = await browser.newPage({ viewport: { width: 320, height: 640 }, hasTouch: true })
    await stress.goto(base, { waitUntil: 'load' })
    await stress.locator('.project').first().waitFor()
    await stress.evaluate(() => document.fonts.ready)
    await stress.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
      const card = document.querySelector('.project')
      card.querySelector('h3').textContent = 'مشروع حملة إبداعية جديدة بعنوان طويل لاختبار وضوح جميع التفاصيل'
      card.querySelector('.project__credit-client dd').textContent = 'المركز الوطني لتطوير المبادرات الإبداعية والإعلامية'
      card.querySelector('.project__credit-role dd').textContent = 'التوجيه الإبداعي · التصوير السينمائي · الإنتاج · المونتاج وتصحيح الألوان'
      scrollTo({ top: card.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' })
    })
    assert.ok(await stress.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '200% text and long CMS content stay inside the phone')
    assert.ok(await stress.locator('.project__details').first().evaluate(el => el.scrollHeight <= el.clientHeight + 1), 'expanded credits are never clipped')
    assert.ok(await stress.locator('.project__details').first().evaluate(el => [...el.querySelectorAll('h3, dt, dd')].every(node => {
      const range = document.createRange(); range.selectNodeContents(node)
      return [...range.getClientRects()].every(r => !r.width || (r.left >= -1 && r.right <= innerWidth + 1))
    })), 'enlarged Arabic glyphs, not just containers, remain in view')
    await stress.close()
    console.log(`PASS ${engine.name()}: 320px phone, long CMS content and 200% text`)
  } finally { await browser.close() }
}
