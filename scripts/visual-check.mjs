import { chromium } from '../../pw-diag/node_modules/playwright/index.mjs'

const browser = await chromium.launch({ headless: true })
const pageErrors = []

const capture = async (name, viewport, fullPage = true) => {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (error) => pageErrors.push(`${name}: ${error.message}`))
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await page.screenshot({
    path: `artifacts/${name}.png`,
    fullPage,
  })

  const report = await page.evaluate(() => ({
    documentDirection: document.documentElement.dir,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    sections: ['hero', 'story', 'services', 'portfolio', 'clients', 'contact'].map((id) => ({
      id,
      exists: Boolean(document.getElementById(id)),
    })),
    cinematicHeight: Math.round(
      document.querySelector('.cinematic-story')?.getBoundingClientRect().height ?? 0,
    ),
    viewportHeight: window.innerHeight,
  }))

  await page.close()
  return report
}

const desktop = await capture('desktop-full', { width: 1440, height: 1000 })
const tablet = await capture('tablet-full', { width: 820, height: 1180 })
const mobile = await capture('mobile-full', { width: 390, height: 844 })

const auditHero = async (width, height) => {
  const page = await browser.newPage({ viewport: { width, height } })
  page.on('pageerror', (error) => pageErrors.push(`hero-${width}: ${error.message}`))
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await page.screenshot({ path: `artifacts/hero-${width}.png` })
  const metrics = await page.evaluate(() => {
    const title = document.querySelector('.hero h1')
    const lineElements = Array.from(document.querySelectorAll('.hero h1 span'))
    const lines = lineElements.map((line) => {
      const rect = line.getBoundingClientRect()
      const style = getComputedStyle(line)
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
      }
    })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const glyphLeft = Math.min(
      ...lineElements.map((line) => {
        const rect = line.getBoundingClientRect()
        const style = getComputedStyle(line)
        if (context) context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        return rect.right - (context?.measureText(line.textContent ?? '').width ?? rect.width)
      }),
    )
    const camera = document
      .querySelector('.cinematic-media-stage__camera')
      ?.getBoundingClientRect()
    const titleTop = Math.min(...lines.map((line) => line.top))
    const titleBottom = Math.max(...lines.map((line) => line.bottom))
    const sharesVerticalSpace = camera
      ? titleBottom > camera.top && titleTop < camera.bottom
      : false
    const titleStyle = title ? getComputedStyle(title) : null
    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      lineBoxesOverlap: lines.length === 2 ? lines[0].bottom > lines[1].top : null,
      verticalGap: lines.length === 2 ? lines[1].top - lines[0].bottom : null,
      protectedCameraGap: camera && sharesVerticalSpace
        ? Math.round(glyphLeft - camera.right)
        : 'separate-axis',
      titleOverflow: titleStyle?.overflow,
      titleFontSize: titleStyle?.fontSize,
      titleLineHeight: titleStyle?.lineHeight,
      lines,
    }
  })
  await page.close()
  return metrics
}

const heroAudits = {}
for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 1000 },
  { width: 1280, height: 900 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]) {
  heroAudits[viewport.width] = await auditHero(viewport.width, viewport.height)
}

const waitForScrub = (page) => page.waitForTimeout(1050)

const scrollStoryToProgress = async (page, progress) => {
  await page.evaluate((nextProgress) => {
    const section = document.querySelector('#story')
    if (!(section instanceof HTMLElement)) return
    const mobile = window.innerWidth <= 720
    const start = section.offsetTop - window.innerHeight * (mobile ? 0.82 : 0.72)
    const end =
      section.offsetTop + section.offsetHeight - window.innerHeight * (mobile ? 0.2 : 0.18)
    window.scrollTo({ top: start + (end - start) * nextProgress })
  }, progress)
  await waitForScrub(page)
}

const scrollServiceToProgress = async (page, index, progress) => {
  await page.evaluate(
    ({ itemIndex, nextProgress }) => {
      const item = document.querySelectorAll('.service-item')[itemIndex]
      if (!(item instanceof HTMLElement)) return
      let documentTop = 0
      let current = item
      while (current) {
        documentTop += current.offsetTop
        current = current.offsetParent instanceof HTMLElement ? current.offsetParent : null
      }
      const mobile = window.innerWidth <= 720
      const start = documentTop - window.innerHeight * (mobile ? 0.92 : 0.88)
      const end = documentTop - window.innerHeight * (mobile ? 0.52 : 0.3)
      window.scrollTo({ top: start + (end - start) * nextProgress })
    },
    { itemIndex: index, nextProgress: progress },
  )
  await waitForScrub(page)
}

