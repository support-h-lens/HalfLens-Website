import { useLayoutEffect, useRef } from 'react'
import { productionStages, services, servicesContent } from '../data/siteContent'
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
      const select = gsap.utils.selector(section)
      const introEyebrow = select('.services__intro .eyebrow')
      const introTitle = select('.services__intro-title h2')
      const introCopy = select('.services__intro-copy')
      const introLine = select('.services__intro-line')
      const productionTrack = select('.services__production-track')

      media = gsap.matchMedia()
      media.add(
        {
          desktop: '(min-width: 721px)',
          mobile: '(max-width: 720px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          const { mobile, reduceMotion } = conditions ?? {}
          const childTargets = select(
            '.services__intro .eyebrow, .services__intro-title h2, .services__intro-copy, .services__intro-line, .service-item__line, .service-item__number, .service-item__meta, .service-item__title-mask h3, .service-item__copy, .services__production-track',
          )

          if (reduceMotion) {
            gsap.set([intro, ...items, ...childTargets], {
              opacity: 1,
              visibility: 'visible',
              x: 0,
              y: 0,
              yPercent: 0,
              scaleX: 1,
              filter: 'none',
            })
            return
          }

          const scrub = mobile ? 0.7 : 0.85

          gsap
            .timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: intro,
                start: mobile ? 'top 84%' : 'top 78%',
                end: mobile ? 'top 28%' : 'top 22%',
                scrub,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              intro,
              { autoAlpha: 0, x: mobile ? -24 : -56, y: mobile ? 12 : 0 },
              { autoAlpha: 1, x: 0, y: 0, duration: 0.28 },
              0,
            )
            .fromTo(
              introLine,
              { scaleX: 0 },
              { scaleX: 1, duration: 0.18 },
              0.02,
            )
            .fromTo(
              introEyebrow,
              { autoAlpha: 0, x: -14 },
              { autoAlpha: 1, x: 0, duration: 0.12 },
              0.03,
            )
            .fromTo(
              introTitle,
              { autoAlpha: 0, yPercent: 48 },
              { autoAlpha: 1, yPercent: 0, duration: 0.2 },
              0.05,
            )
            .fromTo(
              introCopy,
              { autoAlpha: 0, x: -18 },
              { autoAlpha: 1, x: 0, duration: 0.16 },
              0.11,
            )
            .to(intro, { autoAlpha: 1, duration: 0.28 }, 0.28)
            .to(intro, { autoAlpha: 0, y: mobile ? -8 : 0, duration: 0.22 }, 0.56)
            .to(intro, { autoAlpha: 0, duration: 0.22 }, 0.78)

          const desktopMovements = [64, 52, 60, 48, 56]

          items.forEach((item, index) => {
            const fromRight = item.classList.contains('service-item--start')
            const direction = fromRight ? 1 : -1
            const movement = mobile ? 26 : desktopMovements[index] ?? 54
            const line = item.querySelector<HTMLElement>('.service-item__line')
            const number = item.querySelector<HTMLElement>('.service-item__number')
            const meta = item.querySelector<HTMLElement>('.service-item__meta')
            const title = item.querySelector<HTMLElement>('.service-item__title-mask h3')
            const copy = item.querySelector<HTMLElement>('.service-item__copy')

            if (!line || !number || !meta || !title || !copy) return

            gsap
              .timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                  trigger: item,
                  start: mobile ? 'top 72%' : 'top 74%',
                  end: mobile ? 'top 24%' : 'top 18%',
                  scrub,
                  invalidateOnRefresh: true,
                },
              })
              .fromTo(
                item,
                {
                  autoAlpha: 0,
                  x: direction * movement,
                  y: mobile ? 10 : 0,
                },
                { autoAlpha: 1, x: 0, y: 0, duration: 0.26 },
                0,
              )
              .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.18 }, 0.025)
              .fromTo(
                [number, meta],
                { autoAlpha: 0, x: direction * 12 },
                { autoAlpha: 1, x: 0, duration: 0.12, stagger: 0.02 },
                0.055,
              )
              .fromTo(
                title,
                { autoAlpha: 0, yPercent: 46 },
                { autoAlpha: 1, yPercent: 0, duration: 0.19 },
                0.075,
              )
              .fromTo(
                copy,
                { autoAlpha: 0, x: direction * 16 },
                { autoAlpha: 1, x: 0, duration: 0.15 },
                0.12,
              )
              .to(item, { autoAlpha: 1, duration: 0.24 }, 0.26)
              .to(
                item,
                {
                  autoAlpha: 0,
                  x: direction * -10,
                  y: mobile ? -7 : 0,
                  duration: 0.16,
                },
                0.5,
              )
              .to(item, { autoAlpha: 0, duration: 0.34 }, 0.66)
          })

          gsap.fromTo(
            productionTrack,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'bottom 38%',
                end: 'bottom 12%',
                scrub: mobile ? 0.55 : 0.75,
                invalidateOnRefresh: true,
              },
            },
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
    <section
      ref={sectionRef}
      id="services"
      className="services cinematic-chapter"
      aria-labelledby="services-title"
    >
      <div className="layout-container services__layout">
        <header ref={introRef} className="services__intro side-copy side-copy--end">
          <span className="services__intro-line" aria-hidden="true" />
          <p className="eyebrow" dir="ltr">
            {servicesContent.eyebrow}
          </p>
          <div className="services__intro-title motion-title-mask">
            <h2 id="services-title">{servicesContent.title}</h2>
          </div>
          <p className="services__intro-copy">{servicesContent.intro}</p>
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
              <span className="service-item__line" aria-hidden="true" />
              <div className="service-item__header">
                <span className="service-item__number" dir="ltr">
                  {service.id}
                </span>
                <span className="service-item__meta" dir="ltr">
                  {service.meta}
                </span>
              </div>
              <div className="service-item__title-mask motion-title-mask">
                <h3>{service.title}</h3>
              </div>
              <p className="service-item__copy">{service.description}</p>
            </li>
          ))}
        </ol>

        <div className="services__production-map-wrap">
          <span className="services__production-track" aria-hidden="true" />
          <ol className="services__production-map" aria-label="Media production stages">
            {productionStages.map((stage) => (
              <li key={stage.id}>
                <span>{stage.id}</span>
                <span>{stage.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="services__outro" aria-hidden="true">
          <span>END OF CINEMATIC STAGE</span>
          <span>03 / SELECTED WORK</span>
        </div>
      </div>
    </section>
  )
}
