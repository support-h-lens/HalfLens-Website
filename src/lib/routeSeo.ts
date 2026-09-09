import type { PublicWebsiteContent } from './cmsContent'

export const productionOrigin = 'https://h-lens.co'
export const defaultSocialImage = '/media/h-lens-camera-poster.60f5cbbaa591.webp'

export interface RouteSeo {
  title: string
  description: string
  path: string
  image: string
  ogType: 'website' | 'article'
  noIndex?: boolean
  structuredData: Array<Record<string, unknown>>
}

const absoluteUrl = (path: string) => new URL(path, productionOrigin).href

const organization = (content: PublicWebsiteContent) => {
  const email = content.contactChannels.find((channel) => channel.href.startsWith('mailto:'))
  const phone = content.contactChannels.find((channel) => channel.href.startsWith('tel:'))

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${productionOrigin}/#organization`,
    name: 'Half Lens Production',
    alternateName: 'نصف عدسة للإنتاج',
    url: `${productionOrigin}/`,
    logo: absoluteUrl('/half-lens-logo-white.png'),
    ...(email ? { email: email.value } : {}),
    ...(phone ? { telephone: phone.href.replace('tel:', '') } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Riyadh',
      addressCountry: 'SA',
    },
    sameAs: [
      'https://www.instagram.com/HalfLens_SA/',
      'https://www.tiktok.com/@halflens_sa',
      'https://twitter.com/HalfLens_SA',
    ],
  }
}

const breadcrumb = (items: Array<{ name: string; path: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

const corePages: Record<string, Pick<RouteSeo, 'title' | 'description'> & { type: string }> = {
  '/about/': {
    title: 'من نحن | نصف عدسة للإنتاج',
    description: 'تعرّف على نصف عدسة، شركة إنتاج مرئي من الرياض تبني الأفلام والحملات من الفكرة إلى آخر فريم.',
    type: 'AboutPage',
  },
  '/services/': {
    title: 'خدمات الإنتاج المرئي في الرياض | نصف عدسة',
    description: 'إنتاج أفلام وحملات، تصوير فوتوغرافي، موشن جرافيك، تغطيات إعلامية وإعلانات سينمائية من الرياض.',
    type: 'WebPage',
  },
  '/contact/': {
    title: 'تواصل مع نصف عدسة للإنتاج | الرياض',
    description: 'ابدأ مشروعك المرئي مع فريق نصف عدسة في الرياض أو تواصل مباشرة مع تطوير الأعمال.',
    type: 'ContactPage',
  },
  '/careers/': {
    title: 'الوظائف والانضمام إلى فريق نصف عدسة',
    description: 'قدّم للانضمام إلى فريق نصف عدسة في مجالات الإنتاج، إدارة المشاريع، المحتوى الإبداعي وتطوير الأعمال.',
    type: 'WebPage',
  },
}

export function getRouteSeo(pathname: string, content: PublicWebsiteContent): RouteSeo {
  if (pathname === '/') {
    return {
      title: 'نصف عدسة للإنتاج | H-Lens Production',
      description: 'شريكك في الإنتاج الفني من الرياض؛ نصنع الأفلام والحملات والتغطيات من الفكرة إلى آخر فريم.',
      path: '/',
      image: defaultSocialImage,
      ogType: 'website',
      structuredData: [
        organization(content),
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${productionOrigin}/#website`,
          url: `${productionOrigin}/`,
          name: 'نصف عدسة للإنتاج',
          inLanguage: 'ar-SA',
          publisher: { '@id': `${productionOrigin}/#organization` },
        },
      ],
    }
  }

  if (pathname === '/work/') {
    const path = '/work/'
    return {
      title: 'أعمال نصف عدسة | H-Lens Production',
      description: 'أفلام وحملات وتغطيات مختارة من إنتاج نصف عدسة في الرياض.',
      path,
      image: content.projects[0]?.seoImage || content.projects[0]?.youtube?.poster || defaultSocialImage,
      ogType: 'website',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'أعمال نصف عدسة',
          url: absoluteUrl(path),
          inLanguage: 'ar-SA',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: content.archiveWorks.length,
            itemListElement: content.archiveWorks.map((project, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: project.title,
              url: project.link,
            })),
          },
        },
        breadcrumb([
          { name: 'الرئيسية', path: '/' },
          { name: 'أعمالنا', path },
        ]),
      ],
    }
  }

  const project = content.projects.find(
    (item) => pathname === `/work/${item.slug}/`,
  )
  if (project) {
    const path = `/work/${project.slug}/`
    const image = project.seoImage || project.youtube?.poster || project.image || defaultSocialImage
    return {
      title: project.seoTitle || `${project.title} | نصف عدسة`,
      description: project.seoDescription || `${project.title} — ${project.category}. إنتاج نصف عدسة.`,
      path,
      image,
      ogType: 'article',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: project.title,
          description: project.seoDescription || project.intro || project.category,
          url: absoluteUrl(path),
          inLanguage: 'ar-SA',
          image: absoluteUrl(image),
          creator: { '@id': `${productionOrigin}/#organization` },
          ...(project.client ? { about: project.client } : {}),
          ...(project.year ? { dateCreated: project.year } : {}),
          ...(project.youtube?.url ? { sameAs: project.youtube.url } : {}),
        },
        breadcrumb([
          { name: 'الرئيسية', path: '/' },
          { name: 'أعمالنا', path: '/work/' },
          { name: project.title, path },
        ]),
      ],
    }
  }

  const corePage = corePages[pathname]
  if (corePage) {
    const pageName = corePage.title.split('|')[0].trim()
    return {
      title: corePage.title,
      description: corePage.description,
      path: pathname,
      image: defaultSocialImage,
      ogType: 'website',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': corePage.type,
          name: pageName,
          description: corePage.description,
          url: absoluteUrl(pathname),
          inLanguage: 'ar-SA',
          isPartOf: { '@id': `${productionOrigin}/#website` },
        },
        breadcrumb([
          { name: 'الرئيسية', path: '/' },
          { name: pageName, path: pathname },
        ]),
      ],
    }
  }

  return {
    title: 'الصفحة غير موجودة | نصف عدسة',
    description: 'تعذر العثور على الصفحة المطلوبة.',
    path: pathname,
    image: defaultSocialImage,
    ogType: 'website',
    noIndex: true,
    structuredData: [],
  }
}
