import assert from 'node:assert/strict'
import { chromium, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189/'
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const enter = async index => {
      await page.evaluate(index => {
        const frame = document.querySelectorAll('.service-item__frame')[index]
        scrollTo({ top: scrollY + frame.getBoundingClientRect().top - innerHeight * .82, behavior: 'instant' })
      }, index)
      await page.waitForFunction(index => document.querySelectorAll('.service-item__frame')[index].getAnimations().length > 0, index)
    }
    await enter(0)
    const targets = await page.locator('.service-item__frame').first().evaluate(frame => frame.getAnimations({ subtree: true }).map(animation => animation.effect.target.className))
    assert.ok(targets.includes('service-item__frame'))
    assert.ok(targets.every(target => ['service-item__frame', 'service-item__rail'].includes(target)), 'Do not animate text outside its frame')
    await page.waitForFunction(() => !document.querySelector('.service-item__frame').getAnimations({ subtree: true }).length)
    const settled = await page.locator('.service-item__frame').first().evaluate(frame => ({ opacity: getComputedStyle(frame).opacity, transform: getComputedStyle(frame).transform }))
    assert.deepEqual(settled, { opacity: '1', transform: 'none' })

    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForTimeout(150)
    await page.evaluate(() => {
      const frame = document.querySelector('.service-item__frame')
      scrollTo({ top: scrollY + frame.getBoundingClientRect().top - innerHeight * .82, behavior: 'instant' })
    })
    await page.waitForTimeout(100)
    assert.equal(await page.locator('.service-item__frame').first().evaluate(frame => frame.getAnimations({ subtree: true }).length), 0, 'No repeated entrance on reversal')

    await enter(1)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() => [...document.querySelectorAll('.service-item__frame')].every(frame => !frame.getAnimations({ subtree: true }).length))
    assert.equal(await page.locator('.service-item__frame').nth(1).evaluate(frame => getComputedStyle(frame).opacity), '1')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.locator('[data-service-entrance="ready"]').waitFor()
    await enter(3)
    await page.locator('.service-item__link').nth(3).focus()
    assert.equal(await page.locator('.service-item__frame').nth(3).evaluate(frame => frame.getAnimations({ subtree: true }).filter(animation =>
      animation.effect.target === frame || animation.effect.target.classList.contains('service-item__rail')).length), 0, 'Focus immediately settles the entrance (the link focus cue may still animate)')
    assert.deepEqual(errors, [])
    console.log(`PASS ${engine.name()}: whole-card entrance, contained rail, one-time reveal, reversal, live reduced motion, keyboard focus`)
    await page.close()
  } finally { await browser.close() }
}
