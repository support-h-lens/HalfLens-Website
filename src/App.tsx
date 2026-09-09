import { CinematicStory } from './components/CinematicStory'
import { ControlledScroll } from './components/ControlledScroll'
import { Navigation } from './components/Navigation'
import { PortfolioRise } from './components/PortfolioRise'
import { SectionWindow } from './components/SectionWindow'
import type { PublicWebsiteContent } from './lib/cmsContent'
import { usePublicWebsiteContent } from './lib/publicCms'
import { usePageSeo } from './lib/seo'
import {
  AboutPage,
  CareersPage,
  ContactPage,
  ServicesPage,
} from './pages/CompanyPages'
import { NotFound } from './pages/NotFound'
import { Gone } from './pages/Gone'
import { ProjectDetail } from './pages/ProjectDetail'
import { WorkArchive } from './pages/WorkArchive'
import { Clients } from './sections/Clients'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  return `/${pathname.split('/').filter(Boolean).join('/')}/`
}

function HomePage({ cmsContent }: { cmsContent: PublicWebsiteContent }) {
  usePageSeo({
    title: 'نصف عدسة للإنتاج | H-Lens Production',
    description: 'شريكك في الإنتاج الفني من الرياض؛ نصنع الأفلام والحملات والتغطيات من الفكرة إلى آخر فريم.',
    path: '/',
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

interface AppProps {
  initialContent?: PublicWebsiteContent
  pathname?: string
}

function WebsiteRoutes({ initialContent, pathname }: AppProps) {
  const cmsContent = usePublicWebsiteContent(initialContent)
  const path = normalizePath(pathname || window.location.pathname)

  if (path === '/') return <HomePage cmsContent={cmsContent} />
  if (path === '/work/') return <WorkArchive projects={cmsContent.archiveWorks} />
  if (path === '/about/') return <AboutPage />
  if (path === '/services/') return <ServicesPage />
  if (path === '/contact/') return <ContactPage content={cmsContent} />
  if (path === '/careers/') return <CareersPage content={cmsContent} />
  if (path === '/_gone_/') return <Gone />

  if (path.startsWith('/work/')) {
    const slug = decodeURIComponent(path.slice('/work/'.length, -1))
    const projectIndex = cmsContent.projects.findIndex((project) => project.slug === slug)
    if (projectIndex >= 0) {
      const nextProject = cmsContent.projects[(projectIndex + 1) % cmsContent.projects.length]
      return <ProjectDetail project={cmsContent.projects[projectIndex]} nextProject={nextProject} />
    }
  }

  return <NotFound path={path} />
}

export default function App(props: AppProps) {
  return <><ControlledScroll /><WebsiteRoutes {...props} /></>
}
