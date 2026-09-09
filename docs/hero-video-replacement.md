# Hero video replacement (2026-09-08)

Local preview: http://127.0.0.1:5188/

The supplied originals in `C:\Users\amroa\Downloads\new vids` were only read.
`视频上传 (2).mp4` is landscape (1920x1080); `视频上传 (3).mp4` is portrait (1080x1920).
Both contain 481 frames at 48 FPS, lasting 10.020833 seconds.

## Final assets

Files are under `public/media`. Upload only these two MP4s to the existing R2 bucket:

| Orientation | Filename | Web resolution | Bytes |
| --- | --- | --- | ---: |
| Landscape | `h-lens-hero-landscape.b7c04877f910.mp4` | 1920x1080 | 20,901,770 |
| Portrait | `h-lens-hero-portrait.e971de5ef297.mp4` | 720x1280 | 7,013,542 |

A copy of the two files is prepared in `artifacts/hero-media-preparation/fastdecode/cloudflare-upload/`.
Keep these versioned filenames exactly. MP4 metadata: `Content-Type: video/mp4` and
`Cache-Control: public, max-age=31536000, immutable`.

Matching opening posters (at 2/48 seconds) are shipped with the website, not fetched from R2:

- `h-lens-hero-landscape-poster.1ee743755595.webp`
- `h-lens-hero-portrait-poster.930b0d69b4f6.webp`

The old video and poster assets remain for rollback and existing SEO references.
The user uploaded both optimized MP4s to the `vid1` R2 bucket and enabled public access.
The live website has not been deployed in this task.

## Encoding and behavior

The existing videos had a six-frame GOP, no B-frames, and fast-decode tuning.
The new web derivatives preserve that approach: H.264, CRF 20, slow preset,
fastdecode tune, 48 FPS, six-frame keyframe spacing, no B-frames/audio, and MP4
fast start. The portrait derivative is scaled with Lanczos to reduce decoding and
transfer costs. Original frame count and duration are preserved.

`src/data/media.ts` selects local media in development and the new
`https://pub-046fd1c457744b10afc99fdd2c5ab3d1.r2.dev` endpoint in production.
Both public objects were verified on 2026-09-08: full GET responses returned 200,
`video/mp4`, and SHA-256 hashes matching the optimized local assets. Requests for
bytes 0-31 returned 206 with correct Content-Range and 32-byte bodies for both files.
This verifies delivery and byte-range support, not real phone hardware performance.
The endpoint is a public development URL; a custom domain remains the production follow-up.

Selection now follows viewport orientation, including rotation. A responsive
`picture` supplies the matching poster before hydration or while media is loading.
The loader retains same-origin idle preload and Cache Storage for local media.
Cross-origin R2 media now buffers natively after the first paint, without waiting
for window load or requiring CORS-enabled JavaScript fetch. The opening poster
remains visible until scroll intent. Save Data/2G connections do not preload.
Scrolling during a local fetch allows a 200ms completion grace period before
falling back to native media. Rotation cannot reattach revoked blob URLs.

The frame scheduler now requests the latest target directly, keeping one request
in flight. It observes decoding and presentation separately, with a 32ms bounded
presentation handoff and 120ms lost-event recovery. It never interrupts a genuine
pending network/decode seek. Exact endpoint frames and reduced motion are preserved.
Adaptive keyframe snapping and an all-intra encoding were investigated, but are not
used in the final implementation. Uploaded MP4s and their resolution are unchanged.
GSAP still follows actual document scroll; the AiLens-style document controller is
documented in `docs/controlled-scroll.md`.

The approved diagonal sheet now opens the works section, not a story section in
the middle of the film. Progress is measured against `.cinematic-story__chapters`
(hero and services). A separate final-frame hold/overlap tail keeps the video
sticky while the work sheet covers it, without delaying the final video target.
Reduced motion removes this overlap and hold. Video tests use the chapter range.

## Reproduction and checks

`node scripts/prepare-hero-media.mjs "C:\Users\amroa\Downloads\new vids"`
creates derivatives and a manifest with source hashes, frame counts, keyframe gaps,
and fast-start validation. It refuses to overwrite staging outputs. Use a fresh
staging location if preparing another batch. Encoding tool versions can change file
hashes; update the manifest, source references, and tests together if re-encoding.

`node scripts/check-hero-replacement.mjs` runs local Chromium comparisons against
the old MP4s using the same scheduler, plus portrait tablet, rapid rotation,
reduced-motion, seeked-event fallback, direct-media loading, failed-video poster,
and byte-range checks. It uses the existing adjacent `pw-diag` Playwright install.
Screenshots and measured results are saved under `artifacts/hero-replacement/`.

`node scripts/test-cinematic-frame-scheduler.mjs` checks coalescing, bounded
presentation handoff, missing callbacks, pending seeks, boundaries and cleanup.
`node scripts/check-hero-loading.mjs` checks the production preview on port 5189
against actual R2 media, Save Data and local fetch/fallback races.
`node scripts/check-hero-smoothness.mjs` records continuous sweeps and reversals,
including actual presented frames (not just currentTime writes). Its timings are
machine-dependent lab results, not guarantees for physical phones or all browsers.

`npm run lint` and `npm run build` validate the application. The build continues
to report the existing pending SEO migration decisions, unrelated to this change.
