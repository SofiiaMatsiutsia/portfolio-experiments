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

function initShowcase() {
  const viewport = document.querySelector(".showcase");
  const track = viewport?.querySelector(".showcase__track");
  const group = track?.querySelector(".showcase__group");
  if (!viewport || !track || !group) return;

  const mobileLayout = window.matchMedia("(max-width: 1024px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const duplicate = group.cloneNode(true);
  duplicate.setAttribute("aria-hidden", "true");
  duplicate.querySelectorAll("a, button, [tabindex]").forEach((element) => {
    element.tabIndex = -1;
  });
  if ("inert" in duplicate) duplicate.inert = true;
  track.appendChild(duplicate);

  let offset = 0;
  let loopSize = 1;
  let previousTime = performance.now();
  let pauseUntil = 0;
  let dragging = false;
  let pointerId = null;
  let previousPointerPosition = 0;
  let resizeFrame = 0;

  const isHorizontal = () => mobileLayout.matches;
  const pointerPosition = (event) => (isHorizontal() ? event.clientX : event.clientY);
  const normalizeOffset = () => {
    offset = ((offset % loopSize) + loopSize) % loopSize;
  };
  const render = () => {
    const x = isHorizontal() ? -offset : 0;
    const y = isHorizontal() ? 0 : -offset;
    track.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const measure = () => {
    const oldSize = loopSize;
    const progress = oldSize > 1 ? offset / oldSize : 0;
    loopSize = isHorizontal() ? group.getBoundingClientRect().width : group.getBoundingClientRect().height;
    loopSize = Math.max(1, loopSize);
    offset = progress * loopSize;
    normalizeOffset();
    render();
  };
  const nudge = (distance) => {
    offset += distance;
    normalizeOffset();
    pauseUntil = performance.now() + 650;
    render();
  };
  const animate = (time) => {
    const elapsed = Math.min(50, time - previousTime);
    previousTime = time;
    if (!dragging && time >= pauseUntil && !reducedMotion.matches && !document.hidden) {
      offset += (isHorizontal() ? 24 : 28) * (elapsed / 1000);
      normalizeOffset();
      render();
    }
    requestAnimationFrame(animate);
  };

  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const distance = isHorizontal()
        ? Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY
        : Math.abs(event.deltaY) > Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      nudge(distance);
    },
    { passive: false },
  );

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    pointerId = event.pointerId;
    previousPointerPosition = pointerPosition(event);
    pauseUntil = Infinity;
    viewport.classList.add("is-dragging");
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const currentPosition = pointerPosition(event);
    offset -= currentPosition - previousPointerPosition;
    previousPointerPosition = currentPosition;
    normalizeOffset();
    render();
  });

  const endDrag = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    pauseUntil = performance.now() + 650;
    viewport.classList.remove("is-dragging");
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  viewport.addEventListener("keydown", (event) => {
    const forwardKey = isHorizontal() ? "ArrowRight" : "ArrowDown";
    const backwardKey = isHorizontal() ? "ArrowLeft" : "ArrowUp";
    if (event.key !== forwardKey && event.key !== backwardKey) return;
    event.preventDefault();
    nudge(event.key === forwardKey ? 80 : -80);
  });

  const queueMeasure = () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      measure();
    });
  };
  window.addEventListener("resize", queueMeasure);
  mobileLayout.addEventListener("change", measure);
  document.fonts?.ready.then(measure);

  measure();
  requestAnimationFrame(animate);
}

initShowcase();