const readCinematicMotion = (page) =>
  page.evaluate(() => {
    const selectors = [
      '.story__statement',
      '.story__stat',
      '.story__highlights',
      '.services__intro',
      ...Array.from({ length: 5 }, (_, index) => `.service-item:nth-child(${index + 1})`),
    ]
    const camera = document.querySelector('.cinematic-media-stage__body')
    const cameraRect = camera?.getBoundingClientRect()
    const elements = selectors.map((selector) => {
      const element = document.querySelector(selector)
      const rect = element?.getBoundingClientRect()
      const style = element ? getComputedStyle(element) : null
      const opacity = Number(style?.opacity ?? 0)
      const textRects = element
        ? Array.from(
            element.querySelectorAll(
              'h2, h3, p, .story__stat-value, .story__stat > span:nth-child(2), .service-item__header, .story__highlights li',
            ),
          ).map((node) => node.getBoundingClientRect())
        : []
      const overlapsCamera = Boolean(
        cameraRect &&
          opacity > 0.1 &&
          textRects.some(
            (textRect) =>
              textRect.right > cameraRect.left &&
              textRect.left < cameraRect.right &&
              textRect.bottom > cameraRect.top &&
              textRect.top < cameraRect.bottom,
          ),
      )
      return {
        selector,
        opacity,
        visibility: style?.visibility,
        transform: style?.transform,
        filter: style?.filter,
        rect: rect
          ? {
              top: Math.round(rect.top),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
              left: Math.round(rect.left),
            }
          : null,
        overlapsCamera,
      }
    })
    const visible = elements.filter(
      (item) => item.opacity > 0.1 && item.visibility !== 'hidden' && item.rect,
    )
    const overlaps = []
    for (let first = 0; first < visible.length; first += 1) {
      for (let second = first + 1; second < visible.length; second += 1) {
        const a = visible[first]
        const b = visible[second]
        if (
          a.rect.right > b.rect.left &&
          a.rect.left < b.rect.right &&
          a.rect.bottom > b.rect.top &&
          a.rect.top < b.rect.bottom
        ) {
          overlaps.push([a.selector, b.selector])
        }
      }
    }
    return {
      elements,
      visibleOverlaps: overlaps,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      legacyFocusElements: document.querySelectorAll('.focus-composition, .is-in-focus').length,
    }
  })

const auditCinematicMotion = async (name, viewport) => {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (error) => pageErrors.push(`motion-${name}: ${error.message}`))
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto'
    await document.fonts.ready
  })

  const storyProgress = viewport.width <= 720 ? 0.34 : 0.38
  await scrollStoryToProgress(page, storyProgress)
  const storyTogether = await readCinematicMotion(page)
  if (name === '1440' || name === '390') {
    await page.screenshot({ path: `artifacts/gsap-${name}-story.png` })
  }

  await scrollStoryToProgress(page, 0.56)
  const storyLater = await readCinematicMotion(page)
  await scrollStoryToProgress(page, storyProgress)
  const storyReverse = await readCinematicMotion(page)

  const serviceSequence = []
  for (let index = 0; index < 5; index += 1) {
    await scrollServiceToProgress(page, index, 0.5)
    serviceSequence.push(await readCinematicMotion(page))
    if ((name === '1440' || name === '390') && index === 2) {
      await page.screenshot({ path: `artifacts/gsap-${name}-service.png` })
    }
  }

  await scrollServiceToProgress(page, 2, 0.88)
  const serviceFade = await readCinematicMotion(page)
  await scrollServiceToProgress(page, 2, 0.5)
  const serviceReverse = await readCinematicMotion(page)

  await page.close()
  return {
    storyTogether,
    storyLater,
    storyReverse,
    serviceSequence,
    serviceFade,
    serviceReverse,
  }
}

