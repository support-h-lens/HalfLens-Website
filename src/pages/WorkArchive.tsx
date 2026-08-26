import { ArrowIcon } from '../components/ArrowIcon'
import { BrandLogo } from '../components/BrandLogo'
import { ProjectMedia } from '../components/ProjectMedia'
import { Footer } from '../sections/Footer'
import { usePageSeo } from '../lib/seo'
import type { ProjectItem } from '../types/content'

export function WorkArchive({ projects }: { projects: ProjectItem[] }) {
  usePageSeo({
    title: 'أعمال نصف عدسة | H-Lens Production',
    description: 'أفلام وحملات وتغطيات مختارة من إنتاج نصف عدسة في الرياض.',
    path: '/work',
  })

  return (
    <div className="work-page">
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <header className="route-header">
        <a href="/" aria-label="العودة إلى الصفحة الرئيسية" className="route-header__brand">
          <BrandLogo />
        </a>
        <a href="/#contact" className="route-header__action">
          <span>ابدأ مشروعك</span>
          <ArrowIcon />
        </a>
      </header>

      <main id="main-content">
        <header className="work-hero layout-container">
          <p className="brand-kicker" dir="ltr"><i /> HL / WORK ARCHIVE</p>
          <h1>أعمال تحكي.<br />وصورة تبقى.</h1>
          <div className="work-hero__footer">
            <p>مختارات من الحملات، الأفلام، والتجارب المرئية التي صُنعت مع شركائنا.</p>
            <span dir="ltr">{String(projects.length).padStart(2, '0')} PROJECTS</span>
          </div>
        </header>

        <section className="work-index layout-container" aria-label="أرشيف أعمال نصف عدسة">
          {projects.map((project, index) => (
            <article className="work-index__item" key={project.id}>
              <a href={`/work/${encodeURIComponent(project.slug)}`}>
                <div className="work-index__media">
                  <ProjectMedia project={project} eager={index === 0} />
                  <span className="work-index__number" dir="ltr">0{index + 1}</span>
                </div>
                <div className="work-index__copy">
                  <div>
                    <p>{project.category}</p>
                    <h2>{project.title}</h2>
                  </div>
                  <dl>
                    <div><dt>العميل</dt><dd>{project.client}</dd></div>
                    <div><dt>الدور</dt><dd>{project.role}</dd></div>
                    <div><dt>السنة</dt><dd dir="ltr">{project.year}</dd></div>
                  </dl>
                  <span className="work-index__arrow" aria-hidden="true"><ArrowIcon /></span>
                </div>
              </a>
            </article>
          ))}
        </section>
      </main>
      <Footer routeMode />
    </div>
  )
}
