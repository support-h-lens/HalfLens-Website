# Half Lens — Current Site Audit

## Baseline reviewed

- Public application: React 18 + Vite + TypeScript.
- Motion: GSAP ScrollTrigger plus a dedicated presentation-aware cinematic video scheduler.
- Content: typed fallbacks with published project, client, and contact content loaded from Supabase.
- Internal interface: isolated multi-entry `/admin` application with Supabase authentication and role checks.
- Baseline screenshots: `artifacts/baseline/current-390x844.png`, `current-768x1024.png`, and `current-1440x900.png`.

## Preserve

- The single paused cinematic video mapped reversibly to scroll progress.
- The existing frame scheduler, Blob/Cache Storage loader, responsive MP4 selection, poster, and reduced-motion behavior.
- The Arabic-first content, real project films, official client logos, contact and careers flows, CMS fallbacks, and admin/auth boundary.
- The editorial project compositions, rising Portfolio panel, and restrained recording-red signal.
- The corrected Arabic line-height and the current keyboard-accessible mobile navigation.

## Redesign

- Replace the current generic near-black/ivory styling with the exact brand-guide navy, blue, ice, and controlled mint system.
- Replace the experimental type mixture with Cairo for Arabic and interface copy, retaining a compact Latin face only for technical metadata.
- Reduce decorative camera-interface noise. Labels must orient the visitor rather than imitate a camera application.
- Give the Hero a clearer hierarchy: official message, two actions, and a distinct but quiet company-profile action without covering the camera.
- Move from repeated framed boxes toward a reusable 12-column editorial grid and the brand's full-circle versus 45-degree cut geometry.
- Make selected work the strongest post-cinematic destination and provide real archive/detail routes driven by CMS project slugs.
- Rebuild the Clients presentation as calm proof rather than a dense moving wall.
- Tighten the Contact and Footer so the final scene feels composed instead of empty or dashboard-like.

## Remove or avoid

- Decorative timecodes, coordinates, and micro-labels that have no factual or navigational purpose.
- Permanent compositor promotion, animated blur, full-screen filter animation, and offscreen tickers.
- Identical cards, excessive rounded panels, glass effects, random glows, and generic agency claims.
- Content available only on hover, placeholder links, fake testimonials, fake statistics, or fabricated project detail.

## Baseline quality findings

- The desktop Hero is cinematic, but the headline competes with the camera and the left profile control adds a second focal system.
- Tablet has too much empty vertical space before the primary visual and weakens the first impression.
- Mobile is over-instrumented and cramped; several decorative labels consume space that should belong to the headline and work.
- The Portfolio concept is strong and already more distinctive than a conventional grid.
- Current Lighthouse baseline: Accessibility 94, Best Practices 100, SEO 92. The main issues are contrast/accessible naming, missing production SEO files, and the cinematic video being the LCP element.
- Local trace LCP was approximately 4.7s; most delay came from the deferred video/blob becoming the LCP resource. The redesign must not rewrite the proven video architecture.

## Design objective

Keep the cinematic engine and real business functionality, while making the interface unmistakably Half Lens through disciplined Arabic hierarchy, exact brand color, sharp 45-degree cuts, split-frame composition, factual editorial metadata, and work-led storytelling.
