import { writeFile } from 'node:fs/promises'
import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const label = process.env.HLENS_LOADING_LABEL ?? 'loading'
const strategy = process.env.HLENS_LOADING_MODE ?? 'deferred-blob'
const baseUrl = process.env.HLENS_BENCH_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true })

const requestedProfile = process.env.HLENS_LOADING_PROFILE
const requestedScenario = process.env.HLENS_LOADING_SCENARIO
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, mbps: 20, latency: 40 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mbps: 10, latency: 60 },
].filter((profile) => !requestedProfile || profile.name === requestedProfile)

async function createContext(profile) {
  const context = await browser.newContext({ viewport: profile.viewport })
  const setupPage = await context.newPage()
  const session = await context.newCDPSession(setupPage)
  await session.send('Network.enable')
  await session.send('Network.clearBrowserCache')
  await session.send('Network.setCacheDisabled', { cacheDisabled: false })
  await session.detach()
  await setupPage.close()
  return context
}

async function runVisit(context, profile, mode) {
  const page = await context.newPage()
  const session = await context.newCDPSession(page)
  const requests = new Map()
  const responses = new Map()
  const finished = new Map()

  await session.send('Network.enable')
  await session.send('Network.setCacheDisabled', { cacheDisabled: false })
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.latency,
    downloadThroughput: (profile.mbps * 1024 * 1024) / 8,
    uploadThroughput: (profile.mbps * 1024 * 1024) / 8,
  })
  session.on('Network.requestWillBeSent', ({ requestId, request, type, timestamp }) => {
    requests.set(requestId, { url: request.url, type, requestTimestamp: timestamp })
  })
  session.on('Network.responseReceived', ({ requestId, response }) => {
    responses.set(requestId, {
      status: response.status,
      fromDiskCache: response.fromDiskCache,
      fromServiceWorker: response.fromServiceWorker,
      cacheControl: response.headers['cache-control'] ?? response.headers['Cache-Control'] ?? null,
    })
  })
  session.on('Network.loadingFinished', ({ requestId, timestamp, encodedDataLength }) => {
    finished.set(requestId, { finishedTimestamp: timestamp, encodedDataLength })
  })

  await page.addInitScript(({ loadingStrategy, profileName }) => {
    if (loadingStrategy === 'immediate-remote') {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { effectiveType: '4g', saveData: true },
      })

      const attachImmediateVideoSource = () => {
        const video = document.querySelector('video')
        if (!video || video.currentSrc || video.getAttribute('src')) return false
        video.preload = 'auto'
        video.src = profileName === 'mobile'
          ? '/media/h-lens-camera-scroll.d910c0e374dc.mp4'
          : '/media/h-lens-camera-scroll.2dca78fcb8a1.mp4'
        return true
      }
      const observer = new MutationObserver(() => {
        if (attachImmediateVideoSource()) observer.disconnect()
      })
      const observeDocument = () => {
        if (attachImmediateVideoSource()) return
        observer.observe(document.documentElement, { childList: true, subtree: true })
      }
      if (document.documentElement) observeDocument()
      else document.addEventListener('DOMContentLoaded', observeDocument, { once: true })
    }

    window.__loadingAudit = { lcp: null, longTasks: 0, events: [] }
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const entry = entries[entries.length - 1]
      if (entry) {
        window.__loadingAudit.lcp = {
          startTime: entry.startTime,
          size: entry.size,
          url: entry.url,
          tag: entry.element?.tagName ?? null,
          id: entry.element?.id ?? null,
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      window.__loadingAudit.longTasks += list.getEntries().reduce((total, entry) => total + entry.duration, 0)
    }).observe({ type: 'longtask', buffered: true })
    new PerformanceObserver((list) => {
      window.__loadingAudit.events.push(
        ...list.getEntries().map((entry) => ({
          name: entry.name,
          duration: entry.duration,
          processingMs: entry.processingEnd - entry.processingStart,
        })),
      )
    }).observe({ type: 'event', buffered: true, durationThreshold: 0 })
  }, { loadingStrategy: strategy, profileName: profile.name })

  const navigationStarted = Date.now()
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#hero h1')
  const heroReadyMs = await page.evaluate(() => performance.now())

  let earlySeek = null
  if (mode === 'early') {
    earlySeek = await page.evaluate(async () => {
      const video = document.querySelector('video')
      const story = document.querySelector('.cinematic-story')
      const targetProgress = 0.5
      const targetScroll = (story.offsetHeight - innerHeight) * targetProgress
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, targetScroll)
      const sourceDeadline = performance.now() + 12000
      while (!video.currentSrc || !Number.isFinite(video.duration)) {
        if (performance.now() > sourceDeadline) return null
        await new Promise((resolve) => setTimeout(resolve, 16))
      }
      const targetTime = 0.04 + (video.duration - 0.09) * targetProgress
      const startedAt = performance.now()
      const presented = new Promise((resolve) => {
        const watch = (_now, frame) => {
          if (Math.abs(frame.mediaTime - targetTime) <= 1.1 / 48) {
            resolve({ latencyMs: performance.now() - startedAt, mediaTime: frame.mediaTime })
          } else video.requestVideoFrameCallback(watch)
        }
        video.requestVideoFrameCallback(watch)
      })
      return Promise.race([
        presented,
        new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
      ])
    })
  }

  await page.waitForLoadState('load')
  await page.waitForTimeout(mode === 'normal' ? 12000 : 500)

  const fullSeek = mode === 'normal'
    ? await page.evaluate(async () => {
        const video = document.querySelector('video')
        if (!video?.currentSrc || !Number.isFinite(video.duration)) return null

        const samples = []
        for (const progress of [0.25, 0.5, 0.75]) {
          const targetTime = 0.04 + (video.duration - 0.09) * progress
          const startedAt = performance.now()
          const presented = new Promise((resolve) => {
            const watch = (_now, frame) => {
              if (Math.abs(frame.mediaTime - targetTime) <= 1.1 / 48) {
                resolve({
                  progress,
                  latencyMs: performance.now() - startedAt,
                  mediaTime: frame.mediaTime,
                })
              } else video.requestVideoFrameCallback(watch)
            }
            video.requestVideoFrameCallback(watch)
          })
          video.currentTime = targetTime
          const sample = await Promise.race([
            presented,
            new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
          ])
          samples.push(sample)
        }
        return samples
      })
    : null

  const interactionSelector = profile.name === 'mobile' ? '.menu-trigger' : '.button--nav'
  await page.evaluate(() => {
    document.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    })
  })
  await page.click(interactionSelector)
  await page.waitForTimeout(150)

  const pageMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    const paints = Object.fromEntries(
      performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]),
    )
    const preloadStart = performance.getEntriesByName('cinematic-preload-start')[0]?.startTime ?? null
    const preloadComplete = performance.getEntriesByName('cinematic-preload-complete')[0]?.startTime ?? null
    const preloadFallback = performance.getEntriesByName('cinematic-preload-fallback')[0]?.startTime ?? null
    const preloadCacheHit = performance.getEntriesByName('cinematic-preload-cache-hit')[0]?.startTime ?? null
    const video = document.querySelector('video')
    return {
      loadMs: navigation.loadEventEnd,
      domContentLoadedMs: navigation.domContentLoadedEventEnd,
      fcpMs: paints['first-contentful-paint'] ?? null,
      lcp: window.__loadingAudit.lcp,
      longTaskMs: window.__loadingAudit.longTasks,
      maxInteractionDurationMs: Math.max(
        0,
        ...window.__loadingAudit.events.map((entry) => entry.duration),
      ),
      preloadStart,
      preloadComplete,
      preloadFallback,
      preloadCacheHit,
      videoSourceKind: video?.src.startsWith('blob:') ? 'blob' : video?.currentSrc ? 'remote' : 'poster',
      videoReadyState: video?.readyState ?? null,
    }
  })

  const requestRows = [...requests.entries()].map(([requestId, request]) => ({
    ...request,
    ...responses.get(requestId),
    ...finished.get(requestId),
  }))
  const navigationRequest = requestRows.find((request) => request.type === 'Document')
  const originTimestamp = navigationRequest?.requestTimestamp
    ?? Math.min(...requestRows.map((request) => request.requestTimestamp))
  const mediaRequests = requestRows
    .filter((request) => request.url.includes('.mp4'))
    .map((request) => ({
      ...request,
      startMs: (request.requestTimestamp - originTimestamp) * 1000,
      finishMs: request.finishedTimestamp === undefined
        ? null
        : (request.finishedTimestamp - originTimestamp) * 1000,
    }))
  const loadMs = pageMetrics.loadMs
  const criticalCompetition = requestRows.filter(
    (request) => request.requestTimestamp
      && (request.requestTimestamp - originTimestamp) * 1000 < loadMs,
  )
  const mediaBeforeLoad = mediaRequests.filter((request) => request.startMs < loadMs)
  const result = {
    mode,
    wallClockMs: Date.now() - navigationStarted,
    heroReadyMs,
    earlySeek,
    fullSeek,
    ...pageMetrics,
    totalRequests: requestRows.length,
    criticalWindowRequests: criticalCompetition.length,
    mediaBeforeLoad: mediaBeforeLoad.length,
    mediaRequests,
  }
  await page.close()
  return result
}

const results = { label, strategy, generatedAt: new Date().toISOString(), profiles: {} }
for (const profile of profiles) {
  const context = await createContext(profile)
  const first = await runVisit(context, profile, 'normal')
  if (requestedScenario === 'first') {
    await context.close()
    results.profiles[profile.name] = { first }
    console.log(profile.name, JSON.stringify(results.profiles[profile.name], null, 2))
    continue
  }
  const repeat = await runVisit(context, profile, 'normal')
  await context.close()

  const earlyContext = await createContext(profile)
  const early = await runVisit(earlyContext, profile, 'early')
  await earlyContext.close()
  results.profiles[profile.name] = { first, repeat, early }
  console.log(profile.name, JSON.stringify(results.profiles[profile.name], null, 2))
}

await browser.close()
await writeFile(`artifacts/${label}.json`, JSON.stringify(results, null, 2))
