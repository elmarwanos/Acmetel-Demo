# Acmetel — Homepage (Option B, "Momentum" dark)

Static, dependency-free rebuild of the approved dark homepage design, updated for the
client's Option B feedback (2026-07-16). Plain HTML/CSS/JS — no build step, no framework —
so it can be pushed straight to GitHub Pages.

## Structure

```
website code/
├── index.html          # single-page homepage
├── css/styles.css       # all styling (design tokens at the top)
├── js/globe.js          # hero globe canvas renderer
├── js/pulse.js           # "Why Acmetel" heartbeat canvas
├── js/main.js            # nav, data-driven sections, interactions, reveal-on-scroll
├── assets/favicon.svg
└── README.md
```

## What changed vs. the exported design

- **Partner carousel moved into the hero**, visible on first load, full-colour wordmarks
  (was a separate greyscale strip further down the page).
- **Hero globe rebuilt** for higher fidelity: smoothed coastlines, terrain shading,
  brighter ocean/atmosphere glow, glowing gradient carrier-route arcs, pulsing hub markers.
- **Services cards** now tilt/glow/lift toward the cursor, with new dimensional
  gradient-lit icons (replacing the flat line icons and emoji).
- **Products section** rebuilt as a scroll/cursor-driven layout (sticky visual panel +
  progress rail that advances as you scroll, subtle cursor parallax) instead of a static grid.
- **New testimonials section** — sample/placeholder quotes; swap in real client
  testimonials before launch.
- Removed the floating pill/badge above the hero headline and all emoji-as-icon usage
  sitewide, replaced with a custom SVG icon set.

## Running locally

No build step needed. From this folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

(Opening `index.html` directly via `file://` also works, but a local server is closer
to how GitHub Pages will actually serve it.)

## Deploying to GitHub Pages

1. Create a new GitHub repo (or use an existing one) and push this `website code/`
   folder's contents to it — the repo root should contain `index.html` directly
   (not nested inside another folder), e.g.:
   ```bash
   cd "website code"
   git init
   git add .
   git commit -m "Acmetel homepage — Option B dark, client feedback round"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. In the repo on GitHub: **Settings → Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch".
4. Set **Branch** to `main` and folder to `/ (root)`, then Save.
5. GitHub will publish at `https://<your-username>.github.io/<repo-name>/` within a
   minute or two.
6. Optional: add a custom domain under Pages settings once DNS is ready (CNAME record
   pointing at `<your-username>.github.io`).

## Notes / things to swap before a real launch

- Contact form is a front-end-only demo (no backend wired up) — it shows a success
  state locally but doesn't send anywhere yet.
- Testimonial quotes are placeholder copy — replace with real, attributed client quotes.
- Partner strip renders brand-coloured wordmarks (no real logo assets were available in
  the export) — swap in actual partner SVG logos when you have them for full accuracy.
- Blog/events/careers content is static placeholder text matching the original design's
  copy — the full CMS-driven build is out of scope for this static homepage demo.
