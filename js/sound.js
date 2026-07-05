/*
 * Synthesized arcade sound system. No audio files: every sound is built
 * with the Web Audio API so the site stays a self-contained static bundle
 * and the palette stays chiptune, matching the pixel-cabinet brand.
 *
 * - Ambient: a barely-there warm room tone (low drone + filtered hiss,
 *   slow LFO movement) like a powered-on cabinet in a quiet room.
 * - SFX: short square/triangle blips for hover, select, open/close and
 *   a two-note coin for the email copy.
 *
 * Browsers block audio until a user gesture, so the context is created
 * lazily on the first pointer/key event (the password gate guarantees
 * one). Mute state persists in localStorage as 'td-sound'.
 */

(() => {
  const STORE_KEY = 'td-sound';
  const HOVER_THROTTLE_MS = 70;

  let ctx = null;
  let master = null;
  let ambientNodes = null;
  let lastHoverAt = 0;
  let woofBuffer = null;
  let enabled = localStorage.getItem(STORE_KEY) !== 'off';

  const now = () => ctx.currentTime;

  /* ---------- graph bootstrap ---------- */

  const ensureContext = () => {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 1 : 0;
    master.connect(ctx.destination);
    startAmbient();
    loadWoof();
    return true;
  };

  /*
   * The one real recording on the site: a dog bark for the Franky line.
   * "Bark Huayra" by redpanal.org, CC BY-SA 3.0, via Wikimedia Commons
   * (https://commons.wikimedia.org/wiki/File:Bark_Huayra.ogg), re-rendered
   * to mono WAV so every browser's decodeAudioData accepts it. The synth
   * bark below stays as the fallback while this loads (or if it fails).
   */
  const loadWoof = () => {
    fetch('assets/sfx/woof.wav')
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        woofBuffer = decoded;
      })
      .catch(() => {});
  };

  /* ---------- ambient room tone ---------- */

  const startAmbient = () => {
    if (ambientNodes) return;

    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);
    // Long fade-in so the room tone materialises instead of clicking on.
    out.gain.linearRampToValueAtTime(1, now() + 6);

    // Two slightly detuned low sines through a dark lowpass: the hum.
    // Deliberately near the edge of audibility; room tone should be felt
    // when it stops, never noticed while it plays.
    const hum = ctx.createGain();
    hum.gain.value = 0.006;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 110;
    hum.connect(lowpass).connect(out);

    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 55;
    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 82.7; // a warm fifth, slightly off for beating
    oscA.connect(hum);
    oscB.connect(hum);

    // Faint band-passed noise: CRT hiss.
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const hissBand = ctx.createBiquadFilter();
    hissBand.type = 'bandpass';
    hissBand.frequency.value = 5200;
    hissBand.Q.value = 0.6;
    const hiss = ctx.createGain();
    hiss.gain.value = 0.0009;
    noise.connect(hissBand).connect(hiss).connect(out);

    // Slow LFO drifting the lowpass so the hum breathes.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 20;
    lfo.connect(lfoDepth).connect(lowpass.frequency);

    oscA.start();
    oscB.start();
    noise.start();
    lfo.start();

    ambientNodes = { out };
  };

  /* ---------- one-shot synths ---------- */

  // Single enveloped oscillator blip.
  const blip = (freq, dur, type, vol, when = 0, glideTo = null) => {
    if (!ctx || !enabled) return;
    const t = now() + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };

  // Filtered noise burst for transition whooshes.
  const whoosh = (fromHz, toHz, dur, vol) => {
    if (!ctx || !enabled) return;
    const t = now();
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(fromHz, t);
    band.frequency.exponentialRampToValueAtTime(toHz, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(band).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  };

  /* ---------- public palette ---------- */

  const sfx = {
    hover() {
      const t = performance.now();
      if (t - lastHoverAt < HOVER_THROTTLE_MS) return;
      lastHoverAt = t;
      blip(720, 0.05, 'triangle', 0.05);
    },
    select() {
      blip(660, 0.07, 'square', 0.06);
      blip(990, 0.09, 'square', 0.05, 0.055);
    },
    open() {
      whoosh(220, 1600, 0.45, 0.05);
      blip(392, 0.3, 'triangle', 0.035, 0, 784);
    },
    close() {
      whoosh(1600, 180, 0.4, 0.045);
      blip(784, 0.28, 'triangle', 0.03, 0, 392);
    },
    coin() {
      blip(987.77, 0.09, 'square', 0.06);
      blip(1318.51, 0.35, 'square', 0.055, 0.08);
    },
    // Dead click: a low felt-covered tick acknowledging the press did
    // nothing. Audible, but clearly duller than the select blip.
    dud() {
      blip(160, 0.05, 'triangle', 0.1);
      blip(95, 0.07, 'sine', 0.07, 0.006);
    },
    // Franky's bark: the real recording when it's loaded, otherwise the
    // synthesized stand-in below.
    woof() {
      if (!ctx || !enabled) return;
      if (woofBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = woofBuffer;
        const g = ctx.createGain();
        g.gain.value = 0.55;
        src.connect(g).connect(master);
        src.start();
        return;
      }
      // Fallback synth bark: fast rise-then-fall pitch contour ("wuh-f")
      // with a puff of band-passed breath noise.
      const bark = (at) => {
        const t = now() + at;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(340, t + 0.035);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0, t);
        og.gain.linearRampToValueAtTime(0.24, t + 0.02);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        osc.connect(og).connect(master);
        osc.start(t);
        osc.stop(t + 0.17);

        const len = Math.ceil(ctx.sampleRate * 0.12);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const noi = ctx.createBufferSource();
        noi.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1;
        bp.frequency.setValueAtTime(750, t);
        bp.frequency.exponentialRampToValueAtTime(250, t + 0.1);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0, t);
        ng.gain.linearRampToValueAtTime(0.09, t + 0.015);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        noi.connect(bp).connect(ng).connect(master);
        noi.start(t);
      };
      bark(0);
      bark(0.19);
    },
  };

  const play = (name) => {
    if (!enabled || !ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    sfx[name]();
  };

  /* ---------- enable / disable ---------- */

  const setEnabled = (on) => {
    enabled = on;
    localStorage.setItem(STORE_KEY, on ? 'on' : 'off');
    if (ctx && master) {
      const t = now();
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(on ? 1 : 0, t + 0.25);
    }
    document.dispatchEvent(new CustomEvent('td-sound-toggle', { detail: { on } }));
  };

  /* ---------- boot on first gesture ---------- */

  const unlock = () => {
    if (!ensureContext()) return;
    if (ctx.state === 'suspended') ctx.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // Don't hum in a background tab.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (enabled) ctx.resume();
  });

  window.TDSound = {
    play,
    setEnabled,
    isEnabled: () => enabled,
  };
})();

