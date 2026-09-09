import { ArrowIcon } from '../components/ArrowIcon'
import { BrandLogo } from '../components/BrandLogo'
import { usePageSeo } from '../lib/seo'

export function Gone() {
  usePageSeo({
    title: 'المحتوى لم يعد متاحًا | نصف عدسة',
    description: 'أُزيل هذا المحتوى ولم يعد متاحًا.',
    path: '/_gone_/',
    noIndex: true,
  })

  return (
    <>
      <a className="skip-link" href="#main-content">انتقل إلى المحتوى</a>
      <main className="not-found" id="main-content">
        <BrandLogo />
        <p className="brand-kicker" dir="ltr"><i /> FRAME RETIRED / 410</p>
        <h1>هذا المحتوى<br />غادر المشهد.</h1>
        <a className="button button--primary" href="/work/">
          <span>شاهد أعمالنا</span><ArrowIcon />
        </a>
      </main>
    </>
  )
}
