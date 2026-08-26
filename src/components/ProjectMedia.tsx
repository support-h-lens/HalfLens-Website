import type { CSSProperties } from 'react'
import type { ProjectItem } from '../types/content'
import { YouTubeHoverMedia } from './YouTubeHoverMedia'

export function ProjectMedia({ project, eager = false }: { project: ProjectItem; eager?: boolean }) {
  const media = project.youtube

  return (
    <div
      className={`project-media project-media--${project.palette}`}
      style={{ '--project-media-aspect': media?.aspectRatio ?? 16 / 9 } as CSSProperties}
    >
      {media ? (
        <YouTubeHoverMedia
          posterUrl={media.poster}
          title={project.title}
          videoId={media.id}
          eager={eager}
        />
      ) : project.image ? (
        <img
          src={project.image}
          alt={`مشهد من مشروع ${project.title}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : (
        <div className="project-media__fallback" aria-label={`الوسائط قيد التجهيز لمشروع ${project.title}`}>
          <span dir="ltr">HL / {project.id}</span>
          <strong>{project.title}</strong>
        </div>
      )}
      <span className="project-media__cut" aria-hidden="true" />
    </div>
  )
}
