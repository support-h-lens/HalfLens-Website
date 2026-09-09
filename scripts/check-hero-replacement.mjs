import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const baseUrl = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5188'
const outputDir = new URL('../artifacts/hero-replacement/', import.meta.url)
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = []
const landscape = 'h-lens-hero-landscape.b7c04877f910.mp4'
const portrait = 'h-lens-hero-portrait.e971de5ef297.mp4'
const videoSelector = '.cinematic-media-stage__video'
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))]

async function seek(page, progress, reducedMotion = false) {
  const target = await page.evaluate((value) => {
    const story = document.querySelector('.cinematic-story__chapters')
    const video = document.querySelector('.cinematic-media-stage__video')
    const top = story.getBoundingClientRect().top + scrollY
    scrollTo({ top: top + (story.offsetHeight - innerHeight) * value, behavior: 'instant' })
    const actual = Math.max(0, Math.min(1, (scrollY - top) / (story.offsetHeight - innerHeight)))
    return Math.round((2 / 48 + (video.duration - 0.05 - 2 / 48) * actual) * 48) / 48
  }, progress)
  await page.waitForFunction(({ target, reducedMotion }) => {
    const v = document.querySelector('.cinematic-media-stage__video')
    return v && !v.seeking && Math.abs(v.currentTime - (reducedMotion ? 1.1 : target)) < 1.1 / 48
  }, { target, reducedMotion }, { timeout: 12000 })
  const v = await page.locator(videoSelector).evaluate((v) => ({ time: v.currentTime, paused: v.paused, error: v.error?.message }))
  assert.equal(v.paused, true)
  assert.equal(v.error, undefined)
  return { target: reducedMotion ? 1.1 : target, actual: v.time }
}

async function run(name, viewport, { baseline = false, reducedMotion = false, disableRvfc = false, rotate = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  const errors = []
  const requests = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => { if (/\.mp4(?:\?|$)/.test(request.url())) requests.push(request.url()) })
  if (baseline) await page.route('**/src/data/media.ts*', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replaceAll(landscape, 'h-lens-camera-scroll.2dca78fcb8a1.mp4')
      .replaceAll(portrait, 'h-lens-camera-scroll.d910c0e374dc.mp4')
    await route.fulfill({ response, body })
  })
  await page.addInitScript(({ disableRvfc }) => {
    window.__HLENS_CINEMATIC_DIAGNOSTICS__ = true
    window.heroEvents = []
    window.addEventListener('hlens:cinematic-video', (event) => window.heroEvents.push(event.detail))
    if (disableRvfc) Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', { value: undefined, configurable: true })
  }, { disableRvfc })
  try {
    await page.goto(baseUrl, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => performance.getEntriesByName('cinematic-preload-complete').length > 0)
    const opening = await page.evaluate(() => {
      const video = document.querySelector('.cinematic-media-stage__video')
      const poster = document.querySelector('.cinematic-media-stage__poster img')
      return { src: video.getAttribute('src'), poster: poster.currentSrc, visible: getComputedStyle(poster.parentElement).visibility, width: poster.naturalWidth }
    })
    assert.equal(opening.src, null, 'Opening should retain the poster until scroll intent')
    assert.equal(opening.visible, 'visible')
    assert.ok(opening.width > 0)
    const expectedOrientation = viewport.height >= viewport.width ? 'portrait' : 'landscape'
    assert.ok(opening.poster.includes(expectedOrientation))
    assert.equal(new Set(requests).size, 1, 'Only the selected video should be preloaded')
    const expectedVideo = baseline
      ? (expectedOrientation === 'portrait' ? 'h-lens-camera-scroll.d910c0e374dc.mp4' : 'h-lens-camera-scroll.2dca78fcb8a1.mp4')
      : (expectedOrientation === 'portrait' ? portrait : landscape)
    assert.ok(requests[0].endsWith(expectedVideo), `Wrong video in ${name}: ${requests[0]}`)
    await page.screenshot({ path: new URL(`${name}-opening.png`, outputDir).pathname.replace(/^\/(.:)/, '$1') })
    await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 })))
    await page.waitForFunction(() => {
      const v = document.querySelector('.cinematic-media-stage__video')
      return v?.src.startsWith('blob:') && v.readyState >= 2 && !v.seeking
    })
    const dimensions = await page.locator(videoSelector).evaluate((v) => ({ width: v.videoWidth, height: v.videoHeight, duration: v.duration }))
    if (!baseline) assert.equal(dimensions.width < dimensions.height, expectedOrientation === 'portrait')
    const samples = []
    for (const progress of [0.05, 0.2, 0.45, 0.8, 0.4, 0.1, 0.95, 1, 0]) samples.push(await seek(page, progress, reducedMotion))
    if (rotate) {
      await seek(page, 0.35)
      for (const size of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(size)
        await page.waitForFunction(({ portrait }) => {
          const v = document.querySelector('.cinematic-media-stage__video')
          return v && v.readyState >= 2 && !v.error && (v.videoWidth < v.videoHeight) === portrait
        }, { portrait: size.height > size.width })
        await seek(page, 0.35)
        await seek(page, 0.6)
      }
      // Also exercise a quick reversal while the new source may still be loading.
      await page.setViewportSize({ width: 844, height: 390 })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForFunction(() => {
        const v = document.querySelector('.cinematic-media-stage__video')
        return v && v.readyState >= 2 && !v.error && v.videoWidth < v.videoHeight
      })
      await seek(page, 0.3)
    }
    await seek(page, 0, reducedMotion)
    await page.screenshot({ path: new URL(`${name}-video.png`, outputDir).pathname.replace(/^\/(.:)/, '$1') })
    const stats = await page.evaluate(() => {
      const events = window.heroEvents
      const presented = events.filter((event) => event.type === 'presented')
      return { seeks: presented.length, latencies: presented.map((event) => event.seekLatencyMs), horizontalOverflow: document.documentElement.scrollWidth - innerWidth }
    })
    assert.deepEqual(errors, [])
    assert.ok(stats.horizontalOverflow <= 1)
    const result = { name, video: expectedVideo, dimensions, opening, samples, rotationsChecked: rotate, seeks: stats.seeks,
      medianSeekMs: percentile(stats.latencies, 0.5), p95SeekMs: percentile(stats.latencies, 0.95), errors }
    report.push(result)
    await writeFile(new URL('report.json', outputDir), JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify(result))
  } catch (error) {
    console.error(name, await page.locator(videoSelector).evaluate((v) => ({ src: v.src, currentSrc: v.currentSrc, width: v.videoWidth, height: v.videoHeight, ready: v.readyState, error: v.error?.message, portrait: matchMedia('(orientation: portrait)').matches })))
    throw error
  } finally {
    await context.close()
  }
}

