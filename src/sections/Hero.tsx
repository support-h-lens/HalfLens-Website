import { ArrowIcon } from '../components/ArrowIcon'
import { heroContent } from '../data/siteContent'

export function Hero() {
  return (
    <section id="hero" className="hero cinematic-chapter" aria-labelledby="hero-title">
      <div className="layout-container hero__layout">
        <div className="hero__viewfinder" aria-hidden="true">
          <span className="hero__frame-corner hero__frame-corner--one" />
          <span className="hero__frame-corner hero__frame-corner--two" />
          <span className="hero__frame-corner hero__frame-corner--three" />
          <span className="hero__frame-corner hero__frame-corner--four" />
          <span className="hero__safe-line hero__safe-line--top" />
          <span className="hero__safe-line hero__safe-line--bottom" />

          <div className="hero__capture hero__capture--rec">
            <i />
            <span>REC</span>
          </div>
          <div className="hero__capture hero__capture--format">
            <span>CAM A</span>
            <span>4K · 16:9</span>
          </div>
          <div className="hero__capture hero__capture--scene">
            <span>SCENE 01</span>
            <span>24 FPS</span>
          </div>
          <div className="hero__capture hero__capture--timecode">00:00:08:12</div>
        </div>

        <div className="hero__copy">
          <p className="eyebrow" dir="ltr">
            {heroContent.eyebrow}
          </p>
          <h1 id="hero-title">
            <span>{heroContent.titleLineOne}</span>
            <span>{heroContent.titleLineTwo}</span>
          </h1>
          <p className="hero__description">{heroContent.description}</p>
          <div className="hero__actions">
            <a className="button button--primary" href="#portfolio">
              <span>{heroContent.primaryAction}</span>
              <ArrowIcon />
            </a>
            <a className="text-link" href="#contact">
              {heroContent.secondaryAction}
            </a>
          </div>
        </div>

        <div className="hero__index" aria-hidden="true">
          <span>HL / 001</span>
          <span>24.7136° N</span>
          <span>46.6753° E</span>
        </div>

        <a className="scroll-cue" href="#story" aria-label="انتقل إلى قصتنا">
          <span>مرّر لاكتشاف القصة</span>
          <ArrowIcon direction="down" />
        </a>
      </div>
    </section>
  )
}
