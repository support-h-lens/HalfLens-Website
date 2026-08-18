import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { SectionHeading } from '../components/SectionHeading'
import { YouTubeHoverMedia } from '../components/YouTubeHoverMedia'
import { portfolioContent, projects } from '../data/siteContent'
import { gsap, refreshScrollTriggerWhenReady, ScrollTrigger } from '../lib/gsap'

const videoProjects = projects.filter((project) => Boolean(project.youtube))

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

          projectElements.forEach((project) => {
            const visual = project.querySelector<HTMLElement>('.project__visual')
            const surface = project.querySelector<HTMLElement>('.project__media-surface')
            const details = project.querySelector<HTMLElement>('.project__details')
            if (!visual || !surface || !details) return

            const restingClipPath = mobile
              ? 'inset(0% 0% 0% 0% round 14px)'
              : 'inset(0% 0% 0% 0% round 20px)'

            if (reduceMotion) {
              gsap.set(visual, { clipPath: restingClipPath })
              gsap.set(surface, { scale: 1 })
              gsap.set(details, { autoAlpha: 1, y: 0 })
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
                    start: mobile ? 'top 92%' : 'top 90%',
                    end: mobile ? 'top 52%' : 'top 42%',
                    scrub: mobile ? 0.42 : 0.62,
                    invalidateOnRefresh: true,
                  },
                })
                .fromTo(
                  visual,
                  {
                    clipPath: mobile
                      ? 'inset(4% 0% 4% 0% round 18px)'
                      : 'inset(7% 2.5% 7% 2.5% round 26px)',
                  },
                  { clipPath: restingClipPath, duration: 1 },
                  0,
                )
                .fromTo(
                  surface,
                  { scale: mobile ? 1.02 : 1.045 },
                  { scale: 1, duration: 1 },
                  0,
                )
                .fromTo(
                  details,
                  { autoAlpha: 0, y: mobile ? 16 : 22 },
                  {
                    autoAlpha: 1,
                    y: 0,
                    duration: mobile ? 0.62 : 0.72,
                    ease: 'power3.out',
                  },
                  mobile ? 0.24 : 0.28,
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
          الأفلام / {String(videoProjects.length).padStart(2, '0')}
        </p>
      </div>

      <div className="portfolio__projects">
        {videoProjects.map((project, index) => {
          const projectLabel = `${project.title} — مشاهدة الفيلم على YouTube`
          const categorySegments = project.category.split('·')
          const tags = Array.from(
            new Set(
              [
                categorySegments[categorySegments.length - 1]?.trim(),
                project.format.split('·')[0]?.trim(),
                project.role.split('·')[0]?.trim(),
              ].filter((tag): tag is string => Boolean(tag)),
            ),
          )

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
                    <YouTubeHoverMedia
                      posterUrl={project.youtube!.poster}
                      title={project.title}
                      videoId={project.youtube!.id}
                    />
                  </div>
                </div>

                <a
                  className="project__details"
                  href={project.youtube!.url}
                  aria-label={projectLabel}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="project__heading-row">
                    <p className="project__index" dir="ltr">FILM / {project.id}</p>
                    <p className="project__year">{project.year}</p>
                  </div>

                  <div className="project__title-row">
                    <h3>{project.title}</h3>
                    <span className="project__arrow" aria-hidden="true">
                      <ArrowIcon />
                    </span>
                  </div>

                  <div className="project__tags" aria-label="تصنيفات المشروع">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  <span className="visually-hidden">
                    العميل: {project.client}. دور هاف لينس: {project.role}. الصيغة: {project.format}.
                  </span>
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