const motionAudits = {}
const requestedMotionViewport = process.argv[2]
const motionViewports = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 1000 },
  { name: '1280', width: 1280, height: 900 },
  { name: '820', width: 820, height: 1180 },
  { name: '390', width: 390, height: 844 },
].filter(({ name }) => !requestedMotionViewport || name === requestedMotionViewport)

for (const viewport of motionViewports) {
  motionAudits[viewport.name] = await auditCinematicMotion(viewport.name, viewport)
}

const summarizeState = (state) => ({
  opacities: Object.fromEntries(
    state.elements.map((element) => [element.selector, Number(element.opacity.toFixed(3))]),
  ),
  cameraOverlaps: state.elements
    .filter((element) => element.overlapsCamera)
    .map((element) => element.selector),
  textOverlaps: state.visibleOverlaps,
  horizontalOverflow: state.horizontalOverflow,
  legacyFocusElements: state.legacyFocusElements,
})

const motionSummary = Object.fromEntries(
  Object.entries(motionAudits).map(([width, audit]) => [
    width,
    {
      storyTogether: summarizeState(audit.storyTogether),
      storyLater: summarizeState(audit.storyLater),
      storyReverse: summarizeState(audit.storyReverse),
      serviceSequence: audit.serviceSequence.map(summarizeState),
      serviceFade: summarizeState(audit.serviceFade),
      serviceReverse: summarizeState(audit.serviceReverse),
    },
  ]),
)

const reducedMotionPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await reducedMotionPage.emulateMedia({ reducedMotion: 'reduce' })
await reducedMotionPage.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
const reducedMotion = await reducedMotionPage.evaluate(() => {
  const targets = Array.from(
    document.querySelectorAll(
      '.story__statement, .story__stat, .story__highlights, .services__intro, .service-item',
    ),
  )
  return {
    targets: targets.map((target) => {
      const style = getComputedStyle(target)
      return {
        opacity: style.opacity,
        visibility: style.visibility,
        transform: style.transform,
        filter: style.filter,
      }
    }),
    legacyFocusElements: document.querySelectorAll('.focus-composition, .is-in-focus').length,
    countText: document.querySelector('.story__stat-value [aria-hidden="true"] span')
      ?.textContent,
  }
})
await reducedMotionPage.close()

const countPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
countPage.on('pageerror', (error) => pageErrors.push(`count: ${error.message}`))
await countPage.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await countPage.evaluate(async () => {
  document.documentElement.style.scrollBehavior = 'auto'
  await document.fonts.ready
})
const countSelector = '.story__stat-value [aria-hidden="true"] span'
const countInitial = await countPage.locator(countSelector).textContent()
await countPage.evaluate(() => {
  const stat = document.querySelector('.story__stat')
  if (!(stat instanceof HTMLElement)) return
  let documentTop = 0
  let current = stat
  while (current) {
    documentTop += current.offsetTop
    current = current.offsetParent instanceof HTMLElement ? current.offsetParent : null
  }
  window.scrollTo({ top: documentTop - window.innerHeight + 2 })
})
await countPage.waitForTimeout(180)
const countDuring = await countPage.locator(countSelector).textContent()
await countPage.waitForTimeout(1650)
const countFinal = await countPage.locator(countSelector).textContent()
await countPage.evaluate(() => window.scrollTo({ top: 0 }))
await countPage.waitForTimeout(150)
await countPage.evaluate(() => {
  const stat = document.querySelector('.story__stat')
  stat?.scrollIntoView({ block: 'end' })
})
await countPage.waitForTimeout(250)
const countAfterReentry = await countPage.locator(countSelector).textContent()
await countPage.close()
const countAudit = {
  initial: countInitial,
  during: countDuring,
  final: countFinal,
  afterReentry: countAfterReentry,
}

const interactionPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await interactionPage.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await interactionPage.screenshot({ path: 'artifacts/desktop-hero.png' })
const heroSpacing = await interactionPage.evaluate(() => {
  const headlineElement = document.querySelector('.hero h1')
  const spans = headlineElement ? Array.from(headlineElement.querySelectorAll('span')) : []
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const textRects = spans.map((span) => {
    const rect = span.getBoundingClientRect()
    const style = getComputedStyle(span)
    if (context) context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const width = context?.measureText(span.textContent ?? '').width ?? rect.width
    return { left: rect.right - width, right: rect.right, top: rect.top, bottom: rect.bottom }
  })
  const headline = textRects.length
    ? {
        left: Math.min(...textRects.map((rect) => rect.left)),
        right: Math.max(...textRects.map((rect) => rect.right)),
        top: Math.min(...textRects.map((rect) => rect.top)),
        bottom: Math.max(...textRects.map((rect) => rect.bottom)),
      }
    : undefined
  const camera = document
    .querySelector('.cinematic-media-stage__camera')
    ?.getBoundingClientRect()
  if (!headline || !camera) return null
  return {
    headlineRightGap: Math.round(window.innerWidth - headline.right),
    protectedGap: Math.round(headline.left - camera.right),
    overlaps: !(
      headline.right < camera.left ||
      headline.left > camera.right ||
      headline.bottom < camera.top ||
      headline.top > camera.bottom
    ),
  }
})
const contrastChecks = await interactionPage.evaluate(() => {
  const styles = getComputedStyle(document.documentElement)
  const rgb = (hex) => {
    const value = hex.trim().replace('#', '')
    return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16))
  }
  const luminance = (color) => {
    const channels = color.map((channel) => {
      const value = channel / 255
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }
  const ratio = (foreground, background) => {
    const light = Math.max(luminance(foreground), luminance(background))
    const dark = Math.min(luminance(foreground), luminance(background))
    return Number(((light + 0.05) / (dark + 0.05)).toFixed(2))
  }
  const navy950 = rgb(styles.getPropertyValue('--color-navy-base'))
  const navy900 = rgb(styles.getPropertyValue('--navy-900'))
  const paper = rgb(styles.getPropertyValue('--paper'))
  const offWhite = rgb(styles.getPropertyValue('--white'))
  const muted = rgb(styles.getPropertyValue('--muted'))
  const ink = rgb(styles.getPropertyValue('--ink'))

  return {
    offWhiteOnNavy: ratio(offWhite, navy950),
    mutedOnNavy: ratio(muted, navy900),
    navyOnIvory: ratio(ink, paper),
  }
})
await interactionPage.evaluate(() => {
  const portfolio = document.querySelector('#portfolio')
  if (portfolio) window.scrollTo({ top: portfolio.offsetTop - 84 })
})
await interactionPage.waitForTimeout(450)
await interactionPage.screenshot({ path: 'artifacts/desktop-portfolio.png' })
const desktopNav = await interactionPage.evaluate(() => ({
  className: document.querySelector('.site-nav')?.className,
  activeHref: document.querySelector('.site-nav__links .is-active')?.getAttribute('href'),
}))
await interactionPage.close()

const tabletPage = await browser.newPage({ viewport: { width: 820, height: 1180 } })
await tabletPage.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await tabletPage.screenshot({ path: 'artifacts/tablet-hero.png' })
await tabletPage.close()

const largePage = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await largePage.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await largePage.locator('#contact').scrollIntoViewIfNeeded()
await largePage.waitForTimeout(350)
await largePage.screenshot({ path: 'artifacts/large-contact.png' })
const largeContact = await largePage.evaluate(() => {
  const form = document.querySelector('.contact-form')?.getBoundingClientRect()
  const layout = document.querySelector('.contact__layout')?.getBoundingClientRect()
  return {
    formWidth: Math.round(form?.width ?? 0),
    layoutWidth: Math.round(layout?.width ?? 0),
  }
})
await largePage.close()

const menuPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
await menuPage.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await menuPage.locator('.menu-trigger').click()
await menuPage.waitForTimeout(400)
await menuPage.screenshot({ path: 'artifacts/mobile-menu.png' })
const mobileMenu = await menuPage.evaluate(() => ({
  isOpen: document.querySelector('.mobile-menu')?.classList.contains('mobile-menu--open'),
  expanded: document.querySelector('.menu-trigger')?.getAttribute('aria-expanded'),
  bodyLocked: document.body.classList.contains('menu-is-open'),
}))
await menuPage.close()

console.log(
  JSON.stringify(
    {
      desktop,
      tablet,
      mobile,
      heroAudits,
      motionSummary,
      reducedMotion,
      countAudit,
      heroSpacing,
      contrastChecks,
      largeContact,
      desktopNav,
      mobileMenu,
      pageErrors,
    },
    null,
    2,
  ),
)
await browser.close()
