import { ArrowIcon } from './ArrowIcon'
import { SectionMarker } from './SectionMarker'
import type { ArchiveWorkItem } from '../lib/archiveWorks'

export function ProjectIndex({ items }: { items: ArchiveWorkItem[] }) {
  return (
    <div className="project-index layout-container">
      <SectionMarker number="01" label="دليل الأعمال" detail="A CLOSER LOOK" />
      <ol className="project-index__list">
        {items.map((project, index) => (
          <li key={project.id}>
            <a className="project-index__row" href={project.link} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} — يفتح في تبويب جديد`}>
              <span className="project-index__number" dir="ltr">{String(index + 1).padStart(2, '0')}</span>
              <span className="project-index__name">{project.title}<small>{project.client}</small></span>
              <span className="project-index__preview" aria-hidden="true">
                <span className="project-index__monogram">HL</span>
                {project.poster && <img src={project.poster} alt="" loading="lazy" decoding="async" width="200" height="120" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
              </span>
              <span className="project-index__year" dir="ltr">{project.year}</span>
              <ArrowIcon />
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}
