import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium, webkit } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5189/'
const baseline = process.env.HLENS_MOBILE_BASELINE === '1'
const out = new URL('../artifacts/mobile-experience/', import.meta.url)
await mkdir(out, { recursive: true })
const report = []
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] ?? null

for (const engine of baseline ? [chromium] : [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const sizes = baseline ? [[393, 852]] : [[320, 640], [393, 852], [430, 932], [768, 1024], [852, 393], [1440, 1000]]
    for (const [width, height] of sizes) {
      const touch = width < 1000
      const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 3 : 1 })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.addInitScript(() => {
        window.__HLENS_CINEMATIC_DIAGNOSTICS__ = true
        window.filmEvents = []
        window.addEventListener('hlens:cinematic-video', e => window.filmEvents.push(e.detail))
      })
      await page.goto(base, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const layout = await page.evaluate(() => [...document.querySelectorAll('.project')].map(p => {
        const v = p.querySelector('.project__visual'), d = p.querySelector('.project__details'), h = d.querySelector('h3')
        const box = v.getBoundingClientRect()
        const outside = [...d.querySelectorAll('h3, p, dt, dd, .project__meta span')].filter(el => {
          const range = document.createRange(); range.selectNodeContents(el)
          return [...range.getClientRects()].some(r => r.width && (r.left < -1 || r.right > innerWidth + 1))
        }).map(el => el.textContent)
        return { width: p.clientWidth, media: [box.width, box.height], aspect: +v.style.getPropertyValue('--project-media-aspect'), outside, font: parseFloat(getComputedStyle(h).fontSize) }
      }))
      if (!baseline && touch) {
        for (const project of layout) {
          assert.ok(project.width <= width + 1, JSON.stringify(project))
          assert.ok(Math.abs(project.media[0] / project.media[1] - project.aspect) < .015, JSON.stringify(project))
          assert.deepEqual(project.outside, [], 'all Arabic text, not only its container, must fit')
          assert.ok(project.font <= 36)
        }
        assert.equal(await page.locator('.project-video__player').count(), 0, 'touch scrolling must not instantiate hover players')
      }

      // Touch emulation and CPU throttling exercise input/decoder contention, but
      // cannot certify the physical iPhone GPU, Safari toolbar or thermal limits.
      let film
      if (width === 393) {
        const cdp = engine === chromium ? await page.context().newCDPSession(page) : null
        if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
        await page.evaluate(() => dispatchEvent(new Event('touchstart')))
        await page.waitForFunction(() => { const v = document.querySelector('video'); return v?.readyState >= 2 && !v.seeking }, null, { timeout: 30000 })
        await page.waitForTimeout(500)
        film = await page.evaluate(async () => {
          const v = document.querySelector('video'), chapters = document.querySelector('.cinematic-story__chapters')
          const top = scrollY + chapters.getBoundingClientRect().top, distance = chapters.offsetHeight - innerHeight
          const gaps = [], presentations = [], tasks = []
          let last, frameCallback, watching = true
          const observe = (_, meta) => { presentations.push(meta.mediaTime); if (watching) frameCallback = v.requestVideoFrameCallback(observe) }
          if (v.requestVideoFrameCallback) frameCallback = v.requestVideoFrameCallback(observe)
          const observer = typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('longtask') ? new PerformanceObserver(list => tasks.push(...list.getEntries().map(e => e.duration))) : null
          observer?.observe({ type: 'longtask' })
          window.filmEvents = []
          let start
          await new Promise(resolve => {
            const step = now => {
              start ??= now
              if (last) gaps.push(now - last)
              last = now
              const t = Math.min(1, (now - start) / 3600)
              // A full sweep followed immediately by a reversal.
              const progress = t <= .6 ? t / .6 : 1 - (t - .6) / .4 * .8
              scrollTo({ top: top + distance * progress, behavior: 'instant' })
              if (t < 1) requestAnimationFrame(step); else resolve()
            }
            requestAnimationFrame(step)
          })
          await new Promise(resolve => setTimeout(resolve, 2000))
          watching = false
          if (frameCallback) v.cancelVideoFrameCallback(frameCallback)
          observer?.disconnect()
          const expected = 2 / 48 + (v.duration - .05 - 2 / 48) * ((scrollY - top) / distance)
          return { gaps, presentations, tasks, expected, actual: v.currentTime, paused: v.paused, events: window.filmEvents }
        })
        const sought = film.events.filter(e => e.type === 'requested')
        film = { ...film, requested: sought.length, repeatedSeeks: sought.filter((e, i) => i && e.requestedFrame === sought[i - 1].requestedFrame).length, p95RafGap: percentile(film.gaps, .95), p95Seek: percentile(film.events.filter(e => e.type === 'decoded').map(e => e.seekLatencyMs), .95) }
        if (!baseline) {
          assert.ok(Math.abs(film.actual - film.expected) < 1.6 / 48, JSON.stringify(film))
          assert.ok(film.paused)
          if (engine === chromium) assert.ok(new Set(film.presentations).size > 10, 'check presented frames, not just currentTime assignments')
          assert.equal(film.repeatedSeeks, 0, 'no identical-target retry loop')
        }
        if (cdp) {
          // Real browser-generated touch input must still scroll the document.
          const before = await page.evaluate(() => scrollY)
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 650 }] })
          for (let y = 630; y >= 250; y -= 20) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] })
            await page.waitForTimeout(16)
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          await page.waitForTimeout(400)
          const after = await page.evaluate(() => scrollY)
          assert.ok(after > before + 200, `native touch gesture scrolls: ${before} -> ${after}`)
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
        }
      }

      await page.locator('.project').nth(3).evaluate(p => scrollTo({ top: p.getBoundingClientRect().top + scrollY + 48 - 90, behavior: 'instant' }))
      await page.waitForFunction(() => {
        const poster = document.querySelectorAll('.project')[3].querySelector('img')
        return poster?.complete && poster.naturalWidth > 0
      }, null, { timeout: 20000 })
      await page.waitForTimeout(700)
      await page.screenshot({ path: fileURLToPath(new URL(`${baseline ? 'before' : 'after'}-${engine.name()}-${width}x${height}.png`, out)) })
      if (!baseline && width === 393) {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.evaluate(() => scrollTo({ top: 1000, behavior: 'instant' }))
        await page.waitForTimeout(400)
        assert.equal(await page.locator('.project__visual').first().evaluate(el => getComputedStyle(el).transform), 'none')
        const frames = await page.evaluate(() => window.filmEvents.filter(e => e.type === 'requested').length)
        await page.evaluate(() => scrollTo({ top: 3000, behavior: 'instant' }))
        await page.waitForTimeout(500)
        assert.equal(await page.evaluate(() => window.filmEvents.filter(e => e.type === 'requested').length), frames, 'reduced motion stops film seeking')
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.setViewportSize({ width: 852, height: 393 })
        await page.waitForTimeout(800)
        const columns = await page.locator('.project').first().evaluate(el => el.clientWidth)
        assert.ok(columns <= 853, 'rotation keeps touch cards inside the viewport')
        await page.setViewportSize({ width: 393, height: 852 })
      }
      assert.deepEqual(errors, [])
      report.push({ engine: engine.name(), width, height, layout, film, errors })
      console.log(`${baseline ? 'BASELINE' : 'PASS'} ${engine.name()} ${width}x${height}`, film ? JSON.stringify({ requests: film.requested, repeats: film.repeatedSeeks, presentations: film.presentations.length, p95RafMs: film.p95RafGap, p95SeekMs: film.p95Seek, longTasks: film.tasks.length }) : '')
      if (film && engine === webkit && film.p95RafGap > 50) console.warn('WebKit functional checks passed, but frame timing is poor in this Windows lab; this is NOT a Safari smoothness certification.')
      await page.close()
    }
  } finally { await browser.close() }
}
await writeFile(new URL(`${baseline ? 'before' : 'after'}.json`, out), JSON.stringify(report, null, 2))
