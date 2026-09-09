import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const origin = 'https://h-lens.co'
const root = resolve(import.meta.dirname, '..')
const matrix = JSON.parse(await readFile(resolve(root, 'seo/url-migration-matrix.json'), 'utf8'))
const matrixPaths = new Set(matrix.map((entry) => entry.source))

const extractLocations = (xml) => [...xml.matchAll(/<loc>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/loc>/gsi)]
  .map((match) => match[1].trim().replaceAll('&amp;', '&'))

const fetchText = async (url) => {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.text()
}

const normalizePath = (url) => {
  const pathname = decodeURIComponent(new URL(url, origin).pathname)
  if (pathname === '/') return '/'
  return `/${pathname.split('/').filter(Boolean).join('/')}/`
}

const sitemapIndex = await fetchText(`${origin}/sitemap_index.xml`)
const sitemapUrls = extractLocations(sitemapIndex).map((url) => url.replace(/^http:/, 'https:'))
const inventory = new Set()

for (const sitemapUrl of sitemapUrls) {
  const sitemap = await fetchText(sitemapUrl)
  extractLocations(sitemap).forEach((url) => inventory.add(normalizePath(url)))
}

const canonicalPaths = new Set(['/', '/work/'])
const missing = [...inventory].filter((path) => !canonicalPaths.has(path) && !matrixPaths.has(path)).sort()
const stale = [...matrixPaths].filter((path) => !inventory.has(path)).sort()
const pending = matrix.filter((entry) => entry.action === 'review')

console.log(`WordPress inventory: ${inventory.size} URL(s)`)
console.log(`Migration matrix: ${matrix.length} decision(s), ${pending.length} pending Search Console review`)
if (missing.length) {
  console.error('URLs missing from the migration matrix:')
  missing.forEach((path) => console.error(`- ${path}`))
}
if (stale.length) {
  console.warn(`Matrix entries no longer present in the live sitemap: ${stale.length}`)
}
if (missing.length) process.exitCode = 1
