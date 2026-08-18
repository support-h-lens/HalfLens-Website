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
      const introName = select('.services__section-name')
      const introTitle = select('.services__intro-statement')
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
            '.services__intro .eyebrow, .services__section-name, .services__intro-statement, .services__intro-copy, .services__intro-line, .service-item__line, .service-item__number, .service-item__meta, .service-item__title-mask h3, .service-item__copy, .services__production-track',
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

          const scrub = mobile ? 0.38 : 0.48

          gsap
            .timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: intro,
                start: mobile ? 'top 72%' : 'top 64%',
                end: mobile ? 'top 14%' : 'top 10%',
                scrub,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              intro,
              { autoAlpha: 0, x: mobile ? -20 : -36, y: mobile ? 8 : 0 },
              { autoAlpha: 1, x: 0, y: 0, duration: 0.14 },
              0,
            )
            .fromTo(
              introLine,
              { scaleX: 0 },
              { scaleX: 1, duration: 0.18 },
              0,
            )
            .fromTo(
              introEyebrow,
              { autoAlpha: 0, x: -12 },
              { autoAlpha: 1, x: 0, duration: 0.1 },
              0.04,
            )
            .fromTo(
              introName,
              { autoAlpha: 0, yPercent: 108 },
              { autoAlpha: 1, yPercent: 0, duration: 0.2 },
              0.055,
            )
            .fromTo(
              introTitle,
              { autoAlpha: 0, yPercent: 72 },
              { autoAlpha: 1, yPercent: 0, duration: 0.17 },
              0.18,
            )
            .fromTo(
              introCopy,
              { autoAlpha: 0, y: 10 },
              { autoAlpha: 1, y: 0, duration: 0.13 },
              0.27,
            )
            .to(introLine, { scaleX: 0, duration: 0.16 }, 0.72)
            .to(
              intro,
              { autoAlpha: 0, x: mobile ? -10 : -18, duration: 0.18 },
              0.72,
            )
            .to(intro, { autoAlpha: 0, duration: 0.1 }, 0.9)

          const desktopMovements = [44, 38, 42, 34, 40]

          items.forEach((item, index) => {
            const fromRight = item.classList.contains('service-item--start')
            const direction = fromRight ? 1 : -1
            const movement = mobile ? 26 : desktopMovements[index] ?? 54
            const triggerStart = index === 0
              ? 'top 58%'
              : mobile
                ? 'top 72%'
                : 'top 74%'
            const triggerEnd = index === 0
              ? mobile
                ? 'top 8%'
                : 'top 6%'
              : mobile
                ? 'top 14%'
                : 'top 12%'
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
                  start: triggerStart,
                  end: triggerEnd,
                  scrub,
                  invalidateOnRefresh: true,
                },
              })
              .fromTo(
                item,
                {
                  autoAlpha: 0,
                  x: direction * movement,
                  y: mobile ? 8 : 0,
                },
                { autoAlpha: 1, x: 0, y: 0, duration: 0.14 },
                0,
              )
              .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.18 }, 0)
              .fromTo(
                [number, meta],
                { autoAlpha: 0, x: direction * 12 },
                { autoAlpha: 1, x: 0, duration: 0.1, stagger: 0.018 },
                0.045,
              )
              .fromTo(
                title,
                { autoAlpha: 0, yPercent: 108 },
                { autoAlpha: 1, yPercent: 0, duration: 0.2 },
                0.08,
              )
              .fromTo(
                copy,
                { autoAlpha: 0, y: 10 },
                { autoAlpha: 1, y: 0, duration: 0.12 },
                0.2,
              )
              .to(line, { scaleX: 0, duration: 0.18 }, 0.56)
              .to(
                item,
                {
                  autoAlpha: 0,
                  x: direction * -12,
                  y: mobile ? -4 : 0,
                  duration: 0.18,
                },
                0.56,
              )
              .to(item, { autoAlpha: 0, duration: 0.26 }, 0.74)
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
          <div className="services__section-name-mask motion-title-mask">
            <h2 id="services-title" className="services__section-name">
              {servicesContent.label}
            </h2>
          </div>
          <div className="services__intro-title motion-title-mask">
            <p className="services__intro-statement">{servicesContent.title}</p>
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
