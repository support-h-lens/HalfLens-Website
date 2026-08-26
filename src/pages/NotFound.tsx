import { ArrowIcon } from '../components/ArrowIcon'
import { BrandLogo } from '../components/BrandLogo'
import { usePageSeo } from '../lib/seo'

export function NotFound() {
  usePageSeo({
    title: 'الصفحة غير موجودة | نصف عدسة',
    description: 'تعذر العثور على الصفحة المطلوبة.',
    path: window.location.pathname,
    noIndex: true,
  })

  return (
    <>
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <main className="not-found" id="main-content">
        <BrandLogo />
        <p className="brand-kicker" dir="ltr"><i /> FRAME NOT FOUND / 404</p>
        <h1>هذا الفريم<br />خارج المشهد.</h1>
        <a className="button button--primary" href="/">
          <span>العودة للرئيسية</span><ArrowIcon />
        </a>
      </main>
    </>
  )
}
