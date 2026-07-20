/* Acmetel hero globe — dotted-signal network globe with refined terrain,
   lighting/atmosphere and glowing carrier routes. Pure canvas 2D, no deps. */
(function () {
  'use strict';

  // Simplified real-world coastlines [lon, lat] per continent.
  var CONTINENTS = [
    [[-166,68],[-161,70],[-156,71],[-148,70],[-141,69],[-136,69],[-128,70],[-124,71],[-118,72],[-110,72],[-104,71],[-98,71],[-92,71],[-86,69],[-82,69],[-84,66],[-88,64],[-92,63],[-94,60],[-92,57],[-88,56],[-85,55],[-82,55],[-79,54],[-77,55],[-76,58],[-77,61],[-74,62],[-70,60],[-66,58],[-62,56],[-58,54],[-55,52],[-56,50],[-60,48],[-64,46],[-66,44],[-70,43],[-70,41],[-74,40],[-75,38],[-76,36],[-78,34],[-80,32],[-81,30],[-80,27],[-80,25],[-82,26],[-83,29],[-86,30],[-89,29],[-91,29],[-94,29],[-97,27],[-97,24],[-97,21],[-95,19],[-92,18],[-90,20],[-87,20],[-87,17],[-84,15],[-83,13],[-82,9],[-80,9],[-78,8],[-80,7],[-83,8],[-85,10],[-87,13],[-91,14],[-94,16],[-97,16],[-101,17],[-104,19],[-106,22],[-109,24],[-112,27],[-114,30],[-117,32],[-120,34],[-122,37],[-124,40],[-124,43],[-124,46],[-124,48],[-126,50],[-128,52],[-131,54],[-134,57],[-137,58],[-140,60],[-145,60],[-150,59],[-153,58],[-157,57],[-161,56],[-164,55],[-165,60],[-168,65]],
    [[-53,66],[-54,69],[-56,72],[-58,75],[-56,77],[-50,79],[-44,81],[-36,82],[-28,81],[-22,79],[-19,76],[-21,73],[-24,71],[-27,69],[-32,67],[-38,65],[-42,62],[-45,60],[-49,61],[-52,63]],
    [[-77,8],[-72,11],[-67,10],[-63,10],[-60,9],[-56,6],[-52,4],[-50,1],[-48,-1],[-44,-2],[-40,-3],[-37,-5],[-35,-7],[-35,-9],[-37,-12],[-39,-15],[-39,-18],[-40,-21],[-42,-23],[-45,-24],[-48,-26],[-49,-29],[-52,-32],[-55,-35],[-57,-37],[-60,-39],[-62,-41],[-64,-43],[-65,-46],[-67,-49],[-68,-52],[-69,-55],[-72,-54],[-74,-51],[-74,-48],[-73,-45],[-73,-42],[-73,-39],[-72,-36],[-71,-33],[-71,-30],[-70,-26],[-70,-23],[-71,-19],[-74,-16],[-76,-13],[-78,-9],[-80,-6],[-81,-4],[-80,-1],[-80,1],[-78,3],[-77,6]],
    [[-9,32],[-6,35],[-2,35],[3,37],[8,37],[11,37],[11,34],[15,32],[19,31],[24,32],[29,31],[32,31],[34,27],[35,24],[37,21],[38,18],[40,15],[43,12],[47,11],[51,12],[51,10],[48,7],[45,4],[42,0],[40,-3],[39,-7],[38,-11],[36,-15],[35,-18],[33,-22],[32,-26],[30,-30],[27,-33],[23,-34],[20,-35],[18,-33],[16,-29],[14,-25],[12,-20],[12,-16],[13,-11],[12,-6],[9,-2],[9,2],[8,4],[4,6],[0,6],[-4,5],[-8,4],[-12,7],[-16,10],[-17,14],[-16,17],[-16,21],[-14,25],[-11,28]],
    [[-9,37],[-9,40],[-9,43],[-5,44],[-2,46],[-1,49],[2,51],[4,53],[8,54],[8,57],[10,57],[12,56],[14,54],[18,55],[21,56],[24,57],[27,59],[30,60],[28,62],[25,65],[22,68],[18,69],[15,68],[14,65],[12,62],[10,59],[7,58],[5,56],[4,52],[2,50],[0,47],[-1,45],[1,43],[4,42],[7,43],[10,44],[13,45],[14,42],[16,40],[18,40],[20,39],[21,37],[23,36],[26,38],[28,37],[27,36],[24,35],[21,36],[18,38],[15,38],[15,40],[12,38],[9,39],[6,38],[3,37],[0,36],[-4,36],[-7,36]],
    [[30,60],[35,64],[40,66],[45,68],[52,69],[60,70],[68,72],[75,73],[82,74],[90,75],[98,76],[105,77],[113,76],[120,74],[128,73],[136,72],[143,72],[150,71],[158,70],[166,69],[172,67],[178,65],[178,62],[172,61],[165,60],[160,60],[158,56],[156,52],[152,49],[148,45],[143,42],[140,42],[137,44],[135,44],[132,43],[130,42],[128,40],[126,38],[125,36],[126,34],[122,34],[120,32],[120,28],[117,24],[113,22],[110,20],[108,17],[106,12],[105,9],[103,5],[101,3],[100,8],[98,13],[96,16],[94,18],[92,21],[90,22],[87,21],[84,19],[81,16],[80,13],[78,9],[76,8],[74,12],[72,17],[70,21],[68,23],[66,25],[62,25],[58,25],[57,24],[59,21],[57,18],[54,17],[50,15],[46,13],[43,13],[43,16],[41,19],[39,22],[37,25],[35,28],[34,30],[35,33],[35,36],[33,37],[30,37],[27,37],[26,39],[29,41],[33,42],[37,41],[40,43],[44,42],[47,42],[50,45],[53,47],[55,50],[58,52],[54,53],[49,52],[45,49],[40,48],[36,46],[33,45],[30,46],[28,50],[28,54],[30,57]],
    [[113,-22],[114,-26],[113,-30],[115,-34],[118,-35],[122,-34],[126,-32],[130,-32],[133,-32],[136,-35],[138,-36],[140,-38],[144,-38],[147,-39],[150,-37],[152,-33],[153,-30],[153,-26],[151,-24],[149,-21],[146,-19],[145,-15],[143,-11],[141,-13],[139,-17],[136,-12],[133,-12],[130,-13],[128,-15],[125,-14],[122,-17],[119,-20],[116,-21]],
    [[109,1],[111,3],[114,5],[117,7],[119,5],[118,1],[116,-2],[113,-3],[110,-2],[109,0]],
    [[95,5],[98,3],[100,0],[103,-3],[106,-6],[110,-7],[114,-8],[113,-9],[108,-8],[104,-6],[101,-3],[98,1],[95,3]],
    [[131,-1],[135,-2],[139,-3],[143,-4],[147,-6],[150,-9],[147,-10],[143,-8],[139,-7],[135,-4],[131,-2]],
    [[44,-16],[47,-14],[49,-13],[50,-15],[50,-18],[49,-21],[47,-24],[45,-25],[44,-23],[43,-20],[44,-17]],
    [[130,31],[131,33],[133,34],[135,34],[136,35],[138,35],[140,36],[140,38],[141,40],[141,42],[143,43],[145,44],[143,45],[141,44],[140,41],[139,38],[137,37],[135,35],[132,33],[130,32]],
    [[-5,50],[-6,52],[-5,54],[-6,56],[-5,58],[-3,59],[-2,57],[-2,55],[0,53],[1,52],[0,51],[-3,50]],
    [[173,-35],[175,-37],[177,-38],[175,-40],[173,-41],[172,-42],[170,-44],[167,-46],[166,-46],[168,-44],[170,-42],[172,-40],[173,-37]],
    [[80,9],[81,8],[82,7],[81,6],[80,6],[79,7],[80,9]],
  ];

  // approximate "elevation" hot-spots (mountain ranges) per continent index -> subtle terrain shading
  var TERRAIN_SPOTS = [
    [-110, 45], [-70, -15], [10, 45], [85, 30], [105, 33], [30, 0],
  ];

  var HUBS = [
    { lon: -87.6, lat: 41.8, name: 'Chicago' },
    { lon: -0.1,  lat: 51.5, name: 'London' },
    { lon: 28.9,  lat: 41,   name: 'Istanbul' },
    { lon: 55.3,  lat: 25.2, name: 'Dubai' },
    { lon: 46.7,  lat: 24.7, name: 'Riyadh' },
    { lon: 31.2,  lat: 30,   name: 'Cairo' },
    { lon: 67,    lat: 24.9, name: 'Karachi' },
    { lon: 103.8, lat: 1.3,  name: 'Singapore' },
    { lon: 36.8,  lat: -1.3, name: 'Nairobi' },
  ];
  var ARCS = [[0,1],[1,2],[2,3],[3,4],[4,5],[3,6],[6,7],[1,5],[5,8],[2,8]];

  function smooth(poly, passes) {
    // Chaikin corner-cutting smoothing for higher-fidelity coastlines
    var pts = poly.slice();
    for (var p = 0; p < passes; p++) {
      var next = [];
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      pts = next;
    }
    return pts;
  }

  function Globe(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.mouse = [0.5, 0.5];
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.smoothed = CONTINENTS.map(function (poly) { return smooth(poly, 2); });
    this._raf = null;
    this._t0 = performance.now();
    this._bindEvents();
    this._tick = this._tick.bind(this);
    this._raf = requestAnimationFrame(this._tick);
  }

  Globe.prototype._bindEvents = function () {
    var self = this;
    var host = this.opts.mouseTarget || this.canvas;
    this._onMove = function (e) {
      var r = host.getBoundingClientRect();
      self.mouse = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };
    host.addEventListener('mousemove', this._onMove);
  };

  Globe.prototype.destroy = function () {
    cancelAnimationFrame(this._raf);
    var host = this.opts.mouseTarget || this.canvas;
    host.removeEventListener('mousemove', this._onMove);
  };

  Globe.prototype._tick = function (now) {
    var t = this.reduced ? 0.4 : (now - this._t0) / 1000;
    this._draw(t);
    if (!this.reduced) this._raf = requestAnimationFrame(this._tick);
  };

  Globe.prototype._draw = function (t) {
    var cv = this.canvas, ctx = this.ctx;
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = w * dpr; cv.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var cx = w / 2, cy = h * 0.62, R = Math.min(w * 0.32, h * 0.48);

    // outer atmosphere halo (bright, layered, tighter so the disc keeps a crisp silhouette)
    var halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.35);
    halo.addColorStop(0, 'rgba(94,200,255,0.28)');
    halo.addColorStop(0.6, 'rgba(79,140,255,0.10)');
    halo.addColorStop(1, 'rgba(79,140,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // ocean sphere body — brighter, more saturated
    var body = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.06, cx, cy, R);
    body.addColorStop(0, '#9CC7FF');
    body.addColorStop(0.42, '#4F8CFF');
    body.addColorStop(0.78, '#2660D6');
    body.addColorStop(1, '#123F9E');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    var mxr = this.mouse[0];
    var rot = t * 0.16 + (mxr - 0.5) * 1.1;
    function P3(lon, lat) {
      var lam = lon * Math.PI / 180 + rot, phi = lat * Math.PI / 180;
      return [Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)];
    }
    var SX = function (x3) { return cx + R * x3; };
    var SY = function (y3) { return cy - R * y3 * 0.98; };

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    // graticule
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    for (var lon0 = -180; lon0 < 180; lon0 += 30) {
      ctx.beginPath();
      var pen = false;
      for (var lat = -85; lat <= 85; lat += 4) {
        var pp = P3(lon0, lat);
        if (pp[2] < 0.02) { pen = false; continue; }
        if (!pen) { ctx.moveTo(SX(pp[0]), SY(pp[1])); pen = true; } else ctx.lineTo(SX(pp[0]), SY(pp[1]));
      }
      ctx.stroke();
    }

    // landmasses — refined coastlines + terrain shading
    for (var ci = 0; ci < this.smoothed.length; ci++) {
      var poly = this.smoothed[ci];
      var visible = false, pts = [], latSum = 0;
      for (var k = 0; k < poly.length; k++) {
        var lon = poly[k][0], lat = poly[k][1];
        latSum += lat;
        var p3 = P3(lon, lat);
        var x3 = p3[0], y3 = p3[1], z3 = p3[2];
        if (z3 > 0.02) visible = true;
        else { var m = Math.hypot(x3, y3) || 1; x3 /= m; y3 /= m; }
        pts.push([SX(x3), SY(y3)]);
      }
      if (!visible) continue;
      var avgLat = latSum / poly.length, aLat = Math.abs(avgLat);
      var landFill = aLat >= 60 ? '#E4EDDD' : (aLat >= 8 && aLat <= 32 ? '#D9C489' : '#7FC48A');

      ctx.fillStyle = landFill;
      ctx.beginPath();
      pts.forEach(function (pt, i) { if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]); });
      ctx.closePath();
      ctx.fill();

      // terrain elevation shading clipped to this landmass
      ctx.save();
      ctx.clip();
      var spot = TERRAIN_SPOTS[ci % TERRAIN_SPOTS.length];
      var sp3 = P3(spot[0], spot[1]);
      if (sp3[2] > -0.3) {
        var sx = SX(sp3[0]), sy = SY(sp3[1]);
        var terrain = ctx.createRadialGradient(sx, sy, 2, sx, sy, R * 0.5);
        terrain.addColorStop(0, 'rgba(60,50,30,0.16)');
        terrain.addColorStop(1, 'rgba(60,50,30,0)');
        ctx.fillStyle = terrain;
        ctx.fillRect(sx - R * 0.5, sy - R * 0.5, R, R);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(40,70,45,0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // polar ice
    [78, -78].forEach(function (capLat) {
      var visible = false, pts = [];
      for (var lon = -180; lon <= 180; lon += 6) {
        var p3 = P3(lon, capLat), x3 = p3[0], y3 = p3[1], z3 = p3[2];
        if (z3 > 0.02) visible = true;
        else { var m = Math.hypot(x3, y3) || 1; x3 /= m; y3 /= m; }
        pts.push([SX(x3), SY(y3)]);
      }
      if (!visible) return;
      ctx.fillStyle = 'rgba(244,250,255,0.92)';
      ctx.beginPath();
      pts.forEach(function (pt, i) { if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]); });
      ctx.closePath();
      ctx.fill();
    });

    // drifting cloud wisps
    var cloudSeeds = [[30,20,34,7],[-60,35,28,6],[100,-10,30,6],[-130,5,26,5],[160,45,24,5],[-20,-30,30,6]];
    ctx.fillStyle = 'rgba(255,255,255,0.24)';
    cloudSeeds.forEach(function (seed) {
      var clon = seed[0], clat = seed[1], rlon = seed[2], rlat = seed[3];
      var visible = false, pts = [];
      var drift = (t * 2.4) % 360;
      for (var kk = 0; kk <= 24; kk++) {
        var th = (kk / 24) * Math.PI * 2;
        var lon = clon + drift + rlon * Math.cos(th) * (1 + 0.3 * Math.sin(th * 3));
        var lat = Math.max(-80, Math.min(80, clat + rlat * Math.sin(th)));
        var p3 = P3(lon, lat), x3 = p3[0], y3 = p3[1], z3 = p3[2];
        if (z3 > 0.02) visible = true;
        else { var m = Math.hypot(x3, y3) || 1; x3 /= m; y3 /= m; }
        pts.push([SX(x3), SY(y3)]);
      }
      if (!visible) return;
      ctx.beginPath();
      pts.forEach(function (pt, i) { if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]); });
      ctx.closePath();
      ctx.fill();
    });

    // shading (terminator) + specular highlight — adds depth
    var shade = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    shade.addColorStop(0, 'rgba(255,255,255,0)');
    shade.addColorStop(0.68, 'rgba(10,30,80,0.06)');
    shade.addColorStop(1, 'rgba(6,20,60,0.46)');
    ctx.fillStyle = shade;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    var spec = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.5, 0, cx - R * 0.42, cy - R * 0.5, R * 0.58);
    spec.addColorStop(0, 'rgba(255,255,255,0.5)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    // atmosphere rim — brighter double layer
    ctx.strokeStyle = 'rgba(120,200,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(94,200,255,0.16)';
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(cx, cy, R + 7, 0, Math.PI * 2); ctx.stroke();

    // glowing carrier routes between hubs
    ARCS.forEach(function (pair, i) {
      var A = P3(HUBS[pair[0]].lon, HUBS[pair[0]].lat), B = P3(HUBS[pair[1]].lon, HUBS[pair[1]].lat);
      if (A[2] < 0.05 && B[2] < 0.05) return;
      var steps = 30, pts = [];
      for (var s = 0; s <= steps; s++) {
        var u = s / steps;
        var x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u, z = A[2] + (B[2] - A[2]) * u;
        var len = Math.sqrt(x * x + y * y + z * z) || 1;
        var lift = 1 + 0.24 * Math.sin(Math.PI * u);
        pts.push([x / len * lift, y / len * lift, z / len * lift]);
      }
      ctx.save();
      ctx.shadowColor = 'rgba(255,120,90,0.65)';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = 'rgba(255,130,95,0.75)';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      var started = false;
      pts.forEach(function (p) {
        if (p[2] < 0) { started = false; return; }
        var sx = cx + R * p[0], sy = cy - R * p[1] * 0.98;
        if (!started) { ctx.moveTo(sx, sy); started = true; } else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();

      var pu = (t * 0.22 + i * 0.15) % 1;
      var pIdx = Math.round(pu * steps);
      var pt = pts[pIdx];
      if (pt && pt[2] > 0) {
        var psx = cx + R * pt[0], psy = cy - R * pt[1] * 0.98;
        ctx.fillStyle = '#FF8A6B';
        ctx.beginPath(); ctx.arc(psx, psy, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,138,107,0.25)';
        ctx.beginPath(); ctx.arc(psx, psy, 8, 0, Math.PI * 2); ctx.fill();
      }
    });

    // hub markers — layered pulse rings
    HUBS.forEach(function (hub) {
      var p3 = P3(hub.lon, hub.lat);
      if (p3[2] < 0.05) return;
      var sx = cx + R * p3[0], sy = cy - R * p3[1] * 0.98;
      var pr = (t * 0.6) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - pr) * p3[2]) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(sx, sy, 4 + pr * 13, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#FF6B4A';
      ctx.beginPath(); ctx.arc(sx, sy, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(sx, sy, 3.4, 0, Math.PI * 2); ctx.stroke();
    });

    // orbit ring + satellite
    ctx.strokeStyle = 'rgba(120,190,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * 1.3, R * 0.33, -0.28, 0, Math.PI * 2);
    ctx.stroke();
    var op = t * 0.45;
    var ex = R * 1.3 * Math.cos(op), ey = R * 0.33 * Math.sin(op);
    var ox = cx + ex * Math.cos(-0.28) - ey * Math.sin(-0.28);
    var oy = cy + ex * Math.sin(-0.28) + ey * Math.cos(-0.28);
    ctx.fillStyle = '#FF8A6B';
    ctx.shadowColor = 'rgba(255,138,107,0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  };

  window.AcmetelGlobe = Globe;
})();