/*
 * DOM wiring: which elements make which sounds. Kept separate from the
 * engine above so the palette can change without touching selectors.
 */
(() => {
  const S = window.TDSound;
  if (!S) return;

  const HOVERABLE = [
    '.menu__item',
    '.toggle',
    '.wordmark',
    'a.workrow',
    '.writlist__link[href]',
    '.contact__links a',
    '.frame__resume',
    '.contact__mail',
    '.soundchip',
    '.gate__submit',
  ].join(', ');

  const SELECTABLE = [
    '.menu__item',
    '.wordmark',
    '[data-nav]',
    'a.workrow',
    '.writlist__link[href]',
    '.contact__links a',
    '.frame__resume',
  ].join(', ');

  // Anything that is genuinely interactive, listed or not; clicks landing
  // outside all of it get the dead-click dud instead.
  const INTERACTIVE = 'a, button, input, textarea, select, label, [data-nav]';

  // Delegated so late/re-rendered nodes need no re-wiring. mouseover (not
  // mouseenter) bubbles; closest() scopes it to one blip per element entry.
  let lastHoverEl = null;
  document.addEventListener('mouseover', (event) => {
    const el = event.target.closest(HOVERABLE);
    if (!el || el === lastHoverEl) {
      if (!el) lastHoverEl = null;
      return;
    }
    lastHoverEl = el;
    S.play('hover');
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('.contact__mail')) {
      S.play('coin');
      return;
    }
    if (event.target.closest(SELECTABLE)) {
      S.play('select');
      return;
    }
    // A click that meant nothing still deserves an acknowledgement.
    if (!event.target.closest(INTERACTIVE)) S.play('dud');
  });

  // Franky says hi.
  const memory = document.querySelector('.frame__memory');
  if (memory) memory.addEventListener('mouseenter', () => S.play('woof'));

  // Insert coin: unlocking the password gate is the arcade's coin slot.
  // gate.js drops the body's `gated` class on success; play the coin then.
  if (document.body.classList.contains('gated')) {
    new MutationObserver((_, obs) => {
      if (!document.body.classList.contains('gated')) {
        S.play('coin');
        obs.disconnect();
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // The menu's open/close state is the single source of truth for the
  // transition sweep sound: watching aria-expanded catches every path
  // that toggles it (button, Esc, scroll gesture, menu-item close).
  const toggle = document.querySelector('.toggle');
  if (toggle) {
    let prev = toggle.getAttribute('aria-expanded');
    new MutationObserver(() => {
      const cur = toggle.getAttribute('aria-expanded');
      if (cur === prev) return;
      prev = cur;
      S.play(cur === 'true' ? 'open' : 'close');
    }).observe(toggle, { attributes: true, attributeFilter: ['aria-expanded'] });
  }

  /* ---------- sound chip ---------- */

  const chip = document.querySelector('.soundchip');
  if (!chip) return;

  const syncChip = (on) => {
    chip.setAttribute('aria-pressed', String(on));
    chip.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    chip.classList.toggle('is-on', on);
    chip.querySelector('.soundchip__label').textContent = on ? 'Sound' : 'Muted';
  };

  syncChip(S.isEnabled());

  chip.addEventListener('click', () => {
    const next = !S.isEnabled();
    S.setEnabled(next);
    if (next) S.play('select');
  });

  document.addEventListener('td-sound-toggle', (event) => syncChip(event.detail.on));
})();
