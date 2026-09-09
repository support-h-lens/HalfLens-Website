import { build, loadEnv } from 'vite'
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const distDirectory = resolve(root, 'dist')
const serverDirectory = resolve(root, '.ssg')
const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production'
const env = { ...loadEnv(mode, root, ''), ...process.env }
const productionOrigin = 'https://h-lens.co'
const previewBuild = env.H_LENS_BUILD_TARGET === 'preview' || env.CF_PAGES === '1'
const cmsRequired = env.H_LENS_CMS_REQUIRED === 'true'
const strictMigration = env.H_LENS_STRICT_MIGRATION === 'true'

const projectFields = [
  'project_code',
  'slug',
  'title',
  'category',
  'client',
  'production_role',
  'format',
  'project_year',
  'palette',
  'image_url',
  'youtube_id',
  'youtube_url',
  'youtube_poster_url',
  'aspect_ratio',
  'seo_title',
  'seo_description',
  'seo_image',
  'intro',
  'challenge',
  'role_details',
  'services',
  'deliverables',
  'result',
  'transcript',
  'updated_at',
]

const legacyProjectFields = projectFields.filter((field) => ![
  'seo_image',
  'intro',
  'challenge',
  'role_details',
  'services',
  'deliverables',
  'result',
  'transcript',
].includes(field))

const htmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const xmlEscape = (value) => htmlEscape(value).replaceAll("'", '&apos;')
const serializeJson = (value) => JSON.stringify(value)
  .replaceAll('<', '\\u003c')
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029')

const ensureTrailingSlash = (pathname) => {
  if (pathname === '/') return '/'
  return `/${pathname.split('/').filter(Boolean).join('/')}/`
}

const fetchRows = async (supabaseUrl, anonKey, table, query) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`${table} returned ${response.status}: ${detail.slice(0, 240)}`)
  }
  return response.json()
}

async function loadCmsSnapshot(serverModule) {
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    if (cmsRequired) throw new Error('CMS build credentials are required but missing.')
    return {
      content: serverModule.fallbackPublicWebsiteContent,
      redirects: [],
      source: 'fallback',
    }
  }

  try {
    let projectRows
    try {
      projectRows = await fetchRows(
        supabaseUrl,
        anonKey,
        'website_projects',
        `select=${projectFields.join(',')}&status=eq.published&order=sort_order.asc,created_at.asc`,
      )
    } catch (error) {
      if (cmsRequired) throw error
      console.warn(`Extended project fields are unavailable; using the legacy CMS shape. ${error.message}`)
      projectRows = await fetchRows(
        supabaseUrl,
        anonKey,
        'website_projects',
        `select=${legacyProjectFields.join(',')}&status=eq.published&order=sort_order.asc,created_at.asc`,
      )
    }

    const [clientRows, sectionRows, redirectRows, archiveRows] = await Promise.all([
      fetchRows(
        supabaseUrl,
        anonKey,
        'website_clients',
        'select=client_code,name,abbreviation,logo_url&status=eq.published&order=sort_order.asc,created_at.asc',
      ),
      fetchRows(
        supabaseUrl,
        anonKey,
        'website_sections',
        'select=content,updated_at&section_key=eq.contact&status=eq.published&limit=1',
      ),
      fetchRows(
        supabaseUrl,
        anonKey,
        'website_redirects',
        'select=source_path,target_path,status_code,is_active&is_active=eq.true&order=source_path.asc',
      ),
      fetchRows(supabaseUrl, anonKey, 'website_archive_works',
        'select=id,work_type,title,client,project_year,link_url&status=eq.published&order=sort_order.asc,created_at.asc,id.asc'),
    ])

    if (cmsRequired && projectRows.length === 0) {
      throw new Error('CMS returned no published projects.')
    }

    return {
      content: serverModule.createPublicWebsiteContent(projectRows, clientRows, sectionRows, archiveRows),
      redirects: redirectRows,
      source: 'supabase',
    }
  } catch (error) {
    if (cmsRequired) throw error
    console.warn(`CMS snapshot failed; using repository fallbacks. ${error.message}`)
    return {
      content: serverModule.fallbackPublicWebsiteContent,
      redirects: [],
      source: 'fallback',
    }
  }
}

const normalizeSource = (source) => {
  if (typeof source !== 'string' || !source.startsWith('/')) {
    throw new Error(`Redirect source must be a local absolute path: ${source}`)
  }
  if (source.includes('?') || source.includes('#')) {
    throw new Error(`Redirect source cannot contain a query or fragment: ${source}`)
  }
  return ensureTrailingSlash(decodeURIComponent(source))
}

