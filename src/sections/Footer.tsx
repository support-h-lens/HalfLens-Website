import { BrandLogo } from '../components/BrandLogo'
import { footerContent, navigation, services, socialLinks } from '../data/siteContent'

export function Footer() {
  return (
    <footer className="footer">
      <div className="layout-container footer__top">
        <a href="#hero" className="footer__brand" aria-label="العودة إلى الرئيسية">
          <BrandLogo />
        </a>

        <div className="footer__directory">
          <div className="footer__column">
            <h2>{footerContent.servicesLabel}</h2>
            <ul>
              {services.map((service) => (
                <li key={service.id}>{service.title}</li>
              ))}
            </ul>
          </div>

          <div className="footer__column">
            <h2>{footerContent.valuesLabel}</h2>
            <ul>
              {footerContent.values.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__manifesto">
          <div className="footer__signal" dir="ltr">
            <i aria-hidden="true" />
            <span>{footerContent.signal}</span>
          </div>
          <p className="footer__statement">{footerContent.statement}</p>
          <p className="footer__tagline">{footerContent.tagline}</p>
        </div>
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
