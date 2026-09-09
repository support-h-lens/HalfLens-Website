// Native scrolling stays in charge. Animate each complete card once, not its
// individual text layers on every scroll tick. The CSS/SSR state is always visible.
export function revealServiceCards(intro: HTMLElement, frames: HTMLElement[]) {
  if (typeof IntersectionObserver === 'undefined' || typeof intro.animate !== 'function') return () => {}
  const animations = new Map<HTMLElement, Animation[]>()
  const seen = new Set<Element>()
  const finish = (element: HTMLElement) => {
    for (const animation of animations.get(element) ?? []) animation.cancel()
    animations.delete(element)
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement
      if (!entry.isIntersecting) { finish(element); continue }
      if (seen.has(element)) continue
      seen.add(element)
      // Hash navigation/fast flings can land mid-card. Show the final state
      // immediately instead of replaying an entrance over already-read content.
      if (entry.boundingClientRect.top < window.innerHeight * .08 || element.contains(document.activeElement)) continue
      const running = [element.animate([
        { opacity: .32, transform: 'translate3d(0, 24px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ], { duration: 560, easing: 'cubic-bezier(.16, 1, .3, 1)' })]
      const rail = element.querySelector<HTMLElement>('.service-item__rail, .services__intro-rule')
      if (rail) running.push(rail.animate([
        { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' },
      ], { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)' }))
      animations.set(element, running)
      void Promise.all(running.map(animation => animation.finished)).then(() => {
        if (animations.get(element) === running) finish(element)
      }, () => {})
    }
  }, { threshold: 0, rootMargin: '0px 0px -6% 0px' })
  const onFocus = (event: FocusEvent) => {
    for (const element of animations.keys()) if (event.target instanceof Node && element.contains(event.target)) finish(element)
  }
  document.addEventListener('focusin', onFocus)
  for (const element of [intro, ...frames]) observer.observe(element)
  intro.dataset.serviceEntrance = 'ready'
  return () => {
    delete intro.dataset.serviceEntrance
    observer.disconnect()
    document.removeEventListener('focusin', onFocus)
    for (const element of animations.keys()) finish(element)
  }
}
