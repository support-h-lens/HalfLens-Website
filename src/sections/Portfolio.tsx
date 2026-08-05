import { ArrowIcon } from '../components/ArrowIcon'
import { SectionHeading } from '../components/SectionHeading'
import { portfolioContent, projects } from '../data/siteContent'

export function Portfolio() {
  return (
    <section
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
          01 — {String(projects.length).padStart(2, '0')}
        </p>
      </div>

      <div className="portfolio__projects">
        {projects.map((project) => (
          <article className="project" key={project.id}>
            <a href="#contact" aria-label={`${project.title} — اطلب مشروعًا مشابهًا`}>
              <div
                className={`project__visual project__visual--${project.palette}`}
                aria-label={`صورة مؤقتة لمشروع ${project.title}`}
                role="img"
              >
                <span className="project__grain" aria-hidden="true" />
                <span className="project__shape project__shape--one" aria-hidden="true" />
                <span className="project__shape project__shape--two" aria-hidden="true" />
                <span className="project__placeholder" dir="ltr">
                  PROJECT IMAGE · {project.id}
                </span>
              </div>

              <div className="project__details">
                <div>
                  <p>{project.category}</p>
                  <h3>{project.title}</h3>
                </div>
                <div className="project__meta">
                  <span dir="ltr">{project.year}</span>
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
