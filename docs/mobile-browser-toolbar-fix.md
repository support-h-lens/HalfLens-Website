# Browser toolbar layout fix — 2026-09-10

## Reproduced cause

The supplied screenshots show browser-owned translation/navigation controls.
The earlier scroll fix stopped explicit scroll-position resets, but its toolbar
test changed only `innerHeight`. It did not resize the CSS layout viewport.

In an isolated Chromium reproduction, changing the actual viewport height
changed `vh`/`svh`-based spacing across the long cinematic section. Document
scroll position stayed at 8152 px while the fourth project's heading moved:

| Viewport height | Chapter height | Project top in document | Project top on screen |
| --- | --- | --- | --- |
| 700 px, initial | 4720 px | 8272 px | 119.8 px |
| 820 px, before fix | 5521 px | 9111 px | 959.4 px |
| 540 px, before fix | 3999 px | 7550 px | -601.8 px |
| Any tested height, after fix | 4720 px | 8272 px | 119.8 px |

WebKit's post-fix run also retained its original reading position exactly.
The regression covers heights 820, 610, 760, 540 and 700 at an unchanged 393 px
width, native/fallback service motion, a keyboard-sized viewport, and rotation.

This reproduces the failure mechanism, not the actual hardware/browser build
in the user's screenshot. WebKit's [viewport-unit issue discussion](https://bugs.webkit.org/show_bug.cgi?id=279998)
documents how third-party browser viewport configuration can affect small and
large viewport units. The [CSS viewport-unit definitions](https://drafts.csswg.org/css-values-4/#viewport-variants)
also distinguish browser chrome changes from an actual viewport resize.

## Implementation

- Before React hydration, sample the existing `100vh` and `100svh` values on
  touch/narrow devices and retain them as pixel-based CSS layout units.
- Route viewport-dependent section heights, padding and overlaps through these
  units. Desktop and no-JavaScript rendering keep the original CSS-unit fallbacks.
- Ignore height-only changes, including browser toolbars, translation bars and
  the keyboard. Remeasure for real width changes/rotation. Pinch zoom is not
  interpreted as a device-size change.
- Keep the native service view timeline's effective viewport stable as well.
  Without this, a stationary card could change its animation progress even
  after its document geometry was fixed. The older-browser fallback already
  measures the stable sticky-stage height.
- Use the same stable viewport height for the camera timeline endpoint/fade.
  Source and poster orientation follow the stable layout orientation, not a
  temporary aspect-ratio change from the keyboard/browser bars.
- Leave native document scrolling, browser controls, focus, menus, zoom, and
  keyboard behavior in charge. No scroll-offset compensation or browser API
  overrides were added. All installed listeners/timers have a cleanup path;
  the viewport service belongs to the document lifetime and supports HMR cleanup.

The existing dirty admin/publishing/SEO files and the separate PortfolioRise
contrast change were left intact. This task does not publish or deploy them.

## Verification

The web-performance skill guided the stronger layout-resize regression.
Chrome DevTools MCP could not attach because its shared browser profile was
already occupied. No existing browser was closed. Isolated Playwright Chromium
and WebKit were used instead. No new LCP/INP/CLS trace claim is made; the key
measurement here is the repeated reading-position displacement above.

Passed:

```text
npm run verify
node scripts/test-stable-viewport.mjs
node scripts/check-browser-toolbar-layout.mjs
HLENS_TOOLBAR_FALLBACK=1 node scripts/check-browser-toolbar-layout.mjs
node scripts/check-service-entrances.mjs
node scripts/check-mobile-scroll-stability.mjs
node scripts/check-service-rails.mjs
node scripts/check-controlled-scroll.mjs
node scripts/check-editorial-motion.mjs
node scripts/check-mobile-experience.mjs
HLENS_STARTUP_SCENARIOS=native,cached-first-frame,slow-start,restored-page node scripts/check-mobile-video-startup.mjs
```

Browser tests used `HLENS_BENCH_URL=http://127.0.0.1:5200/` (isolated Vite dev
server) or `http://127.0.0.1:5189/` (production preview). `npm run verify` also
ran the workspace's existing 78 migration and 16 publishing tests; no production
publishing action was performed by those mocked tests.

The 12-profile mobile experience sweep passed its functional assertions.
Chromium at 393x852/4x CPU recorded p95 rAF 16.8 ms, 161 presented frames and
no repeated seeks or long tasks. Windows WebKit recorded p95 rAF 558 ms and
no paused-video presentation callbacks: its lab timing remains poor, so this
report does **not** certify real-iPhone animation performance.
The camera scenarios passed across Chromium/WebKit runs. One WebKit cached
startup timestamp assertion missed its tolerance in the combined run; the
cached/slow-start/restored-page targeted rerun passed without changing the
decoder or weakening the assertion.

Physical-phone validation remains necessary. The browser's own visible area
will still change when controls appear; the fix prevents the website from
resizing the document underneath the user's reading position.

Phone preview on the same network: `http://192.168.112.8:5190/`.
Release scope: publish only this fix through `main` to `https://1.h-lens.co/`.
The unrelated prelaunch work and existing WordPress production site are excluded.
Confirm the deployed bundle contains `hlens:layout-viewport-change` before
retesting browser-toolbar transitions on the physical phone.
