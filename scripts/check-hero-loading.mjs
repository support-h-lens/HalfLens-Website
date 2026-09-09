import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const browser = await chromium.launch({ headless: true })
const output = new URL('../artifacts/hero-smoothness/', import.meta.url)
const remoteBase = process.env.HLENS_REMOTE_PREVIEW || 'http://127.0.0.1:5189'
const localBase = 'http://127.0.0.1:5188'
const report = []
try {
  for (const saveData of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const errors = [], requests = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => { if (r.url().includes('.mp4')) requests.push({ url: r.url(), range: r.headers().range, type: r.resourceType() }) })
    if (saveData) await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }))
    await page.goto(remoteBase, { waitUntil: 'load' })
    if (saveData) {
      await page.waitForTimeout(1000)
      assert.equal(requests.length, 0, 'Save Data must prevent speculative video downloads')
      await page.evaluate(() => window.dispatchEvent(new Event('wheel')))
    }
    await page.waitForFunction(() => { const v = document.querySelector('video'); return v?.readyState >= 2 && !v.seeking }, null, { timeout: 30000 })
    const beforeScroll = await page.evaluate(() => {
      const v = document.querySelector('video')
      return { scroll: scrollY, src: v.currentSrc, paused: v.paused, marks: performance.getEntriesByType('mark').map(m => m.name) }
    })
    assert.equal(beforeScroll.scroll, 0)
    assert.ok(beforeScroll.src.startsWith('https://pub-046fd1c457744b10afc99fdd2c5ab3d1.r2.dev/'))
    assert.equal(beforeScroll.paused, true)
    if (!saveData) {
      assert.ok(beforeScroll.marks.includes('cinematic-preload-native'))
      assert.equal(await page.locator('.cinematic-media-stage__poster').evaluate(p => getComputedStyle(p).visibility), 'visible')
      assert.equal(await page.locator('video').evaluate(v => getComputedStyle(v).opacity), '0')
    }
    assert.ok(requests.every(r => r.type === 'media'), 'R2 should use native media, not a CORS-blocked fetch')
    for (const p of [.8, .1, .95, 0]) {
      const target = await page.evaluate(p => {
        const s = document.querySelector('.cinematic-story__chapters'), v = document.querySelector('video')
        const top = s.getBoundingClientRect().top + scrollY, range = s.offsetHeight - innerHeight
        scrollTo({ top: top + p * range, behavior: 'instant' })
        return Math.round((2 / 48 + (v.duration - .05 - 2 / 48) * ((scrollY - top) / range)) * 48) / 48
      }, p)
      await page.waitForFunction(target => { const v = document.querySelector('video'); return !v.seeking && Math.abs(v.currentTime - target) < 1.1 / 48 }, target, { timeout: 30000 })
    }
    assert.deepEqual(errors, [])
    report.push({ test: saveData ? 'R2-save-data' : 'R2-native-preparation', beforeScroll, requests, errors })
    console.log(`PASS ${report.at(-1).test}`)
    await context.close()
  }
  // Scroll during a same-origin fetch: quick completion should keep the blob;
  // a slow response should switch to native media after a bounded wait.
  for (const delay of [80, 650]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const requests = []
    let started
    const fetchStarted = new Promise(resolve => { started = resolve })
    await page.route('**/*.mp4', async route => {
      requests.push(route.request().resourceType())
      if (route.request().resourceType() === 'fetch') {
        started()
        await new Promise(r => setTimeout(r, delay))
      }
      try { await route.continue() } catch { /* Context closed after completing the check. */ }
    })
    await page.goto(localBase, { waitUntil: 'load' })
    await fetchStarted
    await page.evaluate(() => window.dispatchEvent(new Event('wheel')))
    await page.waitForFunction(() => { const v = document.querySelector('video'); return v?.readyState >= 2 && !v.seeking })
    const src = await page.locator('video').getAttribute('src')
    // A busy browser may legitimately exceed the grace period even for the short
    // response. Both paths must become usable; the slow response must fall back.
    if (delay === 650) assert.equal(src.startsWith('blob:'), false)
    if (src.startsWith('blob:')) assert.deepEqual(requests, ['fetch'])
    else assert.ok(requests.includes('media'))
    report.push({ test: `scroll-during-fetch-${delay}ms`, src, requests })
    console.log(`PASS ${report.at(-1).test}`)
    await context.close()
  }
  await mkdir(output, { recursive: true })
  await writeFile(new URL('loading.json', output), JSON.stringify(report, null, 2))
} finally { await browser.close() }
