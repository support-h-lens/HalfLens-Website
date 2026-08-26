import { CinematicStory } from './components/CinematicStory'
import { Navigation } from './components/Navigation'
import { PortfolioRise } from './components/PortfolioRise'
import { SectionWindow } from './components/SectionWindow'
import { Clients } from './sections/Clients'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'
import { usePublicWebsiteContent } from './lib/publicCms'
import { usePageSeo } from './lib/seo'
import { WorkArchive } from './pages/WorkArchive'
import { ProjectDetail } from './pages/ProjectDetail'
import { NotFound } from './pages/NotFound'

function HomePage({ cmsContent }: { cmsContent: ReturnType<typeof usePublicWebsiteContent> }) {
  usePageSeo({
    title: 'نصف عدسة للإنتاج | H-Lens Production',
    description: 'شريكك في الإنتاج الفني من الرياض؛ نصنع الأفلام والحملات والتغطيات من الفكرة إلى آخر فريم.',
  })

  return (
    <>
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <Navigation />
      <main id="main-content">
        <CinematicStory />
        <PortfolioRise projects={cmsContent.projects} />
        <SectionWindow className="section-window--clients" theme="light">
          <Clients items={cmsContent.clients} />
        </SectionWindow>
        <SectionWindow className="section-window--contact" theme="dark">
          <Contact channels={cmsContent.contactChannels} />
        </SectionWindow>
      </main>
      <Footer />
    </>
  )
}

function App() {
  const cmsContent = usePublicWebsiteContent()
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  if (path === '/') return <HomePage cmsContent={cmsContent} />
  if (path === '/work') return <WorkArchive projects={cmsContent.projects} />

  if (path.startsWith('/work/')) {
    const slug = decodeURIComponent(path.slice('/work/'.length))
    const projectIndex = cmsContent.projects.findIndex((project) => project.slug === slug)
    if (projectIndex >= 0) {
      const nextProject = cmsContent.projects[(projectIndex + 1) % cmsContent.projects.length]
      return <ProjectDetail project={cmsContent.projects[projectIndex]} nextProject={nextProject} />
    }
  }

  return <NotFound />
}

export default App
