import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { SectionHeading } from '../components/SectionHeading'
import { YouTubeHoverMedia } from '../components/YouTubeHoverMedia'
import { portfolioContent, projects } from '../data/siteContent'
import { gsap, refreshScrollTriggerWhenReady, ScrollTrigger } from '../lib/gsap'

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
          const revealCleanups: Array<() => void> = []

          projectElements.forEach((project, projectIndex) => {
            const visual = project.querySelector<HTMLElement>('.project__visual')
            const surface = project.querySelector<HTMLElement>('.project__media-surface')
            const details = project.querySelector<HTMLElement>('.project__details')
            const detailItems = project.querySelectorAll<HTMLElement>(
              '.project__title-group, .project__metadata > div, .project__meta',
            )
            if (!visual || !surface || !details) return

            if (reduceMotion) {
              gsap.set(visual, { clipPath: 'inset(0% 0% 0% 0% round 0px)' })
              gsap.set(surface, { scale: 1 })
              gsap.set(details, { autoAlpha: 1, x: 0, y: 0 })
              gsap.set(detailItems, { autoAlpha: 1, y: 0 })
              return
            }

            if (!desktop && !mobile) return

            let revealTimeline: gsap.core.Timeline | undefined

            const clearRevealStyles = () => {
              visual.style.removeProperty('clip-path')
              visual.style.willChange = 'auto'
              surface.style.removeProperty('transform')
              surface.style.willChange = 'auto'
              details.style.removeProperty('opacity')
              details.style.removeProperty('transform')
              details.style.removeProperty('visibility')
              details.style.willChange = 'auto'
              detailItems.forEach((item) => {
                item.style.removeProperty('opacity')
                item.style.removeProperty('transform')
                item.style.removeProperty('visibility')
              })
            }

            const destroyReveal = () => {
              revealTimeline?.scrollTrigger?.kill()
              revealTimeline?.kill()
              revealTimeline = undefined
              clearRevealStyles()
            }

            const createReveal = () => {
              if (revealTimeline) return

              visual.style.willChange = 'clip-path'
              surface.style.willChange = 'transform'
              details.style.willChange = 'transform, opacity'

              const detailsX = mobile ? 0 : projectIndex % 2 === 0 ? -28 : 28

              revealTimeline = gsap
                .timeline({
                  defaults: { ease: 'none' },
                  scrollTrigger: {
                    trigger: project,
                    start: mobile ? 'top 90%' : 'top 88%',
                    end: mobile ? 'top 46%' : 'top 32%',
                    scrub: mobile ? 0.32 : 0.48,
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
                .fromTo(
                  surface,
                  { scale: mobile ? 1.025 : 1.055 },
                  { scale: 1, duration: 1 },
                  0,
                )
                .fromTo(
                  details,
                  { autoAlpha: 0, x: detailsX, y: mobile ? 18 : 0 },
                  { autoAlpha: 1, x: 0, y: 0, duration: 0.72, ease: 'power3.out' },
                  0.08,
                )
                .fromTo(
                  detailItems,
                  { autoAlpha: 0, y: mobile ? 12 : 16 },
                  {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.62,
                    stagger: 0.055,
                    ease: 'power2.out',
                  },
                  0.2,
                )
            }

            clearRevealStyles()

            const lifecycleTrigger = ScrollTrigger.create({
              trigger: project,
              start: 'top 105%',
              end: 'bottom -5%',
              invalidateOnRefresh: true,
              onEnter: createReveal,
              onEnterBack: createReveal,
              onLeave: destroyReveal,
              onLeaveBack: destroyReveal,
              onRefresh: ({ isActive }) => {
                if (isActive) createReveal()
                else destroyReveal()
              },
            })

            revealCleanups.push(() => {
              lifecycleTrigger.kill()
              destroyReveal()
            })
          })

          return () => revealCleanups.forEach((cleanup) => cleanup())
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
        <p className="portfolio__counter">
          المشاريع / {String(projects.length).padStart(2, '0')}
        </p>
      </div>

      <div className="portfolio__projects">
        {projects.map((project, index) => {
          const projectLabel = project.youtube
            ? `${project.title} — مشاهدة الفيلم على YouTube`
            : `${project.title} — ${portfolioContent.eyebrow}`

          return (
            <article
              ref={(element) => {
                projectRefs.current[index] = element
              }}
              className="project"
              key={project.id}
            >
              <div className="project__layout">
                <div
                  className="project__visual"
                  style={
                    {
                      '--project-media-aspect': project.youtube?.aspectRatio ?? 16 / 9,
                    } as CSSProperties
                  }
                >
                  <div
                    className={`project__media-surface project__media-surface--${project.palette}`}
                  >
                    {project.youtube ? (
                      <YouTubeHoverMedia
                        posterUrl={project.youtube.poster}
                        title={project.title}
                        videoId={project.youtube.id}
                      />
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

                <a
                  className="project__details"
                  data-project={project.id}
                  href={project.youtube?.url ?? '#contact'}
                  aria-label={projectLabel}
                  target={project.youtube ? '_blank' : undefined}
                  rel={project.youtube ? 'noreferrer' : undefined}
                >
                  <div className="project__title-group">
                    <p className="project__kicker">المشروع {project.id} / {project.category}</p>
                    <h3>{project.title}</h3>
                  </div>

                  <dl className="project__metadata">
                    <div>
                      <dt>العميل</dt>
                      <dd>{project.client}</dd>
                    </div>
                    <div>
                      <dt>دور هاف لينس</dt>
                      <dd>{project.role}</dd>
                    </div>
                    <div>
                      <dt>الصيغة</dt>
                      <dd>{project.format}</dd>
                    </div>
                    <div>
                      <dt>السنة</dt>
                      <dd>{project.year}</dd>
                    </div>
                  </dl>

                  <div className="project__meta">
                    <span>{project.youtube ? 'شاهد الفيلم' : 'شاهد المشروع'}</span>
                    <span className="project__arrow" aria-hidden="true">
                      <ArrowIcon />
                    </span>
                  </div>
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
