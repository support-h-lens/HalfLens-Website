import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const nativeScrollQuery = '(max-width: 720px), (hover: none), (pointer: coarse)'
const usesNativeScroll = () => typeof window !== 'undefined' && window.matchMedia(nativeScrollQuery).matches
const configureRefresh = () => ScrollTrigger.config({
  ignoreMobileResize: true,
  // A global refresh writes scrollTo(0, 0), then restores the old position.
  // Those writes interrupt iOS momentum. Touch uses the read-only policy below.
  autoRefreshEvents: usesNativeScroll() ? 'none' : 'visibilitychange,DOMContentLoaded,load,resize',
})
if (typeof window !== 'undefined') configureRefresh()

function refreshLayout() {
  if (!usesNativeScroll()) { ScrollTrigger.refresh(true); return }
  // This site's touch layout has no pins. Individual non-pinned refreshes
  // measure layout without the global zero/restore scroll cycle.
  for (const trigger of ScrollTrigger.getAll()) trigger.refresh()
  ScrollTrigger.update()
}

export function installScrollRefreshPolicy() {
  const media = window.matchMedia(nativeScrollQuery)
  let width = window.innerWidth
  let timer = 0
  const resize = () => {
    if (!media.matches || window.innerWidth === width || (window.visualViewport?.scale ?? 1) !== 1) return
    width = window.innerWidth
    window.clearTimeout(timer)
    timer = window.setTimeout(refreshLayout, 250)
  }
  const change = () => { configureRefresh(); resize() }
  configureRefresh()
  window.addEventListener('resize', resize, { passive: true })
  media.addEventListener('change', change)
  return () => {
    window.clearTimeout(timer)
    window.removeEventListener('resize', resize)
    media.removeEventListener('change', change)
  }
}

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
      refreshLayout()
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
