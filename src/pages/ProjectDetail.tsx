import { ArrowIcon } from '../components/ArrowIcon'
import { BrandLogo } from '../components/BrandLogo'
import { ProjectMedia } from '../components/ProjectMedia'
import { Footer } from '../sections/Footer'
import { usePageSeo } from '../lib/seo'
import type { ProjectItem } from '../types/content'

export function ProjectDetail({ project, nextProject }: { project: ProjectItem; nextProject: ProjectItem }) {
  const description = project.seoDescription || `${project.title} — ${project.category}. إنتاج نصف عدسة.`

  usePageSeo({
    title: project.seoTitle || `${project.title} | نصف عدسة`,
    description,
    path: `/work/${project.slug}`,
    image: project.youtube?.poster || project.image,
  })

  return (
    <div className="project-page">
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <header className="route-header route-header--overlay">
        <a href="/" aria-label="العودة إلى الصفحة الرئيسية" className="route-header__brand">
          <BrandLogo />
        </a>
        <a href="/work" className="route-header__action">
          <span>كل الأعمال</span>
          <ArrowIcon />
        </a>
      </header>

      <main id="main-content">
        <section className="project-hero" aria-labelledby="project-page-title">
          <div className="project-hero__media"><ProjectMedia project={project} eager /></div>
          <div className="project-hero__shade" aria-hidden="true" />
          <div className="layout-container project-hero__copy">
            <p className="brand-kicker" dir="ltr"><i /> PROJECT / {project.id}</p>
            <p className="project-hero__category">{project.category}</p>
            <h1 id="project-page-title">{project.title}</h1>
          </div>
        </section>

        <section className="project-credits layout-container" aria-label="بيانات المشروع">
          <header>
            <p>من الفكرة إلى آخر فريم.</p>
            {project.youtube ? (
              <a href={project.youtube.url} target="_blank" rel="noreferrer">
                <span>شاهد الفيلم</span><ArrowIcon />
              </a>
            ) : null}
          </header>
          <dl>
            <div><dt>العميل</dt><dd>{project.client}</dd></div>
            <div><dt>دور نصف عدسة</dt><dd>{project.role}</dd></div>
            {project.format ? <div><dt>الصيغة</dt><dd>{project.format}</dd></div> : null}
            <div><dt>السنة</dt><dd dir="ltr">{project.year}</dd></div>
          </dl>
        </section>

        <a className="next-project" href={`/work/${encodeURIComponent(nextProject.slug)}`}>
          <span className="next-project__meta">المشروع التالي <span dir="ltr">/ {nextProject.id}</span></span>
          <strong>{nextProject.title}</strong>
          <span className="next-project__action" aria-hidden="true"><ArrowIcon /></span>
        </a>
      </main>
      <Footer routeMode />
    </div>
  )
}
