import { writeFile } from 'node:fs/promises'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const baseUrl = process.env.HLENS_BENCH_URL ?? 'http://127.0.0.1:5173'
const label = process.env.HLENS_SCRUB_LABEL ?? 'scrub'
const sampleCount = Number(process.env.HLENS_SCRUB_SAMPLES ?? 10)
const requestedProfile = process.env.HLENS_SCRUB_PROFILE
const frameRate = 48
const frameDuration = 1 / frameRate
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

async function waitForLocalVideo(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector('.cinematic-media-stage__video')
    return Boolean(
      video
      && video.src.startsWith('blob:')
      && Number.isFinite(video.duration)
      && video.duration > 0
      && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    )
  }, null, { timeout: 30000 })
}

async function resetToProgress(page, progress) {
  await page.evaluate((nextProgress) => {
    const story = document.querySelector('.cinematic-story')
    const storyTop = story.getBoundingClientRect().top + window.scrollY
    const range = story.offsetHeight - window.innerHeight
    window.scrollTo({ top: storyTop + range * nextProgress, behavior: 'instant' })
  }, progress)
  await page.waitForTimeout(450)
}

async function runWheelSample(page, deltaY) {
  await page.evaluate(({ sourceFrameRate }) => {
    const video = document.querySelector('.cinematic-media-stage__video')
    const story = document.querySelector('.cinematic-story')
    const firstFrame = 2 / sourceFrameRate
    const lastFrame = Math.max(firstFrame, video.duration - 0.05)
    const storyTop = story.getBoundingClientRect().top + window.scrollY
    const range = story.offsetHeight - window.innerHeight
    const expectedTime = () => {
      const progress = Math.min(1, Math.max(0, (window.scrollY - storyTop) / range))
      return firstFrame + (lastFrame - firstFrame) * progress
    }

    const startedAt = performance.now()
    const presentations = []
    const animationFrames = []
    const currentTimeWriteIndex = window.__cinematicCurrentTimeWrites.length
    const controllerEventIndex = window.__cinematicControllerEvents.length
    const longTasks = []
    let active = true

    const longTaskObserver = new PerformanceObserver((list) => {
      longTasks.push(...list.getEntries().map((entry) => ({
        startTime: entry.startTime,
        duration: entry.duration,
      })))
    })
    longTaskObserver.observe({ type: 'longtask', buffered: false })

    const watchPresentation = (now, metadata) => {
      presentations.push({
        elapsedMs: now - startedAt,
        mediaTime: metadata.mediaTime,
        expectedTime: expectedTime(),
        currentTime: video.currentTime,
      })
      if (active) video.requestVideoFrameCallback(watchPresentation)
    }
    video.requestVideoFrameCallback(watchPresentation)

    const watchAnimationFrame = (now) => {
      animationFrames.push({
        elapsedMs: now - startedAt,
        currentTime: video.currentTime,
        expectedTime: expectedTime(),
        scrollY: window.scrollY,
      })
      if (active) requestAnimationFrame(watchAnimationFrame)
    }
    requestAnimationFrame(watchAnimationFrame)

    window.__cinematicScrubAudit = {
      startedAt,
      initialCurrentTime: video.currentTime,
      initialExpectedTime: expectedTime(),
      presentations,
      animationFrames,
      finish() {
        active = false
        longTaskObserver.disconnect()
        return {
          initialCurrentTime: this.initialCurrentTime,
          initialExpectedTime: this.initialExpectedTime,
          finalCurrentTime: video.currentTime,
          finalExpectedTime: expectedTime(),
          presentations: [...presentations],
          animationFrames: [...animationFrames],
          currentTimeWrites: window.__cinematicCurrentTimeWrites
            .slice(currentTimeWriteIndex)
            .map((write) => ({ ...write, elapsedMs: write.at - startedAt })),
          controllerEvents: window.__cinematicControllerEvents.slice(controllerEventIndex),
          longTasks: [...longTasks],
          currentSrc: video.currentSrc,
          sourceKind: video.src.startsWith('blob:') ? 'blob' : 'remote',
          readyState: video.readyState,
          paused: video.paused,
        }
      },
    }
  }, { sourceFrameRate: frameRate })

  await page.mouse.wheel(0, deltaY)
  await page.waitForTimeout(500)
  return page.evaluate(() => window.__cinematicScrubAudit.finish())
}

