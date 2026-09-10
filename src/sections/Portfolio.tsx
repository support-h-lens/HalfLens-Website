import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { SectionHeading } from '../components/SectionHeading'
import { YouTubeHoverMedia } from '../components/YouTubeHoverMedia'
import { portfolioContent, projects } from '../data/siteContent'
import { gsap, refreshScrollTriggerWhenReady, ScrollTrigger } from '../lib/gsap'
import type { ProjectItem } from '../types/content'

export function Portfolio({ items = projects }: { items?: ProjectItem[] }) {
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
          touch: '(hover: none), (pointer: coarse)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          const { desktop, mobile, touch, reduceMotion } = conditions ?? {}
          // The native touch sheet needs no JS reveal setup or teardown.
          if (mobile || touch) return
          const revealCleanups: Array<() => void> = []

          projectElements.forEach((project) => {
            const visual = project.querySelector<HTMLElement>('.project__visual')
            const surface = project.querySelector<HTMLElement>('.project__media-surface')
            const details = project.querySelector<HTMLElement>('.project__details')
            const detailItems = project.querySelectorAll<HTMLElement>(
              '.project__status, .project__title-group, .project__metadata > div, .project__meta',
            )
            if (!visual || !surface || !details) return

            if (reduceMotion) {
              gsap.set([visual, surface, details, ...detailItems], {
                autoAlpha: 1, clearProps: 'transform,clipPath,willChange',
              })
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
                  { autoAlpha: 0, x: 0, y: 18 },
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
  }, [items])

  return (
    <section
      ref={sectionRef}
      id="portfolio"
      className="portfolio portfolio--showcase light-section"
      aria-labelledby="portfolio-title"
    >
      <div className="layout-container portfolio__heading">
        <SectionHeading
          id="portfolio-title"
          eyebrow={portfolioContent.eyebrow}
          title={portfolioContent.title}
          description={portfolioContent.description}
          theme="light"
        />
        <p className="portfolio__counter">
          المشاريع / {String(items.length).padStart(2, '0')}
        </p>
      </div>

      <div className="layout-container portfolio__projects">
        {items.map((project, index) => {
          const projectHref = `/work/${encodeURIComponent(project.slug)}/`
          const category = project.category.split('·').map(part => part.trim())
            .filter(part => part !== project.client).join(' · ') || project.category

          return (
            <article
              ref={(element) => {
                projectRefs.current[index] = element
              }}
              className="project"
              aria-labelledby={`selected-work-${project.slug}`}
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
                        watchUrl={project.youtube.url}
                      />
                    ) : project.image ? (
                      <a className="project__image-link" href={projectHref} aria-label={`استكشف مشروع ${project.title}`}>
                        <img src={project.image} alt="" loading="lazy" decoding="async" />
                      </a>
                    ) : (
                      <a className="project__image-link project__placeholder-link" href={projectHref}>
                        <span dir="ltr">HALF LENS / {project.id}</span>
                        <strong>{project.title}</strong>
                        <span>استكشف المشروع <ArrowIcon /></span>
                      </a>
                    )}
                  </div>
                </div>

                <a
                  className="project__details"
                  data-project={project.id}
                  href={projectHref}
                  aria-labelledby={`selected-work-${project.slug} selected-work-action-${project.slug}`}
                >
                  <div className="project__status">
                    <span className="project__category">{category}</span>
                    <span className="project__sequence" dir="ltr" aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
                  </div>

                  <div className="project__title-group">
                    <h3 id={`selected-work-${project.slug}`}>{project.title}</h3>
                  </div>

                  <dl className="project__metadata">
                    <div className="project__credit-client">
                      <dt>العميل</dt>
                      <dd>{project.client}</dd>
                    </div>
                    <div className="project__credit-year">
                      <dt>السنة</dt>
                      <dd dir="ltr">{project.year}</dd>
                    </div>
                    <div className="project__credit-role">
                      <dt>دور هاف لينس</dt>
                      <dd>{project.role}</dd>
                    </div>
                  </dl>

                  <div className="project__meta">
                    <span id={`selected-work-action-${project.slug}`}>تفاصيل المشروع</span>
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

      <div className="layout-container portfolio__archive">
        <a href="/work/" className="portfolio__archive-link">
          <span>شاهد جميع الأعمال</span>
          <span className="portfolio__archive-icon" aria-hidden="true">
            <ArrowIcon />
          </span>
        </a>
      </div>
    </section>
  )
}
