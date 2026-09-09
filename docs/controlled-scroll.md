# AiLens-style scrolling

Local development: http://127.0.0.1:5188/
Local production preview (actual R2 video URLs): http://127.0.0.1:5189/
Neither server deploys changes to the live website.

## Reference and integration

Read-only reference:
`C:\Users\amroa\h-lens-cinematic\src\components\ControlledScroll.tsx`
SHA-256: `3A8688E65D042D89FC25C31F36CF1E784F3F72BF916F6FD8037B2B363E70A176`.

The existing Half Lens wheel-only component was unmounted. It now mounts once in
the public App shell and delegates setup/cleanup to `src/lib/controlledScroll.ts`.
The separate admin entry is unaffected. There is no additional scrolling library,
transformed page wrapper or GSAP scroller proxy. Existing section animations follow
real document scrolling as before. CSS smooth scrolling on the root is disabled to
avoid competing easing; the controller's writes also explicitly use `instant`.

## Behavior

- Wheel cap: 132px/event; accumulated target lead: 680px; speed: 2100px/second.
- Follow: `1 - Math.pow(1 - 0.22, elapsedSeconds * 60)`; elapsed capped at 0.05s;
  settle tolerance: 1.5px. Tiny steps account for integer-rounded browser positions.
- Wheel smoothing requires width >=721px, hover and a fine pointer. Reversals clear
  old momentum. Line/page units normalize to 16px/line and 85% viewport/page.
- Touch, zoom, horizontal gestures, keyboard input, inputs, native widgets and
  nested scroll containers retain native behavior. Nested overscroll containment
  is respected at the edges. Modal/body/root scroll locks stop movement.
- Same-document links use `clamp(680 + abs(distance) * 0.12, 680, 1250)` ms and
  quartic ease-out `1 - (1 - progress)^4`. Other routes, downloads, modified clicks,
  new-tab links and links within native surfaces are not intercepted.
- Navigation uses untransformed layout offsets so GSAP reveal transforms don't
  displace the destination. It accounts for the fixed header, root scroll padding
  and target scroll margin, then rechecks the destination at completion.
- Hash/history state are retained. Keyboard links and the skip link move focus;
  temporary tabindex is removed on blur/unmount without altering existing values.
- Any wheel, pointer/touch or keyboard input interrupts navigation. Resize,
  preference changes, page hiding and browser history navigation cancel motion.
- Mobile menu navigation waits for Navigation's own unlock; it never removes a
  lock owned by another component. Reduced-motion anchors move without animation.

## Verification

- `node scripts/test-controlled-scroll-timing.mjs`: deterministic browser fixture
  checks the exact constants, 60/120Hz follow, velocity limit, stalled-frame cap,
  duration/easing, header offset, focus and effect cleanup.
- `node scripts/check-controlled-scroll.mjs`: actual app checks mouse wheel,
  small trackpad-like input, unit normalization, target cap, reversals, native
  keyboard/zoom/horizontal input, nested forms and overscroll, dialogs and body
  locks, header alignment, focus/tabindex, navigation interruption, back/forward,
  live preference changes, the 720/721px boundary, document boundaries, mobile
  touch swipes, mobile menu navigation, wide touch devices and reduced motion.
  Results: `artifacts/controlled-scroll/report.json`.
- Hero regression/loading tests, lint, TypeScript/Vite build and SEO build checks
  are run alongside these checks. The existing 36 SEO migration review decisions
  are unrelated to scrolling.

Chromium automation includes browser-level wheel and touch input plus synthetic
trackpad-sized deltas. Physical trackpads, iOS Safari and Android devices still
require real-device confirmation; no universal frame-rate guarantee is implied.