function summarizeSample(sample) {
  const targetEvent = sample.controllerEvents.find((event) => event.type === 'target')
  const target = targetEvent ? targetEvent.desiredFrame / frameRate : sample.finalExpectedTime
  const tolerance = 1.1 * frameDuration
  const movingPresentations = sample.presentations.filter((frame) => (
    Math.abs(frame.mediaTime - sample.initialCurrentTime) > 0.25 * frameDuration
  ))
  const presentations = movingPresentations.filter((frame, index, frames) => (
    index === 0
    || Math.abs(frame.mediaTime - frames[index - 1].mediaTime) > 0.25 * frameDuration
  ))
  const settledFrame = presentations.find((frame) => Math.abs(frame.mediaTime - target) <= tolerance)
  const intervals = presentations.slice(1).map((frame, index) => (
    frame.elapsedMs - presentations[index].elapsedMs
  ))
  const frameJumps = presentations.slice(1).map((frame, index) => (
    Math.abs(frame.mediaTime - presentations[index].mediaTime) * frameRate
  ))
  const frameAtOrAfter = (elapsedMs) => {
    const frames = sample.animationFrames.filter((frame) => frame.elapsedMs >= elapsedMs)
    return frames[0] ?? sample.animationFrames.at(-1)
  }
  const lagAt = (elapsedMs) => {
    const frame = frameAtOrAfter(elapsedMs)
    return frame ? Math.abs(frame.expectedTime - frame.currentTime) * 1000 : null
  }
  const presentedLagAt = (elapsedMs) => {
    const frames = presentations.filter((frame) => frame.elapsedMs <= elapsedMs)
    const mediaTime = frames.at(-1)?.mediaTime ?? sample.initialCurrentTime
    return Math.abs(target - mediaTime) * 1000
  }
  const animationFrameIntervals = sample.animationFrames.slice(1).map((frame, index) => (
    frame.elapsedMs - sample.animationFrames[index].elapsedMs
  ))
  const presentationEvents = sample.controllerEvents.filter((event) => event.type === 'presented')
  const settledEvent = [...sample.controllerEvents]
    .reverse()
    .find((event) => event.type === 'settled')
  const lastControllerEvent = sample.controllerEvents.at(-1)

  return {
    sourceKind: sample.sourceKind,
    readyState: sample.readyState,
    paused: sample.paused,
    initialTime: sample.initialCurrentTime,
    targetTime: target,
    finalTime: sample.finalCurrentTime,
    currentTimeDeltaMs: Math.abs(sample.finalCurrentTime - sample.initialCurrentTime) * 1000,
    finalErrorMs: Math.abs(sample.finalCurrentTime - target) * 1000,
    presentedFramesUntilSettle: settledFrame
      ? presentations.filter((frame) => frame.elapsedMs <= settledFrame.elapsedMs).length
      : presentations.length,
    totalPresentedFrames: presentations.length,
    totalPresentationCallbacks: movingPresentations.length,
    presentedMediaTimes: presentations.map((frame) => frame.mediaTime),
    settleMs: settledFrame?.elapsedMs ?? null,
    medianPresentedIntervalMs: median(intervals),
    p95PresentedIntervalMs: percentile(intervals, 0.95),
    medianPresentedJumpFrames: median(frameJumps),
    seeksIssued: sample.currentTimeWrites.length,
    controllerSeeksIssued: targetEvent && lastControllerEvent
      ? lastControllerEvent.seeksIssued - targetEvent.seeksIssued
      : 0,
    requestedFramesSkipped: targetEvent && lastControllerEvent
      ? lastControllerEvent.requestedFramesSkipped - targetEvent.requestedFramesSkipped
      : 0,
    controllerSettleMs: settledEvent?.settleTimeMs ?? null,
    medianControllerSeekLatencyMs: median(
      presentationEvents.map((event) => event.seekLatencyMs).filter(Number.isFinite),
    ),
    p95AnimationFrameIntervalMs: percentile(animationFrameIntervals, 0.95),
    maxAnimationFrameIntervalMs: Math.max(0, ...animationFrameIntervals),
    longTaskCount: sample.longTasks.length,
    longTaskDurationMs: sample.longTasks.reduce((total, task) => total + task.duration, 0),
    currentTimeWriteTrace: sample.currentTimeWrites,
    controllerEventTrace: sample.controllerEvents,
    lagAt50Ms: lagAt(50),
    lagAt100Ms: lagAt(100),
    lagAt150Ms: lagAt(150),
    presentedLagAt50Ms: presentedLagAt(50),
    presentedLagAt100Ms: presentedLagAt(100),
    presentedLagAt150Ms: presentedLagAt(150),
  }
}

