import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Safari's expanding/collapsing toolbar is not a new page layout. Rebuilding
// every scroll timeline during that height-only resize makes the film jump.
// GSAP still refreshes for orientation/width changes and substantial resizes.
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, ScrollTrigger }

// Every animated section subscribes to load/fonts. Batch their requests so one
// readiness event doesn't cause a full-page layout refresh for each section.
let readyRefreshFrame = 0
const readyRefreshRequests = new Set<symbol>()

export function refreshScrollTriggerWhenReady() {
  let active = true
  const request = Symbol('ready-refresh')

  const refresh = () => {
    if (!active) return
    readyRefreshRequests.add(request)
    if (readyRefreshFrame) return
    readyRefreshFrame = window.requestAnimationFrame(() => {
      readyRefreshFrame = 0
      if (!readyRefreshRequests.size) return
      readyRefreshRequests.clear()
      ScrollTrigger.refresh()
    })
  }

  if (document.readyState === 'complete') refresh()
  else window.addEventListener('load', refresh, { once: true })

  void document.fonts?.ready.then(refresh)

  return () => {
    active = false
    readyRefreshRequests.delete(request)
    if (!readyRefreshRequests.size) {
      window.cancelAnimationFrame(readyRefreshFrame)
      readyRefreshFrame = 0
    }
    window.removeEventListener('load', refresh)
  }
}
