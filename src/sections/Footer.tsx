import { BrandLogo } from '../components/BrandLogo'
import { ArrowIcon } from '../components/ArrowIcon'
import { useLayoutEffect, useRef } from 'react'
import { gsap, refreshScrollTriggerWhenReady } from '../lib/gsap'
import { footerContent, services, socialLinks } from '../data/siteContent'

const websitePages = [
  { label: 'من نحن', href: '/about/' },
  { label: 'خدماتنا', href: '/services/' },
  { label: 'أعمالنا', href: '/work/' },
  { label: 'تواصل معنا', href: '/contact/' },
  { label: 'الوظائف', href: '/careers/' },
]

export function Footer({ routeMode = false }: { routeMode?: boolean }) {
  const footerRef = useRef<HTMLElement>(null)
  const sectionHref = (id: string) => `${routeMode ? '/' : ''}#${id}`

  useLayoutEffect(() => {
    const footer = footerRef.current
    if (!footer) return
    const media = gsap.matchMedia()
    const context = gsap.context(() => {
      media.add('(min-width: 721px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const content = footer.querySelector('.footer__reveal-content')
        gsap.fromTo(footer.querySelector('.footer__edge'), { scaleY: 1 }, {
          scaleY: 0, ease: 'none',
          scrollTrigger: { trigger: footer, start: 'top bottom', end: 'top 15%', scrub: true },
        })
        const tween = gsap.fromTo(content, { y: -100 }, {
          y: 0, ease: 'none',
          scrollTrigger: { trigger: footer, start: 'top bottom', end: 'top 15%', scrub: true, invalidateOnRefresh: true },
        })
        // Keyboard focus always gets a stationary, fully visible footer.
        const focus = () => {
          tween.scrollTrigger?.kill()
          tween.kill()
          gsap.set(content, { clearProps: 'transform' })
        }
        footer.addEventListener('focusin', focus)
        if (footer.contains(document.activeElement)) focus()
        return () => footer.removeEventListener('focusin', focus)
      })
    }, footer)
    const cancelRefresh = refreshScrollTriggerWhenReady()
    return () => { cancelRefresh(); media.revert(); context.revert() }
  }, [])

  return (
    <footer ref={footerRef} className="footer footer--editorial">
      <div className="footer__edge" aria-hidden="true" />
      <div className="footer__reveal-content">
      <div className="layout-container footer__invitation">
        <div><span className="footer__invitation-label" dir="ltr">YOUR VISION. OUR NEXT FRAME.</span><p>لنكمل النصف الآخر.</p></div>
        <a className="footer__start" href={sectionHref('contact')}><span>لنصنع شيئًا يبقى</span><ArrowIcon /></a>
      </div>
      <div className="layout-container footer__top">
        <a href={sectionHref('hero')} className="footer__brand" aria-label="العودة إلى الرئيسية">
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
          {websitePages.map((item) => (
            <a key={item.href} href={item.href}>
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
      </div>
    </footer>
  )
}
