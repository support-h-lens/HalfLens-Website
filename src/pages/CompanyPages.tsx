import type { ReactNode } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { BrandLogo } from '../components/BrandLogo'
import {
  services,
  servicesContent,
  storyContent,
} from '../data/siteContent'
import type { PublicWebsiteContent } from '../lib/cmsContent'
import { usePageSeo } from '../lib/seo'
import { Contact } from '../sections/Contact'
import { Footer } from '../sections/Footer'

function RouteHeader({ actionHref = '/contact/', actionLabel = 'ابدأ مشروعك' }) {
  return (
    <header className="route-header">
      <a href="/" aria-label="العودة إلى الصفحة الرئيسية" className="route-header__brand">
        <BrandLogo />
      </a>
      <a href={actionHref} className="route-header__action">
        <span>{actionLabel}</span>
        <ArrowIcon />
      </a>
    </header>
  )
}

function CompanyPageShell({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string
  title: ReactNode
  intro: string
  children: ReactNode
}) {
  return (
    <div className="content-page">
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <RouteHeader />
      <main id="main-content">
        <header className="content-page__hero layout-container">
          <p className="brand-kicker" dir="ltr"><i />{kicker}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>
        {children}
      </main>
      <Footer routeMode />
    </div>
  )
}

export function AboutPage() {
  usePageSeo({
    title: 'من نحن | نصف عدسة للإنتاج',
    description: 'تعرّف على نصف عدسة، شركة إنتاج مرئي من الرياض تبني الأفلام والحملات من الفكرة إلى آخر فريم.',
    path: '/about/',
  })

  return (
    <CompanyPageShell
      kicker="HL / ABOUT"
      title={<>نصفٌ يكتمل<br />بشراكة حقيقية.</>}
      intro={storyContent.lead}
    >
      <section className="content-page__story layout-container" aria-labelledby="about-story-title">
        <div>
          <p className="content-page__index" dir="ltr">01 / OUR STORY</p>
          <h2 id="about-story-title">عدسة تحكي، وأثر يبقى.</h2>
        </div>
        <div className="content-page__prose">
          <p>{storyContent.supporting}</p>
          <p>من الرياض نكوّن فريق كل مشروع بحسب فكرته، ونوحّد الإخراج والإنتاج وما بعد الإنتاج داخل مسار واضح يحافظ على الرسالة والجودة.</p>
        </div>
      </section>
      <section className="content-page__highlights layout-container" aria-label="قيم نصف عدسة">
        {storyContent.highlights.map((highlight, index) => (
          <article key={highlight}>
            <span dir="ltr">0{index + 1}</span>
            <h2>{highlight}</h2>
          </article>
        ))}
      </section>
    </CompanyPageShell>
  )
}

export function ServicesPage() {
  usePageSeo({
    title: 'خدمات الإنتاج المرئي في الرياض | نصف عدسة',
    description: 'إنتاج أفلام وحملات، تصوير فوتوغرافي، موشن جرافيك، تغطيات إعلامية وإعلانات سينمائية من الرياض.',
    path: '/services/',
  })

  return (
    <CompanyPageShell
      kicker="HL / SERVICES"
      title={<>كل ما تحتاجه الصورة،<br />تحت سقف واحد.</>}
      intro={servicesContent.intro}
    >
      <section className="content-page__services layout-container" aria-label="خدمات نصف عدسة">
        {services.map((service) => (
          <article key={service.id}>
            <div>
              <span dir="ltr">{service.id}</span>
              <small dir="ltr">{service.meta}</small>
            </div>
            <h2>{service.title}</h2>
            <p>{service.description}</p>
          </article>
        ))}
      </section>
      <div className="content-page__cta layout-container">
        <p>لديك مشروع يحتاج فريق إنتاج متكامل؟</p>
        <a className="button button--primary" href="/contact/"><span>ابدأ مشروعك</span><ArrowIcon /></a>
      </div>
    </CompanyPageShell>
  )
}

export function ContactPage({ content }: { content: PublicWebsiteContent }) {
  usePageSeo({
    title: 'تواصل مع نصف عدسة للإنتاج | الرياض',
    description: 'ابدأ مشروعك المرئي مع فريق نصف عدسة في الرياض أو تواصل مباشرة مع تطوير الأعمال.',
    path: '/contact/',
  })

  return (
    <div className="content-page content-page--contact">
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <RouteHeader actionHref="/work/" actionLabel="شاهد أعمالنا" />
      <main id="main-content">
        <header className="content-page__hero layout-container">
          <p className="brand-kicker" dir="ltr"><i />HL / CONTACT</p>
          <h1>لنحوّل الفكرة<br />إلى صورة.</h1>
          <p>شاركنا هدف مشروعك ونطاقه، وسيتواصل معك فريق تطوير الأعمال لفهمه وبناء الخطوة التالية.</p>
        </header>
        <Contact channels={content.contactChannels} />
      </main>
      <Footer routeMode />
    </div>
  )
}

export function CareersPage({ content }: { content: PublicWebsiteContent }) {
  usePageSeo({
    title: 'الوظائف والانضمام إلى فريق نصف عدسة',
    description: 'قدّم للانضمام إلى فريق نصف عدسة في مجالات الإنتاج، إدارة المشاريع، المحتوى الإبداعي وتطوير الأعمال.',
    path: '/careers/',
  })

  return (
    <div className="content-page content-page--contact">
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <RouteHeader actionHref="/work/" actionLabel="شاهد أعمالنا" />
      <main id="main-content">
        <header className="content-page__hero layout-container">
          <p className="brand-kicker" dir="ltr"><i />HL / CAREERS</p>
          <h1>لديك شغف؟<br />اصنع أثره معنا.</h1>
          <p>نبحث عن مواهب ترى التفاصيل بطريقة مختلفة وتعرف كيف تحول الفكرة إلى عمل متقن. اختر تخصصك وأرسل سيرتك وأفضل أعمالك.</p>
        </header>
        <Contact channels={content.contactChannels} initialPath="career" />
      </main>
      <Footer routeMode />
    </div>
  )
}
