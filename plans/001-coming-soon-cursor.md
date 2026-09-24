# 001 — Make the coming-soon cursor one morph

- **Commit:** c5227f2
- **Severity:** MEDIUM
- **Category:** Cohesion, hierarchy & spatial consistency
- **Estimated scope:** 2 files, ~80 lines

## Problem

Hovering About or Talks on a fine pointer turns the 16px cursor into a "COMING SOON" capsule. The width eases, but the rest of the cursor does not travel with it. The label pops from invisible to visible the instant the capsule is wider than 16px, the squish scale is zeroed in a single frame, and the capsule grows only to the right of the pointer, so the dot and the label read as two objects. Enter and exit also share one 240ms transition. A morph that is already on screen should move as one thing, and the exit should be shorter than the entrance.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `styles.css` | 132–186 | Cursor size, width transition, coming-soon width, label, container query that hides the label |
| `script.js` | 847–981 | Squish-cursor loop, `setSoon`, instant scale reset, 260ms hold |

### Current code

```css
/* styles.css */
.squish-cursor {
  --cursor-size: 16px;
  --soon-width: var(--cursor-size);
  --soon-duration: 240ms;
  --cursor-ease: cubic-bezier(0.23, 1, 0.32, 1);
  /* ... */
  transform-origin: calc(var(--cursor-size) / 2) calc(var(--cursor-size) / 2);
  will-change: transform;
  opacity: 0;
  transition: width var(--soon-duration) var(--cursor-ease);
}

.squish-cursor.is-coming-soon {
  width: var(--soon-width);
}

@container (width <= 16px) {
  .squish-cursor__label {
    opacity: 0;
  }
}
```

```js
// script.js, inside initSquishCursor
const setSoon = (next) => {
  if (!el || next === soon) return;
  soon = next;
  if (soon && label) {
    el.style.setProperty("--soon-width", `${Math.ceil(label.scrollWidth)}px`);
    holdUntil = 0;
  } else {
    holdUntil = performance.now() + 260;
  }
  el.classList.toggle("is-coming-soon", soon);
};

const holdShape = soon || performance.now() < holdUntil;
if (holdShape) {
  rot = 0;
  sx = 1;
  sy = 1;
} else {
  /* squish toward velocity */
}

const canUseCursor = () => finePointer.matches && !reducedMotion.matches;
```

## Target

Drive the whole morph from one `pill` value, `0` (dot) to `1` (capsule), inside the existing `requestAnimationFrame` loop. Do not add a CSS width transition on top of it.

- Open: 180ms, `cubic-bezier(0.23, 1, 0.32, 1)` (`--cursor-ease`, already on `.squish-cursor`).
- Close: 140ms, the same curve. 140 is about 22% shorter than 180.
- Retarget from the current `pill`. Never restart from 0 or 1 if a hover is reversed mid-way.
- Width: `cursorSize + (soonWidth - cursorSize) * pill`, where `soonWidth` is `Math.ceil(label.scrollWidth)` measured when the hover begins.
- Keep the capsule centered on the pointer. The transform already places the dot with `translate3d(${x - half}px, ${y - half}px, 0)`. Subtract `(width - cursorSize) / 2` from x so the extra width grows equally left and right.
- Label opacity equals `pill`. Delete the `@container (width <= 16px)` rule. Keep `overflow: hidden` so the words are clipped by the capsule instead of popping on.
- While `pill` is rising, ease `sx`, `sy`, and `rot` toward `1, 1, 0` with `pill`. Do not assign them in one frame. Delete `holdUntil`.
- While `pill` is above 0, tighten the follow from `EASE` (0.38) toward 1: `follow = EASE + (1 - EASE) * pill`. At `pill === 1` the capsule sits on the pointer. At `pill === 0` the dot keeps the current 0.38 follow. Do not change `EASE` or `POWER`.
- `prefers-reduced-motion: reduce`: still show the capsule (the words are the only signal that About and Talks do not navigate). Set `pill` to 0 or 1 in one frame, set `x = mx` and `y = my`, and keep `sx = 1`, `sy = 1`, `rot = 0`. No trail, no squish, no width tween.

```js
const easeCursor = createEase(0.23, 1, 0.32, 1);
const PILL_OPEN_MS = 180;
const PILL_CLOSE_MS = 140;

function playPill(to) {
  pillFrom = pill;
  pillTo = to;
  pillStart = performance.now();
  pillDuration = to > pill ? PILL_OPEN_MS : PILL_CLOSE_MS;
}
```

`createEase` is already declared at the top of `script.js`. Call it. Do not write a second bezier solver.

**Why these values:**

