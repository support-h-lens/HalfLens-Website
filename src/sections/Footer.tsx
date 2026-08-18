import { BrandLogo } from '../components/BrandLogo'
import { footerContent, navigation, socialLinks } from '../data/siteContent'

export function Footer() {
  return (
    <footer className="footer">
      <div className="layout-container footer__top">
        <a href="#hero" className="footer__brand" aria-label="العودة إلى الرئيسية">
          <BrandLogo />
        </a>

        <div className="footer__callout">
          <div className="footer__signal" dir="ltr">
            <i aria-hidden="true" />
            <span>{footerContent.signal}</span>
          </div>
          <p className="footer__statement">{footerContent.statement}</p>
          <a className="footer__email" href={`mailto:${footerContent.email}`}>
            <span>{footerContent.contactLabel}</span>
            <strong dir="ltr">{footerContent.email}</strong>
          </a>
        </div>

        <p className="footer__tagline">{footerContent.tagline}</p>
      </div>

      <div className="layout-container footer__links">
        <nav aria-label="روابط التذييل">
          {navigation.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="footer__socials">
          {socialLinks.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="layout-container footer__legal">
        <span>© {new Date().getFullYear()} HALF LENS PRODUCTION</span>
        <span>{footerContent.location}</span>
      </div>
    </footer>
  )
}
