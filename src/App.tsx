import { CinematicMediaStage } from './components/CinematicMediaStage'
import { Navigation } from './components/Navigation'
import { Clients } from './sections/Clients'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { OurStory } from './sections/OurStory'
import { Portfolio } from './sections/Portfolio'
import { Services } from './sections/Services'

function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        انتقل إلى المحتوى
      </a>
      <Navigation />

      <main id="main-content">
        <div className="cinematic-story">
          <div className="cinematic-story__sticky" aria-hidden="true">
            <CinematicMediaStage />
          </div>

          <div className="cinematic-story__chapters">
            <Hero />
            <OurStory />
            <Services />
          </div>
        </div>

        <Portfolio />
        <Clients />
        <Contact />
      </main>

      <Footer />
    </>
  )
}

export default App