- 180ms is the tooltip band (125–200ms). A hover capsule that takes 240ms, then waits out a separate 260ms hold, feels late. 180ms with this curve is steep at the start.
- 140ms close is the same motion, shorter, because the pointer has already left.
- `cubic-bezier(0.23, 1, 0.32, 1)` is `--cursor-ease` / `--ease-out-quint`. The capsule is entering a new shape, so it uses ease-out, not ease-in-out (a slow start would read as lag on hover).
- Opacity tied to `pill`, not a 16px threshold, stops the words from appearing in one frame.
- Centering keeps the hotspot in the middle of the capsule. Growing only to the right makes the label slide off the pointer.
- Width stays a real width, not `scaleX`. Scaling would stretch "COMING SOON". This is one `position: fixed` node, so a short width write during the morph is acceptable. Do not animate `width` for the rest of the time the dot is moving.

## Conventions to follow

- Easing already lives on `.squish-cursor` as `--cursor-ease: cubic-bezier(0.23, 1, 0.32, 1)` in `styles.css`. Use that curve. Do not add a new custom property.
- `createEase` in `script.js` is the bezier helper. The menu rings in the same file are the exemplar for "one clock, retarget from the current value." Match that idea. Do not import a library.
- The dot's transform string stays one write: `` `translate3d(${x - half - shift}px, ${y - half}px, 0) rotate(${rot}deg) scale(${sx}, ${sy})` ``.

## Steps

1. In `styles.css`, remove `transition: width var(--soon-duration) var(--cursor-ease)` from `.squish-cursor`. Remove the `@container (width <= 16px)` block that sets `.squish-cursor__label { opacity: 0 }`. Leave the label's type styles. Set `.squish-cursor__label` `opacity` to `0` as the resting value; the loop will overwrite it.
2. In `initSquishCursor`, add `pill`, `pillFrom`, `pillTo`, `pillStart`, `pillDuration`, and `soonWidth`. Implement `playPill` as in Target, using `createEase(0.23, 1, 0.32, 1)`.
3. Change `setSoon` so it only updates `soon`, measures `soonWidth` from `label.scrollWidth` when turning on, and calls `playPill(soon ? 1 : 0)`. Remove `holdUntil` and the `is-coming-soon` class toggle. Width is no longer a class.
4. In `loop`, advance `pill` with `playPill`'s clock when `pillStart` is set. Under reduced motion, assign `pill = soon ? 1 : 0` and skip the tween.
5. Set `el.style.width` from `pill` only when `pill` is not 0, and clear the inline width when `pill` is 0 so the CSS `16px` width remains the resting dot.
6. Set `label.style.opacity` to `String(pill)` each frame.
7. Blend the follow easing with `pill` as in Target. Blend `sx`, `sy`, and `rot` toward the neutral circle as `pill` rises, instead of the `holdShape` snap.
8. Apply `shift = (width - cursorSize) / 2` inside the existing `translate3d`.
9. Change `canUseCursor` to `finePointer.matches` only. Keep the reduced-motion branch inside the loop, as in Target. Do not tear the cursor down solely because reduced motion is on.

## Out of scope

- Do not change `EASE` (0.38) or `POWER` (1.1) for the normal dot.
- Do not change the showcase scroll, the menu rings, or any nav hover gradient.
- Do not add a motion library.
- Do not change the words "Coming soon", the blue `#4DCCF9`, the type size, or which elements use `data-cursor="soon"`.
- Do not animate `scaleX` on the capsule.

## Verification

**Build**

- [ ] `node --check script.js` passes.
- [ ] Desktop homepage at a viewport wider than 1024px. The header shows About, Work, Talks.

**Behavior**

- [ ] Hover About: the dot becomes a capsule with COMING SOON, centered on the pointer, not stuck growing to the right.
- [ ] Leave onto Work: the capsule closes back into the dot. The words do not vanish a frame before the shape, and they do not pop on at 16px.
- [ ] Sweep About → Talks → About quickly. The capsule does not jump back to a dot and replay; it continues from its current width.
- [ ] Move fast, then enter About. The squish settles into the capsule. It does not snap from a stretched oval to a circle in one frame.
- [ ] With `prefers-reduced-motion: reduce`, the capsule still appears on About and Talks, instantly, stuck to the pointer. The dot does not trail or squish. Leaving removes it in one frame.

**Feel**

- [ ] Record one hover on and one hover off at 10–25% playback. The width, the centering shift, and the label opacity should be at the same point in the clip. If the words appear late, they are on a second clock.
- [ ] At full speed, the open should feel immediate. If it feels late, the curve was replaced with a weaker one. Do not fix that by making 180ms longer.
- [ ] Look at it the next day before calling it done. A centered capsule can cover more of the word About than the old rightward grow. If it covers the label badly, say so; do not invent a new offset.

## Notes

Whether the centered capsule should sit slightly below the word, instead of on top of it, cannot be judged from the code. The screenshot of the current hover shows the blue pill already covering About. Centering changes that overlap. Check it by eye after the morph is one object. Do not add a vertical offset unless that overlap is worse than the rightward grow.
