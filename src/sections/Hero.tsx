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

          <div className="hero__index">
            <span>HL / 001</span>
            <span>24.7136° N · 46.6753° E</span>
          </div>
        </div>

        <div className="hero__copy">
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

        <a
          className="hero__profile-link"
          href={heroContent.profileHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="فتح الملف التعريفي لشركة H-Lens بصيغة PDF في تبويب جديد"
        >
          <span className="hero__profile-dial" aria-hidden="true">
            <svg className="hero__profile-orbit" viewBox="0 0 140 140">
              <defs>
                <path
                  id="hero-profile-orbit-path"
                  d="M 70,70 m -53,0 a 53,53 0 1,1 106,0 a 53,53 0 1,1 -106,0"
                />
              </defs>
              <circle cx="70" cy="70" r="60" />
              <text>
                <textPath href="#hero-profile-orbit-path">
                  H-LENS · COMPANY PROFILE · PDF · H-LENS ·
                </textPath>
              </text>
            </svg>
            <span className="hero__profile-icon">
              <ArrowIcon />
            </span>
          </span>
          <span className="hero__profile-copy">
            <span className="hero__profile-meta">{heroContent.profileMeta}</span>
            <strong>{heroContent.profileAction}</strong>
          </span>
        </a>

        <a className="scroll-cue" href="#story" aria-label="انتقل إلى قصتنا">
          <strong>مرّر لاكتشاف القصة</strong>
          <span className="scroll-cue__motion" aria-hidden="true">
            <ArrowIcon direction="down" />
          </span>
        </a>
      </div>
    </section>
  )
}
