import { useEffect, useRef, useState } from 'react'
import { navigation } from '../data/siteContent'
import type { SectionId } from '../types/content'
import { ArrowIcon } from './ArrowIcon'
import { BrandLogo } from './BrandLogo'

const sectionIds = navigation.map(({ id }) => id)

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId>('hero')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const nextId = visible[0]?.target.id as SectionId | undefined
        if (nextId) setActiveSection(nextId)
      },
      {
        rootMargin: '-24% 0px -60% 0px',
        threshold: [0, 0.08, 0.2, 0.45],
      },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.classList.toggle('menu-is-open', menuOpen)

    if (!menuOpen) return undefined

    const menu = menuRef.current
    const focusable = menu?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    window.requestAnimationFrame(() => first?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        window.requestAnimationFrame(() => triggerRef.current?.focus())
        return
      }

      if (event.key !== 'Tab' || !first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('menu-is-open')
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const navigate = () => setMenuOpen(false)
  const navNeedsSurface = ['portfolio', 'clients', 'contact'].includes(activeSection)

  return (
    <>
      <header
        className={`site-nav${isScrolled ? ' site-nav--scrolled' : ''}${
          navNeedsSurface ? ' site-nav--surface' : ''
        }`}
      >
        <a className="site-nav__brand" href="#hero" aria-label="العودة إلى الرئيسية">
          <BrandLogo />
        </a>

        <nav className="site-nav__links" aria-label="التنقل الرئيسي">
          {navigation.map((item) => (
            <a
              key={item.id}
              className={activeSection === item.id ? 'is-active' : ''}
              href={`#${item.id}`}
              aria-current={activeSection === item.id ? 'location' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a className="button button--nav" href="#contact">
          <span>ابدأ مشروعك</span>
          <ArrowIcon />
        </a>

        <button
          ref={triggerRef}
          className={`menu-trigger${menuOpen ? ' menu-trigger--open' : ''}`}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </header>

      <div
        ref={menuRef}
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? ' mobile-menu--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu__topline">
          <span>HL · NAVIGATION</span>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
          >
            إغلاق
          </button>
        </div>

        <nav className="mobile-menu__links" aria-label="التنقل على الجوال">
          {navigation.map((item, index) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              tabIndex={menuOpen ? 0 : -1}
              className={activeSection === item.id ? 'is-active' : ''}
              onClick={navigate}
            >
              <span className="mobile-menu__number">0{index + 1}</span>
              <span>{item.label}</span>
              <ArrowIcon />
            </a>
          ))}
        </nav>

        <a
          className="button button--mobile-menu"
          href="#contact"
          tabIndex={menuOpen ? 0 : -1}
          onClick={navigate}
        >
          <span>لنبدأ مشروعك</span>
          <ArrowIcon />
        </a>
      </div>
    </>
  )
}
