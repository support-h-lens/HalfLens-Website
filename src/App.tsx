import { CinematicStory } from './components/CinematicStory'
import { ControlledScroll } from './components/ControlledScroll'
import { Navigation } from './components/Navigation'
import { PortfolioRise } from './components/PortfolioRise'
import { SectionWindow } from './components/SectionWindow'
import { Clients } from './sections/Clients'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'
import { usePublicWebsiteContent } from './lib/publicCms'

function App() {
  const cmsContent = usePublicWebsiteContent()

  return (
    <>
      <ControlledScroll />
      <a className="skip-link" href="#main-content">
        انتقل إلى المحتوى
      </a>
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

export default App
