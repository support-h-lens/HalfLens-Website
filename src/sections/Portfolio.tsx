import { useLayoutEffect, useRef } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { SectionHeading } from '../components/SectionHeading'
import { portfolioContent, projects } from '../data/siteContent'
import { gsap, refreshScrollTriggerWhenReady } from '../lib/gsap'

export function Portfolio() {
  const sectionRef = useRef<HTMLElement>(null)
  const projectRefs = useRef<Array<HTMLElement | null>>([])

  useLayoutEffect(() => {
    const section = sectionRef.current
    const projectElements = projectRefs.current.filter(
      (project): project is HTMLElement => Boolean(project),
    )
    if (!section || projectElements.length === 0) return undefined

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

          projectElements.forEach((project) => {
            const visual = project.querySelector<HTMLElement>('.project__visual')
            const surface = project.querySelector<HTMLElement>('.project__media-surface')
            if (!visual || !surface) return

            if (reduceMotion) {
              gsap.set(visual, { clipPath: 'inset(0% 0% 0% 0% round 0px)' })
              gsap.set(surface, { scale: 1 })
              return
            }

            if (!desktop && !mobile) return

            gsap
              .timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                  trigger: project,
                  start: mobile ? 'top 90%' : 'top 88%',
                  end: mobile ? 'top 48%' : 'top 35%',
                  scrub: mobile ? 0.55 : 0.8,
                  invalidateOnRefresh: true,
                },
              })
              .fromTo(
                visual,
                {
                  clipPath: mobile
                    ? 'inset(3% 0% 3% 0% round 16px)'
                    : 'inset(6% 2.5% 6% 2.5% round 24px)',
                },
                { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 },
                0,
              )
              .fromTo(surface, { scale: mobile ? 1.025 : 1.055 }, { scale: 1, duration: 1 }, 0)
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
      id="portfolio"
      className="portfolio light-section"
      aria-labelledby="portfolio-title"
    >
      <div className="layout-container portfolio__heading">
        <SectionHeading
          eyebrow={portfolioContent.eyebrow}
          title={portfolioContent.title}
          description={portfolioContent.description}
          theme="light"
        />
        <p className="portfolio__counter" dir="ltr">
          PROJECTS / {String(projects.length).padStart(2, '0')}
        </p>
      </div>

      <div className="portfolio__projects">
        {projects.map((project, index) => (
          <article
            ref={(element) => {
              projectRefs.current[index] = element
            }}
            className="project"
            key={project.id}
          >
            <a href="#contact" aria-label={`${project.title} — ${portfolioContent.eyebrow}`}>
              <div
                className="project__visual"
                aria-label={`${project.title} — PROJECT IMAGE PLACEHOLDER`}
                role="img"
              >
                <div className={`project__media-surface project__media-surface--${project.palette}`}>
                  <span className="project__grain" aria-hidden="true" />
                  <span className="project__shape project__shape--one" aria-hidden="true" />
                  <span className="project__shape project__shape--two" aria-hidden="true" />
                  <span className="project__frame project__frame--top" aria-hidden="true">
                    FRAME / {project.id}
                  </span>
                  <span className="project__frame project__frame--bottom" aria-hidden="true">
                    MASTER · 4K
                  </span>
                  <span className="project__placeholder" dir="ltr">
                    PROJECT MEDIA · {project.id}
                  </span>
                </div>
              </div>

              <div className="project__details">
                <div className="project__title-group">
                  <p dir="ltr">PROJECT {project.id} / {project.category}</p>
                  <h3>{project.title}</h3>
                </div>

                <dl className="project__metadata" dir="ltr">
                  <div>
                    <dt>CLIENT</dt>
                    <dd>{project.client}</dd>
                  </div>
                  <div>
                    <dt>H-LENS ROLE</dt>
                    <dd>{project.role}</dd>
                  </div>
                  <div>
                    <dt>FORMAT</dt>
                    <dd>{project.format}</dd>
                  </div>
                  <div>
                    <dt>YEAR</dt>
                    <dd>{project.year}</dd>
                  </div>
                </dl>

                <div className="project__meta">
                  <span dir="ltr">VIEW PROJECT</span>
                  <span className="project__arrow">
                    <ArrowIcon />
                  </span>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
