import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

export function refreshScrollTriggerWhenReady() {
  let active = true
  let frame = 0

  const refresh = () => {
    if (!active) return
    frame = window.requestAnimationFrame(() => ScrollTrigger.refresh())
  }

  if (document.readyState === 'complete') refresh()
  else window.addEventListener('load', refresh, { once: true })

  void document.fonts?.ready.then(refresh)

  return () => {
    active = false
    window.cancelAnimationFrame(frame)
    window.removeEventListener('load', refresh)
  }
}
