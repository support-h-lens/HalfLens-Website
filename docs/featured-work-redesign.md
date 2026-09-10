# Featured-work redesign — 2026-09-10

## Design

- Replace the four cycling desktop layouts with a single RTL film/credits row.
  The third project no longer becomes a giant full-width exhibition. CMS order,
  project content, and destination URLs remain intact.
- On phones/tablets, put the film first, then compact credits: category/index,
  title, client and year together, role, and a clear project-details link.
  Remove repeated labels, focus-frame decorations and oversized watermark numbers.
- Keep the existing navy/ice identity. Use quiet separators, readable Arabic
  typography and a circular arrow. The first mobile pass reduced the second
  project's details from 516px to 244px; final readability adjustments add a few pixels.
- Make thumbnails actionable with a direct YouTube watch link (new tab), separate
  from the internal case-study link. Desktop hover previews remain opt-in to fine
  pointers without reduced motion. No players load from touch scrolling.
- Respect authored film aspect ratios. Poster artwork fills the authored frame;
  actual video players are not scaled/cropped. Projects with only an image use it;
  missing-media projects get a branded text fallback, not invented footage.
- Keep the existing hero, service motion, diagonal transition and browser-toolbar
  stability fixes. New section sizing uses content/width, never viewport height.

## Checks

- `npm run verify`: lint, TypeScript, production/SSR build, SEO and existing mocked
  publishing tests passed. No publication or CMS writes occur in these tests.
- `node scripts/check-featured-work.mjs`: 22 viewport/browser combinations passed
  (Chromium/WebKit 320–2560px; Firefox phone/desktop), all five projects, layout
  consistency, Arabic containment, media ratios, compact credits, keyboard routing.
- `HLENS_WORK_INTERACTIONS_ONLY=1 node scripts/check-featured-work.mjs`: all three
  engines passed reduced-motion, hover start/stop, new-tab keyboard watch links,
  long CMS copy and 200% text at 320px. Player/watch network responses were mocked:
  these assertions verify wiring, not third-party playback availability.
  A first WebKit stress run started before dev-mode React rendering; waiting for
  the actual project element fixed the test race, without changing app behavior.
- `node scripts/check-browser-toolbar-layout.mjs`: Chromium/WebKit both retained
  the exact reading position through height-only viewport changes; rotation passed.
- `HLENS_BENCH_URL=http://127.0.0.1:5189/ node scripts/check-editorial-motion.mjs`:
  seven profiles passed film ending, diagonal reveal, reverse scrubbing, footer
  focus, reduced motion and production SSR without JavaScript.
- Screenshots inspected in `artifacts/featured-work/`, including small-phone
  fallback content. Chrome DevTools' shared profile was occupied; isolated
  Playwright browsers were used without interrupting the existing browser.

These are local checks, not a physical-iPhone certification.
Approved release scope: publish this redesign through `main` to `https://1.h-lens.co/`.
The existing WordPress production site and unrelated prelaunch work are excluded.
Phone preview: `http://192.168.112.8:5190/#portfolio` on the same Wi-Fi.
The separate dirty admin/publishing/SEO files and `PortfolioRise.tsx` contrast
change were preserved, not edited or staged by this redesign.
