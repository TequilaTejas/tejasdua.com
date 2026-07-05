/*
 * Cursor-follower image on the home footer line. Hovering the memory
 * of Franky note lazily drags his photo along after the pointer, in the
 * style of the GreenSock "show cursor image on hover" pen, choreographed
 * with the Codrops "ImageRevealHover" effect-4 twist-pop (translated from
 * TweenMax to gsap v3): the frame pops in with a twist and rotation, the
 * inner photo counter-rotates and scales down to rest, and the trigger's
 * letters stagger up on every hover.
 *
 * Guarded off on touch (no real hover) and for reduced-motion, since
 * this is a decorative flourish, not a wayfinding cue.
 */

(() => {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const trigger = document.querySelector('.frame__memory');
  const outer = document.querySelector('.franky');
  const dim = document.querySelector('.franky-dim');
  const frame = outer ? outer.querySelector('.franky__frame') : null;
  const innerImg = outer ? outer.querySelector('.franky__img') : null;
  if (!trigger || !outer || !frame || !innerImg) return;

  // Resting tilt matches the site's -4deg signature. The reveal twists in
  // from -19deg and snaps to rest; the hide flicks past rest to +6deg.
  const REST_ROTATION = -4;

  // Anchored above the pointer, not centered on it: the trigger line sits
  // at the bottom of the viewport, so a centered image would fall half
  // below the fold and cover the very text being hovered. This anchor is
  // set once and never animated.
  gsap.set(outer, { yPercent: -112, xPercent: -50 });

  const setX = gsap.quickTo(outer, 'x', { duration: 0.4, ease: 'power3' });
  const setY = gsap.quickTo(outer, 'y', { duration: 0.4, ease: 'power3' });

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

  const showFranky = () => {
    gsap.killTweensOf([frame, innerImg]);
    gsap.set(outer, { autoAlpha: 1 });

    // Lifts the frame line above the dim so the hovered text stays lit
    // while the chrome corners fall behind the spotlight.
    document.body.classList.add('franky-active');

    // Spotlight: dim everything behind the card onto the warm near-black.
    if (dim) {
      gsap.killTweensOf(dim);
      gsap.to(dim, { autoAlpha: 0.85, duration: 0.5, ease: 'power2.out' });
    }

    gsap.fromTo(
      frame,
      { opacity: 0, yPercent: 50, rotation: REST_ROTATION - 15, scale: 0 },
      {
        opacity: 1,
        yPercent: 0,
        rotation: REST_ROTATION,
        scale: 1,
        duration: 0.8,
        ease: 'expo.out',
      }
    );

    gsap.fromTo(
      innerImg,
      { rotation: 15, scale: 2 },
      { rotation: 0, scale: 1, duration: 0.8, ease: 'expo.out' }
    );
  };

  const hideFranky = () => {
    gsap.killTweensOf([frame, innerImg]);

    document.body.classList.remove('franky-active');

    if (dim) {
      gsap.killTweensOf(dim);
      gsap.to(dim, { autoAlpha: 0, duration: 0.2, ease: 'sine.out' });
    }

    gsap.to(frame, {
      yPercent: -40,
      rotation: REST_ROTATION + 10,
      scale: 0.9,
      opacity: 0,
      duration: 0.15,
      ease: 'sine.out',
      onComplete: () => gsap.set(outer, { autoAlpha: 0 }),
    });

    gsap.to(innerImg, {
      rotation: -10,
      scale: 1.5,
      duration: 0.15,
      ease: 'sine.out',
    });
  };

  // --- letters: split .frame__memory into per-character spans -----------

  const splitLetters = (el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);

    const wrapper = document.createElement('span');
    wrapper.className = 'frame__letters';
    wrapper.setAttribute('aria-hidden', 'true');

    const graphemes =
      typeof Intl !== 'undefined' && Intl.Segmenter
        ? Array.from(
            new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
            (s) => s.segment
          )
        : Array.from(text);

    graphemes.forEach((char) => {
      const span = document.createElement('span');
      span.className = 'frame__letter';
      span.textContent = char === ' ' ? ' ' : char;
      wrapper.appendChild(span);
    });

    el.textContent = '';
    el.appendChild(wrapper);

    return [...wrapper.querySelectorAll('.frame__letter')];
  };

  const letters = splitLetters(trigger);

  const animateLetters = () => {
    if (!letters.length) return;
    gsap.killTweensOf(letters);
    gsap.fromTo(
      letters,
      { yPercent: 50, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.03,
        ease: 'expo.out',
      }
    );
  };

  trigger.addEventListener('mouseenter', () => {
    firstMove = true;
    showFranky();
    animateLetters();
    document.addEventListener('mousemove', onMove);
  });

  trigger.addEventListener('mouseleave', () => {
    hideFranky();
    document.removeEventListener('mousemove', onMove);
  });
})();
