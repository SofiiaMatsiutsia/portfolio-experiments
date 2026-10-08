/* ImageAccordion is a dependency-free translation of the supplied React
   component. Source pattern licensed MIT by Bencho: bencho.dev/licence. */

/* ── one spring, for everything that settles ───────────────
   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. */
const springOf = (tune) => ({
  /* stiffness: how hard it is pulled toward the target */
  k: 0.08 + (tune / 100) * 0.16,
  /* decay, per frame: how much of the velocity survives */
  d: 0.62 + (tune / 100) * 0.2,
});

/* Read once, the way the wheel and the pill nav do. A
   preference, not a live input. */
const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ── the strip's own size ──────────────────────────────────
   The original component used a fixed 340px strip. Here the
   strip is fixed to the Figma column by CSS (100% of 736px),
   so it keeps the same footprint on this page while remaining
   usable on a narrow viewport. The cell arithmetic is unchanged. */
const RMAX = 12;

/* How much the open picture takes, as a share of an unopened
   picture. 50 is the value this was drawn at. */
const lift = (open) => 0.4 + (clamp(open, 0, 100) / 100) * 2.8;

/* A gaussian on the distance in pictures, so the swell is
   smooth and never reaches a distant picture visibly. */
const fall = (distance, reach) => {
  const s = 0.35 + (clamp(reach, 0, 100) / 100) * 0.9;
  return Math.exp(-((distance / s) ** 2));
};

export class ImageAccordion {
  constructor(root, {
    open = 50,
    reach = 35,
    bounce = 10,
    gap = 2,
  } = {}) {
    this.root = root;
    this.cells = Array.from(root.querySelectorAll(":scope > .acc-cell"));
    this.open = open;
    this.reach = reach;
    this.bounce = bounce;
    this.gap = clamp(gap, 0, 20);
    this.at = null;
    this.values = this.cells.map(() => 0);
    this.velocities = this.cells.map(() => 0);
    this.raf = 0;
    this.previousTime = 0;
    this.reducedMotion = stillness();
    this.spring = springOf(this.bounce);

    /* The page uses a deliberately near-square 1px corner with
       a 2px image gap, matching the supplied About treatment. */
    root.style.setProperty("--acc-gap", `${this.gap}px`);
    root.style.setProperty("--acc-radius", "1px");

    this.cells.forEach((cell, index) => {
      cell.tabIndex = 0;
      cell.addEventListener("pointerenter", () => this.setAt(index));
      cell.addEventListener("focus", () => this.setAt(index));
    });

    /* The cells change width under the pointer. A bubbling `pointerout`
       can therefore report a transient null relatedTarget and close the
       active image while the pointer is still inside the strip. The root
       itself never moves, so its non-bubbling boundary is the stable exit. */
    root.addEventListener("pointerleave", () => this.setAt(null));
    root.addEventListener("focusout", (event) => {
      const to = event.relatedTarget;
      if (!to || !root.contains(to)) this.setAt(null);
    });
    root.addEventListener("pointercancel", () => this.setAt(null));

    this.render();
  }

  /* One spring per picture, and NO stagger. These cells are
     one width being divided, so they move together. */
  targetFor(index) {
    if (this.at === null) return 0;
    return fall(Math.abs(index - this.at), this.reach) * 100;
  }

  setAt(index) {
    if (this.at === index) return;
    this.at = index;
    if (this.reducedMotion) {
      this.values = this.cells.map((_, i) => this.targetFor(i));
      this.velocities.fill(0);
      this.render();
      return;
    }
    this.start();
  }

  start() {
    if (this.raf) return;
    this.previousTime = 0;
    this.raf = requestAnimationFrame((time) => this.tick(time));
  }

  tick(time) {
    const dt = this.previousTime
      ? clamp((time - this.previousTime) / 16.67, 0, 2.5)
      : 1;
    this.previousTime = time;
    let settled = true;

    this.cells.forEach((_, index) => {
      const target = this.targetFor(index);
      this.velocities[index] += (target - this.values[index]) * this.spring.k * dt;
      this.velocities[index] *= Math.pow(this.spring.d, dt);
      this.values[index] += this.velocities[index] * dt;
      if (Math.abs(target - this.values[index]) >= 0.02 || Math.abs(this.velocities[index]) >= 0.02) {
        settled = false;
      }
    });

    if (settled) {
      this.values = this.cells.map((_, index) => this.targetFor(index));
      this.velocities.fill(0);
      this.raf = 0;
      this.render();
      return;
    }

    this.render();
    this.raf = requestAnimationFrame((nextTime) => this.tick(nextTime));
  }

  render() {
    const multiplier = lift(this.open);
    this.cells.forEach((cell, index) => {
      const swell = this.values[index] / 100;
      cell.style.flexGrow = String(1 + multiplier * swell);
      cell.dataset.open = this.at === index ? "true" : "false";
    });
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

const accordions = Array.from(document.querySelectorAll("[data-image-accordion]"));
accordions.forEach((root) => new ImageAccordion(root));
