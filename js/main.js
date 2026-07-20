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
     Hero globe + stats count-up
     ===================================================================== */
  var heroCanvas = document.getElementById('heroGlobe');
  if (heroCanvas && window.AcmetelGlobe) {
    new window.AcmetelGlobe(heroCanvas, { mouseTarget: document.querySelector('.hero') });
  }

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
    var partners = [
      { name: 'Omantel', color: '#E4032E' },
      { name: 'stc', color: '#4E2A84' },
      { name: 'Mobily', color: '#6DBE45' },
      { name: 'Sinch', color: '#2851E3' },
      { name: 'Zong 4G', color: '#8A3FD1' },
      { name: 'Etisalat Misr', color: '#00A19A' },
      { name: 'Zain', color: '#6FA23A' },
      { name: 'Twilio', color: '#F22F46' },
      { name: 'Airtel', color: '#ED1C24' },
      { name: 'Orange', color: '#FF7900' },
      { name: 'PTCL', color: '#00843D' },
      { name: 'BICS', color: '#0072CE' },
      { name: 'TikTok', color: '#25F4EE', duo: true },
      { name: 'e&', color: '#B02A45' },
    ];
    var loop = partners.concat(partners);
    track.innerHTML = loop.map(function (p) {
      var word = p.duo
        ? '<span class="partner-chip__word"><span>Tik</span><span>Tok</span></span>'
        : '<span class="partner-chip__word">' + p.name + '</span>';
      return '<span class="partner-chip' + (p.duo ? ' partner-chip--duo' : '') + '" style="color:' + (p.duo ? '#EAF0FA' : p.color) + '">' +
        '<span class="partner-chip__dot" style="background:' + p.color + '"></span>' + word + '</span>';
    }).join('');
  })();

  /* ========================================================================
     Services — data, dimensional icons, cursor tilt/glow
     ===================================================================== */
  var SERVICES = [
    { id: 'icon-voice', variant: 'coral', grad: 'g-coral', title: 'Voice', desc: 'Global voice termination with strong footholds in Pakistan and GCC destinations — now expanding across Africa, where growth potential is immense.' },
    { id: 'icon-messaging', variant: 'purple', grad: 'g-purple', title: 'Messaging', desc: 'A2P messaging delivered in close partnership with EMEA mobile operators — every message reaches its destination seamlessly.' },
    { id: 'icon-cloud', variant: 'blue', grad: 'g-blue', title: 'Cloud Computing', desc: 'Acme CloudHub — public, private, hybrid and multi-cloud for government, enterprise, SME and startups. Secure, scalable, sovereign, and free from vendor lock-in.' },
    { id: 'icon-connectivity', variant: 'green', grad: 'g-green', title: 'Connectivity', desc: "Acme ConnectHub — connectivity through Pakistan's first terrestrial cable landing station on the Pak-China Optical Fiber Cable. Faster, more reliable, sovereign." },
    { id: 'icon-mnp', variant: 'amber', grad: 'g-amber', title: 'MNP Lookup', desc: 'Exclusive partner for the Pakistan MNP Database and MNP verification for international traffic — unmatched accuracy and speed on porting status.' },
    { id: 'icon-did', variant: 'cyan', grad: 'g-cyan', title: 'DID / Toll-free', desc: 'Direct Inward Dialing that connects numbers straight to your PBX — local, premium-rate, toll-free, and international toll-free.' },
  ];

  // Chrome does not apply stylesheet rules that target elements *inside* a
  // <symbol> referenced via <use> — only properties inherited from the
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

  (function services() {
    var grid = document.getElementById('servicesGrid');
    if (!grid) return;
    grid.innerHTML = SERVICES.map(function (s) {
      return '<div class="card" tabindex="0">' +
        iconTile(54, s.variant, s.id, s.grad) +
        '<div class="card__title">' + s.title + '</div>' +
        '<div class="card__desc">' + s.desc + '</div>' +
        '<span class="card__link">Learn more →</span></div>';
    }).join('');

    grid.querySelectorAll('.card').forEach(function (card) {
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

    // orbit ring icons
    var spin = document.getElementById('orbitSpin');
    if (spin) {
      spin.innerHTML = SERVICES.map(function (s, i) {
        var angle = (i * 60);
        return '<div class="orbit-icon" style="transform:rotate(' + angle + 'deg) translateX(148px)">' +
          '<div class="orbit-icon__counter" style="transform:rotate(' + (-angle) + 'deg) translate(-50%,-50%)">' +
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
     Products — scroll + cursor driven layout
     ===================================================================== */
  var PRODUCTS = [
    { id: 'icon-firewall', variant: 'coral', grad: 'g-coral', bg: 'linear-gradient(150deg,#FF7A57,#C6421F)', title: 'SMS Firewall', desc: 'Cutting-edge filtering that builds a robust blocking policy — safeguarding revenue and the customer experience.', cta: 'Learn more' },
    { id: 'icon-fraud', variant: 'blue', grad: 'g-blue', bg: 'linear-gradient(150deg,#3E7BDD,#163E8F)', title: 'Fraud Management', desc: 'State-of-the-art detection that manages and prevents fraudulent activity — a top concern for operators.', cta: 'Learn more' },
    { id: 'icon-probe', variant: 'green', grad: 'g-green', bg: 'linear-gradient(150deg,#1FB577,#0B6B41)', title: 'Probe Testing', desc: 'Active route testing that verifies quality end-to-end, keeping every destination honest.', cta: 'Learn more' },
    { id: 'icon-esim', variant: 'white', grad: 'g-white', bg: 'linear-gradient(150deg,#FF6B4A,#4F8CFF)', title: 'ACMeSIM', desc: 'Our consumer travel eSIM — 200+ destinations, plans from $0.99/GB. A smart eSIM for smart travel.', cta: 'Visit acmesim.global' },
  ];

  (function products() {
    var stepsHost = document.getElementById('productsSteps');
    var rail = document.getElementById('productsRail');
    var tile = document.getElementById('productsTile');
    var stage = document.getElementById('productsStage');
    var sticky = stage ? stage.closest('.scroller__sticky') : null;
    if (!stepsHost || !rail || !tile || !stage) return;

    stepsHost.innerHTML = PRODUCTS.map(function (p, i) {
      return '<div class="step" data-index="' + i + '">' +
        '<div class="step__index">0' + (i + 1) + ' / 0' + PRODUCTS.length + '</div>' +
        iconTile(50, p.variant, p.id, p.grad) +
        '<div class="step__title">' + p.title + '</div>' +
        '<div class="step__desc">' + p.desc + '</div>' +
        '<a href="#contact" class="step__link" style="color:' + (p.variant === 'white' ? '#FFD3C4' : '#8FB5FF') + '">' + p.cta + ' →</a></div>';
    }).join('');

    rail.innerHTML = PRODUCTS.map(function (_, i) { return '<button class="tick" type="button" aria-label="Go to product ' + (i + 1) + '" data-index="' + i + '"></button>'; }).join('');

    function setActive(i) {
      var p = PRODUCTS[i];
      stage.style.setProperty('--product-bg', p.bg);
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
      var n = 6;
      for (var i = 0; i < n; i++) {
        var y0 = (h / n) * i + Math.sin(t * 0.4 + i) * 24;
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        for (var x = 0; x <= w; x += 24) {
          var y = y0 + Math.sin(x * 0.008 + t * 0.5 + i * 1.7) * 26;
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
     Why Acmetel — points, big stats, pulse
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
      { quote: 'We moved our A2P traffic to Acmetel mid-quarter and delivery rates across our EMEA routes improved within the first two weeks — no renegotiation drama, no downtime.', name: 'Priya N.', role: 'Head of Messaging Platform, E-commerce Enterprise', metric: '2-week cutover', initials: 'PN', color: '#7A4FD9' },
      { quote: 'ACMeSIM is the first travel eSIM our support team didn’t have to build a playbook around. It activates and holds a connection, which is all we ever ask of it.', name: 'Daniel K.', role: 'Founder, Travel-Tech Startup', metric: '200+ countries', initials: 'DK', color: '#1B9963' },
    ];
    grid.innerHTML = data.map(function (t) {
      return '<div class="t-card">' +
        '<div class="t-card__quote-mark">' + icon('icon-quote', ' width="30" height="22" fill="rgba(111,160,255,0.5)"') + '</div>' +
        '<div class="t-card__text">“' + t.quote + '”</div>' +
        '<div class="t-card__foot">' +
        '<div class="t-card__avatar" style="background:' + t.color + '">' + t.initials + '</div>' +
        '<div><div class="t-card__name">' + t.name + '</div><div class="t-card__role">' + t.role + '</div></div>' +
        '<span class="t-card__metric">' + t.metric + '</span></div></div>';
    }).join('');
  })();

  /* ========================================================================
     Security — orbit badges + cards
     ===================================================================== */
  (function security() {
    var badgesHost = document.getElementById('securityBadges');
    if (badgesHost) {
      var badges = ['GDPR', 'SOC 2 Type II', 'PCI DSS', 'ISO 27001'];
      badgesHost.innerHTML = badges.map(function (b, i) {
        var angle = i * 90;
        return '<div class="orbit-badge" style="transform:rotate(' + angle + 'deg) translateX(164px)">' +
          '<div class="orbit-badge__counter" style="transform:rotate(' + (-angle) + 'deg) translate(-50%,-50%)">' +
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
      { id: 'icon-lock', title: 'Data protection', desc: 'State-of-the-art encryption safeguards every call, message, and byte — in transit and at rest. Peace of mind for you and your customers.', badges: ['End-to-end encryption', 'Zero-trust network'] },
      { id: 'icon-clipboard', title: 'Compliance standards', desc: 'We adhere to global regulatory standards — GDPR, SOC 2 Type II, and PCI DSS — aligning with industry best practice for a secure, compliant environment.', badges: ['GDPR', 'SOC 2 Type II', 'PCI DSS'] },
      { id: 'icon-shieldcheck', title: 'Security commitment', desc: 'A continuously hardened framework with enterprise-grade SSO, regular audits, and independent assessments — upholding the highest standards.', badges: ['SSO', 'Regular audits', '24/7 monitoring'] },
    ];
    grid.innerHTML = cards.map(function (c) {
      return '<div class="card">' + iconTile(52, 'blue', c.id, 'g-blue') +
        '<div class="card__title">' + c.title + '</div>' +
        '<div class="card__desc">' + c.desc + '</div>' +
        '<div class="badge-row">' + c.badges.map(function (b) { return '<span class="badge">' + b + '</span>'; }).join('') + '</div></div>';
    }).join('');
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
        return '<div class="event-card">' +
          '<div class="event-card__date" style="color:' + e.accent + '">' + e.date + '</div>' +
          '<div class="event-card__name">' + e.name + '</div>' +
          '<div class="event-card__place">' + icon('icon-pin', ' width="13" height="13" fill="currentColor"') + ' ' + e.place + '</div>' +
          '<span class="event-card__cta">Book now →</span></div>';
      }).join('');
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
        { id: 'icon-signal', variant: 'blue', grad: 'g-blue', tag: 'Technology', tagColor: '#6FA0FF', title: 'eSIM: the next step in mobile evolution — benefits and the future ahead' },
        { id: 'icon-shieldsearch', variant: 'green', grad: 'g-green', tag: 'Security', tagColor: '#1B9963', title: 'A comprehensive guide to AI scams: common tactics and preventive strategies' },
      ];
      blog.innerHTML = posts.map(function (p) {
        return '<a href="#events" class="blog-post">' + iconTile(44, p.variant, p.id, p.grad) +
          '<div><div class="blog-post__tag" style="color:' + p.tagColor + '">' + p.tag + '</div>' +
          '<div class="blog-post__title">' + p.title + '</div></div></a>';
      }).join('');
    }
  })();

  /* ========================================================================
     Contact form (client-side demo — no backend wired up yet)
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
      note.textContent = 'Thanks — a member of our team will be in touch shortly.';
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
