import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}

const read = (path) => readFile(resolve(dist, path), 'utf8')
const exists = async (path) => access(resolve(dist, path)).then(() => true, () => false)
const routeFile = (route) => route === '/' ? 'index.html' : `${route.slice(1)}index.html`
const attribute = (html, selector, name) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const tag = html.match(new RegExp(`<[^>]+${escapedSelector}[^>]*>`, 'i'))?.[0]
  return tag?.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] || ''
}

const manifest = JSON.parse(await read('build-manifest.json'))
const titles = new Set()
const descriptions = new Set()

for (const route of manifest.routes) {
  const file = routeFile(route)
  check(await exists(file), `${route}: generated HTML file is missing`)
  const html = await read(file)
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || ''
  const description = attribute(html, 'name="description"', 'content')
  const canonical = attribute(html, 'rel="canonical"', 'href')
  const robots = attribute(html, 'name="robots"', 'content')
  const ogImage = attribute(html, 'property="og:image"', 'content')
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length
  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]

  check(Boolean(title), `${route}: title is missing`)
  check(Boolean(description), `${route}: meta description is missing`)
  check(canonical === `https://h-lens.co${route}`, `${route}: canonical is ${canonical}`)
  check(Boolean(ogImage), `${route}: Open Graph image is missing`)
  check(h1Count === 1, `${route}: expected one H1, found ${h1Count}`)
  check(html.includes('<div id="root"><'), `${route}: root has no prerendered content`)
  check(jsonLdBlocks.length > 0, `${route}: structured data is missing`)
  check(
    manifest.target === 'preview' ? robots.includes('noindex') : robots.startsWith('index'),
    `${route}: robots directive does not match ${manifest.target}`,
  )

  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1])
      check(data['@context'] === 'https://schema.org', `${route}: invalid JSON-LD context`)
    } catch (error) {
      failures.push(`${route}: JSON-LD is invalid (${error.message})`)
    }
  }

  check(!titles.has(title), `${route}: duplicate title ${title}`)
  check(!descriptions.has(description), `${route}: duplicate description`)
  titles.add(title)
  descriptions.add(description)
}

for (const errorPage of ['404.html', '410.html']) {
  const html = await read(errorPage)
  check(attribute(html, 'name="robots"', 'content').includes('noindex'), `${errorPage}: must be noindex`)
  check((html.match(/<h1(?:\s|>)/gi) || []).length === 1, `${errorPage}: must contain one H1`)
}

const redirects = await read('_redirects')
const htaccess = await read('.htaccess')
const headers = await read('_headers')
check(!redirects.includes('/index.html 200'), '_redirects contains an SPA fallback')
check(htaccess.includes('ErrorDocument 404 /404.html'), '.htaccess does not configure a real 404 document')
check(htaccess.includes('[R=410,L]'), '.htaccess has no 410 rules')
check(htaccess.includes('!^h-lens\\.co$'), '.htaccess does not canonicalize the hostname')
check(headers.includes('https://1.h-lens.co/*'), '_headers does not protect the preview custom domain')
check(headers.includes('https://:project.pages.dev/*'), '_headers does not protect pages.dev')

const robots = await read('robots.txt')
if (manifest.target === 'preview') {
  check(robots.includes('Disallow: /'), 'preview robots.txt does not disallow crawling')
  check(!(await exists('sitemap.xml')), 'preview build must not contain a sitemap')
} else {
  check(robots.includes('Sitemap: https://h-lens.co/sitemap.xml'), 'production robots.txt has no HTTPS sitemap')
  const sitemap = await read('sitemap.xml')
  const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  check(sitemapLocations.length === manifest.routes.length, 'sitemap route count differs from the build manifest')
  for (const route of manifest.routes) {
    check(sitemapLocations.includes(`https://h-lens.co${route}`), `sitemap is missing ${route}`)
  }
  check(!sitemap.includes('/admin'), 'sitemap contains an admin URL')
  check(!sitemap.includes('1.h-lens.co'), 'sitemap contains a preview URL')
}

if (failures.length > 0) {
  console.error(`SEO build verification failed with ${failures.length} issue(s):`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exitCode = 1
} else {
  console.log(`SEO build verification passed for ${manifest.routes.length} route(s) (${manifest.target}).`)
}
