import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap, refreshScrollTriggerWhenReady, ScrollTrigger } from '../lib/gsap'

interface SectionWindowProps {
  children: ReactNode
  className?: string
  theme: 'dark' | 'light'
}

export function SectionWindow({ children, className = '', theme }: SectionWindowProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    const panel = panelRef.current
    if (!root || !panel) return undefined

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
            gsap.set(panel, { autoAlpha: 1, borderRadius: 0, scale: 1, y: 0 })
            return
          }

          if (!desktop && !mobile) return

          let timeline: gsap.core.Timeline | undefined

          const clearStyles = () => {
            panel.style.removeProperty('border-radius')
            panel.style.removeProperty('opacity')
            panel.style.removeProperty('transform')
            panel.style.removeProperty('visibility')
            panel.style.willChange = 'auto'
          }

          const destroyTimeline = () => {
            timeline?.scrollTrigger?.kill()
            timeline?.kill()
            timeline = undefined
            clearStyles()
          }

          const createTimeline = () => {
            if (timeline) return
            panel.style.willChange = 'transform, opacity, border-radius'

            timeline = gsap
              .timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                  trigger: root,
                  start: mobile ? 'top 101%' : 'top 104%',
                  end: mobile ? 'top 54%' : 'top 28%',
                  scrub: mobile ? 0.38 : 0.68,
                  invalidateOnRefresh: true,
                },
              })
              .fromTo(
                panel,
                {
                  autoAlpha: mobile ? 0.97 : 0.92,
                  borderRadius: mobile ? 28 : 44,
                  scale: mobile ? 0.976 : 0.965,
                  y: mobile ? 42 : 88,
                },
                {
                  autoAlpha: 1,
                  borderRadius: 0,
                  scale: 1,
                  y: 0,
                  duration: 1,
                },
              )
          }

          clearStyles()

          const lifecycleTrigger = ScrollTrigger.create({
            trigger: root,
            start: 'top 108%',
            end: 'bottom -8%',
            invalidateOnRefresh: true,
            onEnter: createTimeline,
            onEnterBack: createTimeline,
            onLeave: destroyTimeline,
            onLeaveBack: destroyTimeline,
            onRefresh: ({ isActive }) => {
              if (isActive) createTimeline()
              else destroyTimeline()
            },
          })

          return () => {
            lifecycleTrigger.kill()
            destroyTimeline()
          }
        },
      )
    }, root)

    const cancelRefresh = refreshScrollTriggerWhenReady()

    return () => {
      cancelRefresh()
      media?.revert()
      context.revert()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`section-window section-window--${theme}${className ? ` ${className}` : ''}`}
    >
      <div ref={panelRef} className="section-window__panel">
        {children}
      </div>
    </div>
  )
}
