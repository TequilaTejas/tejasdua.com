/*
 * Fullscreen clip-path menu with GSAP easeReverse (GSAP >= 3.15),
 * stitching together the home view and five subpages.
 *
 * Opening: cover tiles scatter radially away from the viewport center
 * (outer tiles leave first) while the menu reveals via clip-path.
 * Closing fully: the timeline reverses with an elastic easeReverse.
 * Closing mid-open: the timeline reverses fast with adaptive easeReverse.
 * Navigating: the view swaps underneath the fully open menu, then the
 * menu clip-closes onto the new page and its content staggers in.
 */

const toggleButton = document.querySelector('.toggle');
const wordmark = document.querySelector('.wordmark');
const menu = document.querySelector('.menu');
const menuItems = [...document.querySelectorAll('.menu__item')];
const coverEl = document.querySelector('.cover');
const coverItems = [...document.querySelectorAll('.cover__item')];
const titleEl = document.querySelector('.title');
const frameEl = document.querySelector('.frame');
const pages = [...document.querySelectorAll('.page')];

const SCATTER_DISTANCE = 620;
const OPEN_DURATION = 0.7;
const CLIP_DURATION = 0.8;
const CLIP_DELAY = 0.3;
const MAX_STAGGER = 0.3;
const FULL_CLOSE_EASE = 'elastic.out(0.35)';
const INTERRUPT_TIMESCALE = 2.5;
const SCROLL_GESTURE_COOLDOWN_MS = 1000;

const CLIP_CLOSED = 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
const CLIP_OPEN = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

// 'playground', 'writing' and 'cs-pai' are hidden for now; re-add here
// and in the menu/work-row markup to restore them.
const VIEWS = ['home', 'work', 'about', 'ai', 'contact'];

let view = 'home';
let isOpen = false;
let timeline = null;
let navigating = false;
let scrollGestureCooldownUntil = 0;

const viewportCenter = () => ({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
});

const tileVector = (el) => {
  const rect = el.getBoundingClientRect();
  const c = viewportCenter();
  let dx = rect.left + rect.width / 2 - c.x;
  let dy = rect.top + rect.height / 2 - c.y;
  if (dx === 0 && dy === 0) {
    dx = 1;
    dy = 1;
  }
  const len = Math.hypot(dx, dy);
  return { dx, dy, len };
};

const syncA11y = () => {
  toggleButton.setAttribute('aria-expanded', String(isOpen));
  toggleButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  menu.setAttribute('aria-hidden', String(!isOpen));
  const target = view.startsWith('cs-') ? 'work' : view;
  menuItems.forEach((item) => {
    item.tabIndex = isOpen ? 0 : -1;
    item.classList.toggle('is-current', item.dataset.target === target);
  });
};

// withTiles: include the cover-tile scatter tweens. Only meaningful when
// the view underneath the menu is (or becomes) the home view.
const buildTimeline = (reverseEase, withTiles) => {
  const maxLen = Math.hypot(window.innerWidth / 2, window.innerHeight / 2);

  const tl = gsap.timeline({ paused: true });
  tl.addLabel('go', 0);

  // easeReverse 'expo.in' makes the close accelerate into the center,
  // so the shrinking clip window snaps shut instead of lingering as a
  // small dark box mid-screen.
  tl.to(
    menu,
    {
      clipPath: CLIP_OPEN,
      duration: CLIP_DURATION,
      ease: 'expo',
      easeReverse: 'expo.in',
    },
    `go+=${withTiles ? CLIP_DELAY : 0}`
  );

  if (withTiles) {
    coverItems.forEach((item) => {
      const { dx, dy, len } = tileVector(item);
      // Tiles near the center hold longest; edge tiles leave immediately.
      const delay = MAX_STAGGER * (1 - Math.min(len / maxLen, 1));

      tl.to(
        item,
        {
          x: (dx / len) * SCATTER_DISTANCE,
          y: (dy / len) * SCATTER_DISTANCE,
          rotation: gsap.utils.random(-28, 28),
          opacity: 0,
          duration: OPEN_DURATION,
          ease: 'expo',
          easeReverse: reverseEase,
        },
        `go+=${delay}`
      );
    });
  }

  return tl;
};

