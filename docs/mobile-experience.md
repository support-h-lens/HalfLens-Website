# Mobile layout and motion repair — 2026-09-09

## Confirmed problems and changes

- At a 393px viewport, the featured-project grid was creating an approximately
  850px-wide implicit track. Its ancestors concealed the overflow, cropping the
  picture and Arabic metadata. The project list now uses a zero-minimum track;
  cards cannot use their contents' intrinsic width to enlarge that track.
- Mobile projects inherited a `48svh` media minimum and oversized exhibition
  typography. Touch layouts through 980px and all layouts through 720px now use
  the configured film aspect ratio, without that height minimum. Posters use
  `contain`; details use natural height, 28–36px headings, and stacked, wrapping
  label/value rows. Long client names are visible in full.
- Touch scrolling formerly ran independent title, label, geometry and progress
  animations, plus project clip-path reveals and full-section scale animations.
  Touch content is now styled directly in CSS, visible before hydration, and
  moves with native document scrolling. This avoids constructing/destroying
  reveals during flings and avoids unnecessary GSAP setup reads/writes.
- Fine-pointer desktop animation remains enabled. The camera still follows the
  full chapter timeline in both directions. The final-frame hold and diagonal
  works-sheet reveal remain intact. Touch hero parallax and video color filters
  were removed; the stage's existing contrast gradient is retained.
- Added `ignoreMobileResize` so toolbar-sized vertical resizes on touch-only
  devices do not rebuild scroll timelines. Rotation/width changes still refresh.
  This follows [GSAP's documented mobile resize behavior](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config()/).
- A completed video seek can report an adjacent timestamp in WebKit. The frame
  scheduler now accepts a completed request for the exact current target within
  one frame, preventing endless identical requests. It still coalesces to the
  newest target, never interrupts a pending decode, and immediately handles a
  reversal. Presentation and decoding remain distinct diagnostic signals.

The original videos, R2 objects and their URLs have not changed. Native touch,
pinch/zoom, keyboard input, modal locks and reduced-motion behavior are preserved.

## Verification and limits

Chrome DevTools inspection reproduced the oversized track and cropped image.
Throttled load traces recorded CLS 0.00; no usable LCP/INP results were captured,
and no field/Core Web Vitals claim is made. Load-time forced layouts still appear
in the development trace; these measurements are not production load scores.

The production-build mobile checks cover Chromium and WebKit at 320×640,
393×852, 430×932, 768×1024, 852×393, and desktop 1440×1000. They check actual text
rectangles, media ratios, loaded posters, rotation, reduced motion, native
browser-generated touch gestures, and forward/reverse video targeting. Chromium
also checks presented video frames under 4× CPU slowdown, not only `currentTime`.

The initial Chromium baseline had a 50ms p95 animation-frame interval; subsequent
repaired runs ranged roughly 17–34ms, with no long tasks in those film sweeps.
These are variable local lab measurements, not a device-performance guarantee.
Desktop WebKit passed functional checks but had poor and highly variable frame
timings, and did not reliably emit paused-video presentation callbacks. Additional
paint/decode isolation experiments did not establish a single remaining cause.
**Physical iPhone Safari smoothness is still unverified.** Desktop responsive
emulation and Windows WebKit must not be presented as real-iPhone testing.

Commands used:

```text
npm run verify
node scripts/test-cinematic-frame-scheduler.mjs
node scripts/test-animation-readiness.mjs
node scripts/check-mobile-experience.mjs
node scripts/check-mobile-video-startup.mjs
node scripts/check-controlled-scroll.mjs
node scripts/check-service-rails.mjs
node scripts/check-editorial-motion.mjs
node scripts/check-hero-loading.mjs
```

The build/SEO checks pass; the existing 36 pending SEO migration decisions remain
unrelated. Screenshots and JSON diagnostics are ignored build artifacts under
`artifacts/mobile-experience/`. Service rail tests now wait for the settled state
instead of assuming that every WebKit frame will paint within a fixed 90ms sleep.

## Phone retest

A production-build preview is running at `http://localhost:5190/`, exposed to the
current private network at `http://172.20.10.5:5190/`. The computer must stay running
and the phone must be on the same network. Windows Firewall/network isolation can
prevent another device reaching it; firewall configuration was not changed.

On the physical iPhone, test an initial load and a repeat load, gentle scrolling,
fast flings, immediate reversal, expanded/collapsed Safari bars, rotation, menu
open/close and navigation. Check the final video frame before the works reveal,
all four project posters and the long SIDF metadata. Test reduced motion and
Low Power Mode separately; use the existing explicit camera-start button if the
browser refuses muted startup. Record model/iOS version and a screen recording if
motion still stutters. A merge/push does not certify deployment completion or
physical-device smoothness; both must be confirmed separately.
