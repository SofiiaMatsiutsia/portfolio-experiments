# Portfolio experiments

This is the source for the portfolio at [www.matsiutsia.com](https://www.matsiutsia.com/). The site is static; Vercel serves the files directly using the clean-URL settings in `vercel.json`.

## Homepage intro

The homepage writes the inline signature over the shared blue for 1 second, holds for 250ms, then reveals the page through pastel rings over 1.75 seconds. The normal sequence never waits for fonts or media. A six-second watchdog releases the page if the controller fails to initialize; once it starts, its watchdog uses the remaining animation time plus 600ms. Reduced motion uses a static signature and a 180ms fade; Escape skips the intro.

The intro plays on every homepage visit, including reloads, ordinary navigation, and back/forward restoration. Its settings live in `homepage-intro-settings.js`. Completion is saved in `sessionStorage` under `portfolio:homepage-intro:v1` so the replay policy can be changed later without replacing the controller. Explicit `waitForAssets: true` overrides retain the optional bounded readiness mode.

The showcase initially loads WebP posters and the small Housing Anywhere image. Video sources stay in `data-src` until the intro ends and the tile becomes visible, including tiles in the duplicated loop. Hidden previews pause. Reduced motion and `navigator.connection.saveData` keep posters without automatic video downloads. Original GIF/PNG assets remain available for other pages. Homepage footer scripts defer in dependency order so their downloads cannot delay the intro controller.

Run the regression checks with `node --test scripts/*.test.mjs` and `python3 scripts/check-interface.py`.

## Case studies and typography

`typography.css` supplies SF Pro Display and the shared heading hierarchy. Product demos retain their own fonts. `work/case-study.css` contains the common reading layout; the verification and payout stylesheets contain their project-specific media treatments.

Mark each contents destination with a unique `id` and `data-case-section="Label"`; optional `data-case-color` selects a palette color. `initCaseToc()` builds the compact menu from these sections in document order. Keep the matching `data-toc-fallback` anchor links usable without JavaScript. Previous/next links follow the six published case studies in Work-page order.

The copy timeline commits one of five stages immediately and animates only the diagram. Scroll messages still use `verification-copy:progress` (0–100), quantized to 25-point intervals. Manual selection takes priority until the figure fully leaves and re-enters the viewport; focused controls retain priority. `scripts/milestone-timeline.test.mjs` covers these interactions and the parent/iframe bridge.

## Link waves

The drawn-underlined links on Home and About swap to a static sine wave on hover or keyboard focus. Shared wave settings live at the top of `underlined-links.js`. Both resting and hover strokes are 1.3px thick.

## Publishing

- Canonical Git repository: `https://github.com/SofiiaMatsiutsia/portfolio-experiments.git`
- Production project: `matsiutsia-com` on Vercel
- Production branch: `main`

Pushing a commit to GitHub `main` triggers the Vercel production deployment. Check the deployment status in the Vercel project before treating a release as live. For this checkout, `git remote -v` should show the GitHub URL for both fetch and push. If an older checkout still points to `origin.cursor.com`, update it with:

```sh
git remote set-url origin https://github.com/SofiiaMatsiutsia/portfolio-experiments.git
git fetch origin main
```

Cursor Origin is not the publishing remote for this project. It rejects pushes from free Cursor accounts and is not connected to this Vercel production project.
