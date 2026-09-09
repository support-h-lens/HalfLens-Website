# H-Lens SEO migration runbook

This repository now builds the public website as independent static HTML pages. It does not use an SPA fallback for public routes. The canonical production origin is `https://h-lens.co`, and all canonical directory routes end in `/`.

## What the build enforces

- `npm run build` fetches published Supabase content when build credentials are present, prerenders every public route, and generates `sitemap.xml`, `robots.txt`, `404.html`, `410.html`, `.htaccess`, `_headers`, and `_redirects`.
- CMS fetch failures fall back to repository content for local development. Production publishing sets `H_LENS_CMS_REQUIRED=true`, so an unavailable or empty CMS fails the release.
- `website_redirects` is loaded at build time and merged over the versioned URL migration matrix. Duplicate sources are resolved in favor of CMS records.
- Redirect targets must be generated canonical 200 pages. Loops, chains, unsupported status codes, malformed slugs, duplicate routes, and missing targets fail the build.
- `H_LENS_STRICT_MIGRATION=true` fails while any matrix entry is still `review`. This is the launch gate that prevents unsafe guesses before Search Console evidence is imported.
- `npm run test:seo` checks raw HTML metadata, one H1, canonical URLs, JSON-LD, prerendered body content, sitemap membership, 404/410 files, Apache rules, and preview noindex headers.

## Search Console and URL inventory gate

1. Export the last 16 months of Performance Pages, Queries, Countries, Devices, Indexing, Links, Core Web Vitals, and submitted sitemaps.
2. Fill [search-console-baseline.csv](../seo/search-console-baseline.csv) with clicks, impressions, average position, linking domains, and the approved decision for every old URL.
3. Run `npm run seo:inventory` while WordPress is still live. It compares every Yoast sitemap URL with [url-migration-matrix.json](../seo/url-migration-matrix.json).
4. Resolve every `review` entry using the approved policy: create equivalent content and a direct 301, select a genuinely equivalent page, or mark the URL `gone` for 410.
5. Run a strict release locally: set `H_LENS_STRICT_MIGRATION=true` and run `npm run verify`.

Do not change a published project slug without adding the former slug to `website_redirects`. The build automatically preserves the original `/work/project-01/` through `/work/project-05/` CMS slugs.

## Supabase setup

1. Apply `supabase/migrations/20260827000100_website_static_publishing.sql`.
2. Deploy the `publish-website` Edge Function with JWT verification enabled.
3. Set Edge Function secrets from `supabase/functions/.env.example`. `GITHUB_DISPATCH_TOKEN` should be a fine-grained token limited to this repository and the permission needed to trigger Actions.
4. Confirm only active `owner` or `editor` rows in `website_cms_members` can request a publish. The browser cannot insert or update `website_deployments`; the Edge Function and GitHub use server-side credentials.

## GitHub production environment

Create a protected `production` environment and add:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HOSTINGER_SSH_HOST`
- `HOSTINGER_SSH_PORT`
- `HOSTINGER_SSH_USER`
- `HOSTINGER_SSH_PRIVATE_KEY`
- `HOSTINGER_KNOWN_HOSTS` (trusted host-key entry; do not collect it opportunistically during deployment)
- `HOSTINGER_RELEASES_DIR` (a dedicated absolute release directory)
- `HOSTINGER_PRODUCTION_LINK` (the absolute symlink used as the Hostinger document root)

Set the optional environment variable `JOB_APPLICATIONS_API_URL` to the recruitment endpoint. The workflow builds with locked dependencies, verifies the release, uploads to a unique release directory, validates required files, and atomically changes the production symlink. It refuses to replace a normal directory, which protects the existing WordPress installation during initial setup.

For first cutover, back up WordPress files, database, uploads, plugins/themes, `.htaccess`, and sitemaps. Move WordPress to a private dated backup directory, configure the document root through `HOSTINGER_PRODUCTION_LINK`, and retain WordPress for at least 90 days. Rollback is an atomic symlink change to the previous release or the preserved WordPress directory; do not remove the generated redirects.

## Cloudflare Pages preview

Use build command `npm run build` and output directory `dist`. Cloudflare injects `CF_PAGES=1`, so the build automatically:

- places `noindex,nofollow,noarchive` in every HTML page;
- emits a disallow-all `robots.txt` and no sitemap;
- emits `_headers` rules for `1.h-lens.co`, project `pages.dev`, versioned `pages.dev`, and `/admin`.

Canonical tags still point to the corresponding production URL. Keep `1.h-lens.co` and `*.pages.dev` out of public links. Cloudflare Access can be added later as a second protection layer.

## Launch acceptance

- Freeze WordPress edits and create the final backup.
- Confirm the URL matrix has zero `review` entries and `npm run seo:inventory` reports zero missing URLs.
- Run `npm run verify` with production CMS credentials and strict gates.
- Crawl the uploaded release before activation. Check raw HTML, forms, video, admin auth, redirects, 404, 410, `robots.txt`, and `sitemap.xml`.
- Check `http://www.h-lens.co`, `http://h-lens.co`, and `https://www.h-lens.co` each reach `https://h-lens.co` in one hop. Old mapped paths must reach their final page in one hop.
- Confirm production has no `noindex`, submit the new sitemap, inspect the home page and highest-value pages, and request indexing only for those primary pages.

## Post-launch monitoring

Review Search Console, server logs, form submissions, 404/5xx volume, sitemap state, chosen canonicals, indexed pages, and Core Web Vitals daily for 14 days; twice weekly through week 6; then weekly through day 90. Compare organic clicks, impressions, position, landing pages, and branded/non-branded queries to the saved baseline. Investigate a 20–30% organic decline, important deindexing, redirect loops, sitemap failure, or a different Google-selected canonical immediately.
