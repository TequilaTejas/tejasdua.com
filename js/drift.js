/*
 * Mouse parallax and intro motion for the home cover, in the style of
 * Codrops' "Image Grid Motion Effect". Runs a single rAF loop that lerps
 * every cover-tile image (and the hero title, moving opposite for depth)
 * toward a cursor-mapped offset.
 *
 * The scatter timeline in menu.js owns `.cover__item` transforms; this
 * file only ever touches `.cover__image` (the inner div) and `.title`, so
 * the two animations never fight over the same element.
 *
 * Guarded off on touch (no real hover) and for reduced-motion, same as
 * franky.js.
 */

(() => {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const images = [...document.querySelectorAll('.cover__image')];
  const titleEl = document.querySelector('.title');
  if (!images.length || !titleEl) return;

  const getRandomNumber = (min, max) => Math.random() * (max - min) + min;
  const lerp = (a, b, n) => a + (b - a) * n;
  const map = (value, inMin, inMax, outMin, outMax) =>
    ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

  // Per-tile targets get a random range on each axis (15-60px) and the
  // default lerp speed. The title gets a fixed, smaller range, a slower
  // lerp, and moves opposite the cursor for a parallax-depth feel.
  const targets = images.map((el) => ({
    el,
    rangeX: getRandomNumber(15, 60),
    rangeY: getRandomNumber(15, 60),
    lerpAmt: 0.07,
    invert: false,
    tx: 0,
    ty: 0,
    setX: gsap.quickSetter(el, 'x', 'px'),
    setY: gsap.quickSetter(el, 'y', 'px'),
  }));

  targets.push({
    el: titleEl,
    rangeX: 8,
    rangeY: 6,
    lerpAmt: 0.05,
    invert: true,
    tx: 0,
    ty: 0,
    setX: gsap.quickSetter(titleEl, 'x', 'px'),
    setY: gsap.quickSetter(titleEl, 'y', 'px'),
  });

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  const tick = () => {
    requestAnimationFrame(tick);

    // Cheap bail: no work while the home cover isn't showing, or the tab
    // is backgrounded.
    if (document.hidden || document.body.dataset.view !== 'home') return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    targets.forEach((t) => {
      let targetX = map(mouseX, 0, winW, -t.rangeX, t.rangeX);
      let targetY = map(mouseY, 0, winH, -t.rangeY, t.rangeY);
      if (t.invert) {
        targetX = -targetX;
        targetY = -targetY;
      }

      t.tx = lerp(t.tx, targetX, t.lerpAmt);
      t.ty = lerp(t.ty, targetY, t.lerpAmt);

      t.setX(t.tx);
      t.setY(t.ty);
    });
  };

  requestAnimationFrame(tick);

  // ---- intro ----
  // Only worth doing if the loader is still up when this file runs; if it
  // already lifted, the tiles are already settled and there is nothing to
  // animate from.
  if (document.body.classList.contains('loading')) {
    // Pre-hide before the loader lifts so there is no flash of full-opacity
    // tiles between the class removal and the observer callback below.
    gsap.set(images, { autoAlpha: 0 });

    const loaderWatch = new MutationObserver(() => {
      if (document.body.classList.contains('loading')) return;
      loaderWatch.disconnect();

      gsap.fromTo(
        images,
        { scale: 0.7, autoAlpha: 0 },
        {
          scale: 1,
          autoAlpha: 1,
          duration: 2,
          ease: 'expo.out',
          stagger: { amount: 0.6, grid: 'auto', from: 'center' },
        }
      );
    });

    loaderWatch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
})();
