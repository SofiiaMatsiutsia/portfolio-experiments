# Portfolio interface audit — 12 October 2026

The portfolio keeps its Folio Book typography, handwritten identity, animated initials, and editorial layouts. The polish makes their surrounding interface consistent and dependable. It does not claim endorsement by Apple or any individual designer.

## Scope

Reviewed Home, About, Work, Talks, the custom 404, all nine project pages, the legacy Voyage Monitor redirect, and the standalone One breath explorer. Project screenshots and photographs retain the colors of the work they document. Portfolio lettering and navigation vectors use the shared palette.

## Visual system

`design-tokens.css` declares exactly seven base colors:

| Role | Value | Use |
| --- | --- | --- |
| Rose | `#e8a7ed` | About, lettering, review tape |
| Green | `#86cd8b` | Talks, selection, lettering |
| Orange | `#f6aa81` | Writings, review tape, lettering |
| Blue | `#4dccf9` | Work, link underlines, lettering |
| Grey | `#707070` | Secondary text and metadata |
| White | `#ffffff` | Controls and paper surfaces |
| Black | `#171615` | Main text, icons, keyboard focus |

Canvas, loading plates, borders, and shadows derive from these colors using mixes or transparency. They introduce no independently chosen neutral values. Running text uses black or grey. Uppercase phrases beside the animated initials retain their blue, rose, and green colors. Non-interactive About emphasis uses black text on a tight pastel marker background; actual links retain distinct treatments. Navigation keeps the original colored selected scribbles.

Page gutters are 20px on desktop and 16px on compact layouts. Layout spacing uses a shared 4px scale, with 12/20px component gaps, 24/32px content gaps, and 64/80/96px section intervals. Optical positions for lettering, illustrations, and handwritten marks remain explicit: mathematical uniformity would damage their alignment.

Controls use a 4px radius; media uses 4px; enclosing cards use 6px. All primary controls have 44px touch targets. The full-screen menu changes to a compact two-column layout when viewport height is 600px or less, keeping contacts and dismissal visible in landscape.

## Typography analysis

Folio Book is part of this portfolio's character. A generic font replacement would weaken the relationship between its lettering, photographs, and editorial copy. The implementation keeps the actual Book cut at weight 400, preloads it, disables synthesized weights, and standardizes the hierarchy around it.

| Level | Desktop | Phone | Treatment |
| --- | --- | --- | --- |
| Controls | 16px | 14–16px | 1.25 line height, light tracking |
| Captions / metadata labels | 14px | 14px | Consistent grey, restrained uppercase |
| Card descriptions | 16px | 16px | 1.5 line height, no opacity fading |
| Reading copy | 20px | 18px | 1.5 line height, up to 65ch |
| Card / subsection titles | 24px | 20–24px | 1.2–1.3 line height, slight negative tracking |
| Section titles | 32px | 24px | 1.2 line height, balanced wrapping |
| Case-study title | Fluid 32–48px | 28px | 1.15 line height, balanced wrapping |

The homepage introduction remains a 26px display paragraph (20px on phones). Initial-letter leads retain a 1.4 line grid because their artwork aligns to measured cap height and baselines. Running paragraphs use 1.5. Negative tracking belongs to headings; review paragraphs no longer use tightly compressed display tracking. Numbers in counts and process labels use tabular figures. Long domains wrap inside metadata columns.

