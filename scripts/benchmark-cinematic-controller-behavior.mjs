import { writeFile } from 'node:fs/promises'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const baseUrl = process.env.HLENS_BENCH_URL ?? 'http://127.0.0.1:5173'
const label = process.env.HLENS_CONTROLLER_LABEL ?? 'presentation-aware'
const requestedProfile = process.env.HLENS_SCRUB_PROFILE
const disableVideoFrameCallback = process.env.HLENS_DISABLE_RVFC === '1'
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  { name: 'tablet', viewport: { width: 820, height: 1180 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
].filter((profile) => !requestedProfile || profile.name === requestedProfile)
const browser = await chromium.launch({ headless: true })

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

function percentile(values, percentileValue) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentileValue))]
}

async function preparePage(profile) {
  const context = await browser.newContext({ viewport: profile.viewport })
  const page = await context.newPage()
  await page.addInitScript(({ disableRvfc }) => {
    if (disableRvfc) {
      Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
        configurable: true,
        value: undefined,
      })
      Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', {
        configurable: true,
        value: undefined,
      })
    }
    window.__HLENS_CINEMATIC_DIAGNOSTICS__ = true
    window.__cinematicControllerEvents = []
    window.addEventListener('hlens:cinematic-video', (event) => {
      window.__cinematicControllerEvents.push(event.detail)
    })
  }, { disableRvfc: disableVideoFrameCallback })
  await page.goto(baseUrl, { waitUntil: 'load' })
  await page.waitForFunction(() => {
    const video = document.querySelector('.cinematic-media-stage__video')
    return Boolean(
      video?.src.startsWith('blob:')
      && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    )
  }, null, { timeout: 30000 })
  return { context, page }
}

async function reset(page, progress) {
  await page.evaluate((nextProgress) => {
    const story = document.querySelector('.cinematic-story')
    const top = story.getBoundingClientRect().top + scrollY
    scrollTo({
      top: top + (story.offsetHeight - innerHeight) * nextProgress,
      behavior: 'instant',
    })
  }, progress)
  await page.waitForTimeout(500)
}

async function beginAudit(page) {
  await page.evaluate(() => {
    window.__cinematicBehaviorAudit = {
      eventIndex: window.__cinematicControllerEvents.length,
      startedAt: performance.now(),
      longTasks: [],
    }
    const observer = new PerformanceObserver((list) => {
      window.__cinematicBehaviorAudit.longTasks.push(
        ...list.getEntries().map((entry) => entry.duration),
      )
    })
    observer.observe({ type: 'longtask', buffered: false })
    window.__cinematicBehaviorAudit.observer = observer
  })
}

async function finishAudit(page) {
  return page.evaluate(() => {
    const audit = window.__cinematicBehaviorAudit
    audit.observer.disconnect()
    const video = document.querySelector('.cinematic-media-stage__video')
    return {
      durationMs: performance.now() - audit.startedAt,
      events: window.__cinematicControllerEvents.slice(audit.eventIndex),
      longTasks: audit.longTasks,
      videoCurrentTime: video.currentTime,
      sourceKind: video.src.startsWith('blob:') ? 'blob' : 'remote',
      readyState: video.readyState,
      paused: video.paused,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    }
  })
}

function summarize(result) {
  const requests = result.events.filter((event) => event.type === 'requested')
  const presentations = result.events.filter((event) => event.type === 'presented')
  const settled = result.events.filter((event) => event.type === 'settled')
  const latencies = presentations.map((event) => event.seekLatencyMs).filter(Number.isFinite)
  let seekInFlight = false
  let overlapViolations = 0
  for (const event of result.events) {
    if (event.type === 'requested') {
      if (seekInFlight) overlapViolations += 1
      seekInFlight = true
    }
    if (event.type === 'presented') seekInFlight = false
  }
  const firstEvent = result.events[0]
  const lastEvent = result.events.at(-1)

  return {
    ...result,
    events: undefined,
    seeksIssued: requests.length,
    framesPresented: presentations.length,
    settles: settled.length,
    finalTargetDistanceFrames: lastEvent?.targetToPresentedDistance ?? null,
    maxTargetDistanceFrames: Math.max(
      0,
      ...result.events.map((event) => Math.abs(event.targetToPresentedDistance)),
    ),
    requestedFramesSkipped: firstEvent && lastEvent
      ? lastEvent.requestedFramesSkipped - firstEvent.requestedFramesSkipped
      : 0,
    medianSeekLatencyMs: median(latencies),
    p95SeekLatencyMs: percentile(latencies, 0.95),
    finalSettleMs: settled.at(-1)?.settleTimeMs ?? null,
    overlapViolations,
    directionSequence: [
      ...new Set(result.events
        .filter((event) => event.type === 'target')
        .map((event) => event.direction)),
    ],
    totalLongTasks: result.longTasks.length,
    totalLongTaskDurationMs: result.longTasks.reduce((total, duration) => total + duration, 0),
  }
}

const output = { generatedAt: new Date().toISOString(), profiles: {} }

for (const profile of profiles) {
  const { context, page } = await preparePage(profile)

  await reset(page, 0.25)
  await beginAudit(page)
  for (let index = 0; index < 12; index += 1) {
    await page.mouse.wheel(0, 120)
    await page.waitForTimeout(55)
  }
  await page.waitForTimeout(120)
  for (let index = 0; index < 12; index += 1) {
    await page.mouse.wheel(0, -120)
    await page.waitForTimeout(55)
  }
  await page.waitForTimeout(350)
  const continuous = summarize(await finishAudit(page))

  await reset(page, 0.35)
  await beginAudit(page)
  await page.mouse.wheel(0, 1200)
  await page.waitForTimeout(350)
  const largeForward = summarize(await finishAudit(page))

  await reset(page, 0.65)
  await beginAudit(page)
  await page.mouse.wheel(0, -1200)
  await page.waitForTimeout(350)
  const largeReverse = summarize(await finishAudit(page))

  output.profiles[profile.name] = {
    viewport: profile.viewport,
    continuousForwardReverse: continuous,
    largeForward,
    largeReverse,
  }
  await context.close()
}

await browser.close()
await writeFile(
  `artifacts/cinematic-controller-behavior-${label}.json`,
  `${JSON.stringify(output, null, 2)}\n`,
)
console.log(JSON.stringify(output, null, 2))
