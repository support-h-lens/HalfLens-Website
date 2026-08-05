import { useLayoutEffect, useRef } from 'react'
import { services, servicesContent } from '../data/siteContent'
import { gsap, refreshScrollTriggerWhenReady } from '../lib/gsap'

export function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const introRef = useRef<HTMLElement>(null)
  const serviceRefs = useRef<Array<HTMLLIElement | null>>([])

  useLayoutEffect(() => {
    const section = sectionRef.current
    const intro = introRef.current
    const items = serviceRefs.current.filter(
      (item): item is HTMLLIElement => Boolean(item),
    )

    if (!section || !intro || items.length === 0) return undefined

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
          const targets = [intro, ...items]

          if (reduceMotion) {
            gsap.set(targets, {
              opacity: 1,
              visibility: 'visible',
              x: 0,
              y: 0,
              filter: 'none',
            })
            return
          }

          const movement = mobile ? 28 : 80
          const introMovement = mobile ? -24 : -80
          const scrub = mobile ? 0.7 : 0.85
          const start = mobile ? 'top 92%' : 'top 88%'
          const end = mobile ? 'top 52%' : 'top 30%'
          const filterFrom = desktop ? 'blur(5px)' : 'none'
          const filterTo = desktop ? 'blur(2px)' : 'none'

          gsap
            .timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: intro,
                start: mobile ? 'top 92%' : 'top 82%',
                end: mobile ? 'top 52%' : 'top 34%',
                scrub,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              intro,
              {
                autoAlpha: 0,
                x: introMovement,
                y: mobile ? 12 : 0,
                filter: filterFrom,
              },
              {
                autoAlpha: 1,
                x: 0,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.28,
              },
            )
            .to(intro, { autoAlpha: 1, duration: 0.42 })
            .to(
              intro,
              {
                autoAlpha: 0,
                y: mobile ? -8 : 0,
                filter: filterTo,
                duration: 0.3,
              },
            )

          items.forEach((item) => {
            const fromRight = item.classList.contains('service-item--start')

            gsap
              .timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                  trigger: item,
                  start,
                  end,
                  scrub,
                  invalidateOnRefresh: true,
                },
              })
              .fromTo(
                item,
                {
                  autoAlpha: 0,
                  x: fromRight ? movement : -movement,
                  y: mobile ? 12 : 0,
                  filter: filterFrom,
                },
                {
                  autoAlpha: 1,
                  x: 0,
                  y: 0,
                  filter: 'blur(0px)',
                  duration: 0.28,
                },
              )
              .to(item, { autoAlpha: 1, duration: 0.42 })
              .to(item, {
                autoAlpha: 0,
                y: mobile ? -8 : 0,
                filter: filterTo,
                duration: 0.3,
              })
          })
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
    <section
      ref={sectionRef}
      id="services"
      className="services cinematic-chapter"
      aria-labelledby="services-title"
    >
      <div className="layout-container services__layout">
        <header ref={introRef} className="services__intro side-copy side-copy--end">
          <p className="eyebrow" dir="ltr">
            {servicesContent.eyebrow}
          </p>
          <h2 id="services-title">{servicesContent.title}</h2>
          <p>{servicesContent.intro}</p>
        </header>

        <ol className="services__list">
          {services.map((service, index) => (
            <li
              ref={(item) => {
                serviceRefs.current[index] = item
              }}
              key={service.id}
              className={`service-item service-item--${service.side}`}
            >
              <div className="service-item__header">
                <span className="service-item__number" dir="ltr">
                  {service.id}
                </span>
                <span className="service-item__meta" dir="ltr">
                  {service.meta}
                </span>
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </li>
          ))}
        </ol>

        <div className="services__outro" aria-hidden="true">
          <span>END OF CINEMATIC STAGE</span>
          <span>03 / SELECTED WORK</span>
        </div>
      </div>
    </section>
  )
}
