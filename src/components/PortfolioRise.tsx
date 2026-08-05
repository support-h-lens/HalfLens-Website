import { useLayoutEffect, useRef } from 'react'
import { gsap, refreshScrollTriggerWhenReady } from '../lib/gsap'
import { Portfolio } from '../sections/Portfolio'
import { CinematicMediaStage } from './CinematicMediaStage'

export function PortfolioRise() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const cinematicRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    const cinematic = cinematicRef.current
    const panel = panelRef.current
    if (!section || !cinematic || !panel) return undefined

    let media: gsap.MatchMedia | undefined
    const context = gsap.context(() => {
      media = gsap.matchMedia()
      media.add(
        {
          desktop: '(min-width: 721px)',
          mobile: '(max-width: 720px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          const { desktop, mobile, reduceMotion } = conditions ?? {}

          if (reduceMotion) {
            gsap.set(panel, {
              width: '100%',
              y: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            })
            gsap.set(cinematic, { clearProps: 'all' })
            return
          }

          if (!desktop && !mobile) return

          const initialInset = mobile ? 16 : 32
          const initialRadius = mobile ? 22 : 36
          const initialLift = mobile ? 20 : 46

          gsap.set(panel, {
            width: `calc(100% - ${initialInset}px)`,
            y: initialLift,
            borderTopLeftRadius: initialRadius,
            borderTopRightRadius: initialRadius,
          })

          gsap
            .timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: mobile ? '+=75%' : '+=100%',
                scrub: mobile ? 0.65 : 0.9,
                invalidateOnRefresh: true,
              },
            })
            .to(
              cinematic,
              {
                scale: mobile ? 0.98 : 0.94,
                autoAlpha: mobile ? 0.5 : 0.35,
                filter: mobile ? 'none' : 'blur(2px)',
                duration: 1,
              },
              0,
            )
            .to(
              panel,
              {
                width: '100%',
                y: 0,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                duration: 1,
              },
              0,
            )
        },
      )
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
      <div ref={cinematicRef} className="portfolio-rise__cinematic" aria-hidden="true">
        <CinematicMediaStage className="portfolio-rise__media" />
        <div className="portfolio-rise__final-frame">
          <span>FINAL FRAME</span>
          <span>OUTPUT / 03</span>
        </div>
      </div>

      <div ref={panelRef} className="portfolio-rise__panel">
        <Portfolio />
      </div>
    </div>
  )
}
