import assert from 'node:assert/strict'
import { chromium, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189/'
const onlyGate = process.env.HLENS_STARTUP_GATE_ONLY === '1'
const scenarios = process.env.HLENS_STARTUP_SCENARIOS?.split(',')
  ?? ['native', 'cached-first-frame', 'metadata-only', 'slow-start', 'gesture-required', 'pending-play', 'frozen-play', 'restored-page', 'reduced-motion']

async function scrollFilm(page, progress) {
  const target = await page.evaluate(progress => {
    const chapters = document.querySelector('.cinematic-story__chapters')
    const video = document.querySelector('video')
    const top = scrollY + chapters.getBoundingClientRect().top
    const distance = chapters.offsetHeight - innerHeight
    scrollTo({ top: top + distance * progress, behavior: 'instant' })
    return (2 / 48) + (video.duration - .05 - 2 / 48) * ((scrollY - top) / distance)
  }, progress)
  try { await page.waitForFunction(({ target, final }) => {
    const video = document.querySelector('video')
    // WebKit can report its final decoded sample slightly past that sample's
    // PTS. Only at the endpoint allow two frame intervals; interior seeks keep
    // the tighter tolerance and visual-frame assertions below still apply.
    return video.readyState >= 2 && !video.seeking && video.paused
      && Math.abs(video.currentTime - target) < (final ? 2 : 1.6) / 48
      && getComputedStyle(video).opacity === '1'
  }, { target, final: progress === 1 }, { timeout: 15000 }) } catch (error) {
    console.error('Unsettled startup/recovery', await page.evaluate(target => {
      const v = document.querySelector('video'), c = document.querySelector('.cinematic-story__chapters')
      return { target, actual: v.currentTime, ready: v.readyState, seeking: v.seeking, paused: v.paused,
        stage: v.parentElement.className, playCalls: window.mediaPlayCalls, frames: window.presentedFrames,
        range: c.offsetHeight - innerHeight, y: scrollY, tap: Boolean(document.querySelector('.hero__film-start')), error: v.error?.message }
    }, target))
    throw error
  }
}

for (const engine of (onlyGate ? [chromium] : [chromium, webkit]).filter(engine => !process.env.HLENS_BROWSER || process.env.HLENS_BROWSER === engine.name())) {
  const browser = await engine.launch()
  try {
    for (const scenario of onlyGate ? ['metadata-only'] : scenarios) {
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
        if (!['native', 'cached-first-frame', 'restored-page'].includes(scenario)) {
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
          if (scenario === 'pending-play' && !window.allowMediaGesture) return new Promise(() => {})
          if (scenario === 'frozen-play' && !window.allowMediaGesture) return Promise.resolve()
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
      if (scenario === 'cached-first-frame') {
        await page.waitForFunction(() => { const video = document.querySelector('video'); return video.readyState === 4 && !video.seeking })
        await page.waitForTimeout(100)
      }
      await page.evaluate(() => scrollTo({ top: 100, behavior: 'instant' }))
      if (scenario === 'reduced-motion') {
        await page.waitForTimeout(400)
        assert.equal(await page.evaluate(() => window.mediaPlayCalls), 0, 'Reduced motion must not prime playback')
        assert.equal(await page.locator('.hero__film-start').count(), 0)
        await page.emulateMedia({ reducedMotion: 'no-preference' })
      }
      if (['gesture-required', 'pending-play', 'frozen-play'].includes(scenario)) {
        await page.locator('.hero__film-start').waitFor({ state: 'visible' })
        assert.equal(await page.locator('.hero__film-start').evaluate(button => Boolean(button.closest('[aria-hidden="true"]'))), false)
        // Recovery must remain tappable after the hero has faded out.
        await page.evaluate(() => {
          const chapters = document.querySelector('.cinematic-story__chapters')
          scrollTo({ top: (chapters.offsetHeight - innerHeight) * .45, behavior: 'instant' })
        })
        await page.waitForTimeout(300)
        assert.ok(await page.locator('.hero__film-start').evaluate(button => {
          const r = button.getBoundingClientRect()
          return r.top >= 0 && r.bottom <= innerHeight && button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
        }), 'Recovery must be visible/hit-testable through the service chapters')
        await page.locator('.hero__film-start').click()
      }
      try { await page.waitForFunction(() => {
        const video = document.querySelector('video')
        return video.readyState >= 2 && !video.seeking && video.paused
      }, null, { timeout: 12000 }) } catch (error) {
        console.error(`${engine.name()} ${scenario} startup failed`, await page.evaluate(() => {
          const v = document.querySelector('video')
          return { time: v.currentTime, ready: v.readyState, seeking: v.seeking, paused: v.paused, calls: window.mediaPlayCalls,
            stage: v.parentElement.className, tap: Boolean(document.querySelector('.hero__film-start')), hidden: document.hidden, error: v.error?.message }
        }))
        throw error
      }
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
      if (scenario === 'restored-page') {
        const before = await page.evaluate(() => window.mediaPlayCalls)
        await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
        await page.waitForFunction(before => window.mediaPlayCalls > before, before)
        await scrollFilm(page, .7)
        await scrollFilm(page, .2)
        // Simulate returning from another app without pretending this is a
        // physical iPhone lifecycle test.
        await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true })
          document.dispatchEvent(new Event('visibilitychange'))
          Object.defineProperty(document, 'hidden', { configurable: true, value: false })
          document.dispatchEvent(new Event('visibilitychange'))
          delete document.hidden
        })
        await page.waitForFunction(before => window.mediaPlayCalls > before + 1, before)
        await scrollFilm(page, .8)
      }
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
      assert.ok(await page.evaluate(() => window.mediaPlayCalls > 0), 'Touch video must start its decoder even if the first frame was cached')
      assert.equal(await page.locator('.hero__film-start').count(), 0, 'Recovery prompt clears when the film is ready')
      assert.deepEqual(errors, [])
      console.log(`PASS ${engine.name()} ${scenario}: paused scroll film advances, reverses, and reaches its final frame`)
      await page.close()
    }
  } finally { await browser.close() }
}
