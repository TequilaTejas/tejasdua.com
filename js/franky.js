/*
 * Cursor-follower image on the home footer line. Hovering the memory
 * of Franky note lazily drags his photo along after the pointer, in the
 * style of the GreenSock "show cursor image on hover" pen.
 *
 * Guarded off on touch (no real hover) and for reduced-motion, since
 * this is a decorative flourish, not a wayfinding cue.
 */

(() => {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const trigger = document.querySelector('.frame__memory');
  const img = document.querySelector('.franky');
  if (!trigger || !img) return;

  // Anchored above the pointer, not centered on it: the trigger line sits
  // at the bottom of the viewport, so a centered image would fall half
  // below the fold and cover the very text being hovered.
  gsap.set(img, { yPercent: -112, xPercent: -50, rotation: -4 });

  const setX = gsap.quickTo(img, 'x', { duration: 0.4, ease: 'power3' });
  const setY = gsap.quickTo(img, 'y', { duration: 0.4, ease: 'power3' });

  const fade = gsap.to(img, {
    autoAlpha: 1,
    ease: 'none',
    paused: true,
    duration: 0.18,
  });

  let firstMove = true;

  const onMove = (event) => {
    if (firstMove) {
      setX(event.clientX, event.clientX);
      setY(event.clientY, event.clientY);
      firstMove = false;
      return;
    }
    setX(event.clientX);
    setY(event.clientY);
  };

  trigger.addEventListener('mouseenter', () => {
    firstMove = true;
    fade.play();
    document.addEventListener('mousemove', onMove);
  });

  trigger.addEventListener('mouseleave', () => {
    fade.reverse();
    fade.eventCallback('onReverseComplete', () => {
      document.removeEventListener('mousemove', onMove);
    });
  });
})();