function summarizeDirection(samples) {
  const summarized = samples.map(summarizeSample)
  const numeric = (key) => summarized.map((sample) => sample[key]).filter(Number.isFinite)
  return {
    samples: summarized,
    aggregate: {
      sampleCount: summarized.length,
      movingSamples: summarized.filter((sample) => sample.currentTimeDeltaMs > 10).length,
      settledSamples: numeric('settleMs').length,
      medianPresentedFramesUntilSettle: median(numeric('presentedFramesUntilSettle')),
      medianPresentedIntervalMs: median(numeric('medianPresentedIntervalMs')),
      p95PresentedIntervalMs: percentile(numeric('p95PresentedIntervalMs'), 0.95),
      medianSettleMs: median(numeric('settleMs')),
      p95SettleMs: percentile(numeric('settleMs'), 0.95),
      medianFinalErrorMs: median(numeric('finalErrorMs')),
      medianLagAt50Ms: median(numeric('lagAt50Ms')),
      medianLagAt100Ms: median(numeric('lagAt100Ms')),
      medianLagAt150Ms: median(numeric('lagAt150Ms')),
      medianPresentedLagAt50Ms: median(numeric('presentedLagAt50Ms')),
      medianPresentedLagAt100Ms: median(numeric('presentedLagAt100Ms')),
      medianPresentedLagAt150Ms: median(numeric('presentedLagAt150Ms')),
      medianPresentedJumpFrames: median(numeric('medianPresentedJumpFrames')),
      medianSeeksIssued: median(numeric('seeksIssued')),
      medianControllerSeeksIssued: median(numeric('controllerSeeksIssued')),
      medianRequestedFramesSkipped: median(numeric('requestedFramesSkipped')),
      medianControllerSeekLatencyMs: median(numeric('medianControllerSeekLatencyMs')),
      medianControllerSettleMs: median(numeric('controllerSettleMs')),
      p95ControllerSettleMs: percentile(numeric('controllerSettleMs'), 0.95),
      p95AnimationFrameIntervalMs: percentile(numeric('p95AnimationFrameIntervalMs'), 0.95),
      maxAnimationFrameIntervalMs: Math.max(0, ...numeric('maxAnimationFrameIntervalMs')),
      totalLongTasks: numeric('longTaskCount').reduce((total, count) => total + count, 0),
      totalLongTaskDurationMs: numeric('longTaskDurationMs')
        .reduce((total, duration) => total + duration, 0),
    },
  }
}

const results = { label, sampleCount, generatedAt: new Date().toISOString(), profiles: {} }

for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.viewport })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.__HLENS_CINEMATIC_DIAGNOSTICS__ = true
    window.__cinematicCurrentTimeWrites = []
    window.__cinematicControllerEvents = []

    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')
    if (descriptor?.get && descriptor.set) {
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get() {
          return descriptor.get.call(this)
        },
        set(value) {
          window.__cinematicCurrentTimeWrites.push({
            at: performance.now(),
            value,
          })
          descriptor.set.call(this, value)
        },
      })
    }

    window.addEventListener('hlens:cinematic-video', (event) => {
      window.__cinematicControllerEvents.push(event.detail)
    })
  })
  await page.goto(baseUrl, { waitUntil: 'load' })
  await page.waitForSelector('.cinematic-media-stage__video')
  await waitForLocalVideo(page)

  const forward = []
  for (let index = 0; index < sampleCount; index += 1) {
    await resetToProgress(page, 0.4)
    forward.push(await runWheelSample(page, 120))
  }

  const reverse = []
  for (let index = 0; index < sampleCount; index += 1) {
    await resetToProgress(page, 0.6)
    reverse.push(await runWheelSample(page, -120))
  }

  results.profiles[profile.name] = {
    viewport: profile.viewport,
    forward: summarizeDirection(forward),
    reverse: summarizeDirection(reverse),
  }
  await context.close()
}

await browser.close()
await writeFile(
  `artifacts/cinematic-scrub-${label}.json`,
  `${JSON.stringify(results, null, 2)}\n`,
)

console.log(JSON.stringify(Object.fromEntries(
  Object.entries(results.profiles).map(([name, profile]) => [name, {
    forward: profile.forward.aggregate,
    reverse: profile.reverse.aggregate,
  }]),
), null, 2))
