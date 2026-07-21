(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var icon = function (id, extra) {
    return '<svg' + (extra || '') + '><use href="#' + id + '"/></svg>';
  };

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

  /* ========================================================================
     Hero particle background: a lightweight "network constellation" canvas
     — small dots, thin lines drawn between whichever pairs are currently
     close together — sitting in .hero__bg (z-index: 0, already an empty
     layer behind the vignette/content/globe). Plain canvas 2D rather than
     a video: no asset to source/host, trivially themeable to match the
     site's palette, and it composites under the globe/text for free since
     those already sit in later, higher z-index layers.

     Each particle orbits a slowly-drifting center rather than just moving
     in a straight line — that's what gives the field its visible rotating
     quality, on top of the slower overall wander. Both rates are in
     units/ms (not units/frame) and every step is scaled by real elapsed
     time, so the motion holds the same slow speed regardless of the
     display's refresh rate. Because each particle's orbit has its own
     random radius, angular speed and direction, neighboring pairs drift
     in and out of link range on their own independent cycles — that's
     what produces the connect/disconnect look, not anything scripted. */
  (function heroParticles() {
    var canvas = document.getElementById('heroParticles');
    var hero = document.querySelector('.hero');
    if (!canvas || !hero || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0;
    var particles = [];
    var LINK_DIST = 140;

    function resize() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scales with area but is capped so very large/ultrawide
      // viewports don't quietly balloon into an O(n^2) line-check cost.
      var count = Math.min(90, Math.round((W * H) / 14000));
      particles = [];
      for (var i = 0; i < count; i++) {
        var cx = Math.random() * W, cy = Math.random() * H;
        var orbitR = 10 + Math.random() * 30;
        var angle = Math.random() * Math.PI * 2;
        particles.push({
          cx: cx, cy: cy,
          // Center drift: a slow wander so the whole field never sits
          // static, independent of each particle's own local orbit.
          dcx: (Math.random() - 0.5) * 0.006, dcy: (Math.random() - 0.5) * 0.006,
          orbitR: orbitR,
          angle: angle,
          // rad/ms, one revolution roughly every 20-45s; direction is
          // per-particle so the field turns as a loose swirl, not a disc.
          angSpeed: (Math.random() < 0.5 ? -1 : 1) * (Math.PI * 2 / (20000 + Math.random() * 25000)),
          x: cx + orbitR * Math.cos(angle), y: cy + orbitR * Math.sin(angle),
          r: 1 + Math.random() * 1.4
        });
      }
    }
    resize();

    function step(dt) {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.cx += p.dcx * dt; p.cy += p.dcy * dt;
        if (p.cx < -40) p.cx = W + 40; else if (p.cx > W + 40) p.cx = -40;
        if (p.cy < -40) p.cy = H + 40; else if (p.cy > H + 40) p.cy = -40;
        p.angle += p.angSpeed * dt;
        p.x = p.cx + p.orbitR * Math.cos(p.angle);
        p.y = p.cy + p.orbitR * Math.sin(p.angle);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var dx = particles[a].x - particles[b].x, dy = particles[a].y - particles[b].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            ctx.strokeStyle = 'rgba(111, 160, 255, ' + ((1 - d / LINK_DIST) * 0.35).toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
      for (var i2 = 0; i2 < particles.length; i2++) {
        ctx.beginPath();
        ctx.arc(particles[i2].x, particles[i2].y, particles[i2].r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 210, 255, 0.75)';
        ctx.fill();
      }
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); draw(); }, 150);
    });

    draw(); // immediate first paint, before the rAF loop's first real tick
    if (reduced) { return; }

    var lastT = null;
    function frame(t) {
      if (lastT == null) lastT = t;
      var dt = Math.min(100, t - lastT);
      lastT = t;
      step(dt);
      draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ========================================================================
     Hero globe: turntable-style spin control + stats count-up

     No parallax, no panning — the globe never moves on screen. The only
     interaction is with the spin itself, like scrubbing a DJ turntable:
     while the cursor is over the globe, horizontal mouse movement grabs
     the surface and drags it 1:1 (in either direction, at any speed);
     letting go "throws" it at whatever velocity your hand was moving and
     that throw decays back to the default steady rightward spin. Off the
     globe, or with no interaction at all, it just spins right on its own.

     The surface itself is built from N vertical strips rather than one
     panned background (see the comment above .hero-globe-strip in
     styles.css for why a single flat pan can't look spherical). Rotation
     state is tracked as an angle theta (radians) instead of a raw pixel
     offset, advanced at a constant angular rate — the same way a real
     sphere spins — and every strip derives its screen geometry, its own
     background-size scale, and its own pan speed from an orthographic
     projection (screen-x = R*sin(angle)) of that shared theta. Center
     strips end up wide and fast, limb strips narrow and slow, which is
     what actually produces the deceleration + foreshortening cues a flat
     pan can't. Markers reuse the same projection so they slow/compress in
     step with the surface underneath them instead of sliding linearly.
     ===================================================================== */
  (function heroGlobeSpin() {
    var globe = document.querySelector('.hero-globe');
    if (!globe) return;

    // globe.jpg is 4096x2048 (2:1, see IMAGE_ASPECT below); at "cover"
    // sizing one full seamless rotation loop pans through width*IMAGE_ASPECT
    // texture px — this is the reference ("s=1") scale every strip's own
    // scale is derived from. Recomputed on resize since .hero-globe-wrap is
    // fluid (clamp()), so a single fixed pan distance can't stay correct at
    // every size.
    var pan = 990;
    var boxW = 0, boxH = 0, R = 0;
    var theta = 0; // rotation phase, radians
    var linksSvg = globe.querySelector('.globe-links');

    // Strip count. Adjacent strips are made edge-continuous (see paintStrips),
    // so the seams between them don't show regardless of count; more strips
    // only smooths the step-to-step change in foreshortening. DA is the fixed
    // angular width of one strip — the whole visible hemisphere is PI radians
    // of longitude split into STRIPS equal angular slices.
    var STRIPS = 24;
    var DA = Math.PI / STRIPS;
    // globe.jpg is 4096x2048 (2:1) — used in tune() to derive each strip's
    // background-size height from its (aspect-agnostic, continuity-driven)
    // width, rather than pinning height to the box and letting width imply
    // whatever aspect ratio the projection geometry happens to produce.
    var IMAGE_ASPECT = 4096 / 2048;
    var strips = []; // { el, aLo, aHi, a, left, width }

    function buildStrips() {
      // Idempotent — resize just rebuilds geometry in place rather than
      // recreating elements, since STRIPS never changes at runtime.
      if (strips.length) return;
      for (var i = 0; i < STRIPS; i++) {
        var el = document.createElement('div');
        el.className = 'hero-globe-strip';
        globe.insertBefore(el, globe.firstChild);
        strips.push({ el: el, aLo: 0, aHi: 0, a: 0, left: 0, width: 0 });
      }
      // Strips were inserted front-first above, so put them back in
      // left-to-right DOM order (purely cosmetic — they're all z-index: 0
      // absolute-positioned, but keeps DOM order sane for devtools).
      strips.reverse();
    }
    buildStrips();

    function tune() {
      var r = globe.getBoundingClientRect();
      boxW = r.width; boxH = r.height; R = boxW / 2;
      if (boxW) pan = boxW * IMAGE_ASPECT;
      // Keeps the SVG's user-space units identical to the marker math's px,
      // so a link path can reuse a marker's bx/by with no unit conversion.
      if (linksSvg) linksSvg.setAttribute('viewBox', '0 0 ' + boxW + ' ' + boxH);

      // bgHeight is pinned to boxH (100%) for every strip, full stop — not
      // adjustable. Markers position themselves with `latFrac * boxH` (see
      // updateMarkers() below), i.e. they assume the WHOLE image height
      // maps to the WHOLE box height with no cropping; a background-size
      // taller than boxH (an earlier version of this code tried exactly
      // that, to fix the aspect ratio) crops off part of the actual
      // latitude range, desyncing the visible texture from where markers
      // land and from what boxH is even supposed to represent. So the
      // aspect-ratio fix has to live entirely on the width axis instead —
      // see bgWidth below for how that's done without breaking continuity.
      //
      // refBgWidth is what bgWidth should be for a strip centered exactly
      // at a=0 (phi=0, dead center, zero foreshortening) for that strip's
      // horizontal scale to equal boxH/nativeHeight — the same scale
      // height is already using — which is the only way to guarantee no
      // stretch specifically at the point directly facing the viewer.
      var refBgWidth = boxH * IMAGE_ASPECT;
      // contentFrac accumulates how far into one full 2*PI loop of texture
      // each strip's LEFT edge sits, strip by strip, left to right — see
      // the loop below for why this has to be a running sum rather than a
      // formula evaluated independently per strip.
      var contentFrac = 0;

      strips.forEach(function (s, i) {
        var aLo = -Math.PI / 2 + i * DA;
        var aHi = aLo + DA;
        var a = aLo + DA / 2;
        var xLo = R * (1 + Math.sin(aLo)), xHi = R * (1 + Math.sin(aHi));
        var width = Math.max(0.5, xHi - xLo);
        s.a = a; s.aLo = aLo; s.aHi = aHi; s.left = xLo; s.width = width;
        s.el.style.left = xLo.toFixed(2) + 'px';
        s.el.style.width = width.toFixed(2) + 'px';
        // bgWidth follows cos(a) — the same falloff shape width itself
        // already has near the limb — scaled so it hits exactly refBgWidth
        // at a=0. This is what actually fixes the aspect ratio (width no
        // longer aspect-ratio-agnostic, unlike every earlier version of
        // this formula); cos(a) never reaches exactly 0 for a real strip
        // (the outermost strip's center sits at PI/2 - DA/2, not PI/2), so
        // this doesn't need the same "clamped to at least 0.5" guard width
        // does, but it's clamped anyway for safety against a future STRIPS
        // change making DA large enough for that to matter.
        var bgWidth = Math.max(1, refBgWidth * Math.cos(a));
        // Continuity now can't be expressed as a fixed fraction-per-strip
        // (DA/(2*PI)) the way it could when bgWidth was aspect-agnostic —
        // cos(a) makes each strip's own content-fraction span
        // (width/bgWidth) genuinely different from its neighbors', by
        // design. So instead of computing each strip's position from its
        // own angle independently, accumulate: this strip's content
        // starts exactly where the previous one's ended, by construction,
        // for every strip, at any zoom/box size — continuity is then true
        // by definition rather than something that has to come out right
        // from unrelated formulas agreeing.
        s.bgWidth = bgWidth;
        s.contentFracLo = contentFrac;
        contentFrac += width / bgWidth;
        s.el.style.backgroundSize = bgWidth.toFixed(2) + 'px 100%';
      });
    }
    tune();

    // Where texture-longitude lonFrac currently sits on screen. This has to
    // invert the SAME cos(a)-weighted mapping tune() builds each strip's
    // bgWidth/contentFracLo from above — markers can't just use the plain
    // orthographic mu-theta angle the way they could before that mapping
    // existed, because the texture is no longer sampled linearly against
    // screen angle (that's specifically what fixes the aspect ratio); using
    // the old linear formula here would position markers correctly for a
    // texture that isn't actually the one on screen, showing up as every
    // marker sitting shifted from its real country.
    //
    // In the continuous limit, tune()'s per-strip content increment
    // width_i/bgWidth_i = R*cos(a)*da / (refBgWidth*cos(a)) = (R/refBgWidth)*da
    // — cos(a) cancels exactly — so the content-fraction shown at screen
    // angle a is just linear in a: contentFrac(a) = (R/refBgWidth)*(a+PI/2).
    // Solving that for a given a target content-fraction inverts cleanly
    // with no trig needed. (This mapping only spans [0, PI/(2*IMAGE_ASPECT)]
    // over the visible hemisphere rather than the "half the texture" a true
    // linear-in-longitude mapping would — that's fine: it only needs to be
    // the correct inverse of what's actually on screen, not a physically
    // exact sphere unwrap.)
    function project(lonFrac) {
      var refBgWidth = boxH * IMAGE_ASPECT; // must match tune()'s refBgWidth exactly
      var thetaFrac = theta / (2 * Math.PI);
      var targetFrac = ((lonFrac - thetaFrac) % 1 + 1) % 1;
      var fullFrontSpan = (Math.PI * R) / refBgWidth; // == PI/(2*IMAGE_ASPECT)
      var visible = targetFrac >= 0 && targetFrac <= fullFrontSpan;
      var phi = targetFrac * (refBgWidth / R) - Math.PI / 2;
      return { phi: phi, visible: visible, x: R * (1 + Math.sin(phi)) };
    }

    function paintStrips() {
      // Rotation shifts every strip's content-fraction by the same amount:
      // theta/(2*PI), i.e. a full 2*PI spin shifts by exactly 1.0 — one
      // whole loop — which is what makes the wrap from theta=2*PI back to
      // 0 seamless (the content-fraction lands back on the exact value it
      // started at, mod 1). Wrapping into [0,1) here isn't required for
      // correctness (background-position tiles regardless), just keeps
      // the numbers bounded/readable.
      var thetaFrac = theta / (2 * Math.PI);
      strips.forEach(function (s) {
        var frac = ((s.contentFracLo + thetaFrac) % 1 + 1) % 1;
        s.el.style.backgroundPositionX = (-frac * s.bgWidth).toFixed(2) + 'px';
      });
    }
    paintStrips();

    // Markers: each is pinned to a lat/long read from its data-lat/data-lon
    // attributes. lonFrac feeds the same orthographic project() the strips
    // use, so a marker tracks the sphere point it's pinned to — slowing and
    // compressing toward the limb in step with the surface underneath it —
    // instead of sliding across the box at a constant rate. latFrac still
    // maps straight to y (0=north pole, 1=south pole); vertical curvature
    // isn't modeled, the circular clip on .hero-globe does the equivalent
    // job of tapering a column's visible height near the limb.
    var markers = Array.prototype.map.call(globe.querySelectorAll('.globe-marker'), function (el) {
      var lat = parseFloat(el.getAttribute('data-lat'));
      var lon = parseFloat(el.getAttribute('data-lon'));
      return { id: el.getAttribute('data-id'), el: el, lonFrac: (lon + 180) / 360, latFrac: (90 - lat) / 180 };
    });
    // Data links: a plain list of marker-id pairs, purely for visual density
    // ("data flying all over the globe") rather than any real network
    // topology — so it's not trying to look geographically sensible, just
    // busy. Each pair gets two SVG paths (a steady glow + an animated
    // dashed flow on top, styled in CSS) generated below instead of
    // hand-written, since a plain array is far easier to keep extending
    // than duplicating markup per edge.
    var linkEdges = [
      ['us', 'uae'], ['us', 'pk'], ['us', 'in'], ['us', 'eg'], ['us', 'fr'], ['us', 'ksa'], ['us', 'om'],
      ['fr', 'eg'], ['fr', 'uae'], ['fr', 'pk'],
      ['eg', 'jo'], ['eg', 'sd'], ['eg', 'iq'], ['eg', 'ksa'],
      ['sd', 'ss'], ['sd', 'pk'],
      ['jo', 'iq'], ['jo', 'ksa'], ['jo', 'bh'],
      ['iq', 'kw'],
      ['kw', 'ksa'], ['kw', 'bh'],
      ['ksa', 'bh'],
      ['bh', 'uae'],
      ['uae', 'om'], ['uae', 'in'],
      ['om', 'pk'], ['om', 'in'],
      ['pk', 'uae'], ['pk', 'in'],
      ['in', 'ss']
    ];
    var linkPaths = [];
    if (linksSvg) {
      linkEdges.forEach(function (edge, i) {
        ['globe-link--glow', 'globe-link--flow'].forEach(function (cls) {
          var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('class', 'globe-link ' + cls);
          path.setAttribute('data-from', edge[0]);
          path.setAttribute('data-to', edge[1]);
          path.setAttribute('data-bow', i % 2 === 0 ? '1' : '-1');
          linksSvg.appendChild(path);
          linkPaths.push(path);
        });
      });
    }
    var markerState = {};

    function updateMarkers() {
      markers.forEach(function (m) {
        var proj = project(m.lonFrac);
        var bx = proj.x;
        var by = m.latFrac * boxH;
        var visible = proj.visible;
        var falloff = 0;
        m.el.style.opacity = visible ? '1' : '0';
        if (visible) {
          m.el.style.left = bx.toFixed(1) + 'px';
          m.el.style.top = by.toFixed(1) + 'px';
          // Fade/shrink near the left/right limb rather than popping in/out.
          // cos(phi) is already ~0 right at the limb (phi -> ±90°), so this
          // mostly just softens the pop-in/out rather than doing the heavy
          // lifting the way the old edge-distance falloff had to.
          falloff = Math.max(0, Math.min(1, Math.cos(proj.phi) * 1.15));
          m.el.style.opacity = falloff.toFixed(2);
          m.el.style.transform = 'translate(-50%, -50%) scale(' + (0.75 + 0.25 * falloff).toFixed(2) + ')';
        }
        markerState[m.id] = { bx: bx, by: by, visible: visible, falloff: falloff };
      });
      updateLinks();
    }

    function updateLinks() {
      linkPaths.forEach(function (path) {
        var a = markerState[path.getAttribute('data-from')];
        var b = markerState[path.getAttribute('data-to')];
        if (!a || !b || !a.visible || !b.visible) { path.style.opacity = '0'; return; }
        var opacity = Math.min(a.falloff, b.falloff);
        if (opacity <= 0.02) { path.style.opacity = '0'; return; }
        // Quadratic bezier bowed away from a straight line between the two
        // points, proportional to their spacing, so it reads as a hop
        // arcing over the sphere rather than cutting through it. Bow
        // direction alternates per link (data-bow) so with this many edges
        // overlapping, arcs cross both above and below their chords instead
        // of all bowing the same way, which read flatter/more repetitive.
        var bow = path.getAttribute('data-bow') === '-1' ? -1 : 1;
        var mx = (a.bx + b.bx) / 2;
        var my = (a.by + b.by) / 2 - bow * Math.hypot(b.bx - a.bx, b.by - a.by) * 0.28;
        path.setAttribute('d', 'M' + a.bx.toFixed(1) + ',' + a.by.toFixed(1) +
          ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + b.bx.toFixed(1) + ',' + b.by.toFixed(1));
        path.style.opacity = opacity.toFixed(2);
      });
    }

    if (reduced) {
      paintStrips();
      updateMarkers();
      window.addEventListener('resize', function () { tune(); paintStrips(); updateMarkers(); });
      return;
    }

    // K: px-per-radian at the s=1 reference scale — the conversion between
    // screen-px mouse movement and the angular theta the strips/markers
    // actually run on. Kept in sync with tune() so drag feel doesn't change
    // as the box resizes.
    var K = pan / (2 * Math.PI);
    // project()'s phi = mu - theta means *increasing* theta actually slides
    // the visible surface left (the same inversion the drag handler below
    // corrects for), so the default has to be negative to read as the
    // rightward spin its own name promises.
    var baseAngSpeed = -(2 * Math.PI) / 18000; // rad/ms, the default steady rightward spin
    var targetAngSpeed = baseAngSpeed;
    var currentAngSpeed = baseAngSpeed;
    var lastT = null;
    var grabbed = false;
    var lastX = 0;
    var lastMoveT = 0;
    var angVelocity = baseAngSpeed; // rad/ms, tracked while grabbed for the throw
    var dragSensitivity = 1 / 3; // hover/grab control is 3x less sensitive than a 1:1 drag

    globe.addEventListener('mouseenter', function (e) {
      grabbed = true;
      lastX = e.clientX;
      lastMoveT = performance.now();
      angVelocity = 0;
    });
    globe.addEventListener('mousemove', function (e) {
      if (!grabbed) return;
      var now = performance.now();
      var dt = Math.max(1, now - lastMoveT);
      // Negated: project() computes screen-x from phi = mu - theta, so
      // increasing theta actually slides the visible surface left. Without
      // the flip here, dragging right would move the surface left under
      // the cursor — backwards from what a direct-manipulation drag should
      // feel like (the point under your cursor should track your cursor).
      var dTheta = -((e.clientX - lastX) * dragSensitivity) / K;
      angVelocity += (dTheta / dt - angVelocity) * 0.5; // smoothed instantaneous speed
      theta = ((theta + dTheta) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      paintStrips();
      updateMarkers();
      lastX = e.clientX;
      lastMoveT = now;
    });
    globe.addEventListener('mouseleave', function () {
      grabbed = false;
      // Throw: keep whatever speed the hand was moving at on release, then
      // let the frame loop below ease it back to the default spin.
      currentAngSpeed = angVelocity;
      targetAngSpeed = baseAngSpeed;
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        tune();
        K = pan / (2 * Math.PI);
        paintStrips();
        updateMarkers();
      }, 150);
    });

    function frame(t) {
      if (lastT == null) lastT = t;
      var dt = Math.min(100, t - lastT);
      lastT = t;
      if (!grabbed) {
        currentAngSpeed += (targetAngSpeed - currentAngSpeed) * Math.min(1, dt / 600);
        theta = ((theta + currentAngSpeed * dt) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        paintStrips();
        updateMarkers();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
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
    track.innerHTML = loop.map(function (p) {
      return '<span class="partner-chip partner-chip--pill">' +
        '<img class="partner-chip__logo' + (p.forceDark ? ' partner-chip__logo--dark' : '') + '" src="assets/partners/' + p.file + '" alt="' + p.name + '" loading="lazy"></span>';
    }).join('');
  })();

  /* ========================================================================
     Services, data, dimensional icons, cursor tilt/glow
     ===================================================================== */
  var SERVICES = [
    { id: 'icon-voice', variant: 'coral', grad: 'g-coral', title: 'Voice', desc: 'Global voice termination with strong footholds in Pakistan and GCC destinations, now expanding across Africa, where growth potential is immense.' },
    { id: 'icon-messaging', variant: 'purple', grad: 'g-purple', title: 'Messaging', desc: 'A2P messaging delivered in close partnership with EMEA mobile operators. Every message reaches its destination seamlessly.' },
    { id: 'icon-cloud', variant: 'blue', grad: 'g-blue', title: 'Cloud Computing', desc: 'Acme CloudHub: public, private, hybrid and multi-cloud for government, enterprise, SME and startups. Secure, scalable, sovereign, and free from vendor lock-in.' },
    { id: 'icon-connectivity', variant: 'green', grad: 'g-green', title: 'Connectivity', desc: "Acme ConnectHub: connectivity through Pakistan's first terrestrial cable landing station on the Pak-China Optical Fiber Cable. Faster, more reliable, sovereign." },
    { id: 'icon-mnp', variant: 'amber', grad: 'g-amber', title: 'MNP Lookup', desc: 'Exclusive partner for the Pakistan MNP Database and MNP verification for international traffic, with unmatched accuracy and speed on porting status.' },
    { id: 'icon-did', variant: 'cyan', grad: 'g-cyan', title: 'DID / Toll-free', desc: 'Direct Inward Dialing that connects numbers straight to your PBX: local, premium-rate, toll-free, and international toll-free.' },
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
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
        if (reduced) return;
        card.style.transform = 'perspective(900px) rotateY(' + (dx * 10).toFixed(1) + 'deg) rotateX(' + (-dy * 10).toFixed(1) + 'deg) translateY(-4px) scale(1.012)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0) scale(1)';
      });
    });
  }

  (function services() {
    var grid = document.getElementById('servicesGrid');
    if (!grid) return;
    grid.innerHTML = SERVICES.map(function (s) {
      return '<div class="card tilt-glow" tabindex="0">' +
        iconTile(54, s.variant, s.id, s.grad) +
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
    if (orbit && !reduced) {
      orbit.addEventListener('mousemove', function (e) {
        var r = orbit.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        orbit.style.transform = 'perspective(900px) rotateY(' + (dx * 18).toFixed(1) + 'deg) rotateX(' + (-dy * 18).toFixed(1) + 'deg)';
      });
      orbit.addEventListener('mouseleave', function () { orbit.style.transform = 'perspective(900px) rotateY(0) rotateX(0)'; });
    }
  })();

  /* ========================================================================
     Products, scroll + cursor driven layout
     ===================================================================== */
  var PRODUCTS = [
    { id: 'icon-firewall', variant: 'coral', grad: 'g-coral', bg: 'linear-gradient(150deg,#FF7A57,#C6421F)', title: 'SMS Firewall', desc: 'Cutting-edge filtering that builds a robust blocking policy, safeguarding revenue and the customer experience.', cta: 'Learn more',
      stats: [{ num: '99.5%', label: 'Spam blocked' }, { num: '40%', label: 'Fraud loss cut' }] },
    { id: 'icon-fraud', variant: 'blue', grad: 'g-blue', bg: 'linear-gradient(150deg,#3E7BDD,#163E8F)', title: 'Fraud Management', desc: 'State-of-the-art detection that manages and prevents fraudulent activity, a top concern for operators.', cta: 'Learn more',
      stats: [{ num: '24/7', label: 'Real-time monitoring' }, { num: '99.9%', label: 'Detection accuracy' }] },
    { id: 'icon-probe', variant: 'green', grad: 'g-green', bg: 'linear-gradient(150deg,#1FB577,#0B6B41)', title: 'Probe Testing', desc: 'Active route testing that verifies quality end-to-end, keeping every destination honest.', cta: 'Learn more',
      stats: [{ num: '150+', label: 'Routes tested daily' }, { num: '99.9%', label: 'ASR maintained' }] },
    { id: 'icon-esim', variant: 'white', grad: 'g-white', bg: 'linear-gradient(150deg,#FF6B4A,#4F8CFF)', title: 'ACMeSIM', desc: 'Our consumer travel eSIM: 200+ destinations, plans from $0.99/GB. A smart eSIM for smart travel.', cta: 'Visit acmesim.global',
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
        iconTile(50, p.variant, p.id, p.grad) +
        '<div class="step__title">' + p.title + '</div>' +
        '<div class="step__desc">' + p.desc + '</div>' +
        stats +
        '<a href="#contact" class="step__link" style="color:' + (p.variant === 'white' ? '#FFD3C4' : '#8FB5FF') + '">' + p.cta + ' →</a></div>';
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

    if (sticky && !reduced) {
      sticky.addEventListener('mousemove', function (e) {
        var r = stage.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        stage.style.transform = 'perspective(1000px) rotateY(' + (dx * 8).toFixed(1) + 'deg) rotateX(' + (-dy * 8).toFixed(1) + 'deg)';
      });
      sticky.addEventListener('mouseleave', function () { stage.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)'; });
    }
  })();

  /* ========================================================================
     Decorative wavy lines behind the products panel
     ===================================================================== */
  (function whyLines() {
    var cv = document.getElementById('whyLinesTop');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var visible = false;
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
    function loop(now) {
      if (visible) draw((now - t0) / 1000);
      if (!reduced) requestAnimationFrame(loop);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: 0.05 }).observe(cv);
    } else { visible = true; }
    requestAnimationFrame(loop);
    if (reduced) draw(0.4);
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
        { num: '100+', label: 'Partners worldwide', bg: 'var(--bg-card)', numColor: 'var(--blue)', labelColor: 'var(--text-dim-3)' },
        { num: '6B+', label: 'Minutes terminated every year', bg: 'var(--bg-deep)', numColor: '#fff', labelColor: 'var(--text-dim-2)' },
        { num: '2B+', label: 'Messages delivered', bg: 'linear-gradient(135deg,#FF6B4A,#F05532)', numColor: '#fff', labelColor: 'rgba(255,255,255,0.85)' },
        { num: '3', label: 'Continents of global presence', bg: 'var(--bg-card)', numColor: 'var(--coral)', labelColor: 'var(--text-dim-3)' },
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
      { quote: 'Acmetel’s NOC flagged a routing degradation on our GCC corridor before our own monitoring even caught it. That’s the kind of partner you want underneath a Tier-1 contract.', name: 'Faisal R.', role: 'Director of Carrier Relations, Regional Mobile Operator', metric: '99.9% ASR', initials: 'FR', color: '#1B56E0' },
      { quote: 'We moved our A2P traffic to Acmetel mid-quarter and delivery rates across our EMEA routes improved within the first two weeks. No renegotiation drama, no downtime.', name: 'Priya N.', role: 'Head of Messaging Platform, E-commerce Enterprise', metric: '2-week cutover', initials: 'PN', color: '#7A4FD9' },
      { quote: 'ACMeSIM is the first travel eSIM our support team didn’t have to build a playbook around. It activates and holds a connection, which is all we ever ask of it.', name: 'Daniel K.', role: 'Founder, Travel-Tech Startup', metric: '200+ countries', initials: 'DK', color: '#1B9963' },
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
    if (orbit && !reduced) {
      orbit.addEventListener('mousemove', function (e) {
        var r = orbit.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        orbit.style.transform = 'perspective(900px) rotateY(' + (dx * 16).toFixed(1) + 'deg) rotateX(' + (-dy * 16).toFixed(1) + 'deg)';
      });
      orbit.addEventListener('mouseleave', function () { orbit.style.transform = 'perspective(900px) rotateY(0) rotateX(0)'; });
    }
    var grid = document.getElementById('securityGrid');
    if (!grid) return;
    var cards = [
      { id: 'icon-lock', title: 'Data protection', desc: 'State-of-the-art encryption safeguards every call, message, and byte, in transit and at rest. Peace of mind for you and your customers.', badges: ['End-to-end encryption', 'Zero-trust network'] },
      { id: 'icon-clipboard', title: 'Compliance standards', desc: 'We adhere to global regulatory standards: GDPR, SOC 2 Type II, and PCI DSS, aligning with industry best practice for a secure, compliant environment.', badges: ['GDPR', 'SOC 2 Type II', 'PCI DSS'] },
      { id: 'icon-shieldcheck', title: 'Security commitment', desc: 'A continuously hardened framework with enterprise-grade SSO, regular audits, and independent assessments, upholding the highest standards.', badges: ['SSO', 'Regular audits', '24/7 monitoring'] },
    ];
    grid.innerHTML = cards.map(function (c) {
      return '<div class="card tilt-glow">' + iconTile(52, 'blue', c.id, 'g-blue') +
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
      var data = [
        { name: 'ITW Africa', date: 'Sep 8–10, 2026', place: 'Nairobi', accent: '#FF6B4A' },
        { name: 'WWC Madrid', date: 'Sep 16–18, 2026', place: 'Madrid', accent: '#6FA0FF' },
        { name: 'Capacity Europe', date: 'Oct 13–15, 2026', place: 'London', accent: '#1B9963' },
        { name: 'GCCM Middle East', date: 'Nov 1–4, 2026', place: 'Oman', accent: '#C77E00' },
        { name: 'Africa Tech Festival', date: 'Nov 17–19, 2026', place: 'Cape Town', accent: '#7A4FD9' },
      ];
      grid.innerHTML = data.map(function (e) {
        return '<div class="event-card tilt-glow">' +
          '<div class="event-card__date" style="color:' + e.accent + '">' + e.date + '</div>' +
          '<div class="event-card__name">' + e.name + '</div>' +
          '<div class="event-card__place">' + icon('icon-pin', ' width="13" height="13" fill="currentColor"') + ' ' + e.place + '</div>' +
          '<span class="event-card__cta">Book now →</span></div>';
      }).join('');
      attachCardTilt(grid.querySelectorAll('.event-card'));
    }
    var flight = document.getElementById('flightPath');
    if (flight) {
      flight.addEventListener('mouseenter', function () { flight.classList.add('is-fast'); });
      flight.addEventListener('mouseleave', function () { flight.classList.remove('is-fast'); });
    }
    var blog = document.getElementById('blogList');
    if (blog) {
      var posts = [
        { id: 'icon-suitcase', variant: 'coral', grad: 'g-coral', tag: 'Travel', tagColor: '#FF6B4A', title: 'How to avoid roaming charges abroad: the smart traveler’s guide for 2026' },
        { id: 'icon-signal', variant: 'blue', grad: 'g-blue', tag: 'Technology', tagColor: '#6FA0FF', title: 'eSIM: the next step in mobile evolution, benefits and the future ahead' },
        { id: 'icon-shieldsearch', variant: 'green', grad: 'g-green', tag: 'Security', tagColor: '#1B9963', title: 'A comprehensive guide to AI scams: common tactics and preventive strategies' },
      ];
      blog.innerHTML = posts.map(function (p) {
        return '<a href="#events" class="blog-post tilt-glow">' + iconTile(44, p.variant, p.id, p.grad) +
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