const normalizeTarget = (target) => {
  if (typeof target !== 'string' || !target) throw new Error('Redirect target is missing.')
  const parsed = new URL(target, productionOrigin)
  if (parsed.origin !== productionOrigin) {
    throw new Error(`External redirect targets are not allowed: ${target}`)
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`Redirect targets cannot contain a query or fragment: ${target}`)
  }
  return ensureTrailingSlash(parsed.pathname)
}

const apachePattern = (source) => {
  const decoded = decodeURIComponent(source).replace(/^\/+|\/+$/g, '')
  return decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildMigrationRules(matrix, cmsRedirects, content, routes) {
  const pending = matrix.filter((entry) => entry.action === 'review')
  if (strictMigration && pending.length > 0) {
    throw new Error(`URL migration matrix still has ${pending.length} review decision(s).`)
  }

  const rulesBySource = new Map()
  for (const entry of matrix) {
    if (!['redirect', 'gone'].includes(entry.action)) continue
    const source = normalizeSource(entry.source)
    rulesBySource.set(source, entry.action === 'gone'
      ? { source, action: 'gone', reason: entry.reason }
      : {
          source,
          action: 'redirect',
          target: normalizeTarget(entry.target),
          status: 301,
          reason: entry.reason,
        })
  }

  content.projects.forEach((project) => {
    const numericCode = String(project.id).replace(/^project-/i, '').padStart(2, '0')
    if (!/^\d+$/.test(numericCode)) return
    const source = `/work/project-${numericCode}/`
    const target = `/work/${project.slug}/`
    if (source !== target) {
      rulesBySource.set(source, {
        source,
        action: 'redirect',
        target,
        status: 301,
        reason: 'رابط CMS القديم للمشروع',
      })
    }
  })

  for (const redirect of cmsRedirects) {
    if (![301, 308].includes(Number(redirect.status_code))) {
      throw new Error(`Unsupported permanent redirect status: ${redirect.status_code}`)
    }
    const source = normalizeSource(redirect.source_path)
    rulesBySource.set(source, {
      source,
      action: 'redirect',
      target: normalizeTarget(redirect.target_path),
      status: Number(redirect.status_code),
      reason: 'website_redirects',
    })
  }

  const rules = [...rulesBySource.values()].sort((a, b) => a.source.localeCompare(b.source, 'ar'))
  const redirectSources = new Set(rules.filter((rule) => rule.action === 'redirect').map((rule) => rule.source))

  for (const rule of rules) {
    if (rule.action !== 'redirect') continue
    if (rule.source === rule.target) throw new Error(`Redirect loop: ${rule.source}`)
    if (redirectSources.has(rule.target)) {
      throw new Error(`Redirect chain detected: ${rule.source} -> ${rule.target}`)
    }
    if (!routes.has(rule.target)) {
      throw new Error(`Redirect target is not a generated 200 page: ${rule.source} -> ${rule.target}`)
    }
  }

  return { rules, pending }
}

function buildHead(seo, pathname) {
  const canonical = new URL(seo.path, productionOrigin).href
  const image = new URL(seo.image, productionOrigin).href
  const robots = previewBuild || seo.noIndex
    ? 'noindex, nofollow, noarchive'
    : 'index, follow, max-image-preview:large'
  const structuredData = seo.structuredData
    .map((data) => `    <script type="application/ld+json">${serializeJson(data)}</script>`)
    .join('\n')
  const preload = pathname === '/'
    ? '    <link rel="preload" as="image" href="/media/h-lens-camera-poster.60f5cbbaa591.webp" type="image/webp" fetchpriority="high" />\n'
    : ''
  const canonicalLink = seo.noIndex
    ? ''
    : `    <link rel="canonical" href="${htmlEscape(canonical)}" />`

  return [
    '    <!-- h-lens-head:start -->',
    `    <meta name="description" content="${htmlEscape(seo.description)}" />`,
    '    <meta name="theme-color" content="#111638" />',
    `    <meta name="robots" content="${robots}" />`,
    canonicalLink,
    `    <meta property="og:type" content="${seo.ogType}" />`,
    '    <meta property="og:locale" content="ar_SA" />',
    '    <meta property="og:site_name" content="نصف عدسة للإنتاج" />',
    `    <meta property="og:title" content="${htmlEscape(seo.title)}" />`,
    `    <meta property="og:description" content="${htmlEscape(seo.description)}" />`,
    `    <meta property="og:url" content="${htmlEscape(canonical)}" />`,
    `    <meta property="og:image" content="${htmlEscape(image)}" />`,
    '    <meta name="twitter:card" content="summary_large_image" />',
    `    <meta name="twitter:title" content="${htmlEscape(seo.title)}" />`,
    `    <meta name="twitter:description" content="${htmlEscape(seo.description)}" />`,
    `    <meta name="twitter:image" content="${htmlEscape(image)}" />`,
    '    <link rel="icon" type="image/png" href="/favicon.png" />',
    preload.trimEnd(),
    `    <title>${htmlEscape(seo.title)}</title>`,
    structuredData,
    '    <!-- h-lens-head:end -->',
  ].filter(Boolean).join('\n')
}

function composeHtml(template, pathname, markup, content, seo) {
  const withHead = template.replace(
    /\s*<!-- h-lens-head:start -->[\s\S]*?<!-- h-lens-head:end -->/,
    `\n${buildHead(seo, pathname)}`,
  )
  if (withHead === template) throw new Error('SSG head markers were not found in the Vite output.')

  const payload = `<script id="h-lens-content" type="application/json">${serializeJson(content)}</script>`
  const html = withHead.replace(
    /<div id="root"><\/div>/,
    `${payload}\n    <div id="root">${markup}</div>`,
  )
  if (html === withHead) throw new Error('Root mount point was not found in the Vite output.')
  return html
}

const outputFileForRoute = (pathname) => pathname === '/'
  ? resolve(distDirectory, 'index.html')
  : resolve(distDirectory, pathname.slice(1), 'index.html')

async function writeRoute(template, pathname, content, serverModule) {
  const seo = serverModule.getRouteSeo(pathname, content)
  const markup = serverModule.renderRoute(pathname, content)
  const outputFile = outputFileForRoute(pathname)
  await mkdir(dirname(outputFile), { recursive: true })
  await writeFile(outputFile, composeHtml(template, pathname, markup, content, seo), 'utf8')
}

const lastModified = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString()
}

