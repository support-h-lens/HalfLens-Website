# Mobile scroll stability and reversible services — 2026-09-09

## Confirmed findings

The previous build (`42e081c`) performed three `window.scrollTo` calls when the
camera startup/recovery became ready at document position 2400:

```text
scrollTo(0, 0)     from y=2400
scrollTo(0, 0)     from y=0
scrollTo(0, 2400)  from y=0
```

This was reproduced using Chrome DevTools with touch emulation and 4x CPU
throttling. The call stack led to GSAP's global refresh. Its installed source
explicitly zeroes scrollers and subsequently restores their recorded position.
The readiness effect requested this global refresh even though the video
loading does not change page geometry. The refresh can interrupt native
momentum; desktop emulation does not reproduce every physical iOS consequence.

The previous mobile service entrance was an IntersectionObserver-triggered,
one-time 560 ms animation. A `seen` set prevented replay on returning, and a
fast arrival could skip the entrance entirely. This explains why services
could appear stationary rather than responding to scrolling.

## Changes

- Removed the video-readiness full-page refresh. Creating its ScrollTrigger
  already measures that timeline.
- On touch/narrow layouts, readiness refreshes measure individual triggers
  without the global zero/restore cycle. The current touch layout has **no
  pinned ScrollTriggers**; preserve that assumption if adding new sections.
- Disabled the global automatic refresh events on touch. Fonts/load/content
  readiness still use the batched helper. Real width changes get a debounced
  measurement; height-only toolbar/keyboard changes and pinch zoom do not.
- Desktop retains automatic refreshes, using the safe refresh option for
  readiness work. Wheel smoothing and anchor behavior are unchanged.
- Services now use native CSS view timelines where supported: the whole card
  rises 48 px and gains opacity while its internal rail extends. Movement is
  tied to scroll position, reversible, and settles for reading once entered.
- Older browsers use a passive scroll listener and coalesced animation frame,
  with cached untransformed layout measurements. No document scroll writes,
  animation catch-up timer, or updates to already-settled/offscreen cards.
- Keyboard focus settles its card. Reduced motion and no-JavaScript rendering
  remain readable/static. Cleanup removes observers, listeners, queued frames,
  timers, data attributes and inline motion styles.

The original camera video assets, R2 URLs, page content, brand colors and
desktop service choreography have not changed.

## Measurements and verification

The web-performance workflow was used to trace actual scroll writes and choose
compositor-friendly card motion, rather than changing unrelated assets.

| Measurement | Result | Interpretation |
| --- | --- | --- |
| Initial local LCP, 4x CPU | 777 ms | Good lab load result; not a field metric |
| Initial local CLS | 0.00 | No load-time layout shift in this trace |
| INP | Not measured | No physical-device field data |
| Recovery-induced scroll writes | 3 before, 0 after | Reproduced regression eliminated |
| Chromium 393x852 scroll sweep, 4x CPU | p95 rAF 16.8 ms, 201 presentations, zero repeated seeks/long tasks | Functional and timing checks passed |
| Windows WebKit 393x852 sweep | p95 rAF 291 ms, zero paused-video frame callbacks | Functional checks passed; timing is poor, not Safari smoothness certification |

No changes were made for trace suggestions with zero estimated LCP/FCP savings.
The network inspection confirmed native HTTP 206 video range loading. An
accessibility snapshot confirmed the page's headings, links and form labels;
this was not a complete accessibility audit.

Passed against the production build:

```text
npm run verify
node scripts/test-animation-readiness.mjs
node scripts/test-cinematic-video-startup.mjs
node scripts/test-cinematic-frame-scheduler.mjs
node scripts/check-mobile-scroll-stability.mjs
node scripts/check-service-entrances.mjs
node scripts/check-service-rails.mjs
node scripts/check-mobile-experience.mjs
HLENS_BENCH_URL=http://127.0.0.1:5189 node scripts/check-controlled-scroll.mjs
HLENS_BENCH_URL=http://127.0.0.1:5189 node scripts/check-editorial-motion.mjs
HLENS_STARTUP_SCENARIOS=native,cached-first-frame,restored-page node scripts/check-mobile-video-startup.mjs
```

The stability regression instruments scroll writes, simulates toolbar/keyboard
`innerHeight` changes independently of the stable layout viewport, exercises
camera recovery and small reversals across the page, and dispatches Chromium
native touch flings. Service tests cover native and forced-fallback paths in
Chromium and WebKit, reversal, stationary timing, contained text/rails, focus
and live reduced motion. The layout sweep covers six sizes in each engine.

The build retains the pre-existing warning for 36 SEO migration decisions.

## Physical-phone handoff

Local preview: `http://172.20.10.5:5190/` on the same network as this computer.
The checks above were completed locally before publishing. For a production
test, confirm the new deployment is serving this build before comparing;
a successful push alone does not verify deployment completion.

On an actual iPhone and Android device, test slow forward/reverse gestures,
flings followed by a small reversal, expanding/collapsing the browser toolbar,
returning from another app, and navigating into/out of services. The cards
should retrace the same motion, and camera recovery must not reset the page.
Keep reduced-motion and Low Power Mode cases separate. Browser emulation here
is not proof of physical-phone performance.

References: [GSAP global refresh lifecycle](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.refresh()/),
[individual trigger refresh](https://gsap.com/docs/v3/Plugins/ScrollTrigger/refresh()/),
[WebKit's scroll-driven animation guide](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/).