const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
const hoverMedia = window.matchMedia("(hover: hover)");
document.querySelectorAll(".case__hero").forEach((hero) => {
  const video = hero.querySelector("video.case__hero-media");
  const still = hero.querySelector(".case__hero-still");
  if (!video || typeof video.play !== "function") return;

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
  const tocEntries = railButtons
    .map((btn) => {
      const id = btn?.getAttribute("data-toc-id");
      return {
        id,
        btn,
        el: id ? document.getElementById(id) : null,
      };
    })
    .filter((entry) => entry.btn && entry.el);
  const sections = tocEntries.map((entry) => entry.el);

  if (!sections.length || !trigger || !menu) return;

  const labels = tocEntries.map((entry) => entry.btn.querySelector(".case__toc-label")?.textContent.trim() || "");
  const colors = tocEntries.map((entry) => {
    const item = entry.btn.closest("[data-toc-item]");
    return item?.getAttribute("data-color") || "#dca8e8";
  });
  menuButtons.forEach((btn) => {
    btn.style.setProperty("--item-color", btn.getAttribute("data-color") || "#dca8e8");
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const OPTIMISTIC_MS = 1200;
  const EXIT_MS = 120;
  const TITLE_OUT_MS = 130;
  const SCROLL_OFFSET = 80;
  const SPY_LINE = 96;

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

  function headerOf(el) {
    if (el.matches("h1, h2, h3, h4")) return el;
    return el.querySelector(".case-section__title, .case-step__title, h2, h3") || el;
  }

  function indexForId(id) {
    return tocEntries.findIndex((entry) => entry.id === id);
  }

  function scrollToSection(el) {
    const header = headerOf(el);
    const target = Math.max(0, window.scrollY + header.getBoundingClientRect().top - SCROLL_OFFSET);
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
    let next = 0;
    sections.forEach((el, i) => {
      if (headerOf(el).getBoundingClientRect().top <= SPY_LINE) next = i;
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

  railButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = indexForId(btn.getAttribute("data-toc-id"));
      if (index >= 0) selectIndex(index);
    });
  });
  menuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = indexForId(btn.getAttribute("data-toc-id"));
      if (index >= 0) selectIndex(index);
    });
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

  menuOverlay.querySelectorAll(".menu-overlay__link, .menu-overlay__contact-link").forEach((el) => {
    const setHot = (on) => el.classList.toggle("is-hot", on);
    el.addEventListener("pointerdown", () => setHot(true));
    el.addEventListener("pointerup", () => setHot(false));
    el.addEventListener("pointercancel", () => setHot(false));
    el.addEventListener("pointerleave", () => setHot(false));
  });
}

