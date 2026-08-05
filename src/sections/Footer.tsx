import { BrandLogo } from '../components/BrandLogo'
import { navigation, socialLinks } from '../data/siteContent'

export function Footer() {
  return (
    <footer className="footer">
      <div className="layout-container footer__top">
        <a href="#hero" className="footer__brand" aria-label="العودة إلى الرئيسية">
          <BrandLogo />
        </a>
        <p>من الفكرة إلى الصورة التي تبقى.</p>
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
        <span>الرياض، المملكة العربية السعودية</span>
      </div>
    </footer>
  )
}
