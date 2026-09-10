const CARD_HOVER_COLORS = ["#4DCCF9", "#E8A7ED", "#86CD8B", "#F6AA81"];

document.addEventListener("click", (event) => {
  const soundToggle = event.target.closest(".sound-toggle");
  if (!soundToggle) return;

  const muted = soundToggle.getAttribute("aria-pressed") !== "true";
  soundToggle.classList.toggle("is-muted", muted);
  soundToggle.setAttribute("aria-pressed", String(muted));
  soundToggle.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
});

document.querySelectorAll(".card__media").forEach((media) => {
  media.addEventListener("mouseenter", () => {
    const color = CARD_HOVER_COLORS[Math.floor(Math.random() * CARD_HOVER_COLORS.length)];
    media.style.setProperty("--card-fill", color);
  });

  media.addEventListener("mouseleave", () => {
    media.style.removeProperty("--card-fill");
  });
});

const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
const hoverMedia = window.matchMedia("(hover: hover)");
document.querySelectorAll(".case__hero").forEach((hero) => {
  const video = hero.querySelector(".case__hero-media");
  const still = hero.querySelector(".case__hero-still");
  if (!video) return;

  const syncHeroMotion = () => {
    if (reducedMotionMedia.matches) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };
  syncHeroMotion();
  reducedMotionMedia.addEventListener("change", syncHeroMotion);

  const setZoomOrigin = (event) => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    still.style.setProperty("--zoom-x", `${x}%`);
    still.style.setProperty("--zoom-y", `${y}%`);
  };

  let zoomFrame = 0;
  let latestMove = null;
  const onMove = (event) => {
    if (!hoverMedia.matches || reducedMotionMedia.matches || !still) return;
    latestMove = event;
    if (zoomFrame) return;
    zoomFrame = requestAnimationFrame(() => {
      zoomFrame = 0;
      if (latestMove) setZoomOrigin(latestMove);
    });
  };

  hero.addEventListener("mouseenter", (event) => {
    video.pause();
    if (still) setZoomOrigin(event);
  });
  hero.addEventListener("mousemove", onMove);
  hero.addEventListener("mouseleave", () => {
    if (zoomFrame) {
      cancelAnimationFrame(zoomFrame);
      zoomFrame = 0;
    }
    if (still) {
      still.style.setProperty("--zoom-x", "50%");
      still.style.setProperty("--zoom-y", "50%");
    }
    if (!reducedMotionMedia.matches) video.play().catch(() => {});
  });
});

