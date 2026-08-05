import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const baseUrl = 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true })
const pageErrors = []

const waitForReady = async (page) => {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    await document.fonts.ready
    document.documentElement.style.scrollBehavior = 'auto'
    window.dispatchEvent(new Event('resize'))
  })
  await page.waitForTimeout(180)
}

const documentTop = (selector) =>
  `(() => { const element = document.querySelector('${selector}'); return element ? element.getBoundingClientRect().top + window.scrollY : 0 })()`

const scrollToComposition = async (page, selector, progress) => {
  const target = await page.evaluate(
    ({ selector, progress }) => {
      const element = document.querySelector(selector)
      if (!element) return 0
      const top = element.getBoundingClientRect().top + window.scrollY
      return top + element.getBoundingClientRect().height * progress - window.innerHeight * 0.5
    },
    { selector, progress },
  )
  await page.evaluate((y) => window.scrollTo(0, y), target)
  await page.waitForTimeout(900)
}

const captureAt = async (name, viewport, selector, progress = 0) => {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (error) => pageErrors.push(`${name}: ${error.message}`))
  await waitForReady(page)
  if (selector) await scrollToComposition(page, selector, progress)
  await page.screenshot({ path: `artifacts/${name}.png` })
  await page.close()
}

await captureAt('final-desktop-hero', { width: 1920, height: 1080 })
await captureAt('final-tablet-story', { width: 820, height: 1180 }, '#story', 0.38)
await captureAt('final-mobile-services', { width: 390, height: 844 }, '#services', 0.56)

const transitionMetrics = {}
for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (error) => pageErrors.push(`transition-${viewport.name}: ${error.message}`))
  await waitForReady(page)
  const riseTop = await page.evaluate(documentTop('.portfolio-rise'))
  const checkpoints = []

  for (const progress of [0.02, 0.5, 0.98]) {
    await page.evaluate((y) => window.scrollTo(0, y), riseTop + viewport.height * progress)
    await page.waitForTimeout(950)
    checkpoints.push(
      await page.evaluate((progressValue) => {
        const panel = document.querySelector('.portfolio-rise__panel')
        const cinematic = document.querySelector('.portfolio-rise__cinematic')
        const panelStyle = panel ? getComputedStyle(panel) : null
        const cinematicStyle = cinematic ? getComputedStyle(cinematic) : null
        const panelRect = panel?.getBoundingClientRect()
        return {
          progress: progressValue,
          panelTop: Math.round(panelRect?.top ?? 0),
          panelWidth: Math.round(panelRect?.width ?? 0),
          panelRadius: panelStyle?.borderTopLeftRadius,
          panelTransform: panelStyle?.transform,
          cinematicOpacity: cinematicStyle?.opacity,
          cinematicFilter: cinematicStyle?.filter,
          cinematicTransform: cinematicStyle?.transform,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        }
      }, progress),
    )

    if (progress === 0.5) {
      await page.screenshot({ path: `artifacts/final-${viewport.name}-portfolio-rise.png` })
    }
  }

  transitionMetrics[viewport.name] = checkpoints
  await page.close()
}

await captureAt('final-desktop-portfolio', { width: 1440, height: 1000 }, '#portfolio', 0.12)
await captureAt('final-mobile-contact', { width: 390, height: 844 }, '#contact', 0.28)

const responsiveAudit = {}
for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 1000 },
  { width: 1280, height: 900 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (error) => pageErrors.push(`audit-${viewport.width}: ${error.message}`))
  await waitForReady(page)
  responsiveAudit[viewport.width] = await page.evaluate(() => {
    const heroLines = [...document.querySelectorAll('#hero h1 > span')].map((line) => {
      const rect = line.getBoundingClientRect()
      return { top: Math.round(rect.top), bottom: Math.round(rect.bottom) }
    })
    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      heroLineOverlap: heroLines.length > 1 ? heroLines[0].bottom > heroLines[1].top : false,
      heroTitleOverflow: getComputedStyle(document.querySelector('#hero h1')).overflow,
      cameraWidth: Math.round(
        document.querySelector('.cinematic-story__sticky .cinematic-media-stage')?.getBoundingClientRect().width ?? 0,
      ),
      scrollHeight: document.documentElement.scrollHeight,
    }
  })
  await page.close()
}

const reducedPage = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
})
await waitForReady(reducedPage)
const reducedMotion = await reducedPage.evaluate(() => ({
  riseCinematicDisplay: getComputedStyle(document.querySelector('.portfolio-rise__cinematic')).display,
  risePanelTransform: getComputedStyle(document.querySelector('.portfolio-rise__panel')).transform,
  storyOpacity: getComputedStyle(document.querySelector('.story__statement')).opacity,
  serviceOpacity: getComputedStyle(document.querySelector('.service-item')).opacity,
  count: document.querySelector('.story__stat-value [aria-hidden="true"] span')?.textContent,
}))
await reducedPage.close()

const videoContext = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: 'artifacts', size: { width: 1280, height: 720 } },
})
const videoPage = await videoContext.newPage()
videoPage.on('pageerror', (error) => pageErrors.push(`recording: ${error.message}`))
await waitForReady(videoPage)
await videoPage.waitForTimeout(900)
const videoEnd = await videoPage.evaluate(documentTop('.portfolio-rise__panel'))
const steps = 420
for (let step = 0; step <= steps; step += 1) {
  const progress = step / steps
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2
  await videoPage.evaluate((y) => window.scrollTo(0, y), videoEnd * eased)
  await videoPage.waitForTimeout(32)
}
await videoPage.waitForTimeout(900)
const video = videoPage.video()
await videoPage.close()
if (video) await video.saveAs('artifacts/final-cinematic-walkthrough.webm')
await videoContext.close()

await browser.close()

console.log(
  JSON.stringify(
    {
      transitionMetrics,
      responsiveAudit,
      reducedMotion,
      pageErrors,
    },
    null,
    2,
  ),
)
