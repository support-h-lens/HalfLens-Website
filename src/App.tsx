import { CinematicStory } from './components/CinematicStory'
import { Navigation } from './components/Navigation'
import { PortfolioRise } from './components/PortfolioRise'
import { SectionWindow } from './components/SectionWindow'
import { Clients } from './sections/Clients'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'

function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        انتقل إلى المحتوى
      </a>
      <Navigation />

      <main id="main-content">
        <CinematicStory />

        <PortfolioRise />
        <SectionWindow className="section-window--clients" theme="light">
          <Clients />
        </SectionWindow>
        <SectionWindow className="section-window--contact" theme="dark">
          <Contact />
        </SectionWindow>
      </main>

      <Footer />
    </>
  )
}

export default App
