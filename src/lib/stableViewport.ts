// Browser chrome can resize the *layout* viewport in iOS web views. Even svh
// can then change. Freeze layout units for a width, not the user's scroll offset.
export const layoutViewportEvent = 'hlens:layout-viewport-change'
const touchQuery = '(max-width: 720px), (hover: none), (pointer: coarse)'

export function layoutViewportHeight() {
  const unit = parseFloat(document.documentElement.style.getPropertyValue('--layout-svh'))
  return unit > 0 ? unit * 100 : window.innerHeight
}

export function isLayoutPortrait() {
  const pinned = document.documentElement.dataset.layoutPortrait
  return pinned === undefined ? window.matchMedia('(orientation: portrait)').matches : pinned === 'true'
}

export function installStableViewport() {
  const root = document.documentElement
  const media = window.matchMedia(touchQuery)
  const properties = ['--layout-vh', '--layout-svh'] as const
  const previous = properties.map(name => [name, root.style.getPropertyValue(name)] as const)
  const previousPortrait = root.dataset.layoutPortrait
  let width = -1
  let enabled = false
  let timer = 0
  let disposed = false

  const notify = () => window.dispatchEvent(new Event(layoutViewportEvent))
  const measure = () => {
    timer = 0
    if (disposed || (window.visualViewport?.scale ?? 1) !== 1) return
    const nextWidth = root.clientWidth
    if (media.matches && enabled && Math.abs(nextWidth - width) < 2) return
    width = nextWidth
    if (!media.matches) {
      enabled = false
      for (const property of properties) root.style.removeProperty(property)
      delete root.dataset.layoutPortrait
      notify()
      return
    }
    enabled = true
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;inset:0 auto auto 0;width:0;visibility:hidden;pointer-events:none;contain:strict;'
    document.body.append(probe)
    // Keep each unit's existing design value at startup. On desktop, CSS still
    // uses its native units via var() fallbacks, so no desktop sizing changes.
    probe.style.height = '100vh'
    const large = probe.getBoundingClientRect().height || window.innerHeight
    probe.style.height = CSS.supports('height:100svh') ? '100svh' : '100vh'
    const small = probe.getBoundingClientRect().height || large
    probe.remove()
    root.style.setProperty('--layout-vh', `${large / 100}px`)
    root.style.setProperty('--layout-svh', `${small / 100}px`)
    root.dataset.layoutPortrait = String(small >= width)
    notify()
  }
  const resize = () => {
    if (disposed || (window.visualViewport?.scale ?? 1) !== 1) return
    // Browser toolbars, translation bars and keyboards change only height.
    // Real rotation, split-screen and device width changes must still relayout.
    if (media.matches && enabled && Math.abs(root.clientWidth - width) < 2) return
    window.clearTimeout(timer)
    timer = window.setTimeout(measure, 120)
  }
  const modeChanged = () => { enabled = false; resize() }
  measure()
  window.addEventListener('resize', resize, { passive: true })
  window.addEventListener('pageshow', resize)
  media.addEventListener('change', modeChanged)
  return () => {
    disposed = true
    window.clearTimeout(timer)
    window.removeEventListener('resize', resize)
    window.removeEventListener('pageshow', resize)
    media.removeEventListener('change', modeChanged)
    for (const [property, value] of previous) {
      if (value) root.style.setProperty(property, value)
      else root.style.removeProperty(property)
    }
    if (previousPortrait === undefined) delete root.dataset.layoutPortrait
    else root.dataset.layoutPortrait = previousPortrait
  }
}
