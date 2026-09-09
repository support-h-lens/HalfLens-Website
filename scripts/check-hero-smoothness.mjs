import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import ts from 'typescript'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const base = process.env.HLENS_BENCH_URL || 'http://127.0.0.1:5188'
const label = process.env.HLENS_SMOOTH_LABEL || 'after'
const output = new URL('../artifacts/hero-smoothness/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = []
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] ?? null
try {
  for (const [profile, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    if (label === 'before') {
      const source = await readFile(new URL('scheduler-before.txt', output), 'utf8')
      const body = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
      await page.route('**/src/lib/cinematicFrameScheduler.ts*', route => route.fulfill({ contentType: 'text/javascript', body }))
    }
    await page.addInitScript(() => {
      window.__HLENS_CINEMATIC_DIAGNOSTICS__ = true
      window.heroEvents = []
      window.addEventListener('hlens:cinematic-video', e => window.heroEvents.push(e.detail))
    })
    await page.goto(base, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => performance.getEntriesByName('cinematic-preload-complete').length)
    await page.evaluate(() => window.dispatchEvent(new Event('wheel')))
    await page.waitForFunction(() => { const v = document.querySelector('video'); return v?.readyState >= 2 && !v.seeking })
    await page.waitForTimeout(700)
    for (const [name, duration, from, to] of [['steady', 2400, 0.05, 0.8], ['fast', 650, 0.05, 0.9], ['reverse', 650, 0.9, 0.05], ['reversal', 900, 0.2, 0.85]]) {
      const raw = await page.evaluate(async ({ name, duration, from, to }) => {
        const video = document.querySelector('video')
        const story = document.querySelector('.cinematic-story__chapters')
        const top = story.getBoundingClientRect().top + scrollY
        const range = story.offsetHeight - innerHeight
        const scroll = p => scrollTo({ top: top + range * p, behavior: 'instant' })
        scroll(from)
        await new Promise(r => setTimeout(r, 650))
        window.heroEvents = []
        const samples = [], frames = [], tasks = []
        let lastPresented = video.currentTime, callback, active = true
        const observer = new PerformanceObserver(list => tasks.push(...list.getEntries().map(e => e.duration)))
        observer.observe({ type: 'longtask' })
        const presented = (now, metadata) => {
          lastPresented = metadata.mediaTime
          frames.push({ now, mediaTime: lastPresented })
          if (active) callback = video.requestVideoFrameCallback(presented)
        }
        callback = video.requestVideoFrameCallback(presented)
        let start, stopped
        await new Promise(resolve => {
          function step(now) {
            start ??= now
            const elapsed = now - start
            if (elapsed <= duration) {
              let p = Math.min(1, elapsed / duration)
              if (name === 'reversal') p = p < 0.5 ? p * 2 : (1 - p) * 2
              scroll(from + (to - from) * p)
            } else if (!stopped) { scroll(name === 'reversal' ? from : to); stopped = now }
            const target = (2 / 48) + (video.duration - 0.05 - 2 / 48) * Math.max(0, Math.min(1, (scrollY - top) / range))
            samples.push({ now, target, presented: lastPresented, seeking: video.seeking })
            if (elapsed < duration + 1000) requestAnimationFrame(step)
            else resolve()
          }
          requestAnimationFrame(step)
        })
        active = false
        video.cancelVideoFrameCallback(callback)
        observer.disconnect()
        return { samples, frames, events: window.heroEvents, tasks, start, stopped, duration, source: video.currentSrc, error: video.error?.message }
      }, { name, duration, from, to })
      const moving = raw.samples.filter(s => s.now < raw.stopped)
      const frames = raw.frames.filter(s => s.now < raw.stopped)
      const final = raw.samples.at(-1)
      const settled = raw.samples.find(s => s.now >= raw.stopped && Math.abs(s.presented - final.target) <= 1.1 / 48)
      const result = { label, profile, name, presentations: frames.length, presentationsPerSecond: frames.length * 1000 / duration,
        p95LagFrames: percentile(moving.map(s => Math.abs(s.target - s.presented) * 48), .95),
        p95PresentationGapMs: percentile(frames.slice(1).map((s, i) => s.now - frames[i].now), .95),
        settleMs: settled ? settled.now - raw.stopped : null,
        finalErrorFrames: Math.abs(final.target - final.presented) * 48, longTasks: raw.tasks.length, errors }
      assert.equal(raw.error, undefined)
      assert.deepEqual(errors, [])
      assert.ok(result.finalErrorFrames <= 1.1, JSON.stringify(result))
      report.push(result)
      await writeFile(new URL(`${label}-${profile}-${name}.json`, output), JSON.stringify(raw))
      console.log(JSON.stringify(result))
    }
    await context.close()
  }
  await writeFile(new URL(`${label}-summary.json`, output), JSON.stringify(report, null, 2))
} finally { await browser.close() }