// Rebuilds the timeline at a given progress so the reverse leg can use a
// different easeReverse than the one it was created with, without a jump.
const rebuildAt = (progress, reverseEase, withTiles) => {
  if (timeline) timeline.revert();

  gsap.set(coverItems, { x: 0, y: 0, rotation: 0, opacity: 1 });
  gsap.set(menu, { clipPath: CLIP_CLOSED });

  timeline = buildTimeline(reverseEase, withTiles);
  timeline.progress(gsap.utils.clamp(0, 1, progress)).pause();
};

// Shows one view underneath the menu and hides the rest.
// fromHistory: true when this view swap is driven by a popstate (back/
// forward) event, or by the very first paint. In both cases the browser
// history entry already reflects this view, so we must not push a new one
// (that would fill history with duplicates and break the back button).
const setView = (next, fromHistory = false) => {
  view = next;
  document.body.dataset.view = next;

  const isHome = next === 'home';
  gsap.set([coverEl, titleEl, frameEl], { autoAlpha: isHome ? 1 : 0 });

  pages.forEach((page) => {
    const active = page.dataset.page === next;
    gsap.set(page, { autoAlpha: active ? 1 : 0 });
    page.setAttribute('aria-hidden', String(!active));
    if (active) page.scrollTop = 0;
  });

  if (!fromHistory && history.pushState) {
    history.pushState(null, '', isHome ? '#home' : `#${next}`);
  }
};

const revealPageContent = (next) => {
  if (next === 'home') return;
  const page = pages.find((p) => p.dataset.page === next);
  const els = page.querySelectorAll('[data-reveal]');
  gsap.fromTo(
    els,
    { y: 36, autoAlpha: 0 },
    {
      y: 0,
      autoAlpha: 1,
      duration: 0.7,
      stagger: 0.06,
      delay: 0.2,
      ease: 'expo',
      clearProps: 'transform,opacity,visibility',
    }
  );
};

const closeMenuOnto = (next, fromHistory) => {
  setView(next, fromHistory);
  isOpen = false;
  syncA11y();

  rebuildAt(1, FULL_CLOSE_EASE, next === 'home');
  timeline.timeScale(next === 'home' ? 1 : 1.3).reverse();
  timeline.eventCallback('onReverseComplete', () => {
    navigating = false;
  });

  revealPageContent(next);
};

// fromHistory: true when a popstate (back/forward) triggered this
// navigation. The menu-sweep transition still plays either way, so
// back/forward animate between views just like a click would; setView
// simply skips pushing a new history entry in that case.
const navigateTo = (next, fromHistory = false) => {
  if (navigating || !VIEWS.includes(next)) return;

  if (isOpen) {
    if (next === view) {
      toggleMenu();
      return;
    }
    navigating = true;
    closeMenuOnto(next, fromHistory);
    return;
  }

  // Menu closed (wordmark or hash nav): sweep the menu over the screen,
  // swap the view beneath it, then close onto the new page.
  if (next === view) return;
  navigating = true;
  rebuildAt(0, FULL_CLOSE_EASE, false);
  timeline.timeScale(1.4).play();
  timeline.eventCallback('onComplete', () => closeMenuOnto(next, fromHistory));
};

const toggleMenu = () => {
  if (navigating) return;

  const progress = timeline.progress();
  const fullyOpen = progress >= 0.999;
  const withTiles = view === 'home';

  isOpen = !isOpen;
  syncA11y();

  // Any toggle, whichever triggered it (button, keyboard, scroll gesture),
  // freezes the scroll-gesture accumulator for a beat so momentum scroll
  // right after the transition can't immediately re-toggle the menu.
  scrollGestureCooldownUntil = Date.now() + SCROLL_GESTURE_COOLDOWN_MS;

  if (isOpen) {
    timeline.timeScale(1).play();
    return;
  }

  if (fullyOpen) {
    rebuildAt(1, FULL_CLOSE_EASE, withTiles);
    timeline.timeScale(1).reverse();
    return;
  }

  // Toggled again mid-open: bail out fast with adaptive easeReverse.
  rebuildAt(progress, true, withTiles);
  timeline.timeScale(INTERRUPT_TIMESCALE).reverse();
};

const preloadCoverImages = () => {
  const urls = [...document.querySelectorAll('.cover__image')]
    .map((el) => el.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/)?.[1])
    .filter(Boolean);

  return Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = src;
        })
    )
  );
};