function buildSitemap(routes, content) {
  const projectUpdates = new Map(content.projects.map((project) => [
    `/work/${project.slug}/`,
    lastModified(project.updatedAt),
  ]))
  const urls = [...routes].map((pathname) => {
    const modified = projectUpdates.get(pathname)
    return `  <url><loc>${xmlEscape(new URL(pathname, productionOrigin).href)}</loc>${modified ? `<lastmod>${modified}</lastmod>` : ''}</url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

function buildHtaccess(rules) {
  const goneRules = rules.filter((rule) => rule.action === 'gone').map((rule) =>
    `RewriteRule ^${apachePattern(rule.source)}/?$ - [R=410,L]`,
  )
  const redirects = rules.filter((rule) => rule.action === 'redirect').map((rule) =>
    `RewriteRule ^${apachePattern(rule.source)}/?$ ${productionOrigin}${rule.target} [R=${rule.status},L,NE]`,
  )

  return [
    '# Generated by scripts/build-site.mjs. Do not edit dist/.htaccess manually.',
    'Options -MultiViews',
    'DirectoryIndex index.html',
    'ErrorDocument 404 /404.html',
    'ErrorDocument 410 /410.html',
    '',
    '<IfModule mod_rewrite.c>',
    'RewriteEngine On',
    ...goneRules,
    ...redirects,
    '',
    '# Canonicalize existing directory URLs and hostname/protocol in one hop.',
    'RewriteCond %{REQUEST_URI} !/$',
    'RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} -d',
    'RewriteRule ^(.+)$ https://h-lens.co/$1/ [R=301,L,NE]',
    'RewriteCond %{HTTPS} !=on [OR]',
    'RewriteCond %{HTTP_HOST} !^h-lens\\.co$ [NC]',
    'RewriteRule ^ https://h-lens.co%{REQUEST_URI} [R=301,L,NE]',
    '</IfModule>',
    '',
    '<IfModule mod_headers.c>',
    '  <FilesMatch "\\.(?:css|js|woff2|webp|png|jpg|jpeg|svg|mp4)$">',
    '    Header set Cache-Control "public, max-age=31536000, immutable"',
    '  </FilesMatch>',
    '</IfModule>',
    '',
  ].join('\n')
}

function buildCloudflareHeaders() {
  return [
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/media/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/admin',
    '  Cache-Control: no-store',
    '  X-Robots-Tag: noindex, nofollow, noarchive',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '',
    '/admin/*',
    '  Cache-Control: no-store',
    '  X-Robots-Tag: noindex, nofollow, noarchive',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '',
    'https://1.h-lens.co/*',
    '  X-Robots-Tag: noindex, nofollow, noarchive',
    '',
    'https://:project.pages.dev/*',
    '  X-Robots-Tag: noindex, nofollow, noarchive',
    '',
    'https://:version.:project.pages.dev/*',
    '  X-Robots-Tag: noindex, nofollow, noarchive',
    '',
  ].join('\n')
}

function buildCloudflareRedirects(rules) {
  return rules
    .filter((rule) => rule.action === 'redirect')
    .map((rule) => `${encodeURI(rule.source)} ${productionOrigin}${rule.target} ${rule.status}`)
    .join('\n') + '\n'
}

async function main() {
  await rm(serverDirectory, { recursive: true, force: true })
  await build({ root, mode })
  await build({
    root,
    mode,
    publicDir: false,
    build: {
      ssr: resolve(root, 'src/entry-server.tsx'),
      outDir: serverDirectory,
      emptyOutDir: true,
      minify: false,
    },
  })

  const serverModule = await import(`${pathToFileURL(resolve(serverDirectory, 'entry-server.js')).href}?v=${Date.now()}`)
  const snapshot = await loadCmsSnapshot(serverModule)
  const coreRoutes = ['/', '/about/', '/services/', '/work/', '/contact/', '/careers/']
  const projectRoutes = snapshot.content.projects.map((project) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
      throw new Error(`Invalid canonical project slug: ${project.slug}`)
    }
    return `/work/${project.slug}/`
  })
  const routeList = [...coreRoutes, ...projectRoutes]
  const routes = new Set(routeList)
  if (routes.size !== routeList.length) throw new Error('Duplicate canonical route detected.')

  const matrix = JSON.parse(await readFile(resolve(root, 'seo/url-migration-matrix.json'), 'utf8'))
  const migration = buildMigrationRules(matrix, snapshot.redirects, snapshot.content, routes)
  const template = await readFile(resolve(distDirectory, 'index.html'), 'utf8')

  for (const pathname of routes) {
    await writeRoute(template, pathname, snapshot.content, serverModule)
  }

  const notFoundSeo = serverModule.getRouteSeo('/does-not-exist/', snapshot.content)
  const notFoundMarkup = serverModule.renderRoute('/does-not-exist/', snapshot.content)
  await writeFile(
    resolve(distDirectory, '404.html'),
    composeHtml(template, '/does-not-exist/', notFoundMarkup, snapshot.content, notFoundSeo),
    'utf8',
  )
  const goneSeo = serverModule.getRouteSeo('/_gone_/', snapshot.content)
  const goneMarkup = serverModule.renderRoute('/_gone_/', snapshot.content)
  await writeFile(
    resolve(distDirectory, '410.html'),
    composeHtml(template, '/_gone_/', goneMarkup, snapshot.content, goneSeo),
    'utf8',
  )

  await writeFile(resolve(distDirectory, '.htaccess'), buildHtaccess(migration.rules), 'utf8')
  await writeFile(resolve(distDirectory, '_headers'), buildCloudflareHeaders(), 'utf8')
  await writeFile(resolve(distDirectory, '_redirects'), buildCloudflareRedirects(migration.rules), 'utf8')

  if (previewBuild) {
    await writeFile(resolve(distDirectory, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8')
    await rm(resolve(distDirectory, 'sitemap.xml'), { force: true })
  } else {
    await writeFile(
      resolve(distDirectory, 'robots.txt'),
      'User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://h-lens.co/sitemap.xml\n',
      'utf8',
    )
    await writeFile(resolve(distDirectory, 'sitemap.xml'), buildSitemap(routes, snapshot.content), 'utf8')
  }

  await writeFile(resolve(distDirectory, 'build-manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    target: previewBuild ? 'preview' : 'production',
    cmsSource: snapshot.source,
    routes: [...routes],
    redirectCount: migration.rules.filter((rule) => rule.action === 'redirect').length,
    goneCount: migration.rules.filter((rule) => rule.action === 'gone').length,
    pendingMigrationDecisions: migration.pending.length,
  }, null, 2), 'utf8')

  if (migration.pending.length > 0) {
    console.warn(`SEO migration gate: ${migration.pending.length} URL decision(s) still require Search Console review.`)
  }
  console.log(`Generated ${routes.size} indexable route(s) from ${snapshot.source} CMS content.`)
}

try {
  await main()
} finally {
  await rm(serverDirectory, { recursive: true, force: true })
}
