import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5188'
const output = new URL('../artifacts/controlled-scroll/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
const pass = (name, details = {}) => { results.push({ name, ...details }); console.log(`PASS ${name} ${JSON.stringify(details)}`) }
const position = page => page.evaluate(() => scrollY)
const reset = async (page, y = 0) => {
  await page.evaluate(y => { window.dispatchEvent(new Event('pointerdown')); scrollTo({ top: y, behavior: 'instant' }) }, y)
  await page.waitForTimeout(100)
}
const wheel = (page, data = {}) => page.evaluate(data => {
  const e = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true, ...data })
  document.body.dispatchEvent(e)
  return e.defaultPrevented
}, data)
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(base, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
  await reset(page, 500)
  await page.mouse.move(700, 450)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(700)
  assert.ok(Math.abs(await position(page) - 632) <= 2)
  pass('mouse wheel is capped at 132px, one controller under React StrictMode')

  await reset(page, 500)
  for (let i = 0; i < 10; i++) { await wheel(page, { deltaY: 6 }); await page.waitForTimeout(16) }
  await page.waitForTimeout(600)
  assert.ok(Math.abs(await position(page) - 560) <= 2)
  pass('small trackpad deltas accumulate without amplification')

  for (const [deltaMode, deltaY, expected] of [[1, 2, 32], [2, 1, 132]]) {
    await reset(page, 600); await wheel(page, { deltaMode, deltaY }); await page.waitForTimeout(600)
    assert.ok(Math.abs(await position(page) - (600 + expected)) <= 2)
  }
  pass('line and page wheel units normalize correctly')

  await reset(page, 1000)
  await page.evaluate(() => { for (let i = 0; i < 30; i++) document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, bubbles: true, cancelable: true })) })
  await page.waitForTimeout(1000)
  assert.ok(Math.abs(await position(page) - 1680) <= 2)
  pass('accumulated momentum cannot exceed 680px')

  await reset(page, 1000)
  await wheel(page, { deltaY: 132 }); await page.waitForTimeout(35)
  const turn = await position(page)
  await wheel(page, { deltaY: -132 }); await page.waitForTimeout(600)
  assert.ok(await position(page) < turn - 100)
  pass('direction reversal drops old momentum immediately')

  for (const data of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { deltaX: 200, deltaY: 10 }, { deltaY: 0 }]) {
    assert.equal(await wheel(page, data), false)
  }
  pass('zoom, modified-wheel and horizontal gestures stay native')

  await reset(page, 1000)
  await page.keyboard.press('PageDown'); await page.waitForTimeout(500)
  assert.ok(await position(page) > 1400)
  pass('keyboard page scrolling stays native')

  await page.evaluate(() => {
    const form = document.createElement('form')
    form.id = 'scroll-test-form'
    form.style.cssText = 'position:fixed;top:150px;left:20px;width:280px;z-index:10000;background:white;color:black'
    form.innerHTML = '<div id="nested-scroll" style="height:130px;overflow:auto;overscroll-behavior:contain"><div style="height:900px">Nested content</div></div><textarea id="native-input">Form text</textarea><select><option>Option</option></select>'
    document.body.append(form)
  })
  const outer = await position(page)
  await page.mouse.move(120, 200); await page.mouse.wheel(0, 350); await page.waitForTimeout(400)
  assert.ok(await page.locator('#nested-scroll').evaluate(n => n.scrollTop) > 200)
  assert.ok(Math.abs(await position(page) - outer) < 2)
  await page.locator('#nested-scroll').evaluate(n => { n.scrollTop = n.scrollHeight })
  await page.mouse.wheel(0, 350); await page.waitForTimeout(300)
  assert.ok(Math.abs(await position(page) - outer) < 2)
  assert.equal(await page.locator('#native-input').evaluate(n => {
    const e = new WheelEvent('wheel', { deltaY: 60, bubbles: true, cancelable: true }); n.dispatchEvent(e); return e.defaultPrevented
  }), false)
  await page.locator('#scroll-test-form').evaluate(n => n.remove())
  pass('nested form scrolling, overscroll boundaries and text inputs stay native')

  await reset(page, 500); await wheel(page, { deltaY: 132 })
  await page.evaluate(() => { document.body.style.overflow = 'hidden' })
  await page.waitForTimeout(80)
  const locked = await position(page)
  await page.waitForTimeout(300)
  assert.equal(await position(page), locked)
  assert.equal(await wheel(page), false)
  await page.evaluate(() => document.body.style.removeProperty('overflow'))
  await page.evaluate(() => { const d = document.createElement('dialog'); d.id = 'scroll-test-dialog'; d.textContent = 'Modal'; document.body.append(d); d.showModal() })
  assert.equal(await wheel(page), false)
  await page.locator('#scroll-test-dialog').evaluate(d => { d.close(); d.remove() })
  pass('body locks and native modal dialogs suspend the controller')

  await reset(page)
  await page.locator('.site-nav__links a[href="#portfolio"]').click()
  await page.waitForFunction(() => location.hash === '#portfolio' && !document.body.classList.contains('is-section-travelling'))
  const aligned = await page.evaluate(() => ({ top: document.getElementById('portfolio').getBoundingClientRect().top, header: document.querySelector('.site-nav').getBoundingClientRect().bottom }))
  assert.ok(aligned.top >= aligned.header - 2, JSON.stringify(aligned))
  pass('anchor navigation lands below the fixed header and preserves hash', aligned)

  await page.locator('.site-nav__links a[href="#clients"]').focus()
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => location.hash === '#clients' && document.activeElement?.id === 'clients')
  assert.equal(await page.locator('#clients').getAttribute('tabindex'), '-1')
  await page.keyboard.press('Tab')
  assert.equal(await page.locator('#clients').getAttribute('tabindex'), null)
  pass('keyboard anchors transfer focus and remove temporary tabindex on blur')

  await page.evaluate(() => { document.getElementById('services').setAttribute('tabindex', '0'); document.querySelector('.site-nav__links a[href="#services"]').click() })
  await page.waitForFunction(() => location.hash === '#services')
  assert.equal(await page.locator('#services').getAttribute('tabindex'), '0')
  await page.keyboard.press('Tab')
  assert.equal(await page.locator('#services').getAttribute('tabindex'), '0')
  await page.locator('#services').evaluate(n => n.removeAttribute('tabindex'))
  pass('pre-existing tabindex is preserved')

  const oldHash = await page.evaluate(() => location.hash)
  await page.locator('.site-nav__links a[href="#contact"]').click(); await page.waitForTimeout(130)
  await page.mouse.move(700, 400); await page.mouse.wheel(0, -120); await page.waitForTimeout(1400)
  assert.equal(await page.evaluate(() => location.hash), oldHash)
  assert.equal(await page.evaluate(() => document.body.classList.contains('is-section-travelling')), false)
  pass('wheel interrupts link navigation without committing the cancelled hash')
  await page.locator('.site-nav__links a[href="#contact"]').click(); await page.waitForTimeout(130)
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(1400)
  assert.equal(await page.evaluate(() => location.hash), oldHash)
  pass('keyboard input interrupts link navigation')

  await page.locator('.site-nav__links a[href="#contact"]').click(); await page.waitForTimeout(100)
  await page.keyboard.press('a'); await page.waitForTimeout(1400)
  assert.equal(await page.evaluate(() => location.hash), oldHash)
  pass('non-scrolling keyboard input also interrupts navigation')

  await page.goBack()
  await page.waitForFunction(() => location.hash === '#clients')
  await page.goForward()
  await page.waitForFunction(() => location.hash === '#services')
  pass('browser back/forward preserve anchor history')

  await reset(page, 600); await wheel(page, { deltaY: 132 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  const preferenceStop = await position(page)
  await page.waitForTimeout(300)
  assert.equal(await position(page), preferenceStop)
  assert.equal(await wheel(page), false)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 721, height: 900 }); await page.waitForTimeout(100)
  assert.equal(await wheel(page), true)
  await page.setViewportSize({ width: 720, height: 900 }); await page.waitForTimeout(100)
  assert.equal(await wheel(page), false)
  await page.setViewportSize({ width: 1440, height: 1000 })
  pass('live preference and viewport changes cancel momentum; 721px is the exact threshold')

  await reset(page, 0); await wheel(page, { deltaY: -500 }); await page.waitForTimeout(400)
  assert.equal(await position(page), 0)
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(100); await wheel(page, { deltaY: 500 }); await page.waitForTimeout(400)
  assert.ok(await page.evaluate(() => Math.abs(scrollY - (document.documentElement.scrollHeight - innerHeight))) <= 2)
  pass('document boundaries clamp both directions')
  assert.deepEqual(errors, [])
  await context.close()

  for (const [profile, options] of [
    ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ['narrow-fine-pointer', { viewport: { width: 720, height: 900 } }],
    ['wide-touch', { viewport: { width: 1000, height: 700 }, isMobile: true, hasTouch: true }],
    ['reduced-motion', { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }],
  ]) {
    const context = await browser.newContext(options), page = await context.newPage()
    await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(500)
    await reset(page, 500)
    assert.equal(await wheel(page, { deltaY: 500 }), false)
    if (profile === 'mobile') {
      const cdp = await context.newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 650 }] })
      for (const y of [580, 510, 440, 370, 300]) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y }] })
        await page.waitForTimeout(25)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(500)
      assert.ok(await position(page) > 650)
      await page.locator('.menu-trigger').click()
      await page.waitForFunction(() => document.body.classList.contains('menu-is-open'))
      assert.equal(await wheel(page), false)
      await page.locator('.mobile-menu__links a[href="#contact"]').click()
      await page.waitForFunction(() => location.hash === '#contact' && !document.body.classList.contains('menu-is-open'))
      pass('mobile native swipe, menu lock and menu anchor after close')
    }
    if (profile === 'reduced-motion') {
      await page.locator('.site-nav__links a[href="#contact"]').click()
      await page.waitForFunction(() => location.hash === '#contact', null, { timeout: 1000 })
      assert.equal(await page.evaluate(() => document.body.classList.contains('is-section-travelling')), false)
    }
    pass(`${profile}: wheel stays native`)
    await context.close()
  }
  await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2))
} finally { await browser.close() }