// Never let a stalled image (request opens but never fires load/error, common
// on flaky networks) trap the whole site behind the loader. Boot regardless
// after a hard cap; preloading is a nicety, not a gate.
const MAX_PRELOAD = 2500;
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

const init = () => {
  const initial = location.hash.replace('#', '');
  const initialView = VIEWS.includes(initial) ? initial : 'home';

  // Establish the base history entry ourselves (replace, not push) so the
  // very first back-button press after landing on the site exits cleanly
  // instead of bouncing between duplicate entries for the same view.
  if (history.replaceState) {
    history.replaceState(null, '', initialView === 'home' ? '#home' : `#${initialView}`);
  }
  setView(initialView, true);

  syncA11y();
  rebuildAt(0, FULL_CLOSE_EASE, view === 'home');

  toggleButton.addEventListener('click', toggleMenu);
  wordmark.addEventListener('click', () => navigateTo('home'));

  menuItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTo(item.dataset.target);
    });
  });

  // In-page links (work rows, case-study back links) ride the same
  // menu-sweep transition as the menu items.
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTo(el.dataset.nav);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen && !navigating) {
      toggleMenu();
      toggleButton.focus();
    }
  });

  // Back/forward: the browser has already updated location.hash by the
  // time this fires, so just resolve it against the whitelist and replay
  // the same menu-sweep transition onto that view. If a transition is
  // already in flight, navigateTo's `navigating` lockout drops this event
  // rather than corrupting the timeline; the next popstate (or a manual
  // nav) will resync the visible view with the URL.
  window.addEventListener('popstate', () => {
    const target = location.hash.replace('#', '');
    const resolved = VIEWS.includes(target) ? target : 'home';
    if (resolved === view) return;
    navigateTo(resolved, true);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!timeline.isActive() && !navigating) {
        rebuildAt(isOpen ? 1 : 0, FULL_CLOSE_EASE, view === 'home');
      }
    }, 200);
  });

  initScrollGesture();
};

// Scroll/swipe gesture on the home view: scrolling down opens the menu,
// scrolling up closes it. Wheel deltas (and touch-drag deltas) accumulate
// until they cross a threshold, with a short idle/direction-flip reset and
// a post-trigger cooldown so momentum scroll can't immediately re-toggle.
const initScrollGesture = () => {
  const RESET_IDLE_MS = 400;
  const TRIGGER_THRESHOLD = 120;

  let accumulated = 0;
  let lastEventTime = 0;
  let touchStartY = null;

  const isCoolingDown = () => Date.now() < scrollGestureCooldownUntil;

  const canOpen = () =>
    view === 'home' &&
    !isOpen &&
    !navigating &&
    !document.body.classList.contains('loading') &&
    !document.body.classList.contains('gated');

  const canClose = () => view === 'home' && isOpen && !navigating;

  const handleDelta = (deltaY) => {
    if (isCoolingDown()) {
      accumulated = 0;
      return;
    }

    const now = Date.now();
    const idle = now - lastEventTime > RESET_IDLE_MS;
    const flipped = accumulated !== 0 && Math.sign(accumulated) !== Math.sign(deltaY);
    if (idle || flipped) accumulated = 0;
    lastEventTime = now;

    accumulated += deltaY;

    if (accumulated >= TRIGGER_THRESHOLD) {
      accumulated = 0;
      if (canOpen()) toggleMenu();
      return;
    }

    if (accumulated <= -TRIGGER_THRESHOLD) {
      accumulated = 0;
      if (canClose()) toggleMenu();
    }
  };

  window.addEventListener(
    'wheel',
    (event) => {
      handleDelta(event.deltaY);
    },
    { passive: true }
  );

  window.addEventListener(
    'touchstart',
    (event) => {
      touchStartY = event.touches[0] ? event.touches[0].clientY : null;
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (event) => {
      if (touchStartY === null || !event.touches[0]) return;
      const currentY = event.touches[0].clientY;
      const deltaY = touchStartY - currentY; // finger moving up => positive (scroll-down intent)
      touchStartY = currentY;
      handleDelta(deltaY);
    },
    { passive: true }
  );
};

withTimeout(preloadCoverImages(), MAX_PRELOAD).then(() => {
  document.body.classList.remove('loading');
  init();
});
