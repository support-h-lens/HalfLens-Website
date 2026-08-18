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
      const select = gsap.utils.selector(section)
      const statementEyebrow = select('.story__statement .eyebrow')
      const statementTitle = select('.story__title-mask h2')
      const statementLead = select('.story__lead')
      const statValue = select('.story__stat-value')
      const statDetails = select('.story__stat-label, .story__stat-supporting')
      const highlightLines = select('.story__highlight-line')
      const highlightNumbers = select('.story__highlights li > span:not(.story__highlight-line)')
      const highlightCopy = select('.story__highlights li p')

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
            gsap.set(
              [
                ...targets,
                ...statementEyebrow,
                ...statementTitle,
                ...statementLead,
                ...statValue,
                ...statDetails,
                ...highlightLines,
                ...highlightNumbers,
                ...highlightCopy,
              ],
              {
                opacity: 1,
                visibility: 'visible',
                x: 0,
                y: 0,
                yPercent: 0,
                scaleX: 1,
                filter: 'none',
              },
            )
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
                scrub: 0.55,
                invalidateOnRefresh: true,
              },
            })

            timeline
              .fromTo(
                statement,
                { autoAlpha: 0, x: 24, y: 12 },
                { autoAlpha: 1, x: 0, y: 0, duration: 0.075 },
                0,
              )
              .fromTo(
                statementEyebrow,
                { autoAlpha: 0, x: 10 },
                { autoAlpha: 1, x: 0, duration: 0.055 },
                0.01,
              )
              .fromTo(
                statementTitle,
                { autoAlpha: 0, yPercent: 72 },
                { autoAlpha: 1, yPercent: 0, duration: 0.095 },
                0.025,
              )
              .fromTo(
                statementLead,
                { autoAlpha: 0, y: 10 },
                { autoAlpha: 1, y: 0, duration: 0.07 },
                0.065,
              )
              .to(statementLead, { autoAlpha: 0, y: -6, duration: 0.045 }, 0.17)
              .to(statementTitle, { autoAlpha: 0, y: -8, duration: 0.06 }, 0.19)
              .to(statementEyebrow, { autoAlpha: 0, duration: 0.04 }, 0.205)
              .to(statement, { autoAlpha: 0, x: -8, duration: 0.055 }, 0.215)
              .fromTo(
                stat,
                { autoAlpha: 0, x: -22, y: 12 },
                { autoAlpha: 1, x: 0, y: 0, duration: 0.075 },
                0.255,
              )
              .fromTo(
                statValue,
                { autoAlpha: 0, x: -12 },
                { autoAlpha: 1, x: 0, duration: 0.075 },
                0.265,
              )
              .fromTo(
                statDetails,
                { autoAlpha: 0, y: 8 },
                { autoAlpha: 1, y: 0, duration: 0.065, stagger: 0.012 },
                0.3,
              )
              .to(statDetails, { autoAlpha: 0, y: -6, duration: 0.045 }, 0.405)
              .to(statValue, { autoAlpha: 0, x: 8, duration: 0.055 }, 0.425)
              .to(stat, { autoAlpha: 0, duration: 0.045 }, 0.445)
              .fromTo(
                highlights,
                { autoAlpha: 0, x: 22, y: 12 },
                { autoAlpha: 1, x: 0, y: 0, duration: 0.075 },
                0.48,
              )
              .fromTo(
                highlightLines,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.07, stagger: 0.012 },
                0.49,
              )
              .fromTo(
                [...highlightNumbers, ...highlightCopy],
                { autoAlpha: 0, y: 8 },
                { autoAlpha: 1, y: 0, duration: 0.07, stagger: 0.01 },
                0.515,
              )
              .to([...highlightNumbers, ...highlightCopy], { autoAlpha: 0, y: -6, duration: 0.055 }, 0.66)
              .to(highlightLines, { scaleX: 0, duration: 0.06, stagger: 0.008 }, 0.68)
              .to(highlights, { autoAlpha: 0, x: -8, duration: 0.055 }, 0.7)
              .to(timelineSpacer, { progress: 1, duration: 0.25 }, 0.75)

            return
          }

          if (desktop) {
            const timeline = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: section,
                start: 'top 72%',
                end: 'bottom 18%',
                scrub: 0.65,
                invalidateOnRefresh: true,
              },
            })

            timeline
              .fromTo(
                statement,
                { autoAlpha: 0, x: 46 },
                { autoAlpha: 1, x: 0, duration: 0.12 },
                0,
              )
              .fromTo(
                statementEyebrow,
                { autoAlpha: 0, x: 18 },
                { autoAlpha: 1, x: 0, duration: 0.08 },
                0.01,
              )
              .fromTo(
                statementTitle,
                { autoAlpha: 0, yPercent: 88 },
                { autoAlpha: 1, yPercent: 0, duration: 0.17 },
                0.035,
              )
              .fromTo(
                statementLead,
                { autoAlpha: 0, y: 14 },
                { autoAlpha: 1, y: 0, duration: 0.11 },
                0.105,
              )
              .fromTo(
                stat,
                { autoAlpha: 0, x: -44 },
                { autoAlpha: 1, x: 0, duration: 0.12 },
                0.11,
              )
              .fromTo(
                statValue,
                { autoAlpha: 0, x: -18 },
                { autoAlpha: 1, x: 0, duration: 0.13 },
                0.13,
              )
              .fromTo(
                statDetails,
                { autoAlpha: 0, y: 10 },
                { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.018 },
                0.19,
              )
              .fromTo(
                highlights,
                { autoAlpha: 0, x: 38 },
                { autoAlpha: 1, x: 0, duration: 0.11 },
                0.42,
              )
              .fromTo(
                highlightLines,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.11, stagger: 0.014 },
                0.43,
              )
              .fromTo(
                [...highlightNumbers, ...highlightCopy],
                { autoAlpha: 0, y: 10 },
                { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.012 },
                0.46,
              )
              .to([statementLead, ...statDetails], { autoAlpha: 0, y: -8, duration: 0.07 }, 0.75)
              .to(statementTitle, { autoAlpha: 0, y: -10, duration: 0.1 }, 0.78)
              .to([statementEyebrow, ...statValue], { autoAlpha: 0, duration: 0.08 }, 0.8)
              .to([statement, stat], { autoAlpha: 0, duration: 0.08 }, 0.82)
              .to([...highlightNumbers, ...highlightCopy], { autoAlpha: 0, y: -8, duration: 0.07 }, 0.86)
              .to(highlightLines, { scaleX: 0, duration: 0.08, stagger: 0.01 }, 0.88)
              .to(highlights, { autoAlpha: 0, x: -10, duration: 0.08 }, 0.9)
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
          <div className="story__title-mask motion-title-mask">
            <h2 id="story-title">{storyContent.title}</h2>
          </div>
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
          <span className="story__stat-label">{storyContent.statLabel}</span>
          <p className="story__stat-supporting">{storyContent.supporting}</p>
        </div>

        <ul ref={highlightsRef} className="story__highlights side-copy side-copy--start">
          {storyContent.highlights.map((highlight, index) => (
            <li key={highlight}>
              <span className="story__highlight-line" aria-hidden="true" />
              <span dir="ltr">0{index + 1}</span>
              <p>{highlight}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
