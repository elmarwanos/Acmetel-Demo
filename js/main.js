(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var icon = function (id, extra) {
    return '<svg' + (extra || '') + '><use href="#' + id + '"/></svg>';
  };

  /* ========================================================================
     Animation loop helpers

     The page runs several perpetual canvas requestAnimationFrame loops (hero
     particle field, globe spin, products wavy lines, and the ECG pulse in
     pulse.js). Left alone they keep repainting every frame even while
     scrolled far off-screen or while the browser tab is backgrounded — pure
     wasted main-thread work that hurts scroll smoothness and battery for no
     visible benefit.

     makeLoop wraps a per-frame render(dt) with start()/stop(); gateLoop then
     ties that start/stop to whether `host` is actually on-screen (via
     IntersectionObserver) and the tab is visible (visibilitychange), so an
     off-screen animation costs literally nothing until it scrolls back into
     view. dt is clamped and the clock is reset on each resume, so the first
     frame after a pause never applies one giant catch-up step.
     ===================================================================== */
  function makeLoop(render) {
    var raf = 0, lastT = null;
    function frame(t) {
      if (lastT == null) lastT = t;
      var dt = Math.min(100, t - lastT);
      lastT = t;
      render(dt);
      raf = requestAnimationFrame(frame);
    }
    return {
      start: function () { if (!raf) { lastT = null; raf = requestAnimationFrame(frame); } },
      stop: function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    };
  }
  function gateLoop(host, loop) {
    var onScreen = true;
    function sync() { (onScreen && !document.hidden) ? loop.start() : loop.stop(); }
    if (host && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(host);
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* ========================================================================
     Mobile nav
     ===================================================================== */
  (function nav() {
    var toggle = document.getElementById('navToggle');
    var mobile = document.getElementById('navMobile');
    if (!toggle || !mobile) return;
    function close() {
      mobile.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = icon('icon-menu', ' width="22" height="22"');
    }
    function open() {
      mobile.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.innerHTML = icon('icon-close', ' width="22" height="22"');
    }
    toggle.addEventListener('click', function () {
      mobile.classList.contains('is-open') ? close() : open();
    });
    mobile.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  })();

  /* Hero floating-dots "network constellation" background was removed here
     per client request — the hero now shows only its blueish-black gradient
     behind the globe/content. The old #heroParticles canvas is gone from the
     markup and its whole canvas system was deleted with it. */

  /* ========================================================================
     Hero globe: single-canvas renderer + turntable spin control

     Performance rewrite. The previous globe composited 24 DOM "strips", each
     with 16 blended background layers (background-blend-mode) plus a CSS
     filter, and rewrote background-position on every strip every frame — on
     top of 62 SVG link paths and 14 markers. Animating background-position
     under a blend-mode + filter can't be GPU-composited, so the browser
     re-rasterized all 24 strips on the CPU each frame, saturating the main
     thread and freezing low/mid devices.

     This version bakes the teal tint + brightness into the source texture
     ONCE at load, then draws the whole rotating globe with two GPU-cheap
     drawImage() calls per frame, plus a handful of canvas arcs for the data
     paths. No per-frame blend-mode, filter, background-position, SVG geometry,
     or marker DOM writes. The circular clip, rim-light, limb-darkening and
     glow stay as static CSS on .hero-globe (painted once). The drag/throw
     spin, off-screen gating (gateLoop) and reduced-motion handling are kept.
     ===================================================================== */
  (function heroGlobeCanvas() {
    var globe = document.querySelector('.hero-globe');
    var canvas = document.getElementById('heroGlobeCanvas');
    if (!globe || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');

    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var D = 0;      // globe diameter, CSS px (square)
    var theta = 0;  // rotation phase, radians (0..2PI)
    var texDbl = null, texW = 0, texH = 0, texReady = false;
    // The sphere is drawn as a SLICES x BANDS triangle mesh (a tilted
    // orthographic projection) textured with per-triangle affine blits — no
    // blend-mode/filter/DOM, and triangles tile the tilted surface with exact
    // shared edges (no gaps or staggering). SLICES spans the FULL 360° of
    // longitude and BANDS the full 180° of latitude; back-facing triangles are
    // culled, and the front half fills the whole disc — including the cap that,
    // once tilted, wraps up and over the pole to the top of the disc.
    var SLICES = 60;
    var BANDS = 20;
    // Viewing tilt: look down onto the northern hemisphere by this angle
    // (radians) instead of straight along the equator. Without it the north
    // pole sits on the top edge and northern continents crowd into the top
    // sliver; ~20° drops them to a natural position and shows the pole region
    // tilted at the top, the way globe renders usually frame it.
    var TILT = 14 * Math.PI / 180;
    var cosTilt = Math.cos(TILT), sinTilt = Math.sin(TILT);

    // Acmetel's real markets, and the "data path" arcs drawn between them.
    // The pin markers themselves stay hidden (per an earlier request); only
    // the arcs render. Kept as plain data so pins can be re-enabled later by
    // drawing CITIES points in drawGlobe() with the same project() mapping.
    var CITIES = {
      fr: [48.9, 2.4], eg: [30.0, 31.2], jo: [31.9, 35.9], iq: [33.3, 44.4],
      sd: [15.5, 32.6], ss: [4.9, 31.6], ksa: [24.7, 46.7], kw: [29.4, 48.0],
      bh: [26.2, 50.6], uae: [24.0, 54.5], om: [23.6, 58.4], pk: [24.9, 67.0],
      in: [28.6, 77.2], us: [41.9, -87.6]
    };
    var EDGES = [
      ['us', 'uae'], ['us', 'pk'], ['us', 'eg'], ['us', 'fr'], ['us', 'ksa'],
      ['fr', 'eg'], ['fr', 'uae'], ['eg', 'jo'], ['eg', 'sd'], ['eg', 'ksa'],
      ['sd', 'ss'], ['jo', 'iq'], ['jo', 'bh'], ['kw', 'ksa'], ['ksa', 'bh'],
      ['bh', 'uae'], ['uae', 'om'], ['uae', 'in'], ['om', 'pk'], ['pk', 'in'], ['in', 'ss']
    ];

    // Bake the photo once: brightness/saturation (was a per-frame CSS filter)
    // and a teal recolor. 'color' blend keeps the photo's luminance — its
    // city lights and land/ocean shading — while shifting hue/saturation
    // toward Acmetel teal. Low alpha keeps it a tinge, not a neon repaint.
    function bake(img) {
      var IW = Math.min(1280, img.naturalWidth || 1280);
      var IH = Math.round(IW / 2);
      var off = document.createElement('canvas');
      off.width = IW; off.height = IH;
      var octx = off.getContext('2d');
      octx.filter = 'brightness(1.75) saturate(1.05)';
      octx.drawImage(img, 0, 0, IW, IH);
      octx.filter = 'none';
      // 'color' shifts hue/saturation toward Acmetel teal while keeping the
      // photo's luminance (its lights + land/ocean shading).
      octx.globalCompositeOperation = 'color';
      octx.fillStyle = 'rgba(18, 190, 170, 0.42)';
      octx.fillRect(0, 0, IW, IH);
      // A gentle 'soft-light' teal pass then pushes the lit land/city areas
      // further toward on-brand teal-green without flattening the shading.
      octx.globalCompositeOperation = 'soft-light';
      octx.fillStyle = 'rgba(24, 200, 178, 0.38)';
      octx.fillRect(0, 0, IW, IH);
      octx.globalCompositeOperation = 'source-over';
      // Tile the baked texture twice horizontally. A slice's source window can
      // run past the right edge of one copy as the globe rotates; sampling the
      // doubled texture lets it read straight across the 0°/360° seam with no
      // per-slice wrap handling.
      texW = IW; texH = IH;
      var dbl = document.createElement('canvas');
      dbl.width = IW * 2; dbl.height = IH;
      var dctx = dbl.getContext('2d');
      dctx.drawImage(off, 0, 0);
      dctx.drawImage(off, IW, 0);
      texDbl = dbl; texReady = true;
    }

    function resize() {
      var r = globe.getBoundingClientRect();
      D = r.width || 1;
      canvas.width = Math.round(D * dpr);
      canvas.height = Math.round(D * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Tilted orthographic projection of a lat/lon onto the disc, matching the
    // grid surface below. φ is longitude relative to the meridian facing the
    // viewer, latR is latitude in radians, and the view is tilted by TILT so we
    // look slightly down onto the northern hemisphere. cosc is the cosine of
    // angular distance from the disc centre — the point is on the visible front
    // when cosc >= 0, and `fade` follows it so arcs soften all around the limb.
    function project(lat, lon) {
      var R = D / 2;
      var latR = lat * Math.PI / 180;
      var lonFrac = (lon + 180) / 360;
      var lonC = ((theta / (2 * Math.PI)) % 1 + 1) % 1;
      var dLon = (((lonFrac - lonC) % 1) + 1) % 1;
      if (dLon > 0.5) dLon -= 1;         // wrap to [-0.5, 0.5)
      var phi = dLon * 2 * Math.PI;      // [-π, π)
      var sl = Math.sin(latR), cl = Math.cos(latR), cp = Math.cos(phi);
      var x = R * (1 + cl * Math.sin(phi));
      var y = R * (1 - (cosTilt * sl - sinTilt * cl * cp));
      var cosc = sinTilt * sl + cosTilt * cl * cp;
      var front = cosc >= 0;
      var fade = Math.max(0, Math.min(1, cosc * 1.4));
      return { x: x, y: y, front: front, fade: fade };
    }

    function drawArcs(t) {
      var dash = (t * 0.05) % 16;
      ctx.lineCap = 'round';
      for (var i = 0; i < EDGES.length; i++) {
        var A = CITIES[EDGES[i][0]], B = CITIES[EDGES[i][1]];
        var a = project(A[0], A[1]), b = project(B[0], B[1]);
        if (!a.front || !b.front) continue;
        var op = Math.min(a.fade, b.fade);
        if (op <= 0.02) continue;
        var mx = (a.x + b.x) / 2;
        var my = (a.y + b.y) / 2 - (i % 2 === 0 ? 1 : -1) * Math.hypot(b.x - a.x, b.y - a.y) * 0.28;
        // Steady teal glow (soft bloom via a cheap canvas shadow) …
        ctx.setLineDash([]);
        ctx.shadowColor = 'rgba(95, 233, 214, 0.9)';
        ctx.shadowBlur = 5;
        ctx.strokeStyle = 'rgba(120, 240, 222,' + (0.55 * op).toFixed(3) + ')';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
        // … and a brighter dashed pulse traveling along it.
        ctx.shadowColor = 'rgba(207, 255, 243, 0.9)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(222, 255, 248,' + (0.95 * op).toFixed(3) + ')';
        ctx.lineWidth = 2; ctx.setLineDash([3, 11]); ctx.lineDashOffset = -dash;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.setLineDash([]);
    }

    // Reused vertex buffers for the triangle mesh (avoid per-frame allocation).
    var vX = [], vY = [], vU = [], vV = [], vC = [];

    // Draw one texture-mapped triangle: clip to the screen triangle, then blit
    // the doubled texture under the affine that maps its (u,v) corners onto the
    // screen corners. Triangles tile the tilted sphere with exact shared edges,
    // so there are no inter-cell gaps or staggering — unlike axis-aligned or
    // parallelogram cells, which can't tile a sheared curved surface.
    function drawTri(x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2) {
      var det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
      if (!det) return;
      var a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / det;
      var c = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / det;
      var b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / det;
      var d = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / det;
      var e = x0 - a * u0 - c * v0;
      var f = y0 - b * u0 - d * v0;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath();
      ctx.clip();
      ctx.setTransform(a * dpr, b * dpr, c * dpr, d * dpr, e * dpr, f * dpr);
      ctx.drawImage(texDbl, 0, 0);
      ctx.restore();
    }

    function drawGlobe(t) {
      ctx.clearRect(0, 0, D, D);
      if (texReady) {
        var R = D / 2, N = SLICES, M = BANDS;
        var dphi = 2 * Math.PI / N;                 // full 360° of longitude
        var lonC = ((theta / (2 * Math.PI)) % 1 + 1) % 1;
        var base = ((lonC - 0.5) % 1 + 1) % 1;      // texture longitude at φ = -180°
        var cols = N + 1, rows = M + 1;
        // Build the (N+1)x(M+1) vertex grid: screen position, texture coord, and
        // front/back flag for each lon/lat node.
        for (var gi = 0; gi < cols; gi++) {
          var phi = -Math.PI + gi * dphi;            // -180° .. +180°
          var sp = Math.sin(phi), cp = Math.cos(phi);
          var u = (base + gi / N) * texW;            // into the doubled texture
          for (var gj = 0; gj < rows; gj++) {
            var latR = (0.5 - gj / M) * Math.PI;
            var sl = Math.sin(latR), cl = Math.cos(latR);
            var k = gi * rows + gj;
            vX[k] = R + R * cl * sp;
            vY[k] = R - R * (cosTilt * sl - sinTilt * cl * cp);
            vU[k] = u;
            vV[k] = (gj / M) * texH;
            vC[k] = sinTilt * sl + cosTilt * cl * cp; // cos(angular dist): >=0 front
          }
        }
        // Emit two triangles per quad, skipping quads fully on the back face.
        for (var i = 0; i < N; i++) {
          for (var j = 0; j < M; j++) {
            var k00 = i * rows + j, k10 = (i + 1) * rows + j;
            var k01 = k00 + 1, k11 = k10 + 1;
            if (vC[k00] < 0 && vC[k10] < 0 && vC[k01] < 0 && vC[k11] < 0) continue;
            drawTri(vX[k00], vY[k00], vX[k10], vY[k10], vX[k01], vY[k01],
              vU[k00], vV[k00], vU[k10], vV[k10], vU[k01], vV[k01]);
            drawTri(vX[k10], vY[k10], vX[k11], vY[k11], vX[k01], vY[k01],
              vU[k10], vV[k10], vU[k11], vV[k11], vU[k01], vV[k01]);
          }
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // restore for the arcs
      }
      drawArcs(t);
    }
    function render(t) { drawGlobe(t || performance.now()); }

    // Load texture (webp, fall back to jpg), bake once, draw first frame.
    var img = new Image();
    img.onload = function () { bake(img); resize(); render(0); };
    img.onerror = function () {
      if (img.src.indexOf('globe.webp') > -1) { img.src = 'assets/globe.jpg'; }
    };
    img.src = 'assets/globe.webp';
    resize();

    // Spin physics (drag / throw), same feel as before — only the render
    // target changed. theta is the shared rotation phase.
    var baseAngSpeed = -(2 * Math.PI) / 26000; // rad/ms, gentle steady spin
    var targetAngSpeed = baseAngSpeed;
    var currentAngSpeed = baseAngSpeed;
    var grabbed = false, lastX = 0, lastMoveT = 0, angVelocity = baseAngSpeed;
    var DRAG_SENS = 1 / 260; // rad per CSS px dragged

    function beginGrab(clientX) { grabbed = true; lastX = clientX; lastMoveT = performance.now(); angVelocity = 0; }
    function applyDrag(clientX) {
      var now = performance.now();
      var dt = Math.max(1, now - lastMoveT);
      // Negated so the point under the pointer tracks the pointer.
      var dTheta = -(clientX - lastX) * DRAG_SENS;
      angVelocity += (dTheta / dt - angVelocity) * 0.5;
      theta = ((theta + dTheta) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      render(now);
      lastX = clientX; lastMoveT = now;
    }
    function endGrab() { grabbed = false; currentAngSpeed = angVelocity; targetAngSpeed = baseAngSpeed; }

    if (!reduced) {
      globe.addEventListener('mouseenter', function (e) { beginGrab(e.clientX); });
      globe.addEventListener('mousemove', function (e) { if (grabbed) applyDrag(e.clientX); });
      globe.addEventListener('mouseleave', endGrab);

      var touchId = null, tsx = 0, tsy = 0, deciding = false;
      function tracked(list) { for (var i = 0; i < list.length; i++) if (list[i].identifier === touchId) return list[i]; return null; }
      globe.addEventListener('touchstart', function (e) {
        if (touchId !== null) return;
        var t = e.changedTouches[0]; touchId = t.identifier; tsx = lastX = t.clientX; tsy = t.clientY; deciding = true;
      }, { passive: true });
      globe.addEventListener('touchmove', function (e) {
        if (touchId === null) return;
        var t = tracked(e.changedTouches); if (!t) return;
        if (deciding) {
          var adx = Math.abs(t.clientX - tsx), ady = Math.abs(t.clientY - tsy);
          if (adx < 8 && ady < 8) return;
          deciding = false; if (ady > adx) { touchId = null; return; } beginGrab(t.clientX);
        }
        if (!grabbed) return; e.preventDefault(); applyDrag(t.clientX);
      }, { passive: false });
      function endTouch(e) { if (touchId === null || !tracked(e.changedTouches)) return; touchId = null; deciding = false; if (grabbed) endGrab(); }
      globe.addEventListener('touchend', endTouch);
      globe.addEventListener('touchcancel', endTouch);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); render(performance.now()); }, 150);
    });

    if (reduced) { return; } // static frame already drawn once the texture loads

    // One GPU-cheap frame: ease the spin toward its target (or hold while
    // grabbed, since applyDrag renders directly) and redraw. Fully stops when
    // the globe scrolls off-screen or the tab is hidden.
    gateLoop(globe, makeLoop(function (dt) {
      if (grabbed) return;
      currentAngSpeed += (targetAngSpeed - currentAngSpeed) * Math.min(1, dt / 600);
      theta = ((theta + currentAngSpeed * dt) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      render(performance.now());
    }));
  })();

  (function countUp() {
    var nums = document.querySelectorAll('.stat__num');
    if (!nums.length) return;
    var t0 = performance.now();
    var dur = reduced ? 0 : 1700;
    function frame(now) {
      var p = dur ? Math.min(1, (now - t0) / dur) : 1;
      var eased = 1 - Math.pow(1 - p, 3);
      nums.forEach(function (el) {
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var val = target * eased;
        var shown = target >= 100 ? Math.round(val) : (Math.round(val * 10) / 10);
        el.textContent = shown + suffix;
      });
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ========================================================================
     Partner strip (in-hero, full colour)
     ===================================================================== */
  (function partners() {
    var track = document.getElementById('partnerTrack');
    if (!track) return;
    // Real logo files (assets/partners/), sourced from Wikimedia Commons /
    // official brand kits — see acmetel_partner_logos memory for exact
    // provenance per file. All chips get a white pill backing so every
    // logo's native colors stay true against this site's dark navy.
    var partners = [
      { name: 'Omantel', file: 'omantel.svg' },
      { name: 'stc', file: 'stc.svg' },
      { name: 'Mobily', file: 'mobily.svg' },
      { name: 'Sinch', file: 'sinch.svg' },
      { name: 'Zong 4G', file: 'zong.png' },
      { name: 'Etisalat Misr', file: 'etisalat-misr.svg' },
      { name: 'Zain', file: 'zain.svg', forceDark: true },
      { name: 'Twilio', file: 'twilio.svg' },
      { name: 'Airtel', file: 'airtel.svg' },
      { name: 'Orange', file: 'orange.svg' },
      { name: 'PTCL', file: 'ptcl.png' },
      { name: 'BICS', file: 'bics.png', forceDark: true },
      { name: 'TikTok', file: 'tiktok.svg' },
      { name: 'e&', file: 'e-and.svg' },
    ];
    var loop = partners.concat(partners);
    // Plain partner names as teal wordmarks on glassy pills (per client
    // request, reverted from the white photo-logo chips). The `file` fields
    // above are left in the data in case the image chips are ever restored.
    track.innerHTML = loop.map(function (p) {
      return '<span class="partner-chip">' + p.name + '</span>';
    }).join('');
  })();

  /* ========================================================================
     Services, data, dimensional icons, cursor tilt/glow
     ===================================================================== */
  // Every service icon uses the single Acmetel teal now (was a per-service
  // rainbow of coral/purple/blue/green/amber/cyan) — one accent, per client.
  var SERVICES = [
    { id: 'icon-voice', variant: 'teal', grad: 'g-teal', title: 'Voice', desc: 'Global voice termination with strong footholds in Pakistan and GCC destinations, now expanding across Africa, where growth potential is immense.' },
    { id: 'icon-messaging', variant: 'teal', grad: 'g-teal', title: 'Messaging', desc: 'A2P messaging delivered in close partnership with EMEA mobile operators. Every message reaches its destination seamlessly.' },
    { id: 'icon-cloud', variant: 'teal', grad: 'g-teal', title: 'Cloud Computing', desc: 'Acme CloudHub: public, private, hybrid and multi-cloud for government, enterprise, SME and startups. Secure, scalable, sovereign, and free from vendor lock-in.' },
    { id: 'icon-connectivity', variant: 'teal', grad: 'g-teal', title: 'Connectivity', desc: "Acme ConnectHub: connectivity through Pakistan's first terrestrial cable landing station on the Pak-China Optical Fiber Cable. Faster, more reliable, sovereign." },
    { id: 'icon-mnp', variant: 'teal', grad: 'g-teal', title: 'MNP Lookup', desc: 'Exclusive partner for the Pakistan MNP Database and MNP verification for international traffic, with unmatched accuracy and speed on porting status.' },
    { id: 'icon-did', variant: 'teal', grad: 'g-teal', title: 'DID / Toll-free', desc: 'Direct Inward Dialing that connects numbers straight to your PBX: local, premium-rate, toll-free, and international toll-free.' },
  ];

  // Chrome does not apply stylesheet rules that target elements *inside* a
  // <symbol> referenced via <use>, only properties inherited from the
  // <use> element itself come through. So a two-tone icon (white glyph +
  // a differently-coloured accent detail) can't be built by pointing CSS
  // classes at symbol children; each icon's markup is generated inline
  // instead, with fill/stroke colours baked in directly as attributes.
  var ACCENTS = {
    blue: '#133269', green: '#0A5A37', coral: '#A6371A',
    purple: '#402685', amber: '#8C5608', cyan: '#0A5866', white: '#163E8F',
    teal: '#0A5F55',
  };
  function svgIcon(id, accent) {
    var W = '#fff';
    var strokeMain = 'fill="none" stroke="' + W + '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"';
    var strokeAcc = 'fill="none" stroke="' + accent + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    switch (id) {
      case 'icon-voice': return '<path fill="' + W + '" d="M6 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2Z"/>';
      case 'icon-messaging': return '<path fill="' + W + '" d="M4 5.5h16v10.5H9l-4.5 4V5.5Z"/><path ' + strokeAcc + ' d="M8 10h8M8 13h5"/>';
      case 'icon-cloud': return '<path fill="' + W + '" d="M7.2 18a4.7 4.7 0 0 1 .4-9.38A6.2 6.2 0 0 1 19.3 11 3.7 3.7 0 0 1 18.2 18Z"/>';
      case 'icon-connectivity': return '<g ' + strokeMain + '><circle cx="12" cy="12" r="7.5"/><path d="M4.5 12h15"/><path d="M12 4.5c3 3 3 12 0 15"/><path d="M12 4.5c-3 3-3 12 0 15"/></g>';
      case 'icon-mnp': return '<g ' + strokeMain + '><circle cx="10.5" cy="10.5" r="6.2"/><path d="M15.3 15.3 20 20"/></g>';
      case 'icon-did': return '<rect fill="' + W + '" x="4.5" y="4.5" width="15" height="15" rx="3.5"/><g fill="' + accent + '"><circle cx="9" cy="9.5" r="1.5"/><circle cx="15" cy="9.5" r="1.5"/><circle cx="9" cy="14.5" r="1.5"/><circle cx="15" cy="14.5" r="1.5"/></g>';
      case 'icon-firewall': return '<path fill="' + W + '" d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path ' + strokeAcc + ' d="M9 12l2 2 4-4"/>';
      case 'icon-fraud': return '<path fill="' + W + '" d="M12 4l9 16H3L12 4Z"/><path ' + strokeAcc + ' d="M12 10v4M12 17h.01"/>';
      case 'icon-probe': return '<g ' + strokeMain + '><circle cx="12" cy="13" r="6"/><path d="M12 3v4"/></g><circle fill="' + accent + '" cx="12" cy="13" r="1.7"/>';
      case 'icon-esim': return '<path fill="' + W + '" d="M6 3h9l4 4v14H6V3Z"/><path fill="' + accent + '" d="M9 12h6v5H9v-5Z"/>';
      case 'icon-lock': return '<rect fill="' + W + '" x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path ' + strokeAcc + ' d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle fill="' + accent + '" cx="12" cy="15" r="1.4"/>';
      case 'icon-clipboard': return '<rect fill="' + W + '" x="5.5" y="4.5" width="13" height="16" rx="2.2"/><rect fill="' + accent + '" x="9" y="3" width="6" height="3" rx="1"/><path ' + strokeAcc + ' d="M8.5 12.5l2 2 4.5-4.5M8.5 16.5h4"/>';
      case 'icon-shieldcheck': return '<path fill="' + W + '" d="M12 3.5 19 6v6c0 4.4-3 7.2-7 8.5-4-1.3-7-4.1-7-8.5V6Z"/><path ' + strokeAcc + ' d="M9 12l2 2 4-4"/>';
      case 'icon-suitcase': return '<rect fill="' + W + '" x="4" y="8" width="16" height="11.5" rx="2.2"/><path ' + strokeAcc + ' d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path ' + strokeAcc + ' d="M4 13h16"/>';
      case 'icon-signal': return '<g fill="' + W + '"><rect x="3" y="14" width="3.4" height="5.5" rx="1"/><rect x="9" y="10" width="3.4" height="9.5" rx="1"/><rect x="15" y="6" width="3.4" height="13.5" rx="1"/></g>';
      case 'icon-shieldsearch': return '<path fill="' + W + '" d="M12 3.5 19 6v6c0 4.4-3 7.2-7 8.5-4-1.3-7-4.1-7-8.5V6Z"/><circle ' + strokeAcc + ' cx="11" cy="11.2" r="2.3"/><path ' + strokeAcc + ' d="m13.4 13.6 1.8 1.8"/>';
      default: return '<use href="#' + id + '" fill="' + W + '"/>';
    }
  }
  function iconTile(size, variant, iconId) {
    var accent = ACCENTS[variant] || '#163E8F';
    return '<div class="icon-tile icon-tile--' + variant + '" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + Math.round(size * 0.46) + '" height="' + Math.round(size * 0.46) + '" viewBox="0 0 24 24">' + svgIcon(iconId, accent) + '</svg></div>';
  }

  // Cursor tilt + following glow, shared by every card-style grid tile on
  // the page (services, security, testimonials, events, blog) rather than
  // reimplemented per section. Pair with the .tilt-glow CSS class (which
  // owns the ::after glow layer/transform base) on each card element.
  function attachCardTilt(cards) {
    cards.forEach(function (card) {
      // getBoundingClientRect() forces a synchronous layout; calling it on
      // every mousemove (as this used to) thrashes layout for the whole
      // duration of a hover. The card's box doesn't change between the moves
      // of a single hover, so read it once on enter and reuse it per move.
      var r = null;
      card.addEventListener('mouseenter', function () { r = card.getBoundingClientRect(); });
      card.addEventListener('mousemove', function (e) {
        if (!r) r = card.getBoundingClientRect();
        var mx = (e.clientX - r.left) / r.width;
        var my = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (mx * 100) + '%');
        card.style.setProperty('--my', (my * 100) + '%');
        if (reduced) return;
        var dx = mx - 0.5, dy = my - 0.5;
        card.style.transform = 'perspective(900px) rotateY(' + (dx * 10).toFixed(1) + 'deg) rotateX(' + (-dy * 10).toFixed(1) + 'deg) translateY(-4px) scale(1.012)';
      });
      card.addEventListener('mouseleave', function () {
        r = null;
        card.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0) scale(1)';
      });
    });
  }

  // Same rect-caching idea for the big feature graphics that tilt toward the
  // cursor (services orbit, security orbit, products stage). `evtHost` is
  // where pointer events are listened (sometimes a larger hit area than the
  // box being measured), `box` is what the cursor position is measured
  // against, `target` is what receives the transform. Consolidates three
  // near-identical mousemove/mouseleave blocks that previously each read the
  // rect on every move.
  function attachTilt(evtHost, box, target, persp, deg) {
    if (!evtHost || !box || !target || reduced) return;
    var r = null;
    evtHost.addEventListener('mouseenter', function () { r = box.getBoundingClientRect(); });
    evtHost.addEventListener('mousemove', function (e) {
      if (!r) r = box.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      target.style.transform = 'perspective(' + persp + 'px) rotateY(' + (dx * deg).toFixed(1) + 'deg) rotateX(' + (-dy * deg).toFixed(1) + 'deg)';
    });
    evtHost.addEventListener('mouseleave', function () {
      r = null;
      target.style.transform = 'perspective(' + persp + 'px) rotateY(0) rotateX(0)';
    });
  }

  (function services() {
    var grid = document.getElementById('servicesGrid');
    if (!grid) return;
    grid.innerHTML = SERVICES.map(function (s) {
      return '<div class="card tilt-glow" tabindex="0">' +
        iconTile(54, s.variant, s.id) +
        '<div class="card__title">' + s.title + '</div>' +
        '<div class="card__desc">' + s.desc + '</div>' +
        '<span class="card__link">Learn more →</span></div>';
    }).join('');

    attachCardTilt(grid.querySelectorAll('.card'));

    // orbit ring icons
    var spin = document.getElementById('orbitSpin');
    if (spin) {
      spin.innerHTML = SERVICES.map(function (s, i) {
        var angle = (i * 60);
        // 140px matches .orbit__ring--outer's actual radius (see the CSS
        // comment by that rule) so each icon's center sits exactly on the
        // drawn ring rather than floating past it — and since every icon
        // uses this same radius, they're all equidistant from the
        // Acmetel mark at .orbit__core by construction.
        // translate must come BEFORE rotate here, not after: CSS composes
        // a multi-function transform so a later function operates in the
        // coordinate frame the earlier ones already established. counter
        // ends up rotate(-angle)'d to cancel the parent's spin, so listing
        // translate(-50%,-50%) after it would rotate the centering offset
        // itself by -angle too — correct dead-center only at angle 0,
        // walking further off as angle grows (which is exactly the bug:
        // icons drifted off the ring by different amounts each).
        return '<div class="orbit-icon" style="transform:rotate(' + angle + 'deg) translateX(140px)">' +
          '<div class="orbit-icon__counter" style="transform:translate(-50%,-50%) rotate(' + (-angle) + 'deg)">' +
          '<div class="orbit-icon__inner"><svg width="20" height="20"><use href="#' + s.id + '" fill="url(#' + s.grad + ')"/></svg></div></div></div>';
      }).join('');
    }
    var orbit = document.getElementById('servicesOrbit');
    attachTilt(orbit, orbit, orbit, 900, 18);
  })();

  /* ========================================================================
     Products, scroll + cursor driven layout
     ===================================================================== */
  // All products now share the single Acmetel teal stage/icon (was coral/
  // blue/green/white per product) — "everything teal, not different colors".
  var TEAL_STAGE_BG = 'linear-gradient(150deg,#17BFAB,#0B6E62)';
  var PRODUCTS = [
    { id: 'icon-firewall', variant: 'teal', grad: 'g-teal', bg: TEAL_STAGE_BG, title: 'SMS Firewall', desc: 'Cutting-edge filtering that builds a robust blocking policy, safeguarding revenue and the customer experience.', cta: 'Learn more',
      stats: [{ num: '99.5%', label: 'Spam blocked' }, { num: '40%', label: 'Fraud loss cut' }] },
    { id: 'icon-fraud', variant: 'teal', grad: 'g-teal', bg: TEAL_STAGE_BG, title: 'Fraud Management', desc: 'State-of-the-art detection that manages and prevents fraudulent activity, a top concern for operators.', cta: 'Learn more',
      stats: [{ num: '24/7', label: 'Real-time monitoring' }, { num: '99.9%', label: 'Detection accuracy' }] },
    { id: 'icon-probe', variant: 'teal', grad: 'g-teal', bg: TEAL_STAGE_BG, title: 'Probe Testing', desc: 'Active route testing that verifies quality end-to-end, keeping every destination honest.', cta: 'Learn more',
      stats: [{ num: '150+', label: 'Routes tested daily' }, { num: '99.9%', label: 'ASR maintained' }] },
    { id: 'icon-esim', variant: 'teal', grad: 'g-teal', bg: TEAL_STAGE_BG, title: 'ACMeSIM', desc: 'Our consumer travel eSIM: 200+ destinations, plans from $0.99/GB. A smart eSIM for smart travel.', cta: 'Visit acmesim.global',
      stats: [{ num: '200+', label: 'Countries covered' }, { num: '$0.99', label: 'Per GB from' }] },
  ];

  (function products() {
    var stepsHost = document.getElementById('productsSteps');
    var rail = document.getElementById('productsRail');
    var tile = document.getElementById('productsTile');
    var stage = document.getElementById('productsStage');
    var indexEl = document.getElementById('productsIndex');
    var sticky = stage ? stage.closest('.scroller__sticky') : null;
    if (!stepsHost || !rail || !tile || !stage) return;

    stepsHost.innerHTML = PRODUCTS.map(function (p, i) {
      var stats = p.stats ? '<div class="step__stats">' + p.stats.map(function (s) {
        return '<div class="stat"><div class="stat__num">' + s.num + '</div><div class="stat__label">' + s.label + '</div></div>';
      }).join('') + '</div>' : '';
      return '<div class="step" data-index="' + i + '">' +
        '<div class="step__index">0' + (i + 1) + ' / 0' + PRODUCTS.length + '</div>' +
        iconTile(50, p.variant, p.id) +
        '<div class="step__title">' + p.title + '</div>' +
        '<div class="step__desc">' + p.desc + '</div>' +
        stats +
        '<a href="#contact" class="step__link" style="color:#5FE9D6">' + p.cta + ' →</a></div>';
    }).join('');

    rail.innerHTML = PRODUCTS.map(function (_, i) { return '<button class="tick" type="button" aria-label="Go to product ' + (i + 1) + '" data-index="' + i + '"></button>'; }).join('');

    function setActive(i) {
      var p = PRODUCTS[i];
      stage.style.setProperty('--product-bg', p.bg);
      if (indexEl) indexEl.textContent = '0' + (i + 1);
      tile.innerHTML = '<svg viewBox="0 0 24 24">' + svgIcon(p.id, ACCENTS[p.variant] || '#163E8F') + '</svg>' +
        '<div class="scroller__label">' + p.title + '</div>';
      rail.querySelectorAll('.tick').forEach(function (t, ti) { t.classList.toggle('is-active', ti === i); });
      stepsHost.querySelectorAll('.step').forEach(function (s, si) { s.classList.toggle('is-active', si === i); });
    }
    setActive(0);

    rail.querySelectorAll('.tick').forEach(function (t) {
      t.addEventListener('click', function () {
        var idx = parseInt(t.getAttribute('data-index'), 10);
        var target = stepsHost.querySelector('.step[data-index="' + idx + '"]');
        if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      });
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) setActive(parseInt(e.target.getAttribute('data-index'), 10));
        });
      }, { threshold: 0, rootMargin: '-42% 0px -42% 0px' });
      stepsHost.querySelectorAll('.step').forEach(function (s) { io.observe(s); });
    }

    attachTilt(sticky, stage, stage, 1000, 8);
  })();

  /* ========================================================================
     Decorative wavy lines behind the products panel
     ===================================================================== */
  (function whyLines() {
    var cv = document.getElementById('whyLinesTop');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var t0 = performance.now();
    function draw(t) {
      var w = cv.clientWidth, h = cv.clientHeight;
      if (!w) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(w * dpr)) { cv.width = w * dpr; cv.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var n = 12;
      // .section__lines is inset:0 over the whole (very tall, scroll-jacked)
      // products panel. Doubled from 6 to 12 lines in the same space, so
      // amplitude is halved from the 6-line tuning to match the now-halved
      // row spacing (h/n) — otherwise neighboring lines would cross into
      // each other's rows instead of reading as distinct waves.
      for (var i = 0; i < n; i++) {
        var y0 = (h / n) * i + Math.sin(t * 0.4 + i) * 11;
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        for (var x = 0; x <= w; x += 24) {
          var y = y0 + Math.sin(x * 0.008 + t * 0.5 + i * 1.7) * 12;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    // Under reduced-motion, paint one static frame and never loop; otherwise
    // gate on the canvas being on screen so the loop fully stops (not just
    // skips drawing) whenever the products panel isn't in view.
    if (reduced) { draw(0.4); return; }
    gateLoop(cv, makeLoop(function () { draw((performance.now() - t0) / 1000); }));
  })();

  /* ========================================================================
     Why Acmetel, points, big stats, pulse
     ===================================================================== */
  (function why() {
    var pts = document.getElementById('whyPoints');
    if (pts) {
      var points = [
        'Round-the-clock network operational support, no compromises',
        'Global presence across three continents',
        'Flexible pricing built around your traffic',
        'A dedicated team of telecom experts since 2010',
      ];
      pts.innerHTML = points.map(function (p) {
        return '<div class="why-point"><span class="why-point__check">✓</span><span>' + p + '</span></div>';
      }).join('');
    }
    var stats = document.getElementById('bigStats');
    if (stats) {
      var data = [
        { num: '100+', label: 'Partners worldwide', bg: 'var(--bg-card)', numColor: '#fff', labelColor: 'var(--text-dim-3)' },
        { num: '6B+', label: 'Minutes terminated every year', bg: 'var(--bg-deep)', numColor: '#fff', labelColor: 'var(--text-dim-2)' },
        { num: '2B+', label: 'Messages delivered', bg: 'linear-gradient(135deg,#17BFAB,#0B6E62)', numColor: '#fff', labelColor: 'rgba(255,255,255,0.9)' },
        { num: '3', label: 'Continents of global presence', bg: 'var(--bg-card)', numColor: 'var(--teal-bright)', labelColor: 'var(--text-dim-3)' },
      ];
      stats.innerHTML = data.map(function (s) {
        return '<div class="big-stat" style="background:' + s.bg + '">' +
          '<div class="big-stat__num" style="color:' + s.numColor + '">' + s.num + '</div>' +
          '<div class="big-stat__label" style="color:' + s.labelColor + '">' + s.label + '</div></div>';
      }).join('');
    }
    var pulseCanvas = document.getElementById('pulseCanvas');
    if (pulseCanvas && window.AcmetelPulse) {
      new window.AcmetelPulse(pulseCanvas, { mouseTarget: pulseCanvas.closest('.pulse-wrap') });
    }
  })();

  /* ========================================================================
     Testimonials
     ===================================================================== */
  (function testimonials() {
    var grid = document.getElementById('testimonialsGrid');
    if (!grid) return;
    var data = [
      { quote: 'Acmetel’s NOC flagged a routing degradation on our GCC corridor before our own monitoring even caught it. That’s the kind of partner you want underneath a Tier-1 contract.', name: 'Faisal R.', role: 'Director of Carrier Relations, Regional Mobile Operator', metric: '99.9% ASR', initials: 'FR', color: '#17BFAB' },
      { quote: 'We moved our A2P traffic to Acmetel mid-quarter and delivery rates across our EMEA routes improved within the first two weeks. No renegotiation drama, no downtime.', name: 'Priya N.', role: 'Head of Messaging Platform, E-commerce Enterprise', metric: '2-week cutover', initials: 'PN', color: '#12A594' },
      { quote: 'ACMeSIM is the first travel eSIM our support team didn’t have to build a playbook around. It activates and holds a connection, which is all we ever ask of it.', name: 'Daniel K.', role: 'Founder, Travel-Tech Startup', metric: '200+ countries', initials: 'DK', color: '#0E9E8C' },
    ];
    grid.innerHTML = data.map(function (t) {
      return '<div class="t-card tilt-glow">' +
        '<div class="t-card__quote-mark">' + icon('icon-quote', ' width="30" height="22" fill="rgba(111,160,255,0.5)"') + '</div>' +
        '<div class="t-card__text">“' + t.quote + '”</div>' +
        '<div class="t-card__foot">' +
        '<div class="t-card__avatar" style="background:' + t.color + '">' + t.initials + '</div>' +
        '<div><div class="t-card__name">' + t.name + '</div><div class="t-card__role">' + t.role + '</div></div>' +
        '<span class="t-card__metric">' + t.metric + '</span></div></div>';
    }).join('');
    attachCardTilt(grid.querySelectorAll('.t-card'));
  })();

  /* ========================================================================
     Security, orbit badges + cards
     ===================================================================== */
  (function security() {
    var badgesHost = document.getElementById('securityBadges');
    if (badgesHost) {
      var badges = ['GDPR', 'SOC 2 Type II', 'PCI DSS', 'ISO 27001'];
      badgesHost.innerHTML = badges.map(function (b, i) {
        var angle = i * 90;
        // 160px matches .orbit--shield's outer ring radius: that variant is
        // 380px square with the same shared 30px inset as the default
        // .orbit, so (380 - 2*30)/2 = 160 — same reasoning as the services
        // orbit-icon radius, kept in sync with the ring it's meant to sit on.
        return '<div class="orbit-badge" style="transform:rotate(' + angle + 'deg) translateX(160px)">' +
          '<div class="orbit-badge__counter" style="transform:translate(-50%,-50%) rotate(' + (-angle) + 'deg)">' +
          '<div class="orbit-badge__inner">' + b + '</div></div></div>';
      }).join('');
    }
    var orbit = document.getElementById('securityOrbit');
    attachTilt(orbit, orbit, orbit, 900, 16);
    var grid = document.getElementById('securityGrid');
    if (!grid) return;
    var cards = [
      { id: 'icon-lock', title: 'Data protection', desc: 'State-of-the-art encryption safeguards every call, message, and byte, in transit and at rest. Peace of mind for you and your customers.', badges: ['End-to-end encryption', 'Zero-trust network'] },
      { id: 'icon-clipboard', title: 'Compliance standards', desc: 'We adhere to global regulatory standards: GDPR, SOC 2 Type II, and PCI DSS, aligning with industry best practice for a secure, compliant environment.', badges: ['GDPR', 'SOC 2 Type II', 'PCI DSS'] },
      { id: 'icon-shieldcheck', title: 'Security commitment', desc: 'A continuously hardened framework with enterprise-grade SSO, regular audits, and independent assessments, upholding the highest standards.', badges: ['SSO', 'Regular audits', '24/7 monitoring'] },
    ];
    grid.innerHTML = cards.map(function (c) {
      return '<div class="card tilt-glow">' + iconTile(52, 'teal', c.id) +
        '<div class="card__title">' + c.title + '</div>' +
        '<div class="card__desc">' + c.desc + '</div>' +
        '<div class="badge-row">' + c.badges.map(function (b) { return '<span class="badge">' + b + '</span>'; }).join('') + '</div></div>';
    }).join('');
    attachCardTilt(grid.querySelectorAll('.card'));
  })();

  /* ========================================================================
     Events + Flight path + Blog
     ===================================================================== */
  (function events() {
    var grid = document.getElementById('eventsGrid');
    if (grid) {
      // Each event card now leads with a real conference/people photo
      // (assets/events/), per client request. Date accents unified to the
      // single Acmetel teal (was a per-card rainbow).
      var data = [
        { name: 'ITW Africa', date: 'Sep 8–10, 2026', place: 'Nairobi', img: 'itw-africa.jpg' },
        { name: 'WWC Madrid', date: 'Sep 16–18, 2026', place: 'Madrid', img: 'wwc-madrid.jpg' },
        { name: 'Capacity Europe', date: 'Oct 13–15, 2026', place: 'London', img: 'capacity-europe.jpg' },
        { name: 'GCCM Middle East', date: 'Nov 1–4, 2026', place: 'Oman', img: 'gccm-me.jpg' },
        { name: 'Africa Tech Festival', date: 'Nov 17–19, 2026', place: 'Cape Town', img: 'africa-tech.jpg' },
      ];
      grid.innerHTML = data.map(function (e) {
        return '<div class="event-card tilt-glow">' +
          '<div class="event-card__media"><img class="event-card__img" src="assets/events/' + e.img + '" alt="Attendees at ' + e.name + '" loading="lazy"></div>' +
          '<div class="event-card__date" style="color:#2DD4BF">' + e.date + '</div>' +
          '<div class="event-card__name">' + e.name + '</div>' +
          '<div class="event-card__place">' + icon('icon-pin', ' width="13" height="13" fill="currentColor"') + ' ' + e.place + '</div>' +
          '<span class="event-card__cta">Book now →</span></div>';
      }).join('');
      attachCardTilt(grid.querySelectorAll('.event-card'));
    }
    var flight = document.getElementById('flightPath');
    var plane = document.getElementById('flightPlane');
    if (flight && plane) {
      var hovering = false;
      var hoverTime = 0;
      var progress = 0;
      var lastTime = performance.now();
      var slowDuration = 7;
      var pulsePeriod = 1.2;

      function stepFlight(now) {
        var delta = (now - lastTime) / 1000;
        lastTime = now;

        if (hovering) {
          hoverTime += delta;
        } else {
          hoverTime = 0;
        }

        var pulse = 0.5 + 0.5 * Math.sin((hoverTime / pulsePeriod) * Math.PI * 2);
        var speedMultiplier = 1 + Math.pow(1 + hoverTime * 0.7, 2.2) + (pulse * 0.12 * Math.pow(1 + hoverTime * 0.7, 0.8));
        var duration = slowDuration / speedMultiplier;
        progress = (progress + (delta / duration)) % 1;
        plane.style.setProperty('--flight-distance', (progress * 100) + '%');
        requestAnimationFrame(stepFlight);
      }

      flight.addEventListener('mouseenter', function () {
        hovering = true;
        hoverTime = 0;
        flight.classList.add('is-fast');
      });
      flight.addEventListener('mouseleave', function () {
        hovering = false;
        flight.classList.remove('is-fast');
      });

      requestAnimationFrame(stepFlight);
    }
    var blog = document.getElementById('blogList');
    if (blog) {
      var posts = [
        { id: 'icon-suitcase', variant: 'teal', grad: 'g-teal', tag: 'Travel', tagColor: '#2DD4BF', title: 'How to avoid roaming charges abroad: the smart traveler’s guide for 2026' },
        { id: 'icon-signal', variant: 'teal', grad: 'g-teal', tag: 'Technology', tagColor: '#2DD4BF', title: 'eSIM: the next step in mobile evolution, benefits and the future ahead' },
        { id: 'icon-shieldsearch', variant: 'teal', grad: 'g-teal', tag: 'Security', tagColor: '#2DD4BF', title: 'A comprehensive guide to AI scams: common tactics and preventive strategies' },
      ];
      blog.innerHTML = posts.map(function (p) {
        return '<a href="#events" class="blog-post tilt-glow">' + iconTile(44, p.variant, p.id) +
          '<div><div class="blog-post__tag" style="color:' + p.tagColor + '">' + p.tag + '</div>' +
          '<div class="blog-post__title">' + p.title + '</div></div></a>';
      }).join('');
      attachCardTilt(blog.querySelectorAll('.blog-post'));
    }
  })();

  /* ========================================================================
     Contact form (client-side demo, no backend wired up yet)
     ===================================================================== */
  (function contact() {
    var form = document.getElementById('contactForm');
    var btn = document.getElementById('ctSubmit');
    if (!form || !btn) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.textContent = '✓ Message sent';
      btn.style.background = 'var(--green)';
      btn.disabled = true;
      var note = document.createElement('div');
      note.className = 'contact-card__note';
      note.textContent = 'Thanks! A member of our team will be in touch shortly.';
      form.appendChild(note);
    });
  })();

  /* ========================================================================
     Reveal on scroll
     ===================================================================== */
  (function reveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduced) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  })();
})();
