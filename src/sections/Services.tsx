import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { productionStages, services, servicesContent } from '../data/siteContent'
import { gsap, refreshScrollTriggerWhenReady } from '../lib/gsap'
import { revealServiceCards } from '../lib/revealServiceCards'

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
          touch: '(hover: none), (pointer: coarse)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          const { mobile, touch, reduceMotion } = conditions ?? {}
          // Native scroll-driven whole-card movement, with a read-only fallback
          // for older Safari. Text and borders always share one moving boundary.
          if (mobile || touch) {
            if (reduceMotion) return
            return revealServiceCards(intro, items.flatMap(item => {
              const frame = item.querySelector<HTMLElement>('.service-item__frame')
              return frame ? [frame] : []
            }))
          }
          const introElements = intro.querySelectorAll<HTMLElement>(
            '.services__intro-index, .services__section-name, .services__intro-statement, .services__intro-copy, .services__intro-rule',
          )

          if (reduceMotion) {
            gsap.set([intro, ...introElements, ...items], {
              autoAlpha: 1,
              clearProps: 'transform,clipPath',
            })
            items.forEach((item) => {
              gsap.set(
                item.querySelectorAll(
                  '.service-item__geometry, .service-item__rail, .service-item__number, .service-item__meta, .service-item__title-mask h3, .service-item__copy, .service-item__progress',
                ),
                { autoAlpha: 1, clearProps: 'transform,clipPath' },
              )
            })
            return
          }

          gsap
            .timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: intro,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(intro, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.14 }, 0.04)
            .fromTo(
              intro.querySelector('.services__intro-index'),
              { autoAlpha: 0, x: mobile ? 18 : 32 },
              { autoAlpha: 1, x: 0, duration: 0.12 },
              0.08,
            )
            .fromTo(
              intro.querySelector('.services__section-name'),
              { autoAlpha: 0, yPercent: 108 },
              { autoAlpha: 1, yPercent: 0, duration: 0.2 },
              0.12,
            )
            .fromTo(
              intro.querySelector('.services__intro-rule'),
              { scaleX: 0 },
              { scaleX: 1, duration: 0.2 },
              0.14,
            )
            .fromTo(
              intro.querySelector('.services__intro-statement'),
              { autoAlpha: 0, y: mobile ? 16 : 28 },
              { autoAlpha: 1, y: 0, duration: 0.16 },
              0.21,
            )
            .fromTo(
              intro.querySelector('.services__intro-copy'),
              { autoAlpha: 0, y: 14 },
              { autoAlpha: 1, y: 0, duration: 0.12 },
              0.28,
            )
            .to(intro, { autoAlpha: 1, duration: 0.28 }, 0.4)
            .to(intro, { autoAlpha: 0, y: mobile ? -14 : -26, duration: 0.16 }, 0.78)

          items.forEach((item) => {
            const fromRight = item.classList.contains('service-item--start')
            const direction = fromRight ? 1 : -1
            const travel = mobile ? 24 : 64
            const geometry = item.querySelector<HTMLElement>('.service-item__geometry')
            const rail = item.querySelector<HTMLElement>('.service-item__rail')
            const number = item.querySelector<HTMLElement>('.service-item__number')
            const meta = item.querySelector<HTMLElement>('.service-item__meta')
            const title = item.querySelector<HTMLElement>('.service-item__title-mask h3')
            const copy = item.querySelector<HTMLElement>('.service-item__copy')
            const progress = item.querySelector<HTMLElement>('.service-item__progress')
            if (!geometry || !rail || !number || !meta || !title || !copy || !progress) return

            gsap
              .timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                  trigger: item,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: true,
                  invalidateOnRefresh: true,
                },
              })
              .fromTo(item, { autoAlpha: 0, x: direction * travel }, { autoAlpha: 1, x: 0, duration: 0.16 }, 0.04)
              .fromTo(
                geometry,
                // The frame and its text share one layout boundary. Sliding or
                // scaling only the backdrop lets the content escape its sides.
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.2 },
                0.06,
              )
              .fromTo(rail, { scaleX: 0 }, { scaleX: 1, duration: 0.18 }, 0.1)
              .fromTo(number, { autoAlpha: 0, x: direction * 18 }, { autoAlpha: 1, x: 0, duration: 0.1 }, 0.12)
              .fromTo(meta, { autoAlpha: 0, x: direction * 12 }, { autoAlpha: 1, x: 0, duration: 0.1 }, 0.16)
              .fromTo(title, { autoAlpha: 0, yPercent: 108 }, { autoAlpha: 1, yPercent: 0, duration: 0.18 }, 0.18)
              .fromTo(copy, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.12 }, 0.27)
              .fromTo(progress, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.28)
              .to(item, { autoAlpha: 1, x: 0, duration: 0.3 }, 0.39)
              .to([copy, progress], { autoAlpha: 0, y: -8, duration: 0.08 }, 0.76)
              .to(title, { autoAlpha: 0, yPercent: -42, duration: 0.1 }, 0.8)
              .to([number, meta], { autoAlpha: 0, x: direction * -10, duration: 0.08 }, 0.82)
              .to(rail, { scaleX: 0, duration: 0.1 }, 0.84)
              .to(geometry, { autoAlpha: 0, duration: 0.12 }, 0.84)
              .to(item, { autoAlpha: 0, x: direction * -18, duration: 0.1 }, 0.88)
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
    <section ref={sectionRef} id="services" className="services cinematic-chapter" aria-labelledby="services-title">
      <div className="layout-container services__layout">
        <div className="services__chapter-marker" aria-hidden="true" dir="ltr">
          <span>02 / SERVICES</span>
          <i />
          <span>05 CHAPTERS</span>
        </div>
        <header ref={introRef} className="services__intro">
          <div className="services__intro-index" dir="ltr">
            <span>{servicesContent.eyebrow}</span>
            <span>05 CHAPTERS</span>
          </div>
          <div className="services__section-name-mask motion-title-mask">
            <h2 id="services-title" className="services__section-name">{servicesContent.label}</h2>
          </div>
          <span className="services__intro-rule" aria-hidden="true" />
          <p className="services__intro-statement">{servicesContent.title}</p>
          <p className="services__intro-copy">{servicesContent.intro}</p>
        </header>

        <ol className="services__list">
          {services.map((service, index) => (
            <li
              ref={(item) => { serviceRefs.current[index] = item }}
              key={service.id}
              className={`service-item service-item--${service.side}`}
            >
              <div className="service-item__frame">
                <span className="service-item__geometry" aria-hidden="true">
                  <span className="service-item__rail" />
                </span>
                <div className="service-item__chapter">
                  <div className="service-item__header">
                    <span className="service-item__number" dir="ltr">{service.id}</span>
                    <span className="service-item__meta" dir="ltr">{service.meta}</span>
                  </div>
                  <div className="service-item__title-mask motion-title-mask"><h3>{service.title}</h3></div>
                  <p className="service-item__copy">{service.description}</p>
                  <a className="editorial-link service-item__link" href="/services/"><span>اكتشف خدماتنا</span><ArrowIcon /></a>
                  <div className="service-item__progress" aria-hidden="true" dir="ltr">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <i style={{ '--service-progress': `${((index + 1) / services.length) * 100}%` } as CSSProperties} />
                    <span>{String(services.length).padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="services__production-map-wrap">
          <span className="services__production-track" aria-hidden="true" />
          <ol className="services__production-map" aria-label="Media production stages">
            {productionStages.map((stage) => <li key={stage.id}><span>{stage.id}</span><span>{stage.label}</span></li>)}
          </ol>
        </div>
        <div className="services__outro" aria-hidden="true">
          <span>END OF CINEMATIC STAGE</span><span>03 / SELECTED WORK</span>
        </div>
      </div>
    </section>
  )
}
