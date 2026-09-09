import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { BrandLogo } from '../components/BrandLogo'
import { ProjectIndex } from '../components/ProjectIndex'
import { Footer } from '../sections/Footer'
import { usePageSeo } from '../lib/seo'
import { refreshScrollTriggerWhenReady } from '../lib/gsap'
import { workCategories, type WorkCategoryId } from '../lib/workCategories'
import type { ArchiveWorkItem } from '../lib/archiveWorks'

export function WorkArchive({ projects }: { projects: ArchiveWorkItem[] }) {
  const allFilterRef = useRef<HTMLButtonElement>(null)
  const [selected, setSelected] = useState<WorkCategoryId | null>(null)
  const visibleProjects = selected
    ? projects.filter(item => item.workType === selected)
    : projects
  const selectedLabel = workCategories.find(category => category.id === selected)?.label ?? 'كل الأعمال'

  // Filtering changes the footer's document position, not the scroll controller.
  useLayoutEffect(() => refreshScrollTriggerWhenReady(), [selected, projects])

  usePageSeo({
    title: 'أعمال نصف عدسة | H-Lens Production',
    description: 'أفلام وحملات وتغطيات مختارة من إنتاج نصف عدسة في الرياض.',
    path: '/work/',
  })

  return (
    <div className="work-page work-page--editorial">
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

        <section className="work-filters layout-container" aria-labelledby="work-filter-title">
          <div className="work-filters__toolbar">
            <h2 id="work-filter-title">اكتشف الأعمال حسب المجال</h2>
            <button ref={allFilterRef} type="button" className="work-filters__all" aria-pressed={selected === null} aria-controls="work-results" onClick={() => setSelected(null)}>
              كل الأعمال <span dir="ltr">({String(projects.length).padStart(2, '0')})</span>
            </button>
          </div>
          <div className="work-filters__categories" role="group" aria-label="تصفية الأعمال حسب الخدمة">
            {workCategories.map(category => (
              <button key={category.id} type="button" className="work-filters__category"
                data-category={category.id} aria-pressed={selected === category.id}
                aria-controls="work-results" onClick={() => setSelected(category.id)}>
                <span>{category.label}</span>
                <span className="work-filters__count" dir="ltr" aria-hidden="true">
                  {String(projects.filter(item => item.workType === category.id).length).padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>
          <p className="work-filters__status" role="status" aria-live="polite" aria-atomic="true">
            {selectedLabel} · {visibleProjects.length} من {projects.length} أعمال
          </p>
          <noscript><p>جميع الأعمال معروضة أدناه. فعّل JavaScript لاستخدام التصفية حسب المجال.</p></noscript>
        </section>
        <section id="work-results" className="work-results" aria-label={`دليل الأعمال — ${selectedLabel}`}>
          <div className="work-results__content" key={selected ?? 'all'}>
            {visibleProjects.length > 0 ? <ProjectIndex items={visibleProjects} /> : (
              <div className="work-results__empty layout-container">
                <span className="work-results__empty-index" aria-hidden="true" dir="ltr">00 /</span>
                <h2>لا توجد أعمال منشورة في هذا المجال بعد.</h2>
                <p>اكتشف بقية مشاريعنا، أو تواصل معنا لنصنع مشروعك القادم.</p>
                <button type="button" className="editorial-link" onClick={() => { setSelected(null); allFilterRef.current?.focus({ preventScroll: true }) }}>عرض كل الأعمال <ArrowIcon /></button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer routeMode />
    </div>
  )
}
