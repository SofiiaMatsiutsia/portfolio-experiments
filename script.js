const CARD_HOVER_COLORS = ["#4DCCF9", "#E8A7ED", "#86CD8B", "#F6AA81"];

document.querySelectorAll(".card__media").forEach((media) => {
  media.addEventListener("mouseenter", () => {
    const color = CARD_HOVER_COLORS[Math.floor(Math.random() * CARD_HOVER_COLORS.length)];
    media.style.setProperty("--card-fill", color);
  });

  media.addEventListener("mouseleave", () => {
    media.style.removeProperty("--card-fill");
  });
});

const menuOverlay = document.getElementById("menu-overlay");
const menuOpenBtn = document.getElementById("menu-open");
const menuCloseBtn = document.getElementById("menu-close");

const ringEls = Array.from(document.querySelectorAll(".ring"));
ringEls.slice(0, 4).forEach((ring, i) => {
  ring.style.setProperty("--ring-color", CARD_HOVER_COLORS[i]);
});

// Calm, single-settle easing (no bounce/oscillation) — the raw Figma spring
// curve overshot and corrected itself repeatedly, which read as "jumpy" at
// this scale. A plain smooth deceleration reads as one clean pop instead.
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const RING_DURATION = 450;
const LABEL_DURATION = 300;
const CLOSE_BTN_DURATION = 300;

// Two-step choreography on open: the blue background ring leads, then
// everything else — the remaining rings, all nav/contact labels, and the
// close button — pops in together after one small shared delay.
const GROUP2_OPEN_DELAY = 120;

// Closing is its own explicit timeline, not a generic mirror of the open
// one: a label and its ring band must vanish in lockstep (same delay, same
// duration) or the label is left floating over whatever's exposed once its
// band has already shrunk away — a visible "ghost" flash. So group 2 (every
// non-blue ring + every label + the close button) all close together with
// identical timing, and only then does the blue ring close alone, last.
const GROUP2_CLOSE_DURATION = 350;
const RING1_CLOSE_DELAY = GROUP2_CLOSE_DURATION;

const ANIM_SPECS = [
  {
    el: ringEls[0],
    openDelay: 0,
    openDuration: RING_DURATION,
    closeDelay: RING1_CLOSE_DELAY,
    closeDuration: RING_DURATION,
    easing: EASE,
    from: { transform: "translateX(-50%) scale(0)" },
    to: { transform: "translateX(-50%) scale(1)" },
  },
  ...ringEls.slice(1).map((el) => ({
    el,
    openDelay: GROUP2_OPEN_DELAY,
    openDuration: RING_DURATION,
    closeDelay: 0,
    closeDuration: GROUP2_CLOSE_DURATION,
    easing: EASE,
    from: { transform: "translateX(-50%) scale(0)" },
    to: { transform: "translateX(-50%) scale(1)" },
  })),
  ...[
    ".menu-overlay__link--about",
    ".menu-overlay__link--work",
    ".menu-overlay__link--talks",
    ".menu-overlay__contact-link--email",
    ".menu-overlay__contact-link--linkedin",
    ".menu-overlay__contact-link--twitter",
  ].map((selector) => ({
    el: document.querySelector(selector),
    openDelay: GROUP2_OPEN_DELAY,
    openDuration: LABEL_DURATION,
    closeDelay: 0,
    closeDuration: GROUP2_CLOSE_DURATION,
    easing: EASE,
    from: { opacity: 0, transform: "translateX(-50%) translateY(15px)" },
    to: { opacity: 1, transform: "translateX(-50%) translateY(0)" },
  })),
  {
    el: menuCloseBtn,
    openDelay: GROUP2_OPEN_DELAY,
    openDuration: CLOSE_BTN_DURATION,
    closeDelay: 0,
    closeDuration: GROUP2_CLOSE_DURATION,
    easing: EASE,
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
].filter((spec) => spec.el);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const timing = (ms) => (reducedMotion.matches ? 0 : ms);

function playRingAnimations(isOpen) {
  const animations = ANIM_SPECS.map((spec) => {
    const delay = isOpen ? spec.openDelay : spec.closeDelay;
    const duration = isOpen ? spec.openDuration : spec.closeDuration;
    const keyframes = isOpen ? [spec.from, spec.to] : [spec.to, spec.from];
    return spec.el.animate(keyframes, {
      duration: timing(duration),
      delay: timing(delay),
      easing: spec.easing,
      fill: "both",
    });
  });
  return Promise.all(animations.map((a) => a.finished.catch(() => {})));
}

function openMenu() {
  menuOverlay.hidden = false;
  menuOpenBtn.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  playRingAnimations(true);
}

function closeMenu() {
  if (menuOverlay.hidden) return;
  menuOpenBtn.setAttribute("aria-expanded", "false");
  playRingAnimations(false).then(() => {
    menuOverlay.hidden = true;
    document.body.style.overflow = "";
  });
}

menuOpenBtn.addEventListener("click", openMenu);
menuCloseBtn.addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
