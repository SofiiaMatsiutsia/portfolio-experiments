# Portfolio experiments

This is the source for the portfolio at [www.matsiutsia.com](https://www.matsiutsia.com/). The site is static; Vercel serves the files directly using the clean-URL settings in `vercel.json`.

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
