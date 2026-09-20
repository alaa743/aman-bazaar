/* ==========================================================================
   AMAN BAZAAR — site behaviour
   Every module guards its own hooks, so this one file is safe to load on any
   page whether or not that page contains the markup a module drives.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- helpers */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* Pages live at the root or one folder deep; <html data-base> says which. */
  var BASE = document.documentElement.getAttribute('data-base') || '';
  var url = function (p) { return BASE + p; };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var money = function (n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  var catalogue = (window.AMAN && window.AMAN.products) || [];
  var byId = {};
  catalogue.forEach(function (p) { byId[p.id] = p; });

  var icon = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>'
  };

  /* ------------------------------------------------------------------ toasts */
  var toastHost;

  function toast(message, kind) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toasts';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = (kind === 'alert' ? icon.alert : icon.check) + '<span></span>';
    $('span', el).textContent = message;
    toastHost.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      el.addEventListener('animationend', function () { el.remove(); });
    }, 3200);
  }

  /* ----------------------------------------------------------- scroll lock */
  var lockCount = 0;

  function lockScroll(on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    document.body.classList.toggle('is-locked', lockCount > 0);
  }

  /* -------------------------------------------------------------- 1. gate */
  (function gate() {
    var el = $('#gate');
    if (!el) return;

    // The reveal is a first-impression flourish, not a toll booth on every visit.
    if (reduceMotion || sessionStorage.getItem('aman-gate') === 'seen') {
      el.remove();
      return;
    }
    lockScroll(true);
    var open = function () {
      if (el.classList.contains('is-open')) return;
      el.classList.add('is-open');
      sessionStorage.setItem('aman-gate', 'seen');
      lockScroll(false);
      setTimeout(function () { el.remove(); }, 1600);
    };
    setTimeout(open, 1500);
    el.addEventListener('click', open);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(); });
  }());

  /* ---------------------------------------------------- 2. scroll progress */
  (function progress() {
    var bar = $('.scroll-progress');
    if (!bar) return;
    var tick = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
    };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }());

  /* ----------------------------------------------------------- 3. navbar */
  (function navbar() {
    var nav = $('.nav');
    if (!nav) return;

    var toggle = $('.nav__toggle', nav);
    var menu = $('.nav__menu', nav);
    var last = window.scrollY;

    $$('.nav__link', nav).forEach(function (a, i) { a.style.setProperty('--i', i); });

    var onScroll = function () {
      var y = window.scrollY;
      nav.classList.toggle('is-stuck', y > 40);
      // Reclaim vertical space while reading downward, but never while the menu is open.
      var menuOpen = menu && menu.classList.contains('is-open');
      nav.classList.toggle('is-hidden', y > 420 && y > last && !menuOpen);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (!toggle || !menu) return;

    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      lockScroll(open);
    };

    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });

    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () {
        if (toggle.getAttribute('aria-expanded') === 'true') setMenu(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });

    // A resize past the breakpoint leaves the menu mounted but unstyled; reset it.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && toggle.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }());

  /* ------------------------------------------------------- 4. scroll reveal */
  (function reveal() {
    var targets = $$('[data-reveal]');
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });

    // Stagger siblings inside any container that opts in.
    $$('[data-reveal-group]').forEach(function (group) {
      $$('[data-reveal]', group).forEach(function (el, i) {
        el.style.setProperty('--d', i * 80);
      });
    });
  }());

  /* ---------------------------------------------------------- 5. counters */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduceMotion) { el.textContent = target + suffix; return; }
      var start = performance.now();
      var step = function (now) {
        var t = Math.min((now - start) / 1400, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });
  }());

  /* ---------------------------------------------------------- 6. parallax */
  (function parallax() {
    var layers = $$('[data-parallax]');
    if (!layers.length || reduceMotion) return;

    var ticking = false;
    var update = function () {
      layers.forEach(function (el) {
        var rect = el.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
        el.style.transform = 'translate3d(0,' + (-rect.top * speed).toFixed(2) + 'px,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }());

  /* --------------------------------------------------------------- 7. cart */
  var Cart = (function () {
    var KEY = 'aman-cart-v1';
    var items = [];

    try {
      var stored = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(stored)) {
        // Drop anything whose product no longer exists in the catalogue.
        items = stored
          .filter(function (l) { return l && byId[l.id]; })
          .map(function (l) { return { id: l.id, qty: Math.min(99, Math.max(1, parseInt(l.qty, 10) || 1)) }; });
      }
    } catch (err) { items = []; }

    var listeners = [];

    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (err) { /* private mode */ }
      listeners.forEach(function (fn) { fn(); });
    }

    return {
      lines: function () {
        return items.map(function (l) {
          var p = byId[l.id];
          return { id: l.id, qty: l.qty, product: p, total: p.price * l.qty };
        });
      },
      count: function () {
        return items.reduce(function (n, l) { return n + l.qty; }, 0);
      },
      subtotal: function () {
        return items.reduce(function (n, l) { return n + byId[l.id].price * l.qty; }, 0);
      },
      add: function (id, qty) {
        if (!byId[id]) return false;
        var line = items.filter(function (l) { return l.id === id; })[0];
        if (line) line.qty = Math.min(99, line.qty + (qty || 1));
        else items.push({ id: id, qty: Math.min(99, qty || 1) });
        save();
        return true;
      },
      setQty: function (id, qty) {
        qty = parseInt(qty, 10) || 0;
        if (qty < 1) return this.remove(id);
        items.forEach(function (l) { if (l.id === id) l.qty = Math.min(99, qty); });
        save();
      },
      remove: function (id) {
        items = items.filter(function (l) { return l.id !== id; });
        save();
      },
      clear: function () { items = []; save(); },
      subscribe: function (fn) { listeners.push(fn); fn(); }
    };
  }());

  /* Badge in the navigation */
  (function cartBadge() {
    var badges = $$('.cart-count');
    if (!badges.length) return;
    var prev = Cart.count();
    Cart.subscribe(function () {
      var n = Cart.count();
      badges.forEach(function (b) {
        b.textContent = n;
        b.classList.toggle('is-visible', n > 0);
        if (n > prev) {
          b.classList.remove('is-bump');
          void b.offsetWidth; // restart the animation
          b.classList.add('is-bump');
        }
      });
      prev = n;
    });
  }());

  /* Slide-out drawer */
  var drawer = (function () {
    var panel = $('#cart-drawer');
    if (!panel) return { open: function () {} };

    var backdrop = $('#cart-backdrop');
    var body = $('.drawer__body', panel);
    var foot = $('.drawer__foot', panel);
    var lastFocus = null;

    function render() {
      var lines = Cart.lines();
      if (!lines.length) {
        body.innerHTML =
          '<div class="cart-empty">' +
          '<span class="cart-empty__glyph" aria-hidden="true">\u{13080}</span>' +
          '<p>Your collection is empty.</p>' +
          '<a class="btn btn--sm" href="' + url('categories.html') + '">Browse the archives</a>' +
          '</div>';
        foot.hidden = true;
        return;
      }
      foot.hidden = false;
      body.innerHTML = lines.map(function (l) {
        return '' +
          '<div class="cart-line" data-line="' + l.id + '">' +
          '<img class="cart-line__img" src="' + url(l.product.img) + '" alt="" loading="lazy">' +
          '<div>' +
          '<a class="cart-line__name" href="' + url(l.product.file) + '"></a>' +
          '<p class="cart-line__meta"></p>' +
          '<div class="cart-line__controls">' +
          '<span class="stepper">' +
          '<button type="button" data-step="-1" aria-label="Decrease quantity">−</button>' +
          '<span>' + l.qty + '</span>' +
          '<button type="button" data-step="1" aria-label="Increase quantity">+</button>' +
          '</span>' +
          '<button type="button" class="cart-line__remove" data-remove>Remove</button>' +
          '</div></div>' +
          '<span class="cart-line__price">' + money(l.total) + '</span>' +
          '</div>';
      }).join('');

      // Titles are set as text so product names with & or quotes cannot break out.
      lines.forEach(function (l) {
        var row = $('[data-line="' + CSS.escape(l.id) + '"]', body);
        if (!row) return;
        $('.cart-line__name', row).textContent = l.product.name;
        $('.cart-line__meta', row).textContent = l.product.catName;
      });

      $('#drawer-subtotal', foot).textContent = money(Cart.subtotal());
    }

    body.addEventListener('click', function (e) {
      var row = e.target.closest('[data-line]');
      if (!row) return;
      var id = row.getAttribute('data-line');
      if (e.target.closest('[data-remove]')) {
        Cart.remove(id);
        toast('Removed from your collection.');
      } else if (e.target.closest('[data-step]')) {
        var delta = parseInt(e.target.closest('[data-step]').getAttribute('data-step'), 10);
        var line = Cart.lines().filter(function (l) { return l.id === id; })[0];
        if (line) Cart.setQty(id, line.qty + delta);
      }
    });

    function open() {
      lastFocus = document.activeElement;
      panel.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      lockScroll(true);
      var focusable = $('.drawer__close', panel);
      if (focusable) focusable.focus();
    }

    function close() {
      if (!panel.classList.contains('is-open')) return;
      panel.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      lockScroll(false);
      if (lastFocus) lastFocus.focus();
    }

    $$('[data-cart-open]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); open(); });
    });
    $$('[data-cart-close]', panel).forEach(function (b) { b.addEventListener('click', close); });
    if (backdrop) backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    // Keep tab focus inside the drawer while it is open.
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', panel)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0];
      var lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });

    Cart.subscribe(render);
    return { open: open, close: close };
  }());

  /* Any element carrying data-add can put a product in the cart */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute('data-add');
    var qtyField = btn.form ? $('[data-qty-input]', btn.form) : null;
    var qty = qtyField ? parseInt(qtyField.value, 10) || 1 : 1;
    if (!Cart.add(id, qty)) {
      toast('That piece is no longer available.', 'alert');
      return;
    }
    toast((byId[id] ? byId[id].name : 'Item') + ' added to your collection.');
    if (btn.hasAttribute('data-add-open')) drawer.open();
  });

  /* ------------------------------------------------------- 8. qty stepper */
  (function qtyStepper() {
    $$('[data-qty]').forEach(function (wrap) {
      var input = $('[data-qty-input]', wrap);
      if (!input) return;
      $$('[data-qty-step]', wrap).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var delta = parseInt(btn.getAttribute('data-qty-step'), 10);
          var next = (parseInt(input.value, 10) || 1) + delta;
          input.value = Math.min(99, Math.max(1, next));
        });
      });
      input.addEventListener('change', function () {
        input.value = Math.min(99, Math.max(1, parseInt(input.value, 10) || 1));
      });
    });
  }());

  /* ----------------------------------------------------- 9. product gallery */
  (function gallery() {
    var stage = $('[data-stage]');
    if (!stage) return;
    var img = $('img', stage);
    var thumbs = $$('[data-thumb]');

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var src = thumb.getAttribute('data-thumb');
        if (img.getAttribute('src') === src) return;
        img.style.opacity = '0';
        var swap = function () {
          img.src = src;
          img.style.opacity = '';
          img.removeEventListener('transitionend', swap);
        };
        setTimeout(swap, 180);
        thumbs.forEach(function (t) { t.setAttribute('aria-selected', String(t === thumb)); });
      });
    });

    // Click to magnify, pointer position drives the origin.
    stage.addEventListener('click', function () { stage.classList.toggle('is-zoomed'); });
    stage.addEventListener('mousemove', function (e) {
      if (!stage.classList.contains('is-zoomed')) return;
      var r = stage.getBoundingClientRect();
      img.style.transformOrigin =
        ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
    });
    stage.addEventListener('mouseleave', function () { stage.classList.remove('is-zoomed'); });
  }());

  /* ------------------------------------------- 10. collection filter & sort */
  (function collectionTools() {
    var grid = $('[data-filter-grid]');
    if (!grid) return;

    var search = $('[data-filter-search]');
    var sort = $('[data-filter-sort]');
    var count = $('[data-filter-count]');
    var cards = $$('[data-product]', grid);
    var empty = $('[data-filter-empty]');
    var total = cards.length;

    var normalise = function (s) { return s.toLowerCase().trim(); };

    function apply() {
      var q = search ? normalise(search.value) : '';
      var shown = 0;

      cards.forEach(function (card) {
        var haystack = card.getAttribute('data-search') || '';
        var hit = !q || haystack.indexOf(q) > -1;
        card.hidden = !hit;
        if (hit) shown++;
      });

      if (sort && sort.value !== 'default') {
        var dir = sort.value === 'price-asc' ? 1 : sort.value === 'price-desc' ? -1 : 0;
        var sorted = cards.slice().sort(function (a, b) {
          if (dir) {
            return (parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price'))) * dir;
          }
          return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
        });
        sorted.forEach(function (card) { grid.appendChild(card); });
      } else {
        cards.forEach(function (card) { grid.appendChild(card); });
      }

      if (empty) empty.hidden = shown !== 0;
      if (count) count.innerHTML = '<b>' + shown + '</b> of ' + total + ' pieces';
    }

    if (search) {
      var timer;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(apply, 120);
      });
    }
    if (sort) sort.addEventListener('change', apply);
    apply();
  }());

  /* --------------------------------------------------- 11. global search */
  (function siteSearch() {
    var overlay = $('#search');
    if (!overlay) return;

    var input = $('.search__input', overlay);
    var results = $('.search__results', overlay);
    var lastFocus = null;

    function render(q) {
      q = q.toLowerCase().trim();
      if (q.length < 2) {
        results.innerHTML = '<p class="search__hint">Type at least two letters to search ' +
          catalogue.length + ' pieces.</p>';
        return;
      }
      var hits = catalogue.filter(function (p) {
        return (p.name + ' ' + p.catName).toLowerCase().indexOf(q) > -1;
      }).slice(0, 8);

      if (!hits.length) {
        results.innerHTML = '<p class="search__hint">Nothing matches that yet — try another word.</p>';
        return;
      }
      results.innerHTML = hits.map(function (p) {
        return '<a class="search__item" href="' + url(p.file) + '" data-hit="' + p.id + '">' +
          '<img src="' + url(p.img) + '" alt="" loading="lazy">' +
          '<span><h4></h4><p></p></span>' +
          '<span class="price">' + money(p.price) + '</span></a>';
      }).join('');
      hits.forEach(function (p) {
        var row = $('[data-hit="' + CSS.escape(p.id) + '"]', results);
        if (!row) return;
        $('h4', row).textContent = p.name;
        $('p', row).textContent = p.catName;
      });
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      lockScroll(true);
      input.value = '';
      render('');
      setTimeout(function () { input.focus(); }, 60);
    }

    function close() {
      if (!overlay.classList.contains('is-open')) return;
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      lockScroll(false);
      if (lastFocus) lastFocus.focus();
    }

    $$('[data-search-open]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); open(); });
    });
    $$('[data-search-close]', overlay).forEach(function (b) { b.addEventListener('click', close); });
    input.addEventListener('input', function () { render(input.value); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      // "/" is a search shortcut unless the caret is already in a field.
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        open();
      }
    });
  }());

  /* ---------------------------------------------------- 12. testimonials */
  (function testimonials() {
    var root = $('[data-slider]');
    if (!root) return;

    var track = $('.testimonials__track', root);
    var slides = $$('.testimonial', track);
    var dots = $$('[data-slide-to]', root);
    var index = 0;
    var timer;

    if (slides.length < 2) return;

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      slides.forEach(function (s, n) { s.setAttribute('aria-hidden', String(n !== index)); });
      dots.forEach(function (d, n) { d.setAttribute('aria-selected', String(n === index)); });
    }

    function play() {
      if (reduceMotion) return;
      stop();
      timer = setInterval(function () { go(index + 1); }, 6500);
    }
    function stop() { clearInterval(timer); }

    $$('[data-slide]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        go(index + parseInt(btn.getAttribute('data-slide'), 10));
        play();
      });
    });

    dots.forEach(function (dot, n) {
      dot.addEventListener('click', function () { go(n); play(); });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', play);
    root.addEventListener('focusin', stop);

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(index - 1); play(); }
      if (e.key === 'ArrowRight') { go(index + 1); play(); }
    });

    // Touch swipe
    var startX = null;
    root.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; stop(); }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
      startX = null;
      play();
    });

    go(0);
    play();
  }());

  /* ----------------------------------------------------------- 13. FAQ */
  (function faq() {
    var buttons = $$('.faq__q');
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        // One answer at a time keeps the column from jumping around.
        buttons.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  }());

  /* ------------------------------------------------------ 14. cart page */
  (function cartPage() {
    var root = $('#cart-page');
    if (!root) return;

    var list = $('[data-cart-list]', root);
    var summary = $('[data-cart-summary]', root);
    var form = $('#checkout-form');
    var SHIPPING = 0;

    function render() {
      var lines = Cart.lines();

      if (!lines.length) {
        list.innerHTML =
          '<div class="cart-empty">' +
          '<span class="cart-empty__glyph" aria-hidden="true">\u{13080}</span>' +
          '<p>You have not collected anything yet.</p>' +
          '<a class="btn btn--sm" href="' + url('categories.html') + '">Explore the collections</a>' +
          '</div>';
        summary.hidden = true;
        return;
      }

      summary.hidden = false;
      list.innerHTML = lines.map(function (l) {
        return '' +
          '<div class="cart-line" data-line="' + l.id + '">' +
          '<img class="cart-line__img" src="' + url(l.product.img) + '" alt="" loading="lazy">' +
          '<div>' +
          '<a class="cart-line__name" href="' + url(l.product.file) + '"></a>' +
          '<p class="cart-line__meta"></p>' +
          '<div class="cart-line__controls">' +
          '<span class="stepper">' +
          '<button type="button" data-step="-1" aria-label="Decrease quantity">−</button>' +
          '<span>' + l.qty + '</span>' +
          '<button type="button" data-step="1" aria-label="Increase quantity">+</button>' +
          '</span>' +
          '<button type="button" class="cart-line__remove" data-remove>Remove</button>' +
          '</div></div>' +
          '<span class="cart-line__price">' + money(l.total) + '</span>' +
          '</div>';
      }).join('');

      lines.forEach(function (l) {
        var row = $('[data-line="' + CSS.escape(l.id) + '"]', list);
        if (!row) return;
        $('.cart-line__name', row).textContent = l.product.name;
        $('.cart-line__meta', row).textContent = l.product.catName + ' · ' + money(l.product.price) + ' each';
      });

      var sub = Cart.subtotal();
      $('[data-sum-items]', summary).textContent = Cart.count();
      $('[data-sum-sub]', summary).textContent = money(sub);
      $('[data-sum-ship]', summary).textContent = SHIPPING ? money(SHIPPING) : 'Free';
      $('[data-sum-total]', summary).textContent = money(sub + SHIPPING);
    }

    list.addEventListener('click', function (e) {
      var row = e.target.closest('[data-line]');
      if (!row) return;
      var id = row.getAttribute('data-line');
      if (e.target.closest('[data-remove]')) {
        Cart.remove(id);
        toast('Removed from your collection.');
      } else if (e.target.closest('[data-step]')) {
        var delta = parseInt(e.target.closest('[data-step]').getAttribute('data-step'), 10);
        var line = Cart.lines().filter(function (l) { return l.id === id; })[0];
        if (line) Cart.setQty(id, line.qty + delta);
      }
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!Cart.count()) {
          toast('Add a piece before placing an order.', 'alert');
          return;
        }
        if (!form.reportValidity()) return;

        var name = ($('#ck-name', form) || {}).value || '';
        var ref = 'AB' + Date.now().toString(36).toUpperCase().slice(-6);
        var total = money(Cart.subtotal());
        Cart.clear();
        form.reset();
        $('#checkout-done', root).hidden = false;
        $('#checkout-done', root).innerHTML =
          '<strong>Order ' + ref + ' received.</strong>' +
          '<p>Thank you, ' + (name.split(' ')[0] || 'friend') + '. A curator will confirm your ' +
          total + ' order by email within one business day. Payment is taken on delivery.</p>';
        $('#checkout-done', root).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        toast('Order placed — reference ' + ref + '.');
      });
    }

    Cart.subscribe(render);
  }());

  /* ------------------------------------------------ 15. newsletter form */
  (function newsletter() {
    $$('[data-newsletter]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        toast('You are on the list — watch for the next unveiling.');
        form.reset();
      });
    });
  }());

  /* -------------------------------------------------------- 16. to top */
  (function toTop() {
    var btn = $('.to-top');
    if (!btn) return;
    var tick = function () { btn.classList.toggle('is-visible', window.scrollY > 700); };
    window.addEventListener('scroll', tick, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    tick();
  }());

  /* ------------------------------------------------------ 17. odds & ends */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Images that fail to load should not leave a broken-icon hole in a grid.
  $$('img').forEach(function (img) {
    img.addEventListener('error', function () {
      img.style.visibility = 'hidden';
    }, { once: true });
  });
}());
