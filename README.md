# Portfolio experiments

This is the source for the portfolio at [www.matsiutsia.com](https://www.matsiutsia.com/). The site is static; Vercel serves the files directly using the clean-URL settings in `vercel.json`.

## Homepage intro

The homepage writes the inline signature over cyan for 1 second, holds for 250ms, then reveals the page through pastel rings over 1.75 seconds. `homepage-intro.js` waits for first-screen fonts and media, with a six-second readiness limit. Reduced motion uses a static signature and a 180ms fade; Escape skips the intro.

The intro plays on every fresh homepage load; back/forward restoration skips it. Its settings live in `homepage-intro-settings.js`. Completion is saved in `sessionStorage` under `portfolio:homepage-intro:v1` for optional session-only playback later. The homepage uses WebP/MP4 previews of the original showcase assets; originals remain available for other pages.

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
