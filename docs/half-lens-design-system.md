# Half Lens — Digital Design System

## Concept

**The Other Half Completes the Frame** — an incomplete, sharp half-frame becomes a complete cinematic image through story, collaboration, and final production.

## Color tokens

```css
--hl-navy: #28336e;
--hl-royal: #223f97;
--hl-blue: #3354a5;
--hl-soft-blue: #8898cb;
--hl-mint: #4dc0af;
--hl-ice: #eaf2f4;
```

The application also uses deeper tonal extensions of `--hl-navy` for cinematic depth and high-contrast off-white for text. Pure black is not a primary surface.

## Typography

- Primary: Cairo, locally bundled through the build dependency.
- Arabic display: 500–600, fluid `clamp()` scale, safe line-height 1.12–1.28.
- Body: 400–500, approximately 17–20px desktop and 16–18px mobile.
- Technical Latin metadata: Manrope, compact and secondary.

## Grid and spacing

- Maximum editorial canvas: 1600px.
- Desktop: 12 columns; tablet: 8; mobile: 4.
- Fluid edge gutter: `clamp(20px, 4vw, 72px)`.
- Section spacing follows a fluid scale and is shortened intentionally on mobile.
- Text measure is capped; long Arabic paragraphs never span the full viewport.

## Surfaces and geometry

- Cinematic fields use deep brand navy tones.
- Editorial work and proof chapters use ice.
- Corners are sharp or minimally softened.
- One 45-degree cut or incomplete frame may identify a scene; do not notch every component.
- Lines are thin and structural; mint identifies completion/focus, recording red remains a tiny production signal only.

## Components

- **FrameLink:** label, factual micro-label, and a circular/diagonal action that completes on hover/focus.
- **SectionHeading:** eyebrow, display heading, concise description, and optional index aligned to the shared grid.
- **ProjectFrame:** dominant 16:9 media with factual production credits; no decorative card chrome.
- **MediaAction:** pointer/focus preview with an accessible static action on touch.
- **BrandRule:** incomplete line that finishes with mint/red detail on active state.

## Motion

- Quick: 180ms; standard: 420ms; editorial: 700ms.
- Easing: `cubic-bezier(.22, 1, .36, 1)` for entrances; linear for scroll-linked motion.
- Small content travel: 16–24px; media reveal: restrained scale/crop, never blur.
- Temporary `will-change` only immediately around active reveals.
- No offscreen continuous tickers, animated filters, numeric scrub catch-up, or scroll hijacking.
- Reduced motion removes scrubbed decorative movement and presents completed states.

## Responsive behavior

- Desktop split compositions become intentional stacked sequences on mobile.
- Project metadata remains visible without hover.
- Decorative pattern density is reduced below 720px.
- Touch targets are at least 44px and focus states remain visible.
- Large headings scale fluidly and preserve Arabic dots/diacritics without clipping.

## Asset policy

- Use only official Half Lens marks and real company/project/client media.
- No reference-site imagery, generated client work, fake testimonial, or invented statistics.
- New project media should follow `public/half-lens/ASSET_GUIDE.md`.