function initCaseToc() {
  const root = document.querySelector("[data-toc]");
  if (!root) return;

  const titleEl = root.querySelector("[data-toc-title]");
  const railItems = Array.from(root.querySelectorAll("[data-toc-item]"));
  const railButtons = railItems.map((item) => item.querySelector("[data-toc-id]"));
  const menu = root.querySelector("[data-toc-menu]");
  const menuButtons = Array.from(root.querySelectorAll("[data-toc-menu] [data-toc-id]"));
  const trigger = root.querySelector("[data-toc-trigger]");
  const triggerLabel = root.querySelector("[data-toc-trigger-label]");
  const sections = railButtons
    .map((btn) => document.getElementById(btn.getAttribute("data-toc-id")))
    .filter(Boolean);

  if (!sections.length || !trigger || !menu) return;

  const labels = railButtons.map((btn) => btn.querySelector(".case__toc-label")?.textContent.trim() || "");
  const colors = railItems.map((item) => item.getAttribute("data-color") || "#dca8e8");
  menuButtons.forEach((btn) => {
    btn.style.setProperty("--item-color", btn.getAttribute("data-color") || "#dca8e8");
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const OPTIMISTIC_MS = 1200;
  const EXIT_MS = 120;
  const TITLE_OUT_MS = 130;

  let activeIndex = 0;
  let optimisticUntil = 0;
  let menuOpen = false;
  let closeTimer = 0;
  let displayedIndex = 0;
  let titlePending = null;
  let openedByPointer = false;
  let scrollAnim = 0;

  const listeners = new Set();
  const store = {
    get open() {
      return menuOpen;
    },
    setOpen(next) {
      if (next === menuOpen) return;
      menuOpen = next;
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function scrollToSection(el) {
    const target = Math.max(0, window.scrollY + el.getBoundingClientRect().top - 80);
    if (scrollAnim) cancelAnimationFrame(scrollAnim);
    if (reducedMotion.matches) {
      window.scrollTo(0, target);
      return;
    }

    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    const start = window.scrollY;
    const dist = target - start;
    const duration = Math.min(900, Math.max(450, Math.abs(dist) * 0.55));
    let startTime = 0;

    const step = (now) => {
      if (!startTime) startTime = now;
      const t = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, start + dist * easeOutCubic(t));
      if (t < 1) {
        scrollAnim = requestAnimationFrame(step);
      } else {
        scrollAnim = 0;
        html.style.scrollBehavior = previousBehavior;
      }
    };
    scrollAnim = requestAnimationFrame(step);
  }

  function selectIndex(index) {
    activeIndex = index;
    optimisticUntil = performance.now() + OPTIMISTIC_MS;
    paint();
    scrollToSection(sections[index]);
    store.setOpen(false);
  }

  function spy() {
    const line = window.innerHeight * 0.4;
    const ordered = sections
      .map((el, i) => ({ el, i, top: el.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top);

    let next = 0;
    ordered.forEach((item) => {
      if (item.top <= line) next = item.i;
    });

    if (performance.now() >= optimisticUntil) activeIndex = next;

    paint();
  }

  function syncTriggerTitle() {
    if (!triggerLabel || displayedIndex === activeIndex) return;
    const nextIndex = activeIndex;
    const apply = () => {
      displayedIndex = nextIndex;
      triggerLabel.textContent = labels[nextIndex];
      triggerLabel.classList.remove("is-fading");
    };

    if (reducedMotion.matches) {
      apply();
      return;
    }

    titlePending = nextIndex;
    triggerLabel.classList.add("is-fading");
    const onEnd = (event) => {
      if (event.propertyName !== "opacity") return;
      triggerLabel.removeEventListener("transitionend", onEnd);
      if (titlePending !== nextIndex) return;
      apply();
    };
    triggerLabel.addEventListener("transitionend", onEnd);
    window.setTimeout(() => {
      if (titlePending !== nextIndex) return;
      triggerLabel.removeEventListener("transitionend", onEnd);
      apply();
    }, TITLE_OUT_MS + 40);
  }

  function paint() {
    root.style.setProperty("--toc-index", String(activeIndex));
    root.style.setProperty("--toc-color", colors[activeIndex]);

    railItems.forEach((item, i) => {
      const on = i === activeIndex;
      item.classList.toggle("is-active", on);
      const btn = railButtons[i];
      if (!btn) return;
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
      btn.removeAttribute("aria-hidden");
      btn.tabIndex = 0;
    });

    menuButtons.forEach((btn, i) => {
      const on = i === activeIndex;
      btn.classList.toggle("is-active", on);
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });

    if (titleEl) titleEl.removeAttribute("aria-hidden");
    syncTriggerTitle();
  }

  function mountMenu() {
    window.clearTimeout(closeTimer);
    menu.hidden = false;
    if (reducedMotion.matches) {
      menu.classList.add("is-entered");
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (store.open) menu.classList.add("is-entered");
      });
    });
  }

  function unmountMenu() {
    menu.classList.remove("is-entered");
    const delay = reducedMotion.matches ? 0 : EXIT_MS;
    closeTimer = window.setTimeout(() => {
      if (!store.open) menu.hidden = true;
    }, delay);
  }

  function focusOpenTarget() {
    if (openedByPointer) {
      menu.focus();
      return;
    }
    (menuButtons[activeIndex] || menuButtons[0])?.focus();
  }

  store.subscribe(() => {
    trigger.setAttribute("aria-expanded", String(store.open));
    if (store.open) {
      mountMenu();
      focusOpenTarget();
    } else {
      unmountMenu();
    }
  });

  menu.tabIndex = -1;

  trigger.addEventListener("pointerdown", () => {
    openedByPointer = true;
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      openedByPointer = false;
    }
    if (event.key === "ArrowDown" && !store.open) {
      event.preventDefault();
      store.setOpen(true);
    }
    if (event.key === " ") event.preventDefault();
  });
  trigger.addEventListener("click", () => {
    store.setOpen(!store.open);
  });

  railButtons.forEach((btn, i) => {
    btn.addEventListener("click", () => selectIndex(i));
  });
  menuButtons.forEach((btn, i) => {
    btn.addEventListener("click", () => selectIndex(i));
  });

  document.addEventListener("pointerdown", (event) => {
    if (!store.open) return;
    if (root.contains(event.target)) return;
    store.setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (!store.open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      store.setOpen(false);
      trigger.focus();
      return;
    }

    const last = menuButtons.length - 1;
    const focused = menuButtons.indexOf(document.activeElement);
    let next = focused;
    if (event.key === "ArrowDown") next = focused < 0 ? 0 : Math.min(last, focused + 1);
    else if (event.key === "ArrowUp") next = focused < 0 ? last : Math.max(0, focused - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;

    event.preventDefault();
    menuButtons[next]?.focus();
  });

  let spyFrame = 0;
  const onScrollOrResize = () => {
    if (spyFrame) return;
    spyFrame = requestAnimationFrame(() => {
      spyFrame = 0;
      spy();
    });
  };

  spy();
  root.classList.add("is-visible");
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize);
}

initCaseToc();

const menuOverlay = document.getElementById("menu-overlay");
const menuOpenBtn = document.getElementById("menu-open");
const menuCloseBtn = document.getElementById("menu-close");

const ringEls = Array.from(document.querySelectorAll(".ring"));
ringEls.slice(0, 4).forEach((ring, i) => {
  ring.style.setProperty("--ring-color", CARD_HOVER_COLORS[i]);
});

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const RING_TRANSFORM_OPEN = "translate3d(-50%, 0, 0) scale(1)";
const RING_TRANSFORM_CLOSED = "translate3d(-50%, 0, 0) scale(0.32)";

const RING1_OPEN_MS = 280;
const RING_OPEN_MS = 250;
const RING_FOLLOW_DELAY = 40;
const LABEL_OPEN_MS = 180;
const LABEL_OPEN_START = 50;
const LABEL_STAGGER = 32;
const LABEL_CLOSE_MS = 100;
const GROUP_CLOSE_MS = 180;
const RING1_CLOSE_MS = 200;
const RING1_CLOSE_DELAY = 30;

const navLabelSelectors = [
  ".menu-overlay__link--about",
  ".menu-overlay__link--work",
  ".menu-overlay__link--talks",
];
const contactLabelSelectors = [
  ".menu-overlay__contact-link--email",
  ".menu-overlay__contact-link--linkedin",
  ".menu-overlay__contact-link--twitter",
];
const lastNavOpenDelay = LABEL_OPEN_START + (navLabelSelectors.length - 1) * LABEL_STAGGER;

const ANIM_SPECS = [
  {
    el: ringEls[0],
    openDelay: 0,
    openDuration: RING1_OPEN_MS,
    closeDelay: RING1_CLOSE_DELAY,
    closeDuration: RING1_CLOSE_MS,
    from: { transform: RING_TRANSFORM_CLOSED },
    to: { transform: RING_TRANSFORM_OPEN },
  },
  ...ringEls.slice(1).map((el) => ({
    el,
    openDelay: RING_FOLLOW_DELAY,
    openDuration: RING_OPEN_MS,
    closeDelay: 0,
    closeDuration: GROUP_CLOSE_MS,
    from: { transform: RING_TRANSFORM_CLOSED },
    to: { transform: RING_TRANSFORM_OPEN },
  })),
  ...navLabelSelectors.map((selector, i) => ({
    el: document.querySelector(selector),
    openDelay: LABEL_OPEN_START + i * LABEL_STAGGER,
    openDuration: LABEL_OPEN_MS,
    closeDelay: 0,
    closeDuration: LABEL_CLOSE_MS,
    from: { opacity: 0, transform: "scale(0.97)" },
    to: { opacity: 1, transform: "scale(1)" },
  })),
  ...contactLabelSelectors.map((selector) => ({
    el: document.querySelector(selector),
    openDelay: lastNavOpenDelay,
    openDuration: LABEL_OPEN_MS,
    closeDelay: 0,
    closeDuration: LABEL_CLOSE_MS,
    from: { opacity: 0, transform: "scale(0.97)" },
    to: { opacity: 1, transform: "scale(1)" },
  })),
  {
    el: menuCloseBtn,
    openDelay: lastNavOpenDelay,
    openDuration: LABEL_OPEN_MS,
    closeDelay: 0,
    closeDuration: LABEL_CLOSE_MS,
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
].filter((spec) => spec.el);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const timing = (ms) => (reducedMotion.matches ? 0 : ms);

let menuAnimToken = 0;
let inFlightAnims = [];

function snapshotStyle(el, keys) {
  const computed = getComputedStyle(el);
  const frame = {};
  keys.forEach((key) => {
    frame[key] = computed[key];
  });
  return frame;
}

function stopInFlightAnims() {
  inFlightAnims.forEach((anim) => {
    try {
      anim.commitStyles();
    } catch {
      /* Animation already finished or target gone. */
    }
    anim.cancel();
  });
  inFlightAnims = [];
}

function clearInlineAnimStyles() {
  ANIM_SPECS.forEach((spec) => {
    spec.el.style.transform = "";
    spec.el.style.opacity = "";
  });
}

function playRingAnimations(isOpen) {
  stopInFlightAnims();
  const animations = ANIM_SPECS.map((spec) => {
    const keys = Object.keys(spec.to);
    const current = snapshotStyle(spec.el, keys);
    const target = isOpen ? spec.to : spec.from;
    const anim = spec.el.animate([current, target], {
      duration: timing(isOpen ? spec.openDuration : spec.closeDuration),
      delay: timing(isOpen ? spec.openDelay : spec.closeDelay),
      easing: EASE,
      fill: "both",
    });
    return anim;
  });
  inFlightAnims = animations;
  return Promise.all(animations.map((anim) => anim.finished.catch(() => {})));
}

function lockPageScroll(lock) {
  document.documentElement.style.overflow = lock ? "hidden" : "";
  document.body.style.overflow = lock ? "hidden" : "";
}

function openMenu() {
  const token = ++menuAnimToken;
  menuOverlay.hidden = false;
  menuOverlay.classList.add("is-open", "is-animating");
  menuOpenBtn.setAttribute("aria-expanded", "true");
  lockPageScroll(true);
  playRingAnimations(true).then(() => {
    if (token !== menuAnimToken) return;
    menuOverlay.classList.remove("is-animating");
  });
}

function closeMenu() {
  if (menuOverlay.hidden) return;
  const token = ++menuAnimToken;
  menuOpenBtn.setAttribute("aria-expanded", "false");
  menuOverlay.classList.add("is-animating");
  menuOverlay.classList.remove("is-open");
  playRingAnimations(false).then(() => {
    if (token !== menuAnimToken) return;
    stopInFlightAnims();
    clearInlineAnimStyles();
    menuOverlay.hidden = true;
    menuOverlay.classList.remove("is-animating");
    lockPageScroll(false);
  });
}

if (menuOpenBtn && menuCloseBtn && menuOverlay) {
  menuOpenBtn.addEventListener("click", openMenu);
  menuCloseBtn.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}
