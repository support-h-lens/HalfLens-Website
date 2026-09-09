// Whole-card, reversible motion. Never move document scroll or animate the
// card's text separately from its boundary. CSS/SSR without JS stays readable.
export function revealServiceCards(intro: HTMLElement, frames: HTMLElement[]) {
  const elements = [intro, ...frames]
  const nativeTimeline = CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: entry 0% entry 100%')
  for (const element of elements) element.dataset.serviceMotion = nativeTimeline ? 'native' : 'fallback'
  intro.dataset.serviceEntrance = 'ready'

  let frame = 0
  let disposed = false
  let geometry: Array<{ element: HTMLElement; rail: HTMLElement | null; top: number; height: number; progress: number }> = []
  let viewport = window.innerHeight
  let width = window.innerWidth
  const focused = new Set<HTMLElement>()
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const clear = (element: HTMLElement) => {
    element.style.removeProperty('transform')
    element.style.removeProperty('opacity')
    element.style.removeProperty('will-change')
    element.querySelector<HTMLElement>('.service-item__rail, .services__intro-rule')?.style.removeProperty('transform')
  }
  const render = () => {
    frame = 0
    if (disposed || document.hidden) return
    // Layout is cached; each scroll frame reads only scrollY before style writes.
    const y = Math.max(0, window.scrollY)
    for (const item of geometry) {
      const { element, rail, top, height } = item
      if (focused.has(element)) continue
      const progress = clamp((viewport - (top - y)) / Math.min(height, viewport))
      if (progress === item.progress) continue
      item.progress = progress
      const eased = 1 - Math.pow(1 - progress, 3)
      const remaining = 1 - eased
      element.style.opacity = String(.25 + .75 * eased)
      element.style.transform = `translate3d(0, ${48 * remaining}px, 0)`
      element.style.willChange = progress > 0 && progress < 1 ? 'transform, opacity' : 'auto'
      if (rail) rail.style.transform = `scaleX(${.15 + .85 * eased})`
    }
  }
  const schedule = () => { if (!disposed && !frame) frame = window.requestAnimationFrame(render) }
  const measure = () => {
    if (disposed || nativeTimeline) return
    // The sticky stage uses small viewport units, not the changing Safari toolbar.
    viewport = document.querySelector<HTMLElement>('.cinematic-story__sticky')?.offsetHeight || window.innerHeight
    geometry = elements.map(element => {
      let top = 0
      for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop
      return { element, rail: element.querySelector<HTMLElement>('.service-item__rail, .services__intro-rule'), top, height: Math.max(1, element.offsetHeight), progress: -1 }
    })
    schedule()
  }
  const resize = () => {
    if (width === window.innerWidth || (window.visualViewport?.scale ?? 1) !== 1) return
    width = window.innerWidth
    measure()
  }
  const focus = (event: FocusEvent) => {
    const element = elements.find(element => event.target instanceof Node && element.contains(event.target))
    if (!element) return
    // Keep a keyboard user's reading target stationary for this visit.
    focused.add(element)
    element.dataset.serviceFocused = 'true'
    clear(element)
  }
  const observer = !nativeTimeline && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
  if (!nativeTimeline) {
    for (const element of elements) observer?.observe(element)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('load', measure)
    void document.fonts?.ready.then(measure)
    measure()
  }
  document.addEventListener('focusin', focus)
  return () => {
    disposed = true
    window.cancelAnimationFrame(frame)
    observer?.disconnect()
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', resize)
    window.removeEventListener('load', measure)
    document.removeEventListener('focusin', focus)
    delete intro.dataset.serviceEntrance
    for (const element of elements) {
      delete element.dataset.serviceMotion
      delete element.dataset.serviceFocused
      clear(element)
    }
  }
}
