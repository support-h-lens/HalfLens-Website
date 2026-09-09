# Half Lens editorial motion pass

Reference inspected in the browser: [Fuel](https://fuel.framer.website/), September 8, 2026. The reference's visual ideas were adapted to Half Lens's Arabic content, navy/ice/mint palette and existing media; no Fuel artwork or implementation was imported.

## What changed

- Hero → services → works: the full video scrubs through the hero and service chapters before the light works sheet sweeps over its final frame with the approved diagonal edge. The homepage story section was removed following feedback; the independent `/about/` page remains. The video assets, source-selection logic and exact frame scheduler are retained.
- Transition timing: video progress uses `.cinematic-story__chapters`, excluding a final-frame hold and overlap tail. A 100svh overlap keeps the film stationary under the works sheet. Only the small edge skews, not the whole portfolio; the previous inset/rounded panel controller is removed. Reduced motion removes the tail, overlap, and diagonal effect.
- Services: retained the chapter masks and film-backed animations, tightened their spacing, adjusted Arabic line height and added service-directory links.
- Work: selected projects remain on the homepage, with a “شاهد جميع الأعمال” link. The liked numbered project index now lives exclusively at `/work/`, replacing that route's older card grid. Thumbnail reveals respond to hover and keyboard focus, with always-visible touch thumbnails and image/HL fallbacks. Five service-category filter buttons have counts, pressed states, live result announcements, an All reset, and an empty state. Rows open the existing project/video detail pages.
- Categories: the existing CMS Services field takes precedence; legacy projects are classified from category/role/format text, never IDs or titles. A project can appear in multiple categories. Unknown projects remain in All; no projects are fabricated for an empty category. Editors can specify the site's service labels in the existing Services field without a database migration. See `src/lib/workCategories.ts` for the transparent legacy matching rules.
- Clients: aligned the heading with the editorial divider system; preserved the existing client logos and ticker.
- Accessibility: repaired the existing missing heading-ID references on the portfolio and clients regions, in addition to the new keyboard/focus safeguards.
- Footer: brand navy closing sheet with off-white text, diagonal entrance, contained parallax and a contact invitation. The pale mint background and oversized HALF / LENS wordmark were removed following feedback. The smaller original logo, navigation, social and service/value content remain. Keyboard focus immediately removes footer movement.
- Navigation: retained the AiLens-derived document scroll controller and made the scrolled header opaque for readability over large headings.
- Setup: coalesced the animated sections' load/font readiness requests into one ScrollTrigger refresh per frame. Independent owners can unsubscribe without cancelling another owner's refresh.

`src/styles/editorial-motion.css` is loaded after the existing brand stylesheet. New effects do not introduce a scrolling library or replace actual document scrolling.

## Motion safeguards

The `OurStory` component has been deleted; there is no intermediate story sheet on the homepage. The separate `/about/` page is preserved. `LensField` is retained for reuse but not imported by the homepage. No wave canvas runs on the homepage. Filtering the separate work index refreshes footer scroll measurements; it does not install another scroll controller. Reduced motion disables the brief result fade.

Follow-up video-to-works correction: service labels fade out before the film's final frame, leaving a clean ending before the works sheet enters. The final-frame hold is now `clamp(200px, 28svh, 360px)` of document scroll, plus the stationary-video overlap. The works heading has a shorter top inset and completes its entrance earlier, so the approved diagonal reveal brings in “الصورة هي الدليل” instead of a large empty panel. Reverse scrolling restores the labels; reduced motion leaves all text visible, and keyboard focus in services overrides the label fade. No timed scroll lock or extra intermediate section was introduced.

Service-frame line correction: each `.service-item__rail` is now a child of its decorative rectangle, not of the independently sized text column. It spans the inside border, inherits the frame's polygon clip and movement, and draws from the right. The text layout keeps its original spacing. `scripts/check-service-rails.mjs` verifies all five services during entrance, settled display, exit, and reduced motion on desktop/phone/landscape in Chromium, Firefox, and WebKit. The separate “02 / SERVICES — 05 CHAPTERS” marker retains its existing sticky behavior; the user asked why it stays, not to remove that behavior.

Text-containment follow-up: `.service-item__frame` now owns BOTH the background and the padded content. Its height comes from the text rather than a separately sized decorative shape. The background fills the same rectangular bounds (`clip-path: inset(0)`); it fades but no longer slides/scales independently of the text. The existing whole-card movement, text masks, and right-to-left rail reveal remain. Alternating alignment is preserved on desktop; mobile cards use the full available container width with 24px padding. Headers can wrap, Arabic titles scale down on narrow screens, and progress tracks cannot impose an overflowing minimum width. The rail regression now checks the number, English label, Arabic heading, description, CTA and progress indicator against the frame edges throughout the animation and verifies rendered text bounds with reduced motion.

GSAP media contexts disable the new scroll transforms for reduced motion and clean up on unmount. The footer uses a clipped, normally flowing container, not a fixed footer that could hide links. Touch, zoom, nested controls, keyboard scroll and modal locks remain owned by the existing native-preserving controller.

## Verification

Passed locally:

```text
npm run lint
npm run build
npm run test:seo
node scripts/test-animation-readiness.mjs
node scripts/test-controlled-scroll-timing.mjs
node scripts/test-cinematic-frame-scheduler.mjs
node scripts/check-controlled-scroll.mjs
node scripts/check-editorial-motion.mjs
node scripts/check-editorial-browsers.mjs
node scripts/check-work-archive.mjs
node scripts/check-hero-loading.mjs
node scripts/check-hero-replacement.mjs
```

Chrome/Chromium screenshots and interaction checks cover 320×640, 390×844, 768×1024, 844×390, 1280×720, 1440×1000 and 1920×1080. Checks include completion of the film before the works edge appears, a stationary film during the reveal, reverse scrubbing, no horizontal overflow, reduced-motion toggles, footer focus, and static server-rendered content without JavaScript. The archive suite covers all five category results, CMS labels, Arabic normalization, empty/reset states, keyboard/hover previews, project links, and mobile layouts in Chromium, Firefox and WebKit. WebKit on Windows is not a substitute for testing a physical iPhone/Safari installation.

The scrolling regression suite covers large wheel deltas, trackpad-sized input, line/page units, immediate direction changes, keyboard input, nested scroll containers, textarea input, zoom and horizontal gestures, locks/dialogs, history/hash navigation, header offsets, native mobile swipes and the 721px threshold. The video suite covers desktop/portrait selection, rotations, reduced motion, exact forward/reverse frame targets, missing frame callbacks, poster fallback and R2 loading/Save Data behavior.

One Windows WebKit homepage run reached the test's four-second anchor deadline while other browser inspection was active. An isolated rerun passed desktop and mobile checks without changing the controller or loosening the assertion. Treat browser-engine emulation as regression coverage, not physical-device performance certification.

Chrome DevTools was also used for screenshots and visual inspection. A trace of the earlier editorial layout (before this section removal/archive move) measured LCP **1,620ms** and CLS **0.00**, with local site assets and actual R2 video, without network/CPU throttling. Those historical numbers are not measurements of the revised layout or a production/real-user guarantee. No animation dependency was added.

Screenshots and machine-readable reports are generated under ignored `artifacts/editorial-motion/` and `artifacts/work-archive/`. The build still reports the existing 36 SEO migration decisions requiring Search Console review; its 11-route verification passes.

## Local previews

- Production build, real R2 media: http://127.0.0.1:5189/
- Full work index and filters: http://127.0.0.1:5189/work/
- Development server, local copies of the same media: http://127.0.0.1:5188/

No deployment, git push or Cloudflare changes were performed. The AiLens reference project remains read-only.