try {
  await run('old-desktop', { width: 1440, height: 1000 }, { baseline: true })
  await run('new-desktop', { width: 1440, height: 1000 })
  await run('old-mobile', { width: 390, height: 844 }, { baseline: true })
  await run('new-mobile', { width: 390, height: 844 }, { rotate: true })
  await run('new-tablet', { width: 820, height: 1180 })
  await run('reduced-motion', { width: 390, height: 844 }, { reducedMotion: true })
  await run('seeked-fallback', { width: 390, height: 844 }, { disableRvfc: true })
  // Production's cross-origin R2 source uses this same direct-media fallback path.
  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const fallbackPage = await fallbackContext.newPage()
  await fallbackPage.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true })
  })
  await fallbackPage.goto(baseUrl, { waitUntil: 'load' })
  await seekIntent(fallbackPage)
  const directSrc = await fallbackPage.locator(videoSelector).getAttribute('src')
  assert.ok(directSrc.endsWith(portrait))
  await seek(fallbackPage, 0.6)
  await seek(fallbackPage, 0.1)
  await fallbackContext.close()

  const failedContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const failedPage = await failedContext.newPage()
  await failedPage.route('**/*.mp4', (route) => route.abort())
  await failedPage.goto(baseUrl, { waitUntil: 'load' })
  await failedPage.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 })))
  await failedPage.waitForFunction(() => document.querySelector('.cinematic-media-stage__video')?.error)
  assert.equal(await failedPage.locator('.cinematic-media-stage__poster').evaluate((p) => getComputedStyle(p).visibility), 'visible')
  assert.equal(await failedPage.locator(videoSelector).evaluate((v) => getComputedStyle(v).opacity), '0')
  await failedContext.close()
  report.push({ directMediaFallback: 'pass', failedVideoPoster: 'pass' })
  const response = await (await browser.newContext()).request.get(`${baseUrl}/media/${portrait}`, { headers: { Range: 'bytes=0-31' } })
  assert.equal(response.status(), 206)
  assert.match(response.headers()['content-type'], /video\/mp4/)
  assert.equal((await response.body()).length, 32)
  await writeFile(new URL('report.json', outputDir), JSON.stringify(report, null, 2) + '\n')
} finally {
  await browser.close()
}

async function seekIntent(page) {
  await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 })))
  await page.waitForFunction(() => document.querySelector('.cinematic-media-stage__video')?.readyState >= 2)
}
