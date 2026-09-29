/* =========================================================
   script.js — SwiftSite UI controller
   ---------------------------------------------------------
   Renders everything from config.js, drives the core object,
   and runs the conversation against ai.js (real Gemini calls
   only — no scripted replies anywhere).
   ========================================================= */

(function () {
  'use strict';

  var CFG = window.SWIFTSITE_CONFIG;
  var AI = window.SwiftSiteAI;
  if (!CFG || !AI) { return; }

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- element map ---------- */
  var el = {
    body: document.body,
    scrollBar: $('#scrollBar'),
    topbar: $('#topbar'),
    nav: $('#nav'),
    menuToggle: $('#menuToggle'),
    statusBtn: $('#aiStatusBtn'),
    statusText: $('#statusText'),
    core: $('#core'),
    coreCaption: $('#coreCaption'),
    heroVersion: $('#heroVersion'),
    startBtn: $('#startBtn'),

    railState: $('#railState'),
    langToggle: $('#langToggle'),
    copyLastBtn: $('#copyLastBtn'),
    clearBtn: $('#clearBtn'),
    connectBtn: $('#connectBtn'),
    connectBtnLabel: $('#connectBtnLabel'),

    convoCount: $('#convoCount'),
    modeBadge: $('#modeBadge'),
    modeBadgeLabel: $('#modeBadgeLabel'),
    connectBanner: $('#connectBanner'),
    connectTitle: $('#connectTitle'),
    connectBody: $('#connectBody'),
    connectBannerBtn: $('#connectBannerBtn'),
    emptyState: $('#emptyState'),
    suggestGrid: $('#suggestGrid'),
    thread: $('#thread'),
    composer: $('#composerForm'),
    input: $('#input'),
    sendBtn: $('#sendBtn'),

    serviceList: $('#serviceList'),
    processList: $('#processList'),
    pricingBody: $('#pricingBody'),
    pricingNote: $('#pricingNote'),
    askPricingBtn: $('#askPricingBtn'),

    channels: $('#contactChannels'),
    socials: $('#contactSocials'),
    emailBtn: $('#emailBtn'),
    whatsappBtn: $('#whatsappBtn'),
    startProjectBtn: $('#startProjectBtn'),

    form: $('#projectForm'),
    fType: $('#fType'),
    fBudget: $('#fBudget'),
    formResult: $('#formResult'),
    footerInstagram: $('#footerInstagram'),
    footerGithub: $('#footerGithub'),
    footerYear: $('#footerYear'),

    modal: $('#connectModal'),
    modalClose: $('#modalClose'),
    connectForm: $('#connectForm'),
    keyInput: $('#keyInput'),
    keyRemove: $('#keyRemove'),
    connectMsg: $('#connectMsg'),
    keySourceLabel: $('#keySourceLabel'),
    toast: $('#toast'),
    cursorDot: $('#cursorDot'),
    cursorRing: $('#cursorRing')
  };

  /* ---------- conversation state ---------- */
  var messages = [];            // { role:'user'|'model', text:string }
  var busy = false;
  var langMode = 'auto';
  var streamRaf = null;         // one paint per frame while Gemini streams
  var streamBuf = '';
  var lastFailedText = null;
  var controller = null;
  var turnCount = 0;

  /* ---------- icons (drawn for SwiftSite, not stock) ---------- */
  var ICONS = {
    code: '<path d="M8.6 8 4.6 12l4 4M15.4 8l4 4-4 4M13.3 5.4 10.7 18.6"/>',
    panels: '<rect x="3.6" y="5.2" width="16.8" height="13.6" rx="1"/><path d="M3.6 10h16.8M9.4 10v8.8"/>',
    frame: '<rect x="3.6" y="5.2" width="16.8" height="13.6" rx="1"/><path d="M3.6 9.1h16.8M6.2 7.2h.01M8.4 7.2h.01"/>',
    stack: '<path d="M12 4.4 3.9 8.1 12 11.8l8.1-3.7z"/><path d="M3.9 12.3 12 16l8.1-3.7M3.9 16.3 12 20l8.1-3.7"/>',
    bag: '<path d="M6.2 8h11.6l-.9 11.8H7.1z"/><path d="M9.3 8V6.5a2.7 2.7 0 0 1 5.4 0V8"/>',
    grid: '<rect x="4" y="4" width="6.4" height="6.4"/><rect x="13.6" y="4" width="6.4" height="6.4"/><rect x="4" y="13.6" width="6.4" height="6.4"/><rect x="13.6" y="13.6" width="6.4" height="6.4"/>',
    crosshair: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    pulse: '<path d="M3.4 12.6h3.9l2.1-5.3 3.3 10.2 2.4-4.9h5.5"/>'
  };
  function icon(name) {
    var d = ICONS[name] || ICONS.code;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var ARROW = '<svg class="service__go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 7l5 5-5 5"/></svg>';

  /* ---------- small helpers ---------- */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* plain text → restrained editorial HTML (no markdown clutter) */
  function renderText(raw) {
    var lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
    var html = '';
    var para = [];
    var list = [];

    function flushPara() {
      if (!para.length) return;
      html += '<p>' + inline(para.join(' ')) + '</p>';
      para = [];
    }
    function flushList() {
      if (!list.length) return;
      html += '<ul>' + list.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul>';
      list = [];
    }
    function inline(s) {
      return esc(s)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/(https?:\/\/[^\s<)]+)/g, function (m) {
          return '<a href="' + m + '" target="_blank" rel="noopener noreferrer">' + m.replace(/^https?:\/\//, '') + '</a>';
        });
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { flushList(); flushPara(); continue; }
      if (/^#/.test(line)) { line = line.replace(/^#+\s*/, ''); }
      var bullet = line.match(/^[-•*–—]\s+(.*)$/);
      var numbered = line.match(/^\d+[.)]\s+(.*)$/);
      if (bullet || numbered) { flushPara(); list.push((bullet || numbered)[1]); continue; }
      flushList();
      para.push(line);
    }
    flushList(); flushPara();
    return html || '<p>' + inline(raw) + '</p>';
  }

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  var toastTimer;
  function toast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 3600);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function scrollToId(id, focusAfter) {
    var node = document.getElementById(id);
    if (!node) return;
    var top = node.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    if (focusAfter) setTimeout(function () { focusAfter(); }, reduced ? 60 : 620);
  }

  /* =========================================================
     CORE OBJECT — states + parallax
     ========================================================= */
  var CAPTIONS = {
    idle: 'Idle — the assistant is awake',
    listening: 'Listening',
    thinking: 'Thinking',
    generating: 'Responding',
    ready: 'Response delivered',
    error: 'Connection interrupted',
    local: 'Offline mode — answering from the studio configuration'
  };
  var RAIL = {
    idle: 'Idle', listening: 'Listening', thinking: 'Thinking',
    generating: 'Responding', ready: 'Answered', error: 'Error', local: 'Offline mode'
  };
  var TOPBAR = {
    idle: 'AI · idle', listening: 'AI · listening', thinking: 'AI · thinking',
    generating: 'AI · responding', ready: 'AI · ready', error: 'AI · error', local: 'AI · offline mode'
  };

  var stateTimer;
  function setAiState(state, sticky) {
    if (!AI.isConfigured() && state !== 'error') state = 'local';
    el.body.dataset.aiState = state;
    if (el.coreCaption) el.coreCaption.textContent = CAPTIONS[state] || CAPTIONS.idle;
    if (el.railState) el.railState.textContent = RAIL[state] || RAIL.idle;
    if (el.statusText) el.statusText.textContent = TOPBAR[state] || TOPBAR.idle;
    clearTimeout(stateTimer);
    if (!sticky && (state === 'ready' || state === 'error')) {
      stateTimer = setTimeout(function () {
        if (!busy) setAiState(AI.isConfigured() ? 'idle' : 'local', true);
      }, 3200);
    }
  }

  /* which brain answered — shown on every reply, never hidden */
  function setMode(engine) {
    var local = engine !== 'gemini';
    el.body.classList.toggle('mode-local', local);
    el.body.classList.toggle('mode-gemini', !local);
    if (el.modeBadgeLabel) {
      el.modeBadgeLabel.textContent = local
        ? (CFG.copy.localTag || 'local knowledge')
        : (CFG.copy.geminiTag || 'Gemini');
    }
  }
  function setTurnMode(turn, engine) {
    var tag = turn.node.querySelector('[data-mode]');
    if (!tag) return;
    tag.textContent = engine === 'gemini' ? (CFG.copy.geminiTag || 'Gemini') : (CFG.copy.localTag || 'local knowledge');
    tag.classList.add('is-on');
    turn.node.classList.toggle('turn--local', engine !== 'gemini');
  }
  function addFollowUps(node, list) {
    $$('.chips', el.thread).forEach(function (c) { c.remove(); });
    var wrap = document.createElement('div');
    wrap.className = 'chips';
    (list || []).slice(0, 3).forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('data-cursor', 'button');
      b.textContent = item.text;
      b.addEventListener('click', function () {
        wrap.remove();
        send(item.text);
      });
      wrap.appendChild(b);
    });
    node.parentNode.insertBefore(wrap, node.nextSibling);
  }

  function emitPulse() {
    if (!el.core || reduced) return;
    el.core.classList.add('is-emitting');
    clearTimeout(emitPulse._t);
    emitPulse._t = setTimeout(function () { el.core.classList.remove('is-emitting'); }, 260);
  }

  /* rAF loops pause when the tab is hidden, and the core loop only runs on screen */
  var pageVisible = true;
  document.addEventListener('visibilitychange', function () { pageVisible = !document.hidden; });

  if (finePointer && !reduced && el.core) {
    var tilt = { x: 0, y: 0, tx: 0, ty: 0, cx: 0, cy: 0 };
    var stage = $('.core__stage', el.core);
    var coreInView = true;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        coreInView = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(el.core);
    }

    window.addEventListener('mousemove', function (e) {
      if (!coreInView) return;
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      tilt.tx = ny * -5.5;
      tilt.ty = nx * 7.5;
      tilt.cx = nx * 9;
      tilt.cy = ny * 7;
    }, { passive: true });

    (function loop() {
      requestAnimationFrame(loop);
      if (!coreInView || !pageVisible) return;
      tilt.x += (tilt.tx - tilt.x) * 0.055;
      tilt.y += (tilt.ty - tilt.y) * 0.055;
      if (stage) {
        stage.style.setProperty('--tiltX', tilt.x.toFixed(2) + 'deg');
        stage.style.setProperty('--tiltY', tilt.y.toFixed(2) + 'deg');
        el.core.style.transform = 'translate3d(' + tilt.cx.toFixed(2) + 'px,' + tilt.cy.toFixed(2) + 'px,0)';
      }
    })();
  }

  /* =========================================================
     CURSOR
     ========================================================= */
  if (finePointer && !reduced) {
    var pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var ring = { x: pos.x, y: pos.y };
    var cursorOn = false;

    window.addEventListener('mousemove', function (e) {
      pos.x = e.clientX; pos.y = e.clientY;
      if (!cursorOn) { cursorOn = true; el.body.classList.add('has-cursor'); ring.x = pos.x; ring.y = pos.y; }
      el.cursorDot.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)';
    }, { passive: true });

    (function cursorLoop() {
      requestAnimationFrame(cursorLoop);
      if (!cursorOn || !pageVisible) return;
      ring.x += (pos.x - ring.x) * 0.16;
      ring.y += (pos.y - ring.y) * 0.16;
      el.cursorRing.style.transform = 'translate3d(' + ring.x.toFixed(2) + 'px,' + ring.y.toFixed(2) + 'px,0)';
    })();

    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest && e.target.closest('[data-cursor]');
      if (!hot) return;
      var kind = hot.getAttribute('data-cursor');
      el.body.classList.toggle('cursor-hot', kind !== 'core');
      el.body.classList.toggle('cursor-core', kind === 'core');
    });
    document.addEventListener('mouseout', function (e) {
      var hot = e.target.closest && e.target.closest('[data-cursor]');
      if (!hot) return;
      el.body.classList.remove('cursor-hot', 'cursor-core');
    });
    document.addEventListener('mouseleave', function () { el.body.classList.remove('has-cursor', 'cursor-hot', 'cursor-core'); });
  }

  /* =========================================================
     REVEAL / SCROLL / NAV
     ========================================================= */
  $$('.reveal').forEach(function (node) {
    node.style.setProperty('--d', node.dataset.d || 0);
  });

  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); revealObs.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (n) { revealObs.observe(n); });

    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        $$('#nav a').forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('data-nav') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['assistant', 'services', 'process', 'pricing', 'contact'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) navObs.observe(s);
    });
  } else {
    $$('.reveal').forEach(function (n) { n.classList.add('is-in'); });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.pageYOffset / h) * 100 : 0;
      if (el.scrollBar) el.scrollBar.style.width = p.toFixed(2) + '%';
      if (el.topbar) el.topbar.classList.toggle('is-stuck', window.pageYOffset > 40);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile nav */
  if (el.menuToggle) {
    el.menuToggle.addEventListener('click', function () {
      var open = el.body.classList.toggle('nav-open');
      el.menuToggle.setAttribute('aria-expanded', String(open));
      el.menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('#nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        el.body.classList.remove('nav-open');
        el.menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* =========================================================
     RENDER FROM CONFIG
     ========================================================= */
  function renderHeroMeta() {
    if (el.heroVersion) el.heroVersion.textContent = 'v' + (CFG.version || '1.0');
    if (el.footerYear) el.footerYear.textContent = String(new Date().getFullYear());
  }

  function renderSuggestions() {
    if (!el.suggestGrid) return;
    el.suggestGrid.innerHTML = (CFG.suggestions || []).map(function (s) {
      return '<button type="button" class="suggest__item" data-text="' + esc(s.text) + '" data-cursor="link">' +
        '<span class="suggest__hint">' + esc(s.hint || 'Ask') + '</span>' +
        '<span class="suggest__text">' + esc(s.text) + '</span>' +
        '</button>';
    }).join('');
    $$('.suggest__item', el.suggestGrid).forEach(function (btn) {
      btn.addEventListener('click', function () { send(btn.getAttribute('data-text')); });
    });
  }

  function renderServices() {
    if (!el.serviceList) return;
    el.serviceList.innerHTML = (CFG.services || []).map(function (s, i) {
      var n = String(i + 1).padStart(2, '0');
      var tags = (s.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
      return '<li class="service reveal" data-cursor="tilt" style="--i:' + i + '">' +
        '<span class="service__num">' + n + '</span>' +
        '<span class="service__icon">' + icon(s.icon) + '</span>' +
        '<span class="service__main">' +
          '<span class="service__title">' + esc(s.title) + '</span>' +
          '<span class="service__summary">' + esc(s.summary || '') + '</span>' +
        '</span>' +
        '<span class="service__tags">' + tags + '</span>' +
        ARROW +
        '</li>';
    }).join('');

    var nodes = $$('.service', el.serviceList);
    nodes.forEach(function (node) { node.style.setProperty('--d', 0); });

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
      nodes.forEach(function (n, i) { n.style.transitionDelay = (i % 4) * 70 + 'ms'; obs.observe(n); });
    } else {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
    }

    if (finePointer && !reduced) {
      nodes.forEach(function (node) {
        node.addEventListener('mousemove', function (e) {
          var r = node.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          node.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          node.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          node.style.setProperty('--ry', ((px - 0.5) * 2.4).toFixed(2) + 'deg');
          node.style.setProperty('--rx', ((0.5 - py) * 1.8).toFixed(2) + 'deg');
          node.style.setProperty('--tx', ((px - 0.5) * 5).toFixed(2) + 'px');
          node.style.setProperty('--ty', ((py - 0.5) * 3).toFixed(2) + 'px');
        });
        node.addEventListener('mouseleave', function () {
          ['--rx', '--ry', '--tx', '--ty'].forEach(function (p) { node.style.setProperty(p, '0'); });
        });
      });
    }
  }

  function renderProcess() {
    if (!el.processList) return;
    el.processList.innerHTML = (CFG.process || []).map(function (p, i) {
      return '<article class="step reveal" data-d="' + i + '">' +
        '<span class="step__num">' + esc(p.step) + '</span>' +
        '<h3 class="step__title">' + esc(p.title) + '</h3>' +
        '<p class="step__body">' + esc(p.body) + '</p>' +
        '</article>';
    }).join('');
    $$('.step', el.processList).forEach(function (n) { n.style.setProperty('--d', n.dataset.d || 0); });
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); } });
      }, { threshold: 0.2 });
      $$('.step', el.processList).forEach(function (n) { obs.observe(n); });
    } else {
      $$('.step', el.processList).forEach(function (n) { n.classList.add('is-in'); });
    }
  }

  function renderPricing() {
    if (el.pricingNote) el.pricingNote.textContent = CFG.pricingNote || '';
    if (!el.pricingBody) return;

    el.pricingBody.innerHTML = (CFG.pricing || []).map(function (p, i) {
      var price = (p.price === null || p.price === undefined || p.price === '')
        ? '<span class="quote">Custom quote</span>'
        : '<span class="price-value">' + esc(p.price) + '</span>';
      var inc = (p.includes || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
      return '<div class="ledger__row reveal" data-d="' + (i % 3) + '">' +
        '<div class="ledger__cell ledger__name" data-label="Package">' +
          '<span class="ledger__pkg">' + esc(p.name) + '</span>' +
          '<span class="ledger__for">' + esc(p.for || '') + '</span>' +
        '</div>' +
        '<div class="ledger__cell ledger__inc" data-label="Includes"><ul>' + inc + '</ul></div>' +
        '<div class="ledger__cell ledger__time" data-label="Timeline">' + esc(p.timeline || 'Not configured') + '</div>' +
        '<div class="ledger__cell ledger__price" data-label="Investment">' + price +
          (p.note ? '<span class="ledger__note">' + esc(p.note) + '</span>' : '') +
        '</div>' +
        '</div>';
    }).join('');

    var rows = $$('.ledger__row', el.pricingBody);
    rows.forEach(function (n) { n.style.setProperty('--d', n.dataset.d || 0); });
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); } });
      }, { threshold: 0.12 });
      rows.forEach(function (n) { obs.observe(n); });
    } else {
      rows.forEach(function (n) { n.classList.add('is-in'); });
    }
  }

  function renderContact() {
    var c = CFG.contact || {};
    var soon = c.availabilityLabel || 'Coming soon';

    var rows = [
      { k: 'Email', v: c.email, href: c.email ? 'mailto:' + c.email : '' },
      { k: 'Phone', v: c.phone, href: c.phone ? 'tel:' + c.phone.replace(/[^+\d]/g, '') : '' },
      { k: 'WhatsApp', v: c.whatsapp, href: '' },
      { k: 'Studio', v: c.website || c.address, href: c.website ? c.website : '' },
      { k: 'Hours', v: CFG.workingHours, href: '' }
    ];

    if (el.channels) {
      el.channels.innerHTML = rows.map(function (r) {
        var value = r.v
          ? (r.href ? '<a href="' + esc(r.href) + '"' + (r.href.indexOf('http') === 0 ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(r.v) + '</a>' : esc(r.v))
          : '<span>' + esc(soon) + '</span>';
        return '<div class="channel"><dt>' + esc(r.k) + '</dt><dd class="' + (r.v ? '' : 'is-soon') + '">' + value + '</dd></div>';
      }).join('');
    }

    if (el.socials) {
      el.socials.innerHTML = (CFG.social || []).map(function (s) {
        return '<a class="social" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" data-cursor="link">' +
          '<span class="social__label">' + esc(s.label) + '</span>' +
          '<span class="social__handle">' + esc(s.handle) + '</span>' +
          '<svg class="social__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>' +
          '</a>';
      }).join('');
    }

    var ig = (CFG.social || []).filter(function (s) { return s.id === 'instagram'; })[0];
    var gh = (CFG.social || []).filter(function (s) { return s.id === 'github'; })[0];
    if (el.footerInstagram) { if (ig) el.footerInstagram.href = ig.url; else el.footerInstagram.hidden = true; }
    if (el.footerGithub) { if (gh) el.footerGithub.href = gh.url; else el.footerGithub.hidden = true; }

    function wireAction(node, value, buildHref, soonLabel) {
      if (!node) return;
      if (value) {
        node.setAttribute('href', buildHref(value));
        node.removeAttribute('aria-disabled');
        if (buildHref(value).indexOf('http') === 0) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
      } else {
        node.removeAttribute('href');
        node.setAttribute('aria-disabled', 'true');
        node.title = soonLabel;
        node.addEventListener('click', function (e) { e.preventDefault(); toast(soonLabel); });
      }
    }
    wireAction(el.emailBtn, c.email, function (v) { return 'mailto:' + v; }, 'Email is ' + soon.toLowerCase() + ' — use the project form instead.');
    wireAction(el.whatsappBtn, c.whatsapp, function (v) { return 'https://wa.me/' + v.replace(/[^+\d]/g, '').replace('+', ''); }, 'WhatsApp is ' + soon.toLowerCase() + ' — Instagram and the project form both work.');

    if (el.startProjectBtn) {
      el.startProjectBtn.addEventListener('click', function () {
        scrollToId('projectForm', function () { var n = $('#fName'); if (n) n.focus({ preventScroll: true }); });
      });
    }
  }

  function renderFormOptions() {
    if (el.fType) {
      el.fType.innerHTML = '<option value="">Select a project type</option>' +
        (CFG.form.projectTypes || []).map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
    }
    if (el.fBudget) {
      el.fBudget.innerHTML = '<option value="">Select a budget range</option>' +
        (CFG.form.budgets || []).map(function (b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
    }
  }

  /* =========================================================
     CONNECTION UI
     ========================================================= */
  function refreshConnectionUI() {
    var ok = AI.isConfigured();
    el.body.classList.toggle('ai-local', !ok);
    if (el.connectBanner) {
      el.connectBanner.hidden = ok;
      el.connectBanner.classList.toggle('is-info', !ok);
    }
    if (!ok) {
      if (el.connectTitle) el.connectTitle.textContent = CFG.copy.localTitle || 'Offline mode — the chat still works.';
      if (el.connectBody) el.connectBody.textContent = CFG.copy.localBody || '';
      if (el.connectBannerBtn) el.connectBannerBtn.innerHTML = '<span>' + esc(CFG.copy.localButton || 'Attach Gemini key') + '</span>';
      if (el.connectBtnLabel) el.connectBtnLabel.textContent = CFG.copy.localButton || 'Attach Gemini key';
      setMode('local');
    } else {
      if (el.connectBtnLabel) el.connectBtnLabel.textContent = 'AI connection · Gemini';
      setMode('gemini');
    }
    if (el.keySourceLabel) el.keySourceLabel.textContent = AI.keySource();
    setAiState(ok ? 'idle' : 'local', true);
  }

  var lastFocus = null;
  function openModal() {
    if (!el.modal) return;
    lastFocus = document.activeElement;
    el.modal.hidden = false;
    el.body.classList.add('is-locked');
    if (el.keySourceLabel) el.keySourceLabel.textContent = AI.keySource();
    setTimeout(function () { if (el.keyInput) el.keyInput.focus(); }, 60);
  }
  function closeModal() {
    if (!el.modal || el.modal.hidden) return;
    el.modal.hidden = true;
    el.body.classList.remove('is-locked');
    if (el.keyInput) el.keyInput.value = '';
    if (el.connectMsg) { el.connectMsg.textContent = ''; el.connectMsg.className = 'modal__msg'; }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (el.statusBtn) el.statusBtn.addEventListener('click', openModal);
  if (el.connectBtn) el.connectBtn.addEventListener('click', openModal);
  if (el.connectBannerBtn) el.connectBannerBtn.addEventListener('click', openModal);
  if (el.modalClose) el.modalClose.addEventListener('click', closeModal);
  if (el.modal) {
    el.modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute('data-close-modal')) closeModal();
    });
    el.modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('button, input, [href]', $('.modal__panel', el.modal)).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (el.modal && !el.modal.hidden) { closeModal(); return; }
      if (el.body.classList.contains('nav-open') && el.menuToggle) { el.menuToggle.click(); return; }
    }
    if (e.key === '/' && document.activeElement !== el.input && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) {
      e.preventDefault();
      scrollToId('assistant', function () { el.input.focus({ preventScroll: true }); });
    }
  });

  if (el.connectForm) {
    el.connectForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var value = (el.keyInput.value || '').trim();
      el.connectMsg.className = 'modal__msg';
      if (!value) { el.connectMsg.textContent = 'Paste a key first.'; el.connectMsg.classList.add('is-bad'); return; }
      el.connectMsg.textContent = 'Testing the connection…';
      var res = await AI.testConnection(value);
      if (res.ok) {
        AI.setSessionKey(value);
        el.connectMsg.textContent = 'Connected for this browser tab. Nothing was logged.';
        el.connectMsg.classList.add('is-ok');
        refreshConnectionUI();
        setTimeout(closeModal, 900);
        toast('AI connected');
      } else {
        el.connectMsg.textContent = (res.error && res.error.message) || 'That key did not work.';
        el.connectMsg.classList.add('is-bad');
      }
    });
  }
  if (el.keyRemove) {
    el.keyRemove.addEventListener('click', function () {
      AI.clearSessionKey();
      refreshConnectionUI();
      el.connectMsg.textContent = AI.keySource() === 'deployment'
        ? 'A deployment key is still active — it cannot be removed from the browser.'
        : 'Session key removed.';
      el.connectMsg.className = 'modal__msg ' + (AI.keySource() === 'deployment' ? 'is-ok' : '');
      toast('Key removed');
    });
  }

  /* =========================================================
     CONVERSATION
     ========================================================= */
  function setBusy(state) {
    busy = state;
    el.body.classList.toggle('is-busy', state);
    if (el.sendBtn) el.sendBtn.disabled = state;
    if (el.input) el.input.disabled = state;
    if (el.clearBtn) el.clearBtn.disabled = state || messages.length === 0;
    if (el.copyLastBtn) el.copyLastBtn.disabled = state || !lastModelText();
  }
  function lastModelText() {
    for (var i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'model') return messages[i].text;
    return '';
  }
  function updateCount() {
    if (!el.convoCount) return;
    var q = messages.filter(function (m) { return m.role === 'user'; }).length;
    el.convoCount.textContent = q === 0 ? 'No messages yet' : q + (q === 1 ? ' question' : ' questions') + ' · ' + (messages.length - q) + ' answered';
  }

  function addTurn(role, text) {
    var node = document.createElement('article');
    node.className = 'turn ' + (role === 'user' ? 'turn--you' : 'turn--ai');
    node.dataset.role = role;
    var who = role === 'user' ? 'You' : (CFG.assistantName || 'SwiftSite AI');
    node.innerHTML =
      '<header class="turn__meta">' +
        '<span class="turn__who">' + esc(who) + '</span>' +
        (role === 'user' ? '' : '<span class="turn__mode" data-mode></span>') +
        '<span class="turn__time">' + now() + '</span>' +
        '<span class="turn__tools"></span>' +
      '</header>' +
      '<div class="turn__body"></div>';
    var body = $('.turn__body', node);
    if (text) body.innerHTML = renderText(text);
    el.thread.appendChild(node);
    el.body.dataset.chat = 'open';
    return { node: node, body: body, tools: $('.turn__tools', node) };
  }

  function addTool(turn, label, handler) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini';
    b.textContent = label;
    b.addEventListener('click', handler);
    turn.tools.appendChild(b);
    return b;
  }

  function nearBottom() {
    return window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 420;
  }
  function keepInView(node, instant) {
    if (!node || !nearBottom()) return;
    var top = node.getBoundingClientRect().bottom + window.pageYOffset - window.innerHeight + 90;
    if (top > window.pageYOffset) {
      window.scrollTo({ top: top, behavior: (reduced || instant) ? 'auto' : 'smooth' });
    }
  }

  function showThinking() {
    if (el.emptyState) el.emptyState.hidden = true;
    var turn = addTurn('model', '');
    turn.node.dataset.pending = '1';
    turn.body.setAttribute('aria-busy', 'true');
    turn.body.innerHTML =
      '<span class="thinking">' + esc(CFG.copy.thinking || 'Thinking') +
      '<span class="thinking__dots" aria-hidden="true"><i></i><i></i><i></i></span></span>';
    return turn;
  }

  function finalizeTurn(turn, text) {
    delete turn.node.dataset.pending;
    turn.body.removeAttribute('aria-busy');
    turn.body.innerHTML = renderText(text);
    addTool(turn, 'Copy', function () {
      copyText(text).then(function (ok) { toast(ok ? 'Answer copied' : 'Copy blocked by the browser'); });
    });
    keepInView(turn.node);
  }

  function errorTurn(turn, error, askText) {
    turn.node.classList.add('turn--error');
    turn.node.dataset.pending = '';
    turn.body.removeAttribute('aria-busy');
    var msg = (error && error.message) || (CFG.copy.connectionError || 'Connection problem.');
    turn.body.innerHTML = '<p>' + esc(msg) + '</p>';
    if (error && error.needsKey) {
      addTool(turn, 'Connect AI', function () { openModal(); });
    } else {
      addTool(turn, 'Try again', function () {
        turn.node.remove();
        retry(askText);
      });
    }
    keepInView(turn.node);
  }

  function historyForApi() {
    return messages.map(function (m) { return { role: m.role, text: m.text }; });
  }

  /* coalesce streaming chunks into a single repaint per frame */
  function paintStream(turn, full) {
    streamBuf = full;
    if (streamRaf) return;
    streamRaf = requestAnimationFrame(function () {
      streamRaf = null;
      turn.body.innerHTML = renderText(streamBuf);
      emitPulse();
      keepInView(turn.node, true);
    });
  }

  async function runRequest(text, turn) {
    controller = typeof AbortController === 'function' ? new AbortController() : null;
    var started = false;

    var res = await AI.generate({
      messages: historyForApi(),
      language: langMode,
      signal: controller ? controller.signal : null,
      onChunk: function (delta, full) {
        if (!started) {
          started = true;
          setAiState('generating');
          turn.body.innerHTML = '';
        }
        paintStream(turn, full);
      }
    });

    if (streamRaf) { cancelAnimationFrame(streamRaf); streamRaf = null; }

    if (res.ok) {
      messages.push({ role: 'model', text: res.text });
      finalizeTurn(turn, res.text);
      setMode(res.engine || 'gemini');
      setTurnMode(turn, res.engine || 'gemini');
      if (res.followUps && res.followUps.length) addFollowUps(turn.node, res.followUps);
      setAiState('ready');
      updateCount();
    } else if (res.error && res.error.type === 'aborted') {
      turn.node.remove();
      setAiState(messages.length ? 'idle' : 'local', true);
    } else {
      lastFailedText = text;
      errorTurn(turn, res.error, text);
      setAiState('error');
    }
    setBusy(false);
  }

  async function send(text, isRetry) {
    text = String(text || '').trim();
    if (!text || busy) return;

    /* No key? local.js answers from the studio configuration — labelled, never faked. */
    if (!isRetry) {
      messages.push({ role: 'user', text: text });
      addTurn('user', text);
      updateCount();
    }

    var turn = showThinking();
    setBusy(true);
    setAiState('thinking');
    if (el.input) el.input.value = '';
    autoGrow();
    keepInView(turn.node);
    await runRequest(text, turn);
  }

  function retry(text) {
    var t = text || lastFailedText;
    if (!t) return;
    lastFailedText = null;
    send(t, true);
  }

  /* composer */
  function autoGrow() {
    if (!el.input) return;
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(el.input.scrollHeight, 200) + 'px';
  }

  if (el.composer) {
    el.composer.addEventListener('submit', function (e) {
      e.preventDefault();
      send(el.input.value);
    });
  }
  if (el.input) {
    el.input.addEventListener('input', function () {
      autoGrow();
      if (!busy && el.input.value.trim()) setAiState('listening');
      else if (!busy && AI.isConfigured() && messages.length === 0) setAiState('idle', true);
    });
    el.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!busy) send(el.input.value);
      }
    });
    el.input.addEventListener('blur', function () {
      if (!busy && AI.isConfigured()) setAiState('idle', true);
    });
    autoGrow();
  }

  if (el.clearBtn) {
    el.clearBtn.addEventListener('click', function () {
      if (controller) { try { controller.abort(); } catch (e) {} }
      messages = [];
      lastFailedText = null;
      el.thread.innerHTML = '';
      setMode(AI.isConfigured() ? 'gemini' : 'local');
      if (el.emptyState) el.emptyState.hidden = false;
      el.body.dataset.chat = 'closed';
      updateCount();
      setBusy(false);
      refreshConnectionUI();
      toast('Conversation cleared');
      if (el.input) el.input.focus();
    });
  }

  if (el.copyLastBtn) {
    el.copyLastBtn.addEventListener('click', function () {
      var t = lastModelText();
      if (!t) return;
      copyText(t).then(function (ok) { toast(ok ? 'Answer copied' : 'Copy blocked by the browser'); });
    });
  }

  if (el.langToggle) {
    $$('.lang-toggle__btn', el.langToggle).forEach(function (btn) {
      btn.addEventListener('click', function () {
        langMode = btn.getAttribute('data-lang');
        $$('.lang-toggle__btn', el.langToggle).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        var label = btn.textContent.trim();
        toast(label === 'Auto' ? 'Language: matched to your message' : 'Replies in ' + label);
      });
    });
  }

  if (el.startBtn) {
    el.startBtn.addEventListener('click', function () {
      scrollToId('assistant', function () { el.input.focus({ preventScroll: true }); });
      setAiState(AI.isConfigured() ? 'listening' : 'off', true);
    });
  }

  if (el.askPricingBtn) {
    el.askPricingBtn.addEventListener('click', function () {
      scrollToId('assistant', function () { send('What would my website cost?'); });
    });
  }

  /* =========================================================
     PROJECT FORM — honest validation, no pretending
     ========================================================= */
  var RULES = {
    fName: { label: 'Name', test: function (v) { return v.trim().length >= 2; }, msg: 'Please enter your name' },
    fEmail: { label: 'Email', test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); }, msg: 'Enter a valid email address' },
    fPhone: { label: 'Phone', optional: true, test: function (v) { return v.trim() === '' || v.replace(/[^\d]/g, '').length >= 7; }, msg: 'Enter a reachable number' },
    fType: { label: 'Project type', test: function (v) { return v !== ''; }, msg: 'Choose a project type' },
    fBudget: { label: 'Budget', test: function (v) { return v !== ''; }, msg: 'Choose a budget option' },
    fMessage: { label: 'Message', test: function (v) { return v.trim().length >= 12; }, msg: 'Tell me a little more — 12 characters minimum' }
  };

  function validateField(id) {
    var rule = RULES[id];
    var node = document.getElementById(id);
    if (!rule || !node) return true;
    var errNode = document.getElementById('e' + id.slice(1));
    var field = node.closest('.field');
    var ok = rule.test(node.value);
    if (field) field.classList.toggle('has-error', !ok);
    if (errNode) { errNode.textContent = ok ? '' : rule.msg; errNode.hidden = ok; }
    node.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  Object.keys(RULES).forEach(function (id) {
    var node = document.getElementById(id);
    if (!node) return;
    node.addEventListener('blur', function () { validateField(id); });
    node.addEventListener('input', function () {
      if (node.closest('.field').classList.contains('has-error')) validateField(id);
    });
    node.addEventListener('change', function () { validateField(id); });
  });

  function composeEnquiry(data) {
    return [
      'SwiftSite — project enquiry',
      '-----------------------------',
      'Name: ' + data.name,
      'Email: ' + data.email,
      'Phone: ' + (data.phone || 'not provided'),
      'Project type: ' + data.projectType,
      'Budget: ' + data.budget,
      '',
      'Details:',
      data.message,
      '',
      'Submitted from the SwiftSite website on ' + new Date().toLocaleString()
    ].join('\n');
  }

  if (el.form) {
    el.form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(RULES).forEach(function (id) {
        var ok = validateField(id);
        if (!ok && !firstBad) firstBad = document.getElementById(id);
      });
      if (firstBad) {
        firstBad.focus();
        toast('Check the highlighted fields');
        return;
      }

      var data = {
        name: $('#fName').value.trim(),
        email: $('#fEmail').value.trim(),
        phone: $('#fPhone').value.trim(),
        projectType: $('#fType').value,
        budget: $('#fBudget').value,
        message: $('#fMessage').value.trim()
      };
      var text = composeEnquiry(data);
      var endpoint = (CFG.form && CFG.form.submissionEndpoint) || '';

      el.formResult.hidden = false;
      el.formResult.classList.remove('is-warn');

      if (endpoint) {
        el.formResult.innerHTML = '<h4>Sending…</h4><p>Posting your enquiry to the configured endpoint.</p>';
        try {
          var resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!resp.ok) throw new Error('bad status');
          el.formResult.innerHTML = '<h4>Enquiry sent.</h4><p>The studio received your details through the configured endpoint.</p>';
          el.form.reset();
          return;
        } catch (err) {
          el.formResult.classList.add('is-warn');
          el.formResult.innerHTML = '<h4>That did not go through.</h4>' +
            '<p>The configured submission endpoint did not accept the request. Your details are still below — copy them and send them another way.</p>' +
            '<pre>' + esc(text) + '</pre>';
          wireResultButtons(text, data);
          return;
        }
      }

      el.formResult.innerHTML =
        '<h4>' + esc(CFG.copy.formReady) + '</h4>' +
        '<p>' + esc(CFG.copy.formNoEndpoint) + '</p>' +
        '<pre>' + esc(text) + '</pre>';
      wireResultButtons(text, data);
      toast('Enquiry prepared — nothing was sent yet');
    });
  }

  function wireResultButtons(text, data) {
    var wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '.6rem';
    wrap.style.flexWrap = 'wrap';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn--ghost btn--tiny';
    copyBtn.innerHTML = '<span>Copy details</span>';
    copyBtn.setAttribute('data-cursor', 'button');
    copyBtn.addEventListener('click', function () {
      copyText(text).then(function (ok) { toast(ok ? 'Enquiry copied to clipboard' : 'Copy blocked by the browser'); });
    });
    wrap.appendChild(copyBtn);

    if (CFG.contact && CFG.contact.email) {
      var mailBtn = document.createElement('a');
      mailBtn.className = 'btn btn--primary btn--tiny';
      mailBtn.innerHTML = '<span>Open in mail app</span>';
      mailBtn.setAttribute('data-cursor', 'button');
      mailBtn.href = 'mailto:' + CFG.contact.email +
        '?subject=' + encodeURIComponent('Project enquiry — ' + data.projectType) +
        '&body=' + encodeURIComponent(text);
      wrap.appendChild(mailBtn);
    }

    var ig = (CFG.social || []).filter(function (s) { return s.id === 'instagram'; })[0];
    if (ig) {
      var igBtn = document.createElement('a');
      igBtn.className = 'btn btn--ghost btn--tiny';
      igBtn.innerHTML = '<span>Send via Instagram</span>';
      igBtn.href = ig.url;
      igBtn.target = '_blank';
      igBtn.rel = 'noopener noreferrer';
      igBtn.setAttribute('data-cursor', 'button');
      wrap.appendChild(igBtn);
    }

    el.formResult.appendChild(wrap);
  }

  /* =========================================================
     BOOT
     ========================================================= */
  renderHeroMeta();
  renderSuggestions();
  renderServices();
  renderProcess();
  renderPricing();
  renderContact();
  renderFormOptions();
  refreshConnectionUI();
  updateCount();
  setBusy(false);
  requestAnimationFrame(function () { el.body.classList.add('is-loaded'); });

  /* reveal the hero immediately — it is above the fold */
  $$('.hero .reveal').forEach(function (n, i) {
    setTimeout(function () { n.classList.add('is-in'); }, 120 + i * 90);
  });
})();