function initSquishCursor() {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = 0.38;
  const POWER = 1.1;

  let el = null;
  let label = null;
  let rafId = 0;
  let mx = 0;
  let my = 0;
  let x = 0;
  let y = 0;
  let sx = 1;
  let sy = 1;
  let rot = 0;
  let seeded = false;
  let soon = false;
  let holdUntil = 0;
  let cursorSize = 16;

  const canUseCursor = () => finePointer.matches && !reducedMotion.matches;

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

  const loop = () => {
    if (!canUseCursor()) {
      teardown();
      return;
    }

    const dx = mx - x;
    const dy = my - y;
    x += dx * EASE;
    y += dy * EASE;

    const speed = Math.min(Math.hypot(dx, dy) / 44, POWER);
    const holdShape = soon || performance.now() < holdUntil;
    if (holdShape) {
      rot = 0;
      sx = 1;
      sy = 1;
    } else {
      if (speed > 0.02) rot = (Math.atan2(dy, dx) * 180) / Math.PI;
      sx += (1 + speed - sx) * 0.18;
      sy += (1 - speed * 0.78 - sy) * 0.18;
    }

    const half = cursorSize / 2;
    el.style.transform = `translate3d(${x - half}px, ${y - half}px, 0) rotate(${rot}deg) scale(${sx}, ${sy})`;
    rafId = requestAnimationFrame(loop);
  };

  const onMove = (event) => {
    sync();
    if (!el) return;
    mx = event.clientX;
    my = event.clientY;
    const target = event.target;
    setSoon(Boolean(target && target.closest && target.closest('[data-cursor="soon"]')));
    if (!seeded) {
      x = mx;
      y = my;
      seeded = true;
      el.classList.add("is-visible");
    }
  };

  const onLeave = () => {
    if (!el) return;
    el.classList.remove("is-visible");
    setSoon(false);
  };

  const onEnter = (event) => {
    if (!el) return;
    mx = event.clientX;
    my = event.clientY;
    x = mx;
    y = my;
    sx = 1;
    sy = 1;
    rot = 0;
    el.classList.add("is-visible");
  };

  const teardown = () => {
    if (!el) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
    el.remove();
    el = null;
    label = null;
    seeded = false;
    soon = false;
    holdUntil = 0;
    document.documentElement.classList.remove("has-squish-cursor");
  };

  const setup = () => {
    if (el) return;
    el = document.createElement("div");
    el.className = "squish-cursor";
    el.setAttribute("aria-hidden", "true");
    label = document.createElement("span");
    label.className = "squish-cursor__label";
    label.textContent = "Coming soon";
    el.appendChild(label);
    document.body.appendChild(el);
    cursorSize = el.offsetHeight || cursorSize;
    document.documentElement.classList.add("has-squish-cursor");
    rafId = requestAnimationFrame(loop);
  };

  const sync = () => {
    if (canUseCursor()) setup();
    else teardown();
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  document.documentElement.addEventListener("pointerenter", onEnter);
  finePointer.addEventListener("change", sync);
  reducedMotion.addEventListener("change", sync);
  sync();
}

initSquishCursor();

const WORK_NAV_KEY = "portfolio:work-nav";

function readWorkNav() {
  try {
    return JSON.parse(sessionStorage.getItem(WORK_NAV_KEY) || "null");
  } catch {
    return null;
  }
}

function writeWorkNav(patch) {
  const prev = readWorkNav() || {};
  sessionStorage.setItem(WORK_NAV_KEY, JSON.stringify({ ...prev, ...patch }));
}

function isWorkListHref(href) {
  if (!href) return false;
  try {
    const url = new URL(href, window.location.href);
    return /(?:^|\/)work\.html$/i.test(url.pathname);
  } catch {
    return /(?:^|\/)work\.html(?:[?#]|$)/i.test(href);
  }
}

function isProjectHref(href) {
  if (!href) return false;
  try {
    const url = new URL(href, window.location.href);
    return /\/work\/[^/]+\.html$/i.test(url.pathname);
  } catch {
    return /work\/[^/]+\.html/i.test(href);
  }
}

function withInstantScroll(fn) {
  const html = document.documentElement;
  const previousBehavior = html.style.scrollBehavior;
  html.classList.add("is-restoring-scroll");
  html.style.scrollBehavior = "auto";
  fn();
  html.style.scrollBehavior = previousBehavior;
  html.classList.remove("is-restoring-scroll");
}

function slugWorkFilter(label) {
  return label
    .replace(/^#/, "")
    .trim()
    .toLowerCase()
    .replace(/→/g, "-")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

function initWorkFilters() {
  const root = document.querySelector(".work-filters");
  if (!root) return;

  const pills = Array.from(root.querySelectorAll(".work-filter"));
  const items = Array.from(document.querySelectorAll(".work-item"));
  const status = document.querySelector("[data-filter-status]");
  if (!pills.length || !items.length) return;

  const categoriesOf = (item) =>
    Array.from(item.querySelectorAll(".work-tag")).map((tag) => slugWorkFilter(tag.textContent));

  const applyFilter = (value) => {
    pills.forEach((pill) => {
      const on = pill.getAttribute("data-filter") === value;
      pill.classList.toggle("is-active", on);
      pill.setAttribute("aria-pressed", String(on));
    });

    let visible = 0;
    items.forEach((item) => {
      const show = value === "all" || categoriesOf(item).includes(value);
      item.hidden = !show;
      if (show) visible += 1;
    });

    const active = pills.find((pill) => pill.getAttribute("data-filter") === value);
    const label = active?.querySelector(".work-filter__label")?.textContent.trim() || "All";
    if (status) {
      const noun = visible === 1 ? "project" : "projects";
      status.textContent =
        value === "all" ? `Showing all ${visible} ${noun}` : `Showing ${visible} ${noun} in ${label}`;
    }
  };

  const saved = readWorkNav();
  if (saved?.restore && saved.filter && saved.filter !== "all") {
    applyFilter(saved.filter);
  }

  root.addEventListener("click", (event) => {
    const pill = event.target.closest(".work-filter");
    if (!pill || !root.contains(pill)) return;
    applyFilter(pill.getAttribute("data-filter"));
    writeWorkNav({ filter: pill.getAttribute("data-filter"), y: window.scrollY });
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    const current = event.target.closest(".work-filter");
    if (!current) return;
    event.preventDefault();
    const index = pills.indexOf(current);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % pills.length;
    if (event.key === "ArrowLeft") next = (index - 1 + pills.length) % pills.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = pills.length - 1;
    pills[next].focus();
  });
}

initWorkFilters();

function initWorkScrollRestore() {
  const onWork = document.body.classList.contains("work");
  if (onWork && "scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const currentFilter = () =>
    document.querySelector(".work-filter.is-active")?.getAttribute("data-filter") || "all";

  const snapshotWork = () => {
    if (!document.body.classList.contains("work")) return;
    const prev = readWorkNav() || {};
    writeWorkNav({
      y: window.scrollY,
      filter: currentFilter(),
      restore: prev.restore ?? false,
    });
  };

  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a[href]");
      if (!link) return;

      const href = link.getAttribute("href");
      if (document.body.classList.contains("work")) {
        writeWorkNav({
          y: window.scrollY,
          filter: currentFilter(),
          restore: isProjectHref(href),
        });
        return;
      }

      if (document.body.classList.contains("case") && isWorkListHref(href)) {
        writeWorkNav({ restore: true });
      }
    },
    true,
  );

  window.addEventListener("pagehide", snapshotWork);

  if (!onWork) return;

  const saved = readWorkNav();
  const targetY = saved?.y;
  const shouldRestore = Boolean(saved?.restore) && typeof targetY === "number";

  const restore = () => {
    if (!shouldRestore) return;
    withInstantScroll(() => {
      window.scrollTo(0, targetY);
    });
  };

  restore();
  requestAnimationFrame(restore);
  window.addEventListener("load", () => {
    restore();
    writeWorkNav({ restore: false });
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) return;
    restore();
  });
  document.querySelectorAll(".work-item img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", restore, { once: true });
  });

  let scrollFrame = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        snapshotWork();
      });
    },
    { passive: true },
  );
}

