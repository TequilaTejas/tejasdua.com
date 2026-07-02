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

const CLIP_CLOSED = 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
const CLIP_OPEN = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

const VIEWS = ['home', 'work', 'about', 'playground', 'writing', 'contact', 'cs-pai'];

let view = 'home';
let isOpen = false;
let timeline = null;
let navigating = false;

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
const setView = (next) => {
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

  if (history.replaceState) {
    history.replaceState(null, '', isHome ? '#home' : `#${next}`);
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

const closeMenuOnto = (next) => {
  setView(next);
  isOpen = false;
  syncA11y();

  rebuildAt(1, FULL_CLOSE_EASE, next === 'home');
  timeline.timeScale(next === 'home' ? 1 : 1.3).reverse();
  timeline.eventCallback('onReverseComplete', () => {
    navigating = false;
  });

  revealPageContent(next);
};

const navigateTo = (next) => {
  if (navigating || !VIEWS.includes(next)) return;

  if (isOpen) {
    if (next === view) {
      toggleMenu();
      return;
    }
    navigating = true;
    closeMenuOnto(next);
    return;
  }

  // Menu closed (wordmark or hash nav): sweep the menu over the screen,
  // swap the view beneath it, then close onto the new page.
  if (next === view) return;
  navigating = true;
  rebuildAt(0, FULL_CLOSE_EASE, false);
  timeline.timeScale(1.4).play();
  timeline.eventCallback('onComplete', () => closeMenuOnto(next));
};

const toggleMenu = () => {
  if (navigating) return;

  const progress = timeline.progress();
  const fullyOpen = progress >= 0.999;
  const withTiles = view === 'home';

  isOpen = !isOpen;
  syncA11y();

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
  setView(VIEWS.includes(initial) ? initial : 'home');

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

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!timeline.isActive() && !navigating) {
        rebuildAt(isOpen ? 1 : 0, FULL_CLOSE_EASE, view === 'home');
      }
    }, 200);
  });
};

withTimeout(preloadCoverImages(), MAX_PRELOAD).then(() => {
  document.body.classList.remove('loading');
  init();
});
