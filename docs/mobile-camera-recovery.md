# Camera startup and service entrances — 2026-09-09

## Findings and scope

The live portrait MP4 returned HTTP 206 with byte ranges, and Chrome DevTools
presented different frames while scrolling forward/back. Its encoded format is
H.264 High, 720×1280, 48 fps, without B frames (7,013,542 bytes). The phone report
is not dismissed on that basis: desktop responsive mode does not reproduce
physical Safari's playback policy, decoder lifecycle or thermal limits.

The previous startup code could accept a cached `readyState=4` frame without
ever starting the touch playback pipeline. A regression test waiting for that
cached frame before scrolling failed against the previous implementation.
Additionally, a pending `play()` promise prevented subsequent gesture retries;
only explicit `NotAllowedError` rejections exposed a recovery button, and the
button was inside the fading hero, unavailable further down the film.

These are confirmed code-path gaps, not proof of the precise state of the user's
iPhone. The device/browser/OS and power-mode question remains unanswered.

## Changes

- Separate startup from the paused scroll scheduler. Touch startup now requires
  the media clock to actually advance, not just a cached frame or fulfilled
  promise. The silent warm-up then pauses before the scheduler takes ownership.
- Keep the video visible during warm-up. All startup/handoff waits are bounded
  (6 seconds); a stalled scroll seek offers recovery after 5 seconds without
  repeatedly restarting a real network/decode request.
- Retry inside a genuine tap/click handler. The small recovery button remains
  hit-testable through service chapters, outside the hero fade and aria-hidden
  stage. Explicit recovery can reload an errored/stuck resource; ordinary
  scrolling does not. Restore playback after app return/BFCache restoration
  while preserving the scroll timeline.
- Respect reduced motion, source/orientation changes and cleanup. No new video
  encodings, R2 uploads, external libraries or live configuration changes.
- Mobile service cards lift/fade as complete units once (560 ms); their contained
  accent line draws from right to left (650 ms). IntersectionObserver and two
  temporary compositor animations replace continuous per-text scroll work on
  touch. Base/SSR content stays visible. Fast arrivals, reverse scrolling,
  keyboard focus and reduced-motion changes do not leave content hidden.

This uses the [WebKit gesture/inline media policy](https://webkit.org/blog/6784/new-video-policies-for-ios/)
and explicitly handles [play promise failures/delays](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play).

## Checks and remaining device verification

New deterministic tests cover cached startup, observed clock advancement,
pending promises, a stalled initial seek, media errors, app return, stale
callbacks and cleanup. Browser scenarios cover native/cached/metadata-only
startup, slow loading with rotation, gesture-only startup, a never-settling or
non-advancing play attempt, BFCache/app return and reduced motion. WebKit
screenshots compare actual video pixels at two timeline positions; timestamps
alone are not used as visual proof. Its final-sample timestamp can differ by
under two frame intervals, so only the endpoint assertion permits that tolerance.

Service tests verify whole-card/rail animation, no repeated entrance on reversal,
focus and reduced-motion cancellation, text/border containment and the absence
of the removed outer rectangle. Existing film-end, sheet-reveal, layout and
scroll-input checks remain in place.

Chrome DevTools' 4× CPU load traces recorded LCP 905 ms / CLS 0.00 for the live
baseline and LCP 828 ms / CLS 0.00 for the local build. These use different
network paths and are not evidence of a load-speed improvement; INP/field data
was not available. The first post-change Chromium scroll sweep recorded 209
presented frames, zero repeat seeks, p95 rAF 16.7 ms and no long tasks.
Windows WebKit performance and emulation are **not physical iPhone validation**.
The completed layout sweep passed all six sizes in both engines. Its final
393×852 run recorded Chromium p95 rAF 16.7 ms (211 presented frames) and Windows
WebKit p95 rAF 223 ms (no paused-video presentation callbacks). WebKit passed
functional assertions but its lab frame timing remains poor; this change is not
a claim that Safari smoothness is certified.

Completed checks:

```text
npm run verify
node scripts/test-cinematic-video-startup.mjs
node scripts/test-cinematic-frame-scheduler.mjs
node scripts/test-animation-readiness.mjs
node scripts/check-mobile-video-startup.mjs  # all scenarios across engine/scenario runs
node scripts/check-service-entrances.mjs
node scripts/check-service-rails.mjs
node scripts/check-mobile-experience.mjs
HLENS_BENCH_URL=http://127.0.0.1:5189 node scripts/check-editorial-motion.mjs
HLENS_BENCH_URL=http://127.0.0.1:5189 node scripts/check-controlled-scroll.mjs
```

The build retains the existing 36 pending SEO migration decisions; these are
unrelated to the camera. These checks were completed locally before publishing.

Use `http://172.20.10.5:5190/` on the same network as the computer. Test cold and
repeat loads, gentle scroll, flings and reversal, Safari toolbar changes,
rotation, app switching, and Low Power Mode separately. If the browser blocks
startup, tap **تشغيل حركة الكاميرا** once. Reduced motion intentionally disables
the scroll film. After publishing, confirm the production deployment is serving
the new build before testing. A push alone does not verify deployment completion
or physical-phone behavior.