function initPageTransitions() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  window.addEventListener("pageswap", (event) => {
    if (reducedMotion.matches && event.viewTransition) {
      event.viewTransition.skipTransition();
    }
  });

  if (reducedMotion.matches) return;
  if (CSS.supports("view-transition-name", "none")) return;
  document.documentElement.classList.add("is-page-enter");
}

initWorkScrollRestore();
initPageTransitions();

const CONTACT_EMAIL = "sofiia.matsiutsia@gmail.com";
const COPY_FEEDBACK_MS = 2000;

function initCopyEmailButtons() {
  const selectors = ".action-btn--copy, .menu-overlay__contact-link--email";
  document.querySelectorAll(selectors).forEach((button) => {
    const label =
      button.querySelector(".action-btn__text") ||
      button.querySelector(".menu-overlay__contact-text");
    if (!label) return;

    const defaultText = label.textContent.trim();
    let resetTimer = 0;

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(CONTACT_EMAIL);
      } catch {
        const area = document.createElement("textarea");
        area.value = CONTACT_EMAIL;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand("copy");
        } finally {
          area.remove();
        }
      }

      window.clearTimeout(resetTimer);
      label.textContent = "Copied!";
      button.classList.add("is-copied");
      resetTimer = window.setTimeout(() => {
        label.textContent = defaultText;
        button.classList.remove("is-copied");
      }, COPY_FEEDBACK_MS);
    });
  });
}

initCopyEmailButtons();
