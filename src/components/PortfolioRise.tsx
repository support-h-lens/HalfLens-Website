import { useLayoutEffect, useRef } from 'react'
import { gsap, refreshScrollTriggerWhenReady } from '../lib/gsap'
import { Portfolio } from '../sections/Portfolio'
import type { ProjectItem } from '../types/content'

export function PortfolioRise({ projects }: { projects: ProjectItem[] }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const edgeRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    const edge = edgeRef.current
    if (!section || !edge) return undefined

    let media: gsap.MatchMedia | undefined
    const context = gsap.context(() => {
      media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        // The work sheet is the ONLY light surface after the finished film.
        // Keep its content on document scroll; only its edge and heading ease in.
        gsap.fromTo(edge, { skewY: -4 }, {
          skewY: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: section, start: 'top bottom', end: 'top 12%',
            scrub: true, invalidateOnRefresh: true,
          },
        })
        gsap.fromTo(section.querySelector('.portfolio__heading'), { y: 44, opacity: .15 }, {
          y: 0, opacity: 1, ease: 'power2.out',
          scrollTrigger: {
            trigger: section, start: 'top 95%', end: 'top 45%',
            scrub: .25, invalidateOnRefresh: true,
          },
        })
      })
    }, section)

    const cancelRefresh = refreshScrollTriggerWhenReady()

    return () => {
      cancelRefresh()
      media?.revert()
      context.revert()
    }
  }, [])

  return (
    <div ref={sectionRef} className="portfolio-rise">
      <div ref={edgeRef} className="portfolio-rise__edge" aria-hidden="true" />
      <div className="portfolio-rise__panel">
        <Portfolio items={projects} />
      </div>
    </div>
  )
}
