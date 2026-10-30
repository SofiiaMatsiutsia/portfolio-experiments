# Handwriting loader verification

Checked locally on 2026-10-30 against the approved slow-connection plan. No dependencies or publishing changes were made.

## Automated checks

- `node --test scripts/*.test.mjs`: 19 passing tests. Covers startup fallback, a controller arriving five seconds late, unresolved media/fonts, 1250ms reveal and 3000ms completion, reduced motion, controller watchdog cleanup, playback controls, replay cleanup, cloned previews, visibility, data saving, and replay handoff ordering.
- Syntax checks passed for `home-entrance.js`, `homepage-intro.js`, `homepage-intro-settings.js`, and `script.js`.
- `python3 scripts/check-interface.py`: 16 HTML documents passed. The asset check now includes deferred `data-src` references.
- `git diff --check`: passed.

## Browser observations

Checks used the Codex in-app browser and temporary local response fixtures. Fixtures and instrumentation are not shipped in the site.

| Scenario | Observed result |
| --- | --- |
| Normal load | Intro completed in approximately 3003ms from the first writing phase event |
| Cold-cache, shared 400kbps response-body bandwidth, 400ms initial response delay | Intro completed in approximately 3004ms; the page was interactive while videos continued loading |
| Main page script delayed 8 seconds | Intro completed in approximately 3030ms, independently of that script |
| Showcase media delayed 11 seconds and then returned 404 | Intro completed in approximately 3012ms; unavailable-preview messages appeared and project links remained present |
| Reduced-motion fixture | Static signature and opacity fade completed in approximately 194ms; no preview video sources attached |
| Data-saving fixture | Normal intro completed in approximately 3004ms; no preview video sources attached |
| Missing intro controller | The startup watchdog removed the blue curtain and released the page |

Event observations include frame scheduling and setup overhead; they are not a frame-rate profile. The animation settings remain exactly 1000ms writing, 250ms hold, and 1750ms reveal. The slow fixture limits response bodies, not protocol overhead. A browser navigation-wait timeout occurred during the shared-bandwidth check; inspecting the resulting document confirmed successful intro completion and restored interactivity.

The signature stayed within the viewport at 320×568, 390×844, 768×1024, 1024×768, and 1440×900. No horizontal document overflow was observed. Writing frames were captured at each size. Playback controls were checked with a temporary fixture: replay, pause, seek to reveal, resume, Escape, and resize during reveal. Opening the menu, navigating to About, and using Back also worked. Persisted `pageshow` restoration is covered by the existing bootstrap unit test; the browser Back check used a fresh document.

Visible previews started after the intro; offscreen originals and duplicates initially had no `source[src]`. Leaving visibility paused playback. Decorative videos are hidden from accessibility output because their enclosing project links already provide the labels; this also avoids an empty-source media warning being announced for poster-only previews.

## Assets

The five initial showcase images/posters total **262,184 bytes** before HTTP compression. New posters are 33,304 bytes (mobile), 43,060 bytes (scroll), and 9,422 bytes (MFT). The two converted videos are H.264, 700×1052, 24fps, yuv420p, silent, with fast-start metadata. Original source assets remain untouched.

## Remaining device verification

Physical iPhone/iPad Safari, native OS reduced-motion/data-saving preferences, browser 4× CPU throttling, and recorded frame-by-frame performance profiling were not available in this session. The preference fixtures exercise the production branches but do not replace those device checks. Fullscreen SVG-mask acceleration remains browser-dependent; no claim of guaranteed 60fps is made.
