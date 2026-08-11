import { useLayoutEffect, useRef } from 'react'
import { gsap, refreshScrollTriggerWhenReady } from '../lib/gsap'
import { Portfolio } from '../sections/Portfolio'

export function PortfolioRise() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    const panel = panelRef.current
    if (!section || !panel) return undefined

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
                start: 'top bottom',
                end: mobile ? 'top 22%' : 'top top',
                scrub: mobile ? 0.65 : 0.9,
                invalidateOnRefresh: true,
              },
            })
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
      <div ref={panelRef} className="portfolio-rise__panel">
        <Portfolio />
      </div>
    </div>
  )
}