The interpretation draws on [Rauno's Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design): responsiveness, stable spatial relationships, interruptible interactions, and usable input paths matter alongside composition. The changes apply those principles through focus stability, immediate filter feedback, preserved loading frames, and motion preferences.

## Behavior and edge cases

- Loading plates now cover Talks images and About photo strips as well as work and case-study media.
- Failed media receives a clear fallback. Standalone figures offer retry; project links stay usable without nested interactive buttons.
- A valid video poster remains useful if playback fails. Pending media has a bounded loading window that starts when a lazy frame approaches the viewport.
- Intrinsic image dimensions reserve the final aspect ratio. The broken Voyage Monitor poster path is corrected.
- Autoplay media pauses under reduced motion, when off-screen, and when the document is hidden. Decorative marquee motion stops under reduced motion.
- The showcase freezes while keyboard focus is inside it, making links stable to inspect and activate.
- Email copy announces success. If both clipboard mechanisms fail, the address appears directly; focus returns from the fallback textarea.
- Work filter counts derive from actual projects. Filtering announces results, offers an empty state, and restores the selection when returning from a project.
- The mobile menu is a labelled dialog with a focus trap, inert background, Escape dismissal, focus restoration, and cleanup after crossing the desktop breakpoint. Case studies combine Contents and Menu in a compact bottom group; the header scrolls away and Contents opens upward. The two menus are mutually exclusive.
- Every portfolio page has one primary heading, a main landmark, and a skip link. About's introductory paragraph is now its semantic h1; Work has a visually hidden primary heading.
- Without the main script, primary navigation remains visible, email uses a mailto link, case-study contents become static anchors, and non-working menu controls are hidden.
- Short phone screens can scroll the homepage content instead of clipping it.
- The 404 can scroll when its artwork and return action need extra height.

## Verification

| Check | Result |
| --- | --- |
| All 14 portfolio pages at 1440px and 390px | Loaded; no broken images; one h1 each; shared font and text color |
| Seven representative page layouts at 320, 768, 1024, 1280, and 1920px | 35 checks; no horizontal overflow |
| 390 × 430 homepage | Content scrolls; contact targets remain 44px high |
| 667 × 375 menu | All destinations, contacts, sound, and close fit within the viewport |
| Filter selection and project return | Research selection restored; four matching projects |
| Mobile contents menu | Selection updates the label and closes the menu |
| Menu keyboard flow | Focus wraps; Escape closes; background cannot receive focus |
| Failed image and retry | Error plate appears; a later successful response clears it |
| Delayed lazy image | Pending frame and loaded frame both 57.53125px high at 390px width |
| Clipboard denial | Visible address and retry feedback; button keeps focus |
| Reduced-motion scenario | Videos paused; letter paused; shimmer disabled |
| Main-script-unavailable scenario | Navigation, mailto contact, and static contents remain available |
| Dive explorer | Shared theme renders; species selection updates the detail panel; return link has reserved space |
| Source checks | JavaScript syntax and Git whitespace checks pass |
| `python3 scripts/check-interface.py` | 16 HTML documents; palette, local links, headings, and image dimensions pass |

Browser checks ran in the local in-app browser. Reduced motion and missing-script cases used a temporary preview harness; physical iOS/Safari and assistive-technology testing were not performed. External destinations were inspected in markup, not exhaustively tested for availability. This is a local implementation, not a production deployment.

## Remaining release limitation

The separate dive explorer contains a pre-existing AG Charts Enterprise installation without a license key. Its interface is polished, but the license warning remains. Supply a valid license or rebuild it with appropriate community features before releasing that experiment as a production application. The original app sources are absent; its small theme adapter is documented in `docs/dive-theme-adapter.md`.

## Character and navigation restoration

The subsequent implementation restores the original homepage signature drawing and expanding pastel rings on every visit while coordinating with native View Transitions. Selected-navigation artwork stays colored, and hover artwork cannot replace it. The cursor crossfades to a blue, white-outlined triangle over enabled links and buttons while keeping its circle, Coming soon capsule, and drag priority.

Voyage Monitor → Internal Panel → TeamLift → HousingAnywhere now have static Previous/Next thumbnail links and an All work link. The sequence does not wrap, and HousingAnywhere’s existing content remains intact. Additional verification is recorded in [restoration-checks.md](restoration-checks.md).

## Keeping the system consistent

Run `python3 scripts/check-interface.py` after future edits. If raster assets change, `python3 scripts/normalize-image-dimensions.py` updates their intrinsic dimensions (requires Pillow). Edit base colors and shared layout/type decisions in `design-tokens.css`; use those variables in CSS and resolve them only when canvas rendering requires concrete colors.
