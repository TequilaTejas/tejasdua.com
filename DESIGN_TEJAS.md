# DESIGN_TEJAS.md

Design system for **tejasdua.com**, the personal portfolio of Tejas Dua.
This is the single source of truth for look, feel, and motion. Read it before
changing any visual code.

---

## 1. Voice and register

This is a **brand** surface, not a product UI. The design is the product. The
job is to leave an impression, not to transact. Three voice words drive every
choice:

- **Mechanical**, pixel type and hard offset shadows, like an arcade cabinet or a CRT terminal.
- **Warm**, ember orange against near-black, never cold blue or clinical grey.
- **Confident**, oversized type, generous black space, no apology.

The reference lane is retro-game UI crossed with a hand-built indie site. It is
deliberately not the editorial-serif lane and not the Stripe-minimal lane.

If a change makes the site look like a generic SaaS template, it is wrong.

---

## 2. Color

Tinted near-blacks plus a single committed accent. No pure `#000` or `#fff`.
All neutrals carry a faint warm hue so the screen never looks cold. Defined in
`:root` as OKLCH.

| Token | OKLCH | Reads as | Use |
|---|---|---|---|
| `--color-bg` | `oklch(0.14 0.012 70)` | near-black, warm | page background |
| `--color-ink` | `oklch(0.96 0.012 80)` | warm off-white | primary text, borders |
| `--color-ink-dim` | `oklch(0.7 0.015 80)` | muted cream | meta text, captions |
| `--color-ember` | `oklch(0.68 0.19 45)` | electric orange | the one accent |
| `--color-ember-deep` | `oklch(0.45 0.15 40)` | burnt orange | offset shadows, depth |
| `--color-line` | `oklch(0.32 0.02 70)` | dim divider | list rules, hairlines |

**Strategy: Restrained-plus.** One accent (ember) carries roughly 10 percent of
the surface: borders, hover states, shadows, the current-page marker. Everything
else is the warm near-black and cream. Do not introduce a second accent hue.
Color meaning is fixed: ember always means "active, hovered, or alive."

---

## 3. Typography

Two families, each with a clear job. Never swap them.

- **Handjet** (pixel display), weights 300 to 900. Used for everything structural:
  the hero name, all headings, menu items, buttons, labels, stat numbers,
  pull-quotes. This is the brand's voice. Set most display type uppercase with
  positive letter-spacing (`0.02em` to `0.25em` depending on size).
- **IBM Plex Mono** (terminal mono), weights 400 and 600. Used for everything you
  read rather than scan: long-form case-study body copy, leads, list-item names,
  hints. Sentence case, normal letter-spacing, line-height `1.55` to `1.65`. Runs
  wide; size it a step smaller than the Handjet equivalent.

The rule: **Handjet for anything you scan, Plex Mono for anything you read.**

Scale is fluid with `clamp()` and steps at least 1.25 apart:

- Hero title: `clamp(4rem, 17vw, 15rem)`, weight 800, line-height 0.82.
- Page title: `clamp(3rem, 9vw, 7rem)`, weight 800.
- Case title: `clamp(2.4rem, 6vw, 4.6rem)`, weight 800.
- Menu item: `clamp(2rem, 7vw, 4.8rem)`, weight 700.
- Body: `1.05rem`, line-height 1.65.
- Labels and meta: `1rem` to `1.25rem`, uppercase, tracked.

Big display type gets a hard offset text-shadow in ember-deep
(`0.04em 0.04em 0`) for the printed-poster depth.

---

## 4. Layout

- **One stage, layered.** `main` is a single CSS grid cell (`grid-area: stage`)
  and every view stacks in it on the z-axis. There are no scrolling sections on
  home; views swap, they do not flow.
- **Fixed chrome corners.** Wordmark top-left, menu toggle top-right, footer note
  bottom-center. All three use the page padding `clamp(1rem, 3vw, 2rem)`.
- **Case studies are the exception**, they scroll, capped at `880px` reading width.
- **Z-index order:** cover tiles 300, hero title 400, menu 500, frame 600,
  chrome buttons 700, password gate 950, loader 900 to 901.
- Spacing breathes with `clamp()`. Vary rhythm; do not pad everything the same.

---

## 5. Components

**Bordered box with offset shadow** is the signature object. Every interactive
or framed element is a 2px ink border with a hard ember or ember-deep shadow
offset down-right. No soft blurs, no rounded corners beyond what is shown.

- **Toggle / buttons:** ink border, 5px ember offset shadow. Hover lifts
  `translate(-2px,-2px)` and grows the shadow; active presses into it.
- **Wordmark (TD):** same box language, used as the home button.
- **Work rows:** full-width list, hairline `--color-line` dividers, name slides
  right and turns ember on hover, a tilted thumbnail fades in.
- **Stat strips:** Handjet numerals oversized over a tracked uppercase label.
- **Pull-quote:** bordered box, ember-deep shadow, Handjet uppercase.
- **Password gate:** centered bordered box, TD logo chip, shakes on wrong entry.

**Bans:** no side-stripe accent borders, no gradient text, no glassmorphism,
no soft drop shadows, no rounded SaaS cards, no nested cards.

---

## 6. Motion

Motion is the brand's party trick. The whole site is stitched by a single
GSAP-driven clip-path menu.

- **The menu IS the page transition.** Clicking a destination swaps the view
  underneath the open menu, then the menu clip-closes onto the new page and its
  content staggers in. There is no separate router animation.
- **easeReverse** (GSAP 3.15) is the core mechanic. Opening eases out with `expo`;
  closing reverses with a different ease (`expo.in` for the clip so it snaps shut,
  `elastic.out(0.35)` for the tile settle on a full home close). This asymmetry,
  open and close feeling different, is the signature.
- **Cover tiles** scatter radially from screen center on open (outer tiles leave
  first, center tiles last) and elastic back on a home return.
- **Curves:** ease-out exponential for reveals (`cubic-bezier(0.22,1,0.36,1)`),
  spring-ish `(0.34,1.56,0.64,1)` only for small playful pops. No bounce on layout.
- Never animate layout properties. Animate transform, opacity, clip-path.
- Honor `prefers-reduced-motion`: kill ambient loops (the menu background drift).

---

## 7. Imagery

- Scattered landscape photo tiles form the home cover, filtered
  `saturate(0.85) contrast(1.05)` so they sit under the warm palette.
- Case-study heroes are wide (`21/9`), bordered, with an ember-deep offset shadow.
- All images carry the same desaturated-warm filter for cohesion.
- Real assets beat stock; replace stand-in Unsplash shots with real project
  screenshots as they become available. Captions flag which are placeholders.

---

## 8. Accessibility and resilience

- Menu syncs `aria-hidden`, `aria-expanded`, and tab order with open state.
- Every interactive element has a visible ember `:focus-visible` outline.
- Esc closes the menu. Keyboard nav reaches all destinations.
- Deep links work: each view maps to a hash (`#work`, `#cs-fitness`).
- Mobile collapses split layouts to single column and hides hover-only thumbs.

---

## 9. Hard rules

1. Two fonts only: Handjet to scan, IBM Plex Mono to read.
2. One accent: ember. It always means active or alive.
3. Bordered box plus hard offset shadow is the only elevation style.
4. The menu clip transition is the brand. Do not replace it with a fade.
5. No em dashes anywhere in copy.
6. No pure black or white. Tint every neutral warm.
7. If it could pass for a default template, redo it.
