/*
 * Client-side password gate. Deterrence, not security: static hosting
 * has no server, so the page only stores a hash and unlocks per session.
 */

(() => {
  const HASH = '3312522844';
  const KEY = 'td-gate';

  const gate = document.querySelector('.gate');
  const form = document.querySelector('.gate__form');
  const input = document.querySelector('.gate__input');
  const error = document.querySelector('.gate__error');

  const djb2 = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    }
    return String(h);
  };

  const unlock = (instant) => {
    document.body.classList.remove('gated');
    if (instant) {
      gate.remove();
      return;
    }
    gate.classList.add('gate--open');
    setTimeout(() => gate.remove(), 700);
  };

  if (sessionStorage.getItem(KEY) === HASH) {
    unlock(true);
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (djb2(input.value) === HASH) {
      sessionStorage.setItem(KEY, HASH);
      unlock(false);
    } else {
      error.textContent = 'Wrong password. Try again.';
      gate.classList.remove('gate--shake');
      void gate.offsetWidth;
      gate.classList.add('gate--shake');
      input.select();
    }
  });

  input.focus();
})();
