# Acmetel — Marketing Homepage

A single-page marketing site for Acmetel, hand-built as a static site: plain HTML,
CSS, and JavaScript with **no framework and no build step**. The whole experience —
animated hero, interactive globe, scroll-driven product story, a live "network
heartbeat", and cursor-reactive cards — ships as three small files plus a handful of
images. It loads fast, has nothing to install or keep patched, and can be hosted
anywhere that serves static files.

**What's in the repo**

| Path | What it is |
|------|------------|
| `index.html` | The entire page, one document |
| `css/styles.css` | All styling; design tokens (colour, type, spacing) sit at the top |
| `js/main.js` | Navigation, the data-driven sections, and every interaction |
| `js/pulse.js` | The ECG "network heartbeat" canvas in *Why Acmetel* |
| `assets/` | Logos, partner marks, and the globe texture (`globe.webp`) |

What's committed is exactly what runs in the browser — no bundler, no dependencies.

## View it live

The site is published with GitHub Pages:

### → https://elmarwanos.github.io/website-code/

Every push to `main` redeploys it automatically. A GitHub Actions workflow
(`.github/workflows/deploy-pages.yml`) minifies the CSS and JavaScript during the
build and publishes the result, so visitors always get the optimised version while
the source in the repo stays readable.

To preview it on your own machine, from this folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## How the globe was built

The rotating globe in the hero looks like a 3D render, but there is **no WebGL and no
3D library** behind it. It's a deliberate illusion assembled from a flat image, CSS,
and a little geometry — which is what keeps it around 130 KB and smooth on a phone,
where a real 3D engine would cost several megabytes.

**A flat map, sliced into strips.** The source is a single equirectangular (2:1)
night-lights photo of Earth. Painting it as one flat panning background reads like a
photo scrolling behind a porthole, so instead the globe is split into ~24 thin
**vertical strips**, each showing its own slice of the map.

**Sphere geometry, one strip at a time.** Every strip is positioned and scaled with an
orthographic sphere projection (`screen-x = R · sin(angle)`). Strips near the centre
come out **wide and pan fast**; strips near the edge come out **narrow and pan slow**.
That single rule reproduces the two cues your eye reads as "sphere": the horizontal
*foreshortening* toward the edges, and the *deceleration* of surface features as they
turn away from you. Adjacent strips are stitched edge-to-edge so the seams never show.

**Depth and light, faked convincingly.** A circular clip turns the rectangle into a
disc. A crescent **rim-light** and a **limb-darkening** shadow — two CSS gradient
layers — make the surface curve away at the edges the way a photographed sphere does.
A scatter of **city-light dots** is blended over the photo and recoloured to Acmetel
green using CSS blend modes.

**Live markers and data links.** Acmetel's real markets are pinned to true
latitude/longitude and run through the *same* projection, so they slow and compress
toward the edge in lockstep with the surface beneath them — they feel stuck to the
globe rather than floating over it. The glowing arcs between them are SVG paths, bowed
like hops over the sphere and animated with a dashed "flow" to suggest live traffic
moving across the network.

**Rotation and interaction.** The globe spins by advancing a single angle at a constant
rate, exactly how a turntable turns. On desktop you can **grab and scrub** it with the
cursor; let go and it "throws", then eases back to its steady spin. On touch devices a
horizontal drag does the same, while vertical swipes are left alone so the page still
scrolls normally.

**Built to stay cheap.** The texture is served as an optimised WebP, and the animation
loop **pauses itself** whenever the globe scrolls off-screen or the browser tab is in
the background — so it never spends battery drawing something nobody is looking at.
