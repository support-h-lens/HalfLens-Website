import assert from 'node:assert/strict'
import { chromium, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189/'
const onlyGate = process.env.HLENS_STARTUP_GATE_ONLY === '1'

async function scrollFilm(page, progress) {
  const target = await page.evaluate(progress => {
    const chapters = document.querySelector('.cinematic-story__chapters')
    const video = document.querySelector('video')
    const top = scrollY + chapters.getBoundingClientRect().top
    const distance = chapters.offsetHeight - innerHeight
    scrollTo({ top: top + distance * progress, behavior: 'instant' })
    return (2 / 48) + (video.duration - .05 - 2 / 48) * ((scrollY - top) / distance)
  }, progress)
  await page.waitForFunction(target => {
    const video = document.querySelector('video')
    return video.readyState >= 2 && !video.seeking && video.paused
      && Math.abs(video.currentTime - target) < 1.6 / 48
      && getComputedStyle(video).opacity === '1'
  }, target, { timeout: 15000 })
}

for (const engine of onlyGate ? [chromium] : [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    for (const scenario of onlyGate ? ['metadata-only'] : ['native', 'metadata-only', 'slow-start', 'gesture-required', 'reduced-motion']) {
      const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: scenario === 'reduced-motion' ? 'reduce' : 'no-preference' })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      // Desktop WebKit emulation does not reproduce every iOS media policy.
      // Model iOS's metadata-only preload gate explicitly, leaving real media
      // decoding, networking and scrolling to the browser after play() unlocks it.
      await page.addInitScript(scenario => {
        window.mediaPlayCalls = 0
        window.allowMediaGesture = false
        window.presentedFrames = []
        const watched = new WeakSet()
        document.addEventListener('loadedmetadata', event => {
          const video = event.target
          if (video.tagName !== 'VIDEO' || watched.has(video) || !video.requestVideoFrameCallback) return
          watched.add(video)
          const watch = () => video.requestVideoFrameCallback((_, metadata) => {
            window.presentedFrames.push(metadata.mediaTime)
            if (video.isConnected) watch()
          })
          watch()
        }, true)
        const unlocked = new WeakSet()
        const readyState = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'readyState').get
        const play = HTMLMediaElement.prototype.play
        if (scenario !== 'native') {
          Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
            configurable: true,
            get() { return unlocked.has(this) ? readyState.call(this) : Math.min(1, readyState.call(this)) },
          })
          for (const type of ['loadeddata', 'canplay', 'seeked']) document.addEventListener(type, event => {
            if (event.target.tagName === 'VIDEO' && !unlocked.has(event.target)) event.stopImmediatePropagation()
          }, true)
        }
        document.addEventListener('click', event => {
          if (event.isTrusted) window.allowMediaGesture = true
        }, true)
        HTMLMediaElement.prototype.play = function () {
          window.mediaPlayCalls++
          if (scenario === 'gesture-required' && !window.allowMediaGesture) return Promise.reject(new DOMException('A real tap is required', 'NotAllowedError'))
          unlocked.add(this)
          return play.call(this)
        }
      }, scenario)
      if (scenario === 'slow-start') await page.route('**/*.mp4', async route => {
        await new Promise(resolve => setTimeout(resolve, 500))
        await route.continue()
      })
      await page.goto(base, { waitUntil: scenario === 'slow-start' ? 'domcontentloaded' : 'load' })
      await page.evaluate(() => document.fonts.ready)
      if (scenario === 'slow-start') {
        await page.locator('video').waitFor({ state: 'attached' })
        await page.evaluate(() => scrollTo({ top: 100, behavior: 'instant' }))
        await page.waitForFunction(() => window.mediaPlayCalls > 0)
        await page.setViewportSize({ width: 852, height: 393 })
        await page.waitForTimeout(80)
        await page.setViewportSize({ width: 393, height: 852 })
      }
      await page.waitForFunction(() => Number.isFinite(document.querySelector('video')?.duration))
      await page.evaluate(() => scrollTo({ top: 100, behavior: 'instant' }))
      if (scenario === 'reduced-motion') {
        await page.waitForTimeout(400)
        assert.equal(await page.evaluate(() => window.mediaPlayCalls), 0, 'Reduced motion must not prime playback')
        assert.equal(await page.locator('.hero__film-start').count(), 0)
        await page.emulateMedia({ reducedMotion: 'no-preference' })
      }
      if (scenario === 'gesture-required') {
        await page.locator('.hero__film-start').waitFor({ state: 'visible' })
        assert.equal(await page.locator('.hero__film-start').evaluate(button => Boolean(button.closest('[aria-hidden="true"]'))), false)
        await page.locator('.hero__film-start').click()
      }
      await page.waitForFunction(() => {
        const video = document.querySelector('video')
        return video.readyState >= 2 && !video.seeking && video.paused
      }, null, { timeout: 6000 })
      const visualFrames = []
      for (const progress of [.2, .8, .1, 1]) {
        await scrollFilm(page, progress)
        if (engine === webkit && (progress === .2 || progress === .8)) {
          // Windows WebKit can paint paused seeks without delivering rVFC.
          // Compare only the video pixels with all moving page overlays hidden.
          const hidden = await page.addStyleTag({ content: '.cinematic-story__chapters,.site-nav,.cinematic-media-stage > :not(video) { visibility:hidden!important; } .cinematic-media-stage::after { display:none!important; }' })
          const clip = await page.evaluate(() => ({ x: Math.round(innerWidth * .2), y: Math.round(innerHeight * .25), width: Math.round(innerWidth * .6), height: Math.round(innerHeight * .5) }))
          visualFrames.push(await page.screenshot({ clip }))
          await hidden.evaluate(style => style.remove())
        }
      }
      const playCount = await page.evaluate(() => window.mediaPlayCalls)
      await page.evaluate(() => {
        const video = document.querySelector('video')
        video.currentTime = video.duration * .4
        dispatchEvent(new Event('touchend'))
        dispatchEvent(new Event('pointerup'))
      })
      assert.equal(await page.evaluate(() => window.mediaPlayCalls), playCount, 'Further touch input must not restart playback during a scrub seek')
      await scrollFilm(page, .7)
      if (scenario === 'metadata-only') {
        for (const viewport of [{ width: 852, height: 393 }, { width: 393, height: 852 }]) {
          await page.setViewportSize(viewport)
          await page.waitForFunction(portrait => {
            const video = document.querySelector('video')
            return video.readyState >= 2 && !video.seeking && (video.videoHeight > video.videoWidth) === portrait
          }, viewport.height > viewport.width)
          await scrollFilm(page, .4)
          await scrollFilm(page, .8)
        }
      }
      const presented = await page.evaluate(() => window.presentedFrames)
      if (engine === webkit) assert.notDeepEqual(visualFrames[0], visualFrames[1], 'WebKit must paint different video frames, not only change currentTime')
      else assert.ok(presented.some(time => time < 3) && presented.some(time => time > 6), `Compositor must present different video frames: ${JSON.stringify(presented)}`)
      if (scenario !== 'native') assert.ok(await page.evaluate(() => window.mediaPlayCalls > 0), 'Metadata-only video must be primed before enabling scrubbing')
      assert.equal(await page.locator('.hero__film-start').count(), 0, 'Recovery prompt clears when the film is ready')
      assert.deepEqual(errors, [])
      console.log(`PASS ${engine.name()} ${scenario}: paused scroll film advances, reverses, and reaches its final frame`)
      await page.close()
    }
  } finally { await browser.close() }
}
