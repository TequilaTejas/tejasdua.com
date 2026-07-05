/*
 * Contact email: tap/click copies the address to the clipboard and the
 * hover tooltip flips to "Copied!" briefly. Falls back to a temporary
 * textarea + execCommand where the async Clipboard API is unavailable.
 */

(() => {
  const el = document.querySelector('.contact__mail');
  if (!el) return;

  const email = el.dataset.email;
  const defaultTip = el.dataset.tip;
  let resetTimer;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch (_) {
        /* nothing else to try; leave the tooltip on its default text */
        ta.remove();
        return;
      }
      ta.remove();
    }

    el.dataset.tip = 'Copied!';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      el.dataset.tip = defaultTip;
    }, 1600);
  };

  el.addEventListener('click', copy);
  // Reset the label once the pointer leaves so the next hover reads fresh.
  el.addEventListener('mouseleave', () => {
    clearTimeout(resetTimer);
    el.dataset.tip = defaultTip;
  });
})();
