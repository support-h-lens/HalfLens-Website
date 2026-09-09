// Adapted from the read-only AiLens ControlledScroll reference.
export const scrollSettings = {
  maxWheelDelta: 132,
  maxTargetLead: 680,
  maxSpeed: 2100,
  followStrength: 0.22,
  settleDistance: 1.5,
  minNavigationDuration: 680,
  maxNavigationDuration: 1250,
} as const

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

const normalizeWheel = (event: WheelEvent) => {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight * 0.85
  return event.deltaY
}

const nativeSurface = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="spinbutton"], [role="combobox"], [role="listbox"], [role="menu"], dialog, [role="dialog"], [data-native-scroll]'

function usesNestedScrolling(event: WheelEvent, direction: number) {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue
    if (node === document.body || node === document.documentElement) break
    if (node.matches(nativeSurface) || node.isContentEditable) return true
    const style = getComputedStyle(node)
    if (!/(auto|scroll|overlay)/.test(style.overflowY) || node.scrollHeight <= node.clientHeight + 1) continue
    if (/(contain|none)/.test(style.overscrollBehaviorY)) return true
    if (direction > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 1) return true
  }
  return false
}

function isScrollLocked() {
  const body = document.body
  if (body.classList.contains('menu-is-open') || document.querySelector('dialog:modal')) return true
  const bodyStyle = getComputedStyle(body)
  const rootStyle = getComputedStyle(document.documentElement)
  if (bodyStyle.position === 'fixed' || /hidden|clip/.test(bodyStyle.overflowY) || /hidden|clip/.test(rootStyle.overflowY)) return true
  return [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')]
    .some(node => node.getAttribute('aria-hidden') !== 'true' && node.getClientRects().length > 0
      && getComputedStyle(node).visibility !== 'hidden')
}

// Section reveal animations transform their panels. Layout offsets deliberately
// exclude those transforms so an anchor doesn't land short of the heading.
function layoutTop(element: HTMLElement) {
  let top = 0
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop
  return top
}

function headerOffset() {
  let offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  for (const header of document.querySelectorAll<HTMLElement>('.site-nav, .route-header')) {
    const style = getComputedStyle(header)
    const rect = header.getBoundingClientRect()
    if (/fixed|sticky/.test(style.position) && rect.top <= 1 && rect.bottom > 0) offset = Math.max(offset, rect.bottom + 12)
  }
  return offset
}

export function installControlledScroll() {
  const desktopPointer = matchMedia('(min-width: 721px) and (hover: hover) and (pointer: fine)')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let animationFrame = 0
  let navigationFrame = 0
  let previousTimestamp = 0
  let targetY = window.scrollY
  let lastWrittenY = window.scrollY
  let running = false
  let disposed = false
  let releaseFocus = () => {}
  const maximumScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight)
  const wheelEnabled = () => desktopPointer.matches && !reducedMotion.matches && !isScrollLocked()

  const writeScroll = (top: number) => {
    // Keep horizontal position and bypass CSS smooth scrolling: only one easing layer.
    window.scrollTo({ top: clamp(top, 0, maximumScroll()), left: window.scrollX, behavior: 'instant' })
    lastWrittenY = window.scrollY
  }

  const stop = () => {
    cancelAnimationFrame(animationFrame)
    cancelAnimationFrame(navigationFrame)
    animationFrame = navigationFrame = previousTimestamp = 0
    running = false
    targetY = lastWrittenY = window.scrollY
    document.body.classList.remove('is-section-travelling')
  }

  const focusTarget = (target: HTMLElement) => {
    releaseFocus()
    const temporaryTabIndex = !target.hasAttribute('tabindex') && target.tabIndex < 0
    if (temporaryTabIndex) target.setAttribute('tabindex', '-1')
    const cleanup = () => {
      if (temporaryTabIndex && target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex')
      target.removeEventListener('blur', cleanup)
    }
    releaseFocus = cleanup
    target.addEventListener('blur', cleanup, { once: true })
    target.focus({ preventScroll: true })
  }

  const navigateTo = (target: HTMLElement, hash: string, moveFocus: boolean) => {
    stop()
    if (!target.isConnected || isScrollLocked()) return
    const startY = window.scrollY
    const destination = () => clamp(layoutTop(target) - headerOffset()
      - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0), 0, maximumScroll())
    const endY = destination()
    const distance = endY - startY
    const finish = () => {
      navigationFrame = 0
      document.body.classList.remove('is-section-travelling')
      // Re-measure for a header resize, font load, or CMS content arriving in flight.
      writeScroll(destination())
      targetY = window.scrollY
      if (location.hash !== hash) history.pushState(history.state, '', hash)
      if (moveFocus) focusTarget(target)
    }
    if (reducedMotion.matches || Math.abs(distance) < 2) { finish(); return }
    const duration = clamp(680 + Math.abs(distance) * 0.12, scrollSettings.minNavigationDuration, scrollSettings.maxNavigationDuration)
    const startedAt = performance.now()
    document.body.classList.add('is-section-travelling')
    const animate = (timestamp: number) => {
      if (disposed || !target.isConnected || isScrollLocked()) { stop(); return }
      const progress = clamp((timestamp - startedAt) / duration, 0, 1)
      writeScroll(startY + distance * (1 - Math.pow(1 - progress, 4)))
      if (progress < 1) navigationFrame = requestAnimationFrame(animate)
      else finish()
    }
    navigationFrame = requestAnimationFrame(animate)
  }

  const renderStep = (timestamp: number) => {
    if (disposed || !wheelEnabled()) { stop(); return }
    const currentY = window.scrollY
    targetY = clamp(targetY, 0, maximumScroll())
    const distance = targetY - currentY
    if (Math.abs(distance) <= scrollSettings.settleDistance) { writeScroll(targetY); stop(); return }
    const elapsedSeconds = previousTimestamp ? clamp((timestamp - previousTimestamp) / 1000, 0, 0.05) : 1 / 60
    previousTimestamp = timestamp
    const follow = 1 - Math.pow(1 - scrollSettings.followStrength, elapsedSeconds * 60)
    const desiredStep = distance * follow
    const maximumStep = scrollSettings.maxSpeed * elapsedSeconds
    // Integer-rounded browser scroll positions must still settle on high-Hz screens.
    const step = Math.sign(distance) * Math.min(Math.abs(distance), Math.max(1, Math.abs(desiredStep)), maximumStep)
    writeScroll(currentY + step)
    animationFrame = requestAnimationFrame(renderStep)
  }

  const handleWheel = (event: WheelEvent) => {
    // All new input cancels navigation, including native nested/zoom/horizontal input.
    if (navigationFrame) stop()
    if (!wheelEnabled() || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey
      || event.shiftKey || event.altKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) {
      stop()
      return
    }
    const delta = normalizeWheel(event)
    if (!Number.isFinite(delta) || usesNestedScrolling(event, Math.sign(delta))) { stop(); return }
    event.preventDefault()
    const currentY = window.scrollY
    // Drop old momentum on reversal, so the page responds to the new direction now.
    if (!running || Math.sign(delta) !== Math.sign(targetY - currentY)) targetY = currentY
    const requested = clamp(targetY + clamp(delta, -scrollSettings.maxWheelDelta, scrollSettings.maxWheelDelta), 0, maximumScroll())
    targetY = clamp(currentY + clamp(requested - currentY, -scrollSettings.maxTargetLead, scrollSettings.maxTargetLead), 0, maximumScroll())
    running = true
    if (!animationFrame) animationFrame = requestAnimationFrame(renderStep)
  }

  const handleAnchorClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const anchor = event.composedPath().find(node => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined
    if (!anchor || !anchor.hasAttribute('href') || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
    let url: URL
    try { url = new URL(anchor.href, location.href) } catch { return }
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash || url.hash === '#') return
    let id: string
    try { id = decodeURIComponent(url.hash.slice(1)) } catch { return }
    const target = document.getElementById(id)
    if (!target || anchor.closest('dialog, [role="dialog"], [data-native-scroll]')) return
    // Keep links to nested scroll surfaces native as well.
    for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      if (/(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 1) return
    }
    const closingMenu = Boolean(anchor.closest('.mobile-menu'))
    if (isScrollLocked() && !closingMenu) return
    event.preventDefault()
    stop()
    // React closes the mobile menu in its own click handler. Wait for that commit;
    // never remove a scroll-lock class owned by Navigation from this controller.
    navigationFrame = requestAnimationFrame(() => {
      navigationFrame = 0
      if (!disposed) navigateTo(target, url.hash, event.detail === 0 || anchor.classList.contains('skip-link'))
    })
  }

  const handleNativeScroll = () => {
    if ((running || navigationFrame) && Math.abs(window.scrollY - lastWrittenY) > 2) stop()
    if (!running && !navigationFrame) targetY = lastWrittenY = window.scrollY
  }
  const handleKey = (event: KeyboardEvent) => {
    if (navigationFrame || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Tab', 'Escape'].includes(event.key)) stop()
  }
  const handleVisibility = () => { if (document.hidden) stop() }
  const locks = new MutationObserver(() => { if ((running || navigationFrame) && isScrollLocked()) stop() })
  for (const root of [document.documentElement, document.body]) locks.observe(root, { attributes: true, attributeFilter: ['class', 'style'] })
  window.addEventListener('wheel', handleWheel, { passive: false })
  document.addEventListener('click', handleAnchorClick)
  window.addEventListener('scroll', handleNativeScroll, { passive: true })
  window.addEventListener('keydown', handleKey)
  window.addEventListener('pointerdown', stop, { passive: true, capture: true })
  window.addEventListener('touchstart', stop, { passive: true, capture: true })
  window.addEventListener('resize', stop, { passive: true })
  window.addEventListener('pagehide', stop)
  window.addEventListener('popstate', stop)
  window.addEventListener('hashchange', stop)
  document.addEventListener('visibilitychange', handleVisibility)
  desktopPointer.addEventListener('change', stop)
  reducedMotion.addEventListener('change', stop)
  return () => {
    disposed = true
    stop()
    releaseFocus()
    locks.disconnect()
    window.removeEventListener('wheel', handleWheel)
    document.removeEventListener('click', handleAnchorClick)
    window.removeEventListener('scroll', handleNativeScroll)
    window.removeEventListener('keydown', handleKey)
    window.removeEventListener('pointerdown', stop, true)
    window.removeEventListener('touchstart', stop, true)
    window.removeEventListener('resize', stop)
    window.removeEventListener('pagehide', stop)
    window.removeEventListener('popstate', stop)
    window.removeEventListener('hashchange', stop)
    document.removeEventListener('visibilitychange', handleVisibility)
    desktopPointer.removeEventListener('change', stop)
    reducedMotion.removeEventListener('change', stop)
  }
}
