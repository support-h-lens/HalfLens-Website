import { CinematicStory } from './components/CinematicStory'
import { Navigation } from './components/Navigation'
import { PortfolioRise } from './components/PortfolioRise'
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
        <Clients />
        <Contact />
      </main>

      <Footer />
    </>
  )
}

export default App
