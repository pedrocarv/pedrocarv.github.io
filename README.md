# Pedro Silva — research website

A responsive, static research website with an image-led homepage, research overview, biography, full publication list, individual publication pages, talks, and teaching. Built with React, TypeScript, and Vinext. No database, API keys, or application server is needed to serve the exported site.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

## Build

```sh
npm run build
```

The deployable website is in `dist/client/`. Serve that folder through any static web host. Use a local HTTP server to view it, rather than opening HTML files directly.

## Update your content

- Homepage biography and research: `app/page.tsx`
- Publications: `lib/publications.json` (new records automatically receive individual pages)
- Talks: `app/talks/page.tsx`
- Teaching: `app/teaching/page.tsx`
- Navigation, email, and profile links: `components/site/chrome.tsx`
- Colors, typography, and responsive layout: `app/globals.css`
- Photos and illustration: `public/images/`

All publication records were migrated from `pedrocarv/pedrocarv.github.io`, revision `cc1563f` (2025-10-16). The Frontiers article link was checked against its publisher. The two journal articles are separated from eight conference contributions. Author names are preserved as credited in the source. The biography and status follow the current repository; no additional degrees, awards, or publications have been invented. The old CV contains template examples and is intentionally omitted.

## Publishing

The site publishes to **https://pedrocs.com/** through GitHub Pages.

Push changes to `master` to run the **Publish research website to GitHub Pages** workflow. It installs the locked dependencies, checks TypeScript, builds the static site, and deploys `dist/client/`. You can also run the workflow manually from the Actions tab.

In Settings → Pages, the source is **GitHub Actions**. Keep the custom domain set to `pedrocs.com` and HTTPS enabled. `public/CNAME` and `.nojekyll` are included in the static output. The Sites manifest supports the separate private preview; GitHub Pages uses the workflow.

The previous Jekyll website is preserved in the repository’s Git history before the redesign commit.

## Asset credits

- Magnetosphere illustration: NASA / GSFC, reused from the original site with its existing attribution; shown as an illustration, not simulation output.
- Photo of Pedro Silva at AGU 2024: reused from the original site.
- No generated scientific imagery or invented simulation results are used.
