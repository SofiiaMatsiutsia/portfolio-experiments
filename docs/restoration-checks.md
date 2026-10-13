# Character and navigation verification

Implemented the approved restoration plan locally using the existing HTML, CSS, JavaScript, assets, and palette. No dependencies or publication changes were introduced.

## Browser checks

- Home: restored the original signature drawing and pastel ring reveal from the separate handwriting-intro worktree. The signature draws for 1000ms, holds for 250ms, then rings expand for 1750ms. Direct visits, reloads, internal returns, and browser Back replay it. The animated L remains active beneath it. Escape releases the overlay; reduced motion shows the static signature and fades for 180ms.
- About: original rose selected scribble, uppercase rose lead, and black-on-pastel emphasis render without added underlines. Home and Talks retain their blue and green leads.
- Four sequenced case studies: checked at 320×568, 390×844, 667×375, 1024×768, and 1440×900. No horizontal overflow. Compact headers scroll with content; desktop contents stays in the rail.
- Contents: opens above the dock, fits short landscape screens, updates the section label, restores focus after selection/Escape, and closes on Tab. Opening the full menu dismisses Contents. Full-menu keyboard focus excludes hidden elements.
- Project navigation: source checks confirm each destination and both non-wrapping endpoints. Links work without JavaScript. Failed lazy thumbnails produce a fallback without blocking the destination or adding nested buttons.
- Cursor: ordinary content keeps the circle; enabled Menu produces the triangle; Coming soon overrides it; a disabled initial control keeps the circle. Reduced-motion and coarse-pointer fixtures keep the native cursor. Dragging the homepage showcase moves its track without navigating, and releases its drag state.

Browser checks used the local in-app browser. Temporary fixture responses simulated missing JavaScript, failed media, reduced motion, and a coarse pointer. Physical iOS/Safari and assistive-technology testing were not performed.

## Repeatable checks

```sh
node --test scripts/home-entrance.test.mjs
node --check script.js
node --check letter-animation.js
node --check home-entrance.js
node --check homepage-intro.js
node --check homepage-intro-settings.js
python3 scripts/check-interface.py
```

The early bootstrap starts a blue curtain before first paint. `homepage-intro.js` preserves the original 23 signature paths, drawing order, and ring geometry. First-screen fonts and media load underneath; readiness is bounded to six seconds, and a watchdog releases the page if the controller fails. Pagehide cleans up the overlay, animations, and inert state; persisted pageshow reconstructs the intro from pristine markup. An incoming native transition is skipped while the intro is active. Nine bootstrap tests cover repeat visits, Back, Escape, watchdog release, cleanup failures, native transition coordination, and unavailable storage.

The previous 350ms-only fade was a misidentification of the requested intro and has been replaced. Browser capture confirms all four stages: writing, hold, ring reveal, and the fully visible page. Additional checks confirm a 260px signature within a 320px viewport, successful Home-link and Back returns, Escape release, and the reduced-motion fallback.

## Navigation sizing refinement

Selected scribbles now fit the existing 70px About and 63px Work/Talks envelopes with their aspect ratios preserved. Base image visibility applies to touch devices as well as fine pointers, so the hover and selected drawings cannot overlap. Verified a simulated coarse-pointer layout at 1180px and compact case controls at 320px, 390px, 768px, and 1024px. The open Menu control uses 14px text and a smaller borderless surface; its tap area remains 44px high. Case controls are 44px high with no border or shadow. The link pointer keeps the shared blue fill. Escape dismissal and focus restoration still pass.

## Compact controls

Mobile Menu and Close share a 68px width, 14px text, and a 32px painted surface within a 44px tap target. The radial menu clips its oversized rings without creating an internal scroll area, so focusing Close cannot scroll the menu away from its labels. Work filters use 12px labels and smaller gaps; their mobile surfaces are 32px high with at least 44×44px tap targets. Desktop contact actions use 14px text, 14px arrows, and content-sized 32px surfaces within 44px targets. On the mobile Home screen, the three contact actions use 12px text, 12px arrows, and compact content widths while retaining 44px targets; mobile contact layouts on other pages retain their previous styling. Checked Home, About, and Work at 320px and 390px without horizontal overflow; Research selection still announces four projects.
