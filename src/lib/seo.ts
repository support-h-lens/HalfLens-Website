import { useEffect } from 'react'

import { defaultSocialImage, productionOrigin } from './routeSeo'

interface SeoOptions {
  title: string
  description: string
  path?: string
  image?: string
  noIndex?: boolean
}

const setMeta = (selector: string, attribute: 'content' | 'href', value: string) => {
  const element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector)
  element?.setAttribute(attribute, value)
}

export function usePageSeo({
  title,
  description,
  path = '/',
  image = defaultSocialImage,
  noIndex = false,
}: SeoOptions) {
  useEffect(() => {
    const canonical = `${productionOrigin}${path}`
    const socialImage = image.startsWith('http') ? image : `${productionOrigin}${image}`

    document.title = title
    setMeta('meta[name="description"]', 'content', description)
    setMeta('link[rel="canonical"]', 'href', canonical)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', canonical)
    setMeta('meta[property="og:image"]', 'content', socialImage)
    setMeta('meta[name="twitter:title"]', 'content', title)
    setMeta('meta[name="twitter:description"]', 'content', description)
    setMeta('meta[name="twitter:image"]', 'content', socialImage)
    setMeta(
      'meta[name="robots"]',
      'content',
      noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    )
  }, [description, image, noIndex, path, title])
}
