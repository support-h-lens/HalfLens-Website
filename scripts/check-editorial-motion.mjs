import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5188'
const out = new URL('../artifacts/editorial-motion/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = []
const pass = (name, data = {}) => { report.push({ name, ...data }); console.log(`PASS ${name} ${JSON.stringify(data)}`) }
const scroll = async (page, selector, offset = 112) => {
  await page.evaluate(({ selector, offset }) => {
    dispatchEvent(new Event('pointerdown'))
    const el = document.querySelector(selector)
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset, behavior: 'instant' })
  }, { selector, offset })
  await page.waitForTimeout(550)
}
const screenshot = (page, name) => page.screenshot({ path: new URL(`${name}.png`, out).pathname.replace(/^\/(\w:)/, '$1') })

try {
  for (const [name, width, height, touch] of [
    ['desktop', 1440, 1000, false], ['wide', 1920, 1080, false],
    ['laptop', 1280, 720, false], ['tablet', 768, 1024, true],
    ['phone', 390, 844, true], ['small-phone', 320, 640, true],
    ['phone-landscape', 844, 390, true],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(700)
    assert.equal(await page.locator('#hero canvas').count(), 0, 'hero must have no wave layer')
    assert.equal(await page.locator('#story, a[href="#story"], .footer__wordmark, .project-index').count(), 0, 'removed story, dead links, footer wordmark and moved archive must not render on the homepage')
    await screenshot(page, `${name}-hero`)
    const filmEnd = await page.evaluate(() => {
      const chapters = document.querySelector('.cinematic-story__chapters')
      const end = chapters.getBoundingClientRect().bottom + scrollY - innerHeight
      scrollTo({ top: end, behavior: 'instant' })
      return end
    })
    await page.waitForFunction(() => {
      const v = document.querySelector('.cinematic-media-stage__video')
      return v?.readyState >= 2 && !v.seeking && Math.abs(v.currentTime - (v.duration - .05)) < 1.1 / 48
    }, null, { timeout: 30000 })
    const ending = await page.evaluate(() => ({
      edge: document.querySelector('.portfolio-rise__edge').getBoundingClientRect().top,
      height: innerHeight,
      sticky: document.querySelector('.cinematic-story__sticky').getBoundingClientRect().top,
      labels: getComputedStyle(document.querySelector('.services__layout')).opacity,
    }))
    assert.ok(ending.edge > ending.height + 30, `${name}: works must remain below screen when the full film reaches its final frame ${JSON.stringify(ending)}`)
    assert.ok(Math.abs(ending.sticky) < 1, 'the final frame remains stationary')
    assert.equal(ending.labels, '0', 'service text must clear the complete film ending')
    await screenshot(page, `${name}-film-ending`)
    await scroll(page, '.portfolio-rise', height * .55)
    const reveal = await page.evaluate(() => ({
      skew: new DOMMatrix(getComputedStyle(document.querySelector('.portfolio-rise__edge')).transform).m12,
      sticky: document.querySelector('.cinematic-story__sticky').getBoundingClientRect().top,
      panel: getComputedStyle(document.querySelector('.portfolio-rise__panel')).transform,
      time: document.querySelector('.cinematic-media-stage__video').currentTime,
      duration: document.querySelector('.cinematic-media-stage__video').duration,
      headingTop: document.querySelector('.portfolio__heading').getBoundingClientRect().top,
      panelTop: document.querySelector('.portfolio-rise__panel').getBoundingClientRect().top,
      headingOpacity: getComputedStyle(document.querySelector('.portfolio__heading')).opacity,
    }))
    assert.ok(reveal.skew < -.001, 'the transferred diagonal is visible mid-reveal')
    assert.ok(Math.abs(reveal.sticky) < 1, 'work sheet must overlay a stationary video')
    assert.equal(reveal.panel, 'none', 'the large work panel must not have a competing transform')
    assert.ok(Math.abs(reveal.time - (reveal.duration - .05)) < 1.1 / 48)
    assert.ok(reveal.headingTop - reveal.panelTop <= 100, 'the work sheet must not start with a large blank area')
    assert.ok(Number(reveal.headingOpacity) > .98, 'works heading should be readable during the reveal')
    await page.waitForTimeout(400)
    await screenshot(page, `${name}-transition`)
    await page.evaluate(y => scrollTo({ top: y - 200, behavior: 'instant' }), filmEnd)
    await page.waitForFunction(() => {
      const v = document.querySelector('.cinematic-media-stage__video')
      return !v.seeking && v.currentTime < v.duration - .1
    })
    assert.ok(await page.locator('.services__layout').evaluate(e => Number(getComputedStyle(e).opacity) > .5), 'reverse scrolling restores service labels')
    pass(`${name} full film precedes diagonal works reveal; reverse scrolling resumes scrubbing`)
    for (const [key, selector] of [['service', '.service-item'], ['portfolio', '#portfolio'], ['clients', '#clients'], ['contact', '#contact'], ['footer', 'footer']]) {
      await scroll(page, selector)
      const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
      assert.ok(overflow.scrollWidth <= overflow.width + 1, `${name}/${key} horizontal overflow ${JSON.stringify(overflow)}`)
      await screenshot(page, `${name}-${key}`)
    }
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
    await screenshot(page, `${name}-footer-bottom`)
    const footerLinks = await page.locator('.footer__links a').evaluateAll(links => links.map(e => ({ color: getComputedStyle(e).color, rect: e.getBoundingClientRect().toJSON() })))
    assert.ok(footerLinks.every(e => e.color === 'rgb(234, 242, 244)'), 'footer links must use the light brand text on navy')
    assert.equal(await page.locator('footer').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(40, 51, 110)', 'footer must use the existing brand navy')
    if (name === 'desktop') {
      await scroll(page, 'footer', 400)
      await page.locator('.footer__start').focus()
      assert.equal(await page.locator('.footer__reveal-content').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m42), 0)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1500)
      assert.equal(await page.evaluate(() => location.hash), '#contact')
      assert.equal(await page.evaluate(() => document.activeElement.id), 'contact')
      pass('footer focus disables parallax and CTA navigates with focus and hash')
      await scroll(page, '.portfolio-rise', 400)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForTimeout(100)
      assert.equal(await page.locator('.portfolio-rise__edge').evaluate(e => getComputedStyle(e).display), 'none')
      assert.equal(await page.locator('.portfolio-rise').evaluate(e => getComputedStyle(e).marginBlockStart), '0px')
      assert.equal(await page.locator('.cinematic-story__tail').evaluate(e => e.offsetHeight), 0)
      assert.equal(await page.locator('.portfolio__heading').evaluate(e => getComputedStyle(e).opacity), '1')
      assert.equal(await page.locator('.services__layout').evaluate(e => getComputedStyle(e).opacity), '1')
      await screenshot(page, 'desktop-reduced-motion')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.waitForTimeout(100)
      assert.equal(await page.locator('.portfolio-rise__edge').evaluate(e => getComputedStyle(e).display), 'block')
      pass('live reduced-motion toggles remove the overlap, hold and diagonal animation')
    }
    assert.deepEqual(errors, [], `${name} page errors`)
    pass(`${name} responsive sections`, { width, height, touch })
    await context.close()
  }
  // Server-rendered content and footer also work before JS.
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5189/', { waitUntil: 'load' })
  assert.equal(await page.locator('#story, .footer__wordmark').count(), 0)
  assert.ok(await page.locator('#portfolio h2').isVisible())
  assert.equal(await page.locator('.project-index__row').count(), 0)
  assert.equal(await page.locator('.portfolio__archive-link').getAttribute('href'), '/work/')
  assert.ok(await page.locator('footer .footer__start').isVisible())
  pass('production SSR contains featured works, archive link and compact footer without JavaScript')
  await context.close()
} finally {
  await browser.close()
  await writeFile(new URL('report.json', out), JSON.stringify(report, null, 2))
}
