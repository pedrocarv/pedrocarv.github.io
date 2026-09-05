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

Push changes to `master` to run the **Publish research website to GitHub Pages** workflow. It installs the locked dependencies, checks TypeScript and the model invariants, builds the static site, and deploys `dist/client/`. You can also run the workflow manually from the Actions tab.

In Settings → Pages, the source is **GitHub Actions**. Keep the custom domain set to `pedrocs.com` and HTTPS enabled. `public/CNAME` and `.nojekyll` are included in the static output. The Sites manifest supports the separate private preview; GitHub Pages uses the workflow.

The previous Jekyll website is preserved in the repository’s Git history before the redesign commit.

## Asset credits

- Magnetosphere illustration: NASA / GSFC, reused from the original site with its existing attribution; shown as an illustration, not simulation output.
- Photo of Pedro Silva at AGU 2024: reused from the original site.
- Earth globe texture: [NASA Earth Observatory, Blue Marble Next Generation, July 2004](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), a 5400 × 2700 equirectangular day map.

## Interactive magnetosphere

The homepage contains a rotatable Three.js teaching model with solar-wind speed, proton density, and IMF Bz controls, independent visibility controls, camera presets, pause/reset, and five inspectable Dungey-cycle stages. Three.js loads when the section approaches the viewport. Reduced-motion preferences pause the initial animation; a static illustration and cycle descriptions remain available if WebGL 2 fails.

- `components/magnetosphere/explorer.tsx`: controls, loading states, cycle narrative, sources.
- `components/magnetosphere/scene.ts`: globe, field topology, wind, current directions, aurora, camera and rendering lifecycle.
- `components/magnetosphere/plasma.ts`: analytic pressure volume rendering, ring drift, tail transport, and polar outflow tracers.
- `lib/magnetosphere.ts`: pressure scaling and pure geometry functions.
- `npm test`: pressure units/scaling, field-line topology and anchoring, wind exclusion, tail transport continuity/direction, and outward polar flow across the control range.

Axes are schematic: +x is antisunward, +y is magnetic north, and +z is dusk. Proton dynamic pressure is mₚnv²; the dayside distance scales as P⁻¹⁄⁶, normalized to 10 Earth radii at 2 nPa. Other shapes, pressure colors, particle speeds, and timing are illustrative. These are analytic educational graphics, not imported simulation results or a forecast. Aurora altitude and current thickness are enlarged. IMF By, dipole tilt, northward-IMF lobe reconnection, Region 2 currents, and substorm timing are omitted.

The pressure torus follows the volumetric approach in [NASA SVS: The Ring Current in Earth's Magnetosphere](https://svs.gsfc.nasa.gov/5643/). Plasma-sheet rendering and directional markers are informed by [NASA SVS: Reconnection Fronts](https://svs.gsfc.nasa.gov/4088/); polar-cap ion plumes reference [NASA's polar wind animation](https://svs.gsfc.nasa.gov/14628/). Pressure shading, bulk transport, conventional current, field-line motion, polar outflow, and auroral precipitation are explicitly distinguished in the interface. Additional physics references: [NASA on reconnection](https://pwg.gsfc.nasa.gov/Education/wmpause.html) and [current systems](https://pwg.gsfc.nasa.gov/Education/wcurrent.html).
