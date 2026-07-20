/* Acmetel "live network heartbeat" strip — canvas ECG-style pulse line. */
(function () {
  'use strict';

  function Pulse(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.mouseX = null;
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._t0 = performance.now();
    this._bind();
    this._tick = this._tick.bind(this);
    this._raf = requestAnimationFrame(this._tick);
  }

  Pulse.prototype._bind = function () {
    var self = this;
    var host = this.opts.mouseTarget || this.canvas;
    this._onMove = function (e) {
      var r = host.getBoundingClientRect();
      self.mouseX = e.clientX - r.left;
    };
    this._onLeave = function () { self.mouseX = null; };
    host.addEventListener('mousemove', this._onMove);
    host.addEventListener('mouseleave', this._onLeave);
  };

  Pulse.prototype.destroy = function () {
    cancelAnimationFrame(this._raf);
    var host = this.opts.mouseTarget || this.canvas;
    host.removeEventListener('mousemove', this._onMove);
    host.removeEventListener('mouseleave', this._onLeave);
  };

  Pulse.prototype._tick = function (now) {
    var t = this.reduced ? 0.5 : (now - this._t0) / 1000;
    this._draw(t);
    if (!this.reduced) this._raf = requestAnimationFrame(this._tick);
  };

  function ecg(u) {
    var v = 0;
    v += Math.exp(-Math.pow((u - 0.5) * 34, 2)) * 1.0;
    v -= Math.exp(-Math.pow((u - 0.57) * 44, 2)) * 0.32;
    v += Math.exp(-Math.pow((u - 0.32) * 26, 2)) * 0.16;
    v += Math.exp(-Math.pow((u - 0.72) * 30, 2)) * 0.12;
    return v;
  }

  Pulse.prototype._draw = function (t) {
    var cv = this.canvas, ctx = this.ctx;
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)) { cv.width = w * dpr; cv.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var cy = h * 0.58;

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < w; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 10); ctx.lineTo(gx, h - 10); ctx.stroke(); }

    var xoff = t * 110;
    var grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(120,160,255,0.15)');
    grad.addColorStop(0.5, '#6FA0FF');
    grad.addColorStop(1, '#FF6B4A');
    var mpx = this.mouseX;
    var amp = function (x) { return 46 * (1 + (mpx != null ? 0.9 * Math.exp(-Math.pow((x - mpx) / 90, 2)) : 0)); };
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (var x = 0; x <= w; x += 2) {
      var u = (((x + xoff) / 280) % 1 + 1) % 1;
      var y = cy - ecg(u) * amp(x);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    var peakX = w - 90;
    var pu = (((peakX + xoff) / 280) % 1 + 1) % 1;
    ctx.fillStyle = '#FF6B4A';
    ctx.beginPath(); ctx.arc(peakX, cy - ecg(pu) * 46, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,107,74,0.22)';
    ctx.beginPath(); ctx.arc(peakX, cy - ecg(pu) * 46, 10, 0, Math.PI * 2); ctx.fill();
  };

  window.AcmetelPulse = Pulse;
})();
