/* =============================================================
   App entry — initialize Reveal + wire interactive widgets.

   Uses path-based URLs like the Finance deck (e.g. /presentation/3)
   via the History API. The Azure Static Web Apps config rewrites
   any /presentation/* request to /presentation.html, so deep links
   and page refresh work without a backend.
   ============================================================= */

(async function () {
  if (typeof applyChartDefaults === 'function') applyChartDefaults();

  try {
    await window.SLIDES_READY;
  } catch (err) {
    console.error('[main] aborting Reveal init — slides failed to load.');
    return;
  }

  const deck = new Reveal({
    hash: false,
    history: false,
    slideNumber: 'c/t',
    transition: 'slide',
    transitionSpeed: 'default',
    backgroundTransition: 'fade',
    controls: true,
    progress: true,
    center: false,
    width: 1280,
    height: 800,
    margin: window.innerWidth < 600 ? 0.08 : 0.04,
    minScale: 0.2,
    maxScale: 1.6,
    scrollActivationWidth: 0,
    keyboard: true,
    touch: true,
    overview: true,
  });

  deck.initialize().then(() => {
    if (typeof renderAllWidgets === 'function') renderAllWidgets();
    if (typeof wireWidgetInputs === 'function') wireWidgetInputs();

    // Register the slide-change hook BEFORE we kick off any navigation so that
    // direct-URL deep links (e.g. /presentation/14) still fire the hook.
    if (typeof onSlideChange === 'function') {
      deck.on('slidechanged', (e) => {
        setTimeout(() => onSlideChange(e), 50);
      });
    }

    setupPathRouting(deck);
    setupFullscreenButton();
    setupAnimationButton();
    setupCloseDeckButton();
    setupMobileHint();
    setupStepIntercept(deck);
    setupOverviewScroll(deck);
    setupOverviewZoom(deck);

    if (typeof onSlideChange === 'function') {
      // Fire once for the initial slide as well, since 'slidechanged'
      // doesn't trigger when we're already sitting on slide 0.
      setTimeout(() => {
        const cur = deck.getCurrentSlide();
        if (cur) onSlideChange({ currentSlide: cur, previousSlide: null });
      }, 120);
    }

    let resizeTimer;
    deck.on('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (typeof refitWidgets === 'function') refitWidgets();
      }, 80);
    });
  });

  // ---------- Path-based routing (mirrors Finance deck) ----------
  function setupPathRouting(deck) {
    const PREFIX = '/presentation';

    function slideIndexFromPath() {
      const m = window.location.pathname.match(/^\/presentation\/?(\d+)?(?:\/(\d+))?\/?$/);
      if (!m) return null;
      const h = m[1] ? Math.max(0, parseInt(m[1], 10) - 1) : 0;
      const v = m[2] ? Math.max(0, parseInt(m[2], 10) - 1) : 0;
      return { h, v };
    }

    function pathFromIndices(indices) {
      const h = (indices.h || 0) + 1;
      const v = indices.v || 0;
      return v > 0 ? `${PREFIX}/${h}/${v + 1}` : `${PREFIX}/${h}`;
    }

    const initial = slideIndexFromPath();
    if (initial && (initial.h > 0 || initial.v > 0)) {
      deck.slide(initial.h, initial.v);
    }

    deck.on('slidechanged', () => {
      const newPath = pathFromIndices(deck.getIndices());
      if (window.location.pathname !== newPath) {
        history.pushState(null, '', newPath);
      }
    });

    window.addEventListener('popstate', () => {
      const idx = slideIndexFromPath();
      if (idx) deck.slide(idx.h, idx.v);
    });

    if (initial && initial.h === 0 && initial.v === 0 &&
        !/^\/presentation\/1(?:\/1)?\/?$/.test(window.location.pathname)) {
      history.replaceState(null, '', `${PREFIX}/1`);
    }
  }

  // ---------- Fullscreen toggle (YouTube-style hover reveal) ----------
  function setupFullscreenButton() {
    if (document.getElementById('fullscreenBtn')) return;
    const ENTER = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/></svg>`;
    const EXIT  = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v4H5M15 4v4h4M9 20v-4H5M15 20v-4h4"/></svg>`;
    const btn = document.createElement('button');
    btn.id = 'fullscreenBtn';
    btn.className = 'fullscreen-btn';
    btn.type = 'button';
    btn.title = 'Fullscreen (F)';
    btn.setAttribute('aria-label', 'Enter fullscreen');
    btn.innerHTML = ENTER;
    document.body.appendChild(btn);

    const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const update = () => {
      btn.innerHTML = isFs() ? EXIT : ENTER;
      btn.title = isFs() ? 'Exit fullscreen (Esc or F)' : 'Fullscreen (F)';
      btn.setAttribute('aria-label', isFs() ? 'Exit fullscreen' : 'Enter fullscreen');
    };
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) req.call(el).catch(() => {});
      }

    });
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    update();

    let hideTimer = 0;
    const show = () => { btn.classList.add('is-visible'); clearTimeout(hideTimer); };
    const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => btn.classList.remove('is-visible'), 700); };
    window.addEventListener('mousemove', (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      if (e.clientX >= w - 220 && e.clientY >= h - 200) show(); else scheduleHide();
    });
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('mouseleave', scheduleHide);
    window.addEventListener('touchstart', show, { passive: true });
  }

  // ---------- Pause/replay timed animation ----------
  function setupAnimationButton() {
    if (document.getElementById('animationBtn')) return;
    const PAUSE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`;
    const PLAY = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>`;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const btn = document.createElement('button');
    btn.id = 'animationBtn';
    btn.className = 'animation-btn is-visible';
    btn.type = 'button';
    document.body.appendChild(btn);

    let userPaused = reduceMotion.matches;
    function apply(paused) {
      document.body.classList.toggle('animations-paused', paused);
      document.body.classList.toggle('motion-enabled', !paused && reduceMotion.matches);
      btn.innerHTML = paused ? PLAY : PAUSE;
      btn.title = paused ? 'Play slide animations' : 'Pause slide animations';
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('aria-pressed', String(paused));
      if (typeof setPresentationAnimationsPaused === 'function') {
        setPresentationAnimationsPaused(paused);
      }
    }
    btn.addEventListener('click', () => {
      userPaused = !userPaused;
      apply(userPaused);
    });
    reduceMotion.addEventListener('change', event => {
      userPaused = event.matches;
      apply(userPaused);
    });
    document.addEventListener('visibilitychange', () => {
      if (typeof setPresentationAnimationsPaused !== 'function') return;
      if (document.hidden) setPresentationAnimationsPaused(true);
      else setPresentationAnimationsPaused(userPaused);
    });
    apply(userPaused);
  }

  // ---------- Step-through interceptor ----------
  // When the current slide has an interactive widget with pending "next step"
  // actions (marked via [data-step-btn]), the right-arrow / page-down / space
  // key and Reveal's right-arrow control click advance the widget instead of
  // navigating to the next slide. Once the widget is exhausted (button is
  // disabled), the action falls through to normal slide navigation.
  function setupStepIntercept(deck) {
    function pendingStepBtn() {
      const cur = deck.getCurrentSlide();
      if (!cur) return null;
      const btn = cur.querySelector('[data-step-btn]');
      if (!btn || btn.disabled) return null;
      return btn;
    }
    const NAV_KEYS = new Set(['ArrowRight', 'PageDown', ' ', 'Spacebar']);
    document.addEventListener('keydown', (e) => {
      if (!NAV_KEYS.has(e.key)) return;
      const t = e.target;
      const interactive = t && t.closest &&
        t.closest('button, a, input, textarea, select, summary, [role="button"], [contenteditable="true"]');
      if (interactive) {
        // Reveal also binds Space globally. Keep it from navigating when a
        // control has focus, and preserve native button-style activation.
        e.stopImmediatePropagation();
        if (e.key === ' ' || e.key === 'Spacebar') {
          const buttonLike = interactive.matches('button, [role="button"], summary');
          if (buttonLike) {
            e.preventDefault();
            interactive.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
        return;
      }
      const btn = pendingStepBtn();
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      btn.click();
    }, true);
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('.navigate-right, .navigate-down');
      if (!navBtn) return;
      const btn = pendingStepBtn();
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      btn.click();
    }, true);
  }

  // ---------- Overview-mode horizontal scrolling ----------
  // Reveal's overview mode lays the slides out in a grid that can extend off
  // screen when there are many slides. By default the mousewheel/trackpad
  // does nothing in overview. We hook wheel events and translate them into
  // horizontal slide navigation so the user can pan through the whole deck.
  function setupOverviewScroll(deck) {
    let cooldown = 0;
    let accum = 0;
    const STEP_THRESHOLD = 60;
    const COOLDOWN_MS = 110;
    document.addEventListener('wheel', (e) => {
      if (!deck.isOverview || !deck.isOverview()) return;
      e.preventDefault();
      const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY)) ? e.deltaX : e.deltaY;
      accum += delta;
      const now = performance.now();
      if (now < cooldown) return;
      if (accum >= STEP_THRESHOLD) {
        deck.right();
        accum = 0;
        cooldown = now + COOLDOWN_MS;
      } else if (accum <= -STEP_THRESHOLD) {
        deck.left();
        accum = 0;
        cooldown = now + COOLDOWN_MS;
      }
    }, { passive: false });
  }

  // ---------- Overview-mode zoom (bigger thumbnails) ----------
  // Reveal applies an inline transform to .slides in overview mode that looks
  // like  `translate(-50%,-50%) scale(<deckFit>) scale(<overviewScale>) translateX(...) translateY(...)`
  // where `<overviewScale>` is the small (~0.2) factor that shrinks slides
  // into thumbnails. We watch for that transform changing and rewrite the
  // *second* scale() to be ~2x bigger so the previews are easier to read.
  function setupOverviewZoom(deck) {
    const slides = document.querySelector('.reveal .slides');
    if (!slides) return;
    const ZOOM_FACTOR = 2.2;
    const EPS = 0.0005;
    const SCALE_RX = /scale\(([^)]+)\)/g;
    let lastPatchedScale = null;

    function patch() {
      if (!deck.isOverview || !deck.isOverview()) return;
      const t = slides.style.transform;
      if (!t) return;

      let idx = 0;
      let secondVal = NaN;
      t.replace(SCALE_RX, (m, val) => {
        idx += 1;
        if (idx === 2) secondVal = parseFloat(val);
        return m;
      });
      if (!isFinite(secondVal)) return;
      // If the current second-scale matches what we last wrote, this mutation
      // came from our own update — ignore it.
      if (lastPatchedScale !== null &&
          Math.abs(secondVal - lastPatchedScale) < EPS) return;

      const newScale = secondVal * ZOOM_FACTOR;
      idx = 0;
      const patched = t.replace(SCALE_RX, (m, val) => {
        idx += 1;
        if (idx === 2) return `scale(${newScale})`;
        return m;
      });
      lastPatchedScale = newScale;
      slides.style.transform = patched;
    }

    new MutationObserver(() => patch())
      .observe(slides, { attributes: true, attributeFilter: ['style'] });
    if (deck.on) {
      deck.on('overviewshown', patch);
      deck.on('overviewhidden', () => { lastPatchedScale = null; });
    }
    patch();
  }

  function setupCloseDeckButton() {
    if (window.top !== window.self) return;
    if (document.getElementById('closeDeckBtn')) return;
    const ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
    const btn = document.createElement('a');
    btn.id = 'closeDeckBtn';
    btn.className = 'close-deck-btn';
    btn.href = '/';
    btn.title = 'Back to landing page';
    btn.setAttribute('aria-label', 'Back to landing page');
    btn.innerHTML = ICON;
    document.body.appendChild(btn);

    let hideTimer = 0;
    const show = () => { btn.classList.add('is-visible'); clearTimeout(hideTimer); };
    const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => btn.classList.remove('is-visible'), 700); };
    window.addEventListener('mousemove', (e) => {
      if (e.clientX >= window.innerWidth - 220 && e.clientY <= 200) show(); else scheduleHide();
    });
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('mouseleave', scheduleHide);
    window.addEventListener('touchstart', show, { passive: true });
  }

  function setupMobileHint() {
    if (document.getElementById('mobileHint')) return;
    const hint = document.createElement('div');
    hint.id = 'mobileHint';
    hint.className = 'mobile-hint';
    hint.textContent = 'Rotate to landscape for readable slides';
    document.body.appendChild(hint);
  }
})();
