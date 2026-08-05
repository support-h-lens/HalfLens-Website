import { useLayoutEffect, useRef } from 'react'
import { storyContent } from '../data/siteContent'
import { gsap, ScrollTrigger, refreshScrollTriggerWhenReady } from '../lib/gsap'

const finalStatValue = Number.parseInt(storyContent.statValue.replace(/\D/g, ''), 10)

export function OurStory() {
  const sectionRef = useRef<HTMLElement>(null)
  const statementRef = useRef<HTMLDivElement>(null)
  const statRef = useRef<HTMLDivElement>(null)
  const statNumberRef = useRef<HTMLSpanElement>(null)
  const highlightsRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    const statement = statementRef.current
    const stat = statRef.current
    const statNumber = statNumberRef.current
    const highlights = highlightsRef.current

    if (!section || !statement || !stat || !statNumber || !highlights) return undefined

    let media: gsap.MatchMedia | undefined
    let countTween: gsap.core.Tween | undefined
    let countTrigger: ScrollTrigger | undefined
    let hasCounted = false
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
          const targets = [statement, stat, highlights]

          if (reduceMotion) {
            hasCounted = true
            statNumber.textContent = String(finalStatValue)
            gsap.set(targets, {
              opacity: 1,
              visibility: 'visible',
              x: 0,
              y: 0,
              filter: 'none',
            })
            return
          }

          if (hasCounted) {
            statNumber.textContent = String(finalStatValue)
          } else {
            const counter = { value: 1 }
            let killTriggerAfterCreation = false
            statNumber.textContent = '1'

            const startCount = () => {
              if (hasCounted) return
              hasCounted = true
              countTween = gsap.to(counter, {
                value: finalStatValue,
                duration: 1.6,
                ease: 'power2.out',
                onUpdate: () => {
                  statNumber.textContent = String(Math.round(counter.value))
                },
                onComplete: () => {
                  statNumber.textContent = String(finalStatValue)
                },
              })

              if (countTrigger) countTrigger.kill()
              else killTriggerAfterCreation = true
            }

            countTrigger = ScrollTrigger.create({
              trigger: stat,
              start: 'top bottom',
              invalidateOnRefresh: true,
              onEnter: startCount,
              onEnterBack: startCount,
            })

            if (killTriggerAfterCreation) countTrigger.kill()
          }

          if (mobile) {
            const timelineSpacer = { progress: 0 }
            const timeline = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: section,
                start: 'top 82%',
                end: 'bottom 20%',
                scrub: 0.7,
                invalidateOnRefresh: true,
              },
            })

            timeline
              .fromTo(
                statement,
                { autoAlpha: 0, x: 28, y: 14 },
                { autoAlpha: 1, x: 0, y: 0, duration: 0.1 },
                0,
              )
              .to(statement, { autoAlpha: 1, duration: 0.07 }, 0.1)
              .to(statement, { autoAlpha: 0, y: -8, duration: 0.07 }, 0.17)
              .fromTo(
                stat,
                { autoAlpha: 0, x: -24, y: 14 },
                { autoAlpha: 1, x: 0, y: 0, duration: 0.1 },
                0.24,
              )
              .to(stat, { autoAlpha: 1, duration: 0.06 }, 0.34)
              .to(stat, { autoAlpha: 0, y: -8, duration: 0.06 }, 0.4)
              .fromTo(
                highlights,
                { autoAlpha: 0, x: 24, y: 14 },
                { autoAlpha: 1, x: 0, y: 0, duration: 0.1 },
                0.46,
              )
              .to(highlights, { autoAlpha: 1, duration: 0.06 }, 0.56)
              .to(highlights, { autoAlpha: 0, y: -8, duration: 0.06 }, 0.62)
              .to(timelineSpacer, { progress: 1, duration: 0.32 }, 0.68)

            return
          }

          if (desktop) {
            const timeline = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: section,
                start: 'top 72%',
                end: 'bottom 18%',
                scrub: 0.85,
                invalidateOnRefresh: true,
              },
            })

            timeline
              .fromTo(
                statement,
                { autoAlpha: 0, x: 80, filter: 'blur(5px)' },
                {
                  autoAlpha: 1,
                  x: 0,
                  filter: 'blur(0px)',
                  duration: 0.18,
                },
                0,
              )
              .fromTo(
                stat,
                { autoAlpha: 0, x: -80, filter: 'blur(5px)' },
                {
                  autoAlpha: 1,
                  x: 0,
                  filter: 'blur(0px)',
                  duration: 0.18,
                },
                0.16,
              )
              .fromTo(
                highlights,
                { autoAlpha: 0, x: 64, filter: 'blur(4px)' },
                {
                  autoAlpha: 1,
                  x: 0,
                  filter: 'blur(0px)',
                  duration: 0.16,
                },
                0.48,
              )
              .to(
                [statement, stat],
                { autoAlpha: 0, filter: 'blur(2px)', duration: 0.12 },
                0.8,
              )
              .to(
                highlights,
                { autoAlpha: 0, filter: 'blur(2px)', duration: 0.1 },
                0.88,
              )
          }
        },
      )
    }, section)

    const cancelRefresh = refreshScrollTriggerWhenReady()

    return () => {
      cancelRefresh()
      countTween?.kill()
      countTrigger?.kill()
      media?.revert()
      context.revert()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="story"
      className="story cinematic-chapter"
      aria-labelledby="story-title"
    >
      <div className="layout-container story__layout">
        <div ref={statementRef} className="story__statement side-copy side-copy--start">
          <p className="eyebrow" dir="ltr">
            {storyContent.eyebrow}
          </p>
          <h2 id="story-title">{storyContent.title}</h2>
          <p className="story__lead">{storyContent.lead}</p>
        </div>

        <div ref={statRef} className="story__stat side-copy side-copy--end">
          <span className="story__stat-value" dir="ltr">
            <span aria-hidden="true">
              +<span ref={statNumberRef}>40</span>
            </span>
            <span className="visually-hidden" dir="rtl">
              {storyContent.statAccessibleLabel}
            </span>
          </span>
          <span>{storyContent.statLabel}</span>
          <p>{storyContent.supporting}</p>
        </div>

        <ul ref={highlightsRef} className="story__highlights side-copy side-copy--start">
          {storyContent.highlights.map((highlight, index) => (
            <li key={highlight}>
              <span dir="ltr">0{index + 1}</span>
              <p>{highlight}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
