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

function createEase(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const slope = sampleDX(t);
      if (Math.abs(slope) < 1e-6) break;
      const next = t - (sampleX(t) - x) / slope;
      if (Math.abs(next - t) < 1e-5) {
        t = next;
        break;
      }
      t = next;
    }
    return Math.min(1, Math.max(0, sampleY(Math.min(1, Math.max(0, t)))));
  };
}

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

  const CRUISE_X = 48;
  const CRUISE_Y = 56;
  const GLIDE_TAU = 320;
  const VELOCITY_WINDOW = 100;
  const MAX_RELEASE_SPEED = 1800;
  const NOTCH_MS = 280;
  const easeSnap = createEase(0.16, 1, 0.3, 1);

  let offset = 0;
  let loopSize = 1;
  let previousTime = performance.now();
  let pauseUntil = 0;
  let dragging = false;
  let pointerId = null;
  let previousPointerPosition = 0;
  let resizeFrame = 0;
  let velocity = 0;
  let glide = false;
  let coasting = false;
  let wheelLatch = false;
  let notch = null;
  let samples = [];

  const isHorizontal = () => mobileLayout.matches;
  const cruiseSpeed = () => (isHorizontal() ? CRUISE_X : CRUISE_Y);
  const pointerPosition = (event) => (isHorizontal() ? event.clientX : event.clientY);
  const wrap = (value) => ((value % loopSize) + loopSize) % loopSize;
  const normalizeOffset = () => {
    offset = wrap(offset);
  };
  const render = () => {
    const wrapped = wrap(offset);
    const x = isHorizontal() ? -wrapped : 0;
    const y = isHorizontal() ? 0 : -wrapped;
    track.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const measure = () => {
    const oldSize = loopSize;
    const progress = oldSize > 1 ? wrap(offset) / oldSize : 0;
    loopSize = isHorizontal() ? group.getBoundingClientRect().width : group.getBoundingClientRect().height;
    loopSize = Math.max(1, loopSize);
    offset = progress * loopSize;
    notch = null;
    render();
  };
  const pushDelta = (delta) => {
    const t = performance.now();
    samples.push({ t, delta });
    const cutoff = t - VELOCITY_WINDOW;
    while (samples.length && samples[0].t < cutoff) samples.shift();
  };
  const releaseVelocity = () => {
    const now = performance.now();
    const recent = samples.filter((sample) => now - sample.t <= VELOCITY_WINDOW);
    if (!recent.length) return 0;
    const sum = recent.reduce((total, sample) => total + sample.delta, 0);
    const span = recent[recent.length - 1].t - recent[0].t;
    const dt = Math.max(span, 16) / 1000;
    return Math.min(MAX_RELEASE_SPEED, Math.max(-MAX_RELEASE_SPEED, sum / dt));
  };
  const stopGesture = () => {
    notch = null;
    glide = false;
    coasting = false;
    wheelLatch = false;
    pauseUntil = 0;
    samples = [];
  };
  const nudge = (distance) => {
    stopGesture();
    velocity = 0;
    offset += distance;
    normalizeOffset();
    pauseUntil = performance.now() + 650;
    render();
  };
  const glideStep = (elapsed) => {
    const cruise = cruiseSpeed();
    const blend = 1 - Math.exp(-elapsed / GLIDE_TAU);
    velocity += (cruise - velocity) * blend;
    offset += velocity * (elapsed / 1000);
    if (Math.abs(velocity - cruise) < 0.5) {
      glide = false;
      velocity = cruise;
    }
  };
  const animate = (time) => {
    const elapsed = Math.min(50, time - previousTime);
    previousTime = time;
    const frozen = document.hidden;
    if (dragging || frozen) {
      /* Pointer tracking writes the transform itself. */
    } else if (notch) {
      const progress = Math.min(1, (time - notch.start) / notch.duration);
      offset = notch.from + (notch.to - notch.from) * easeSnap(progress);
      render();
      if (progress >= 1) {
        offset = notch.to;
        normalizeOffset();
        notch = null;
        velocity = 0;
        glide = !reducedMotion.matches;
        render();
      }
    } else if (time < pauseUntil) {
      /* Arrow keys keep an instant jump, then the drift resumes. */
    } else if (wheelLatch) {
      wheelLatch = false;
      coasting = true;
    } else if (coasting) {
      coasting = false;
      glide = !reducedMotion.matches;
      if (glide) glideStep(elapsed);
      render();
    } else if (glide && !reducedMotion.matches) {
      glideStep(elapsed);
      normalizeOffset();
      render();
    } else if (!reducedMotion.matches) {
      offset += cruiseSpeed() * (elapsed / 1000);
      normalizeOffset();
      render();
    }
    requestAnimationFrame(animate);
  };

  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      if (dragging) return;
      let distance = isHorizontal()
        ? Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY
        : Math.abs(event.deltaY) > Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (event.deltaMode === 1) distance *= 100;
      else if (event.deltaMode === 2) {
        distance *= isHorizontal() ? viewport.clientWidth : viewport.clientHeight;
      }
      pauseUntil = 0;
      const isNotch = !reducedMotion.matches && event.deltaMode !== 0;
      if (!isNotch) {
        notch = null;
        glide = false;
        coasting = false;
        offset += distance;
        normalizeOffset();
        render();
        if (reducedMotion.matches) return;
        pushDelta(distance);
        velocity = releaseVelocity();
        wheelLatch = true;
        return;
      }
      const from = offset;
      const target = (notch ? notch.to : offset) + distance;
      notch = { start: performance.now(), from, to: target, duration: NOTCH_MS };
      glide = false;
      coasting = false;
      wheelLatch = false;
      samples = [];
    },
    { passive: false },
  );

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    pointerId = event.pointerId;
    previousPointerPosition = pointerPosition(event);
    stopGesture();
    velocity = 0;
    viewport.classList.add("is-dragging");
    try {
      viewport.setPointerCapture(event.pointerId);
    } catch {
      /* Capture needs a live pointer; tracking still follows the events. */
    }
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const currentPosition = pointerPosition(event);
    const delta = previousPointerPosition - currentPosition;
    previousPointerPosition = currentPosition;
    offset += delta;
    normalizeOffset();
    render();
    pushDelta(delta);
  });

  const endDrag = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    viewport.classList.remove("is-dragging");
    if (reducedMotion.matches) {
      samples = [];
      return;
    }
    velocity = releaseVelocity();
    samples = [];
    glide = true;
    coasting = false;
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
const menuLogo = document.querySelector(".menu-overlay__logo");

const ringEls = Array.from(document.querySelectorAll(".ring"));

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const RING_TRANSFORM_OPEN = "translate3d(-50%, 0, 0) scale(1)";
const RING_TRANSFORM_CLOSED = "translate3d(-50%, 0, 0) scale(0.32)";

const OPEN_MS = 250;
const CLOSE_MS = 200;
const RING_FOLLOW_DELAY = 40;
// Words wait until the bands have landed, then settle with them.
const LABEL_OPEN_DELAY = 120;
const LABEL_OPEN_MS = 160;
const LABEL_SCALE_FROM = "0.92";

const navLabelSelectors = [
  ".menu-overlay__logo",
  ".menu-overlay__link--about",
  ".menu-overlay__link--work",
  ".menu-overlay__link--writings",
  ".menu-overlay__link--talks",
];
const contactLabelSelectors = [
  ".menu-overlay__contact-link--email",
  ".menu-overlay__contact-link--linkedin",
  ".menu-overlay__contact-link--twitter",
];
const labelFrom = { opacity: 0, scale: LABEL_SCALE_FROM };
const labelTo = { opacity: 1, scale: "1" };

const ANIM_SPECS = [
  {
    el: ringEls[0],
    openDelay: 0,
    openDuration: OPEN_MS,
    closeDelay: 0,
    closeDuration: CLOSE_MS,
    from: { transform: RING_TRANSFORM_CLOSED },
    to: { transform: RING_TRANSFORM_OPEN },
  },
  ...ringEls.slice(1).map((el) => ({
    el,
    openDelay: RING_FOLLOW_DELAY,
    openDuration: OPEN_MS,
    closeDelay: 0,
    closeDuration: CLOSE_MS,
    from: { transform: RING_TRANSFORM_CLOSED },
    to: { transform: RING_TRANSFORM_OPEN },
  })),
  ...navLabelSelectors.map((selector) => ({
    el: document.querySelector(selector),
    openDelay: LABEL_OPEN_DELAY,
    openDuration: LABEL_OPEN_MS,
    closeDelay: 0,
    closeDuration: CLOSE_MS,
    from: labelFrom,
    to: labelTo,
  })),
  ...contactLabelSelectors.map((selector) => ({
    el: document.querySelector(selector),
    openDelay: LABEL_OPEN_DELAY,
    openDuration: LABEL_OPEN_MS,
    closeDelay: 0,
    closeDuration: CLOSE_MS,
    from: labelFrom,
    to: labelTo,
  })),
  {
    el: menuCloseBtn,
    openDelay: LABEL_OPEN_DELAY,
    openDuration: LABEL_OPEN_MS,
    closeDelay: 0,
    closeDuration: CLOSE_MS,
    from: labelFrom,
    to: labelTo,
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
    spec.el.style.scale = "";
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
  menuLogo?.addEventListener("click", (e) => {
    if (!menuLogo.getAttribute("href")?.startsWith("#")) return;
    e.preventDefault();
    closeMenu();
  });
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
  const items = Array.from(document.querySelectorAll(".work-item:not([data-held])"));
  const status = document.querySelector("[data-filter-status]");
  if (!pills.length || !items.length) return;

  const visiblePills = () => pills.filter((pill) => !pill.hidden);

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
    const savedPill = pills.find((pill) => pill.getAttribute("data-filter") === saved.filter);
    if (savedPill && !savedPill.hidden) applyFilter(saved.filter);
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
    const available = visiblePills();
    const index = available.indexOf(current);
    if (index === -1) return;
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % available.length;
    if (event.key === "ArrowLeft") next = (index - 1 + available.length) % available.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = available.length - 1;
    available[next].focus();
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

function initCaseGalleries() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-case-gallery]").forEach((root) => {
    const viewport = root.querySelector(".case-gallery__viewport");
    const track = root.querySelector(".case-gallery__track");
    const slides = Array.from(root.querySelectorAll(".case-gallery__slide"));
    const buttons = Array.from(root.querySelectorAll(".case-gallery__nav button"));
    const status = root.querySelector("[data-gallery-status]");
    if (!viewport || !track || slides.length < 2 || !buttons.length) return;

    let index = 0;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let origin = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let axis = null;

    const width = () => viewport.clientWidth;

    const readX = () => {
      const transform = getComputedStyle(track).transform;
      if (!transform || transform === "none") return 0;
      return new DOMMatrix(transform).m41;
    };

    const apply = (x, animate) => {
      const motion = animate && !reducedMotion.matches;
      if (motion) {
        track.style.transition = "none";
        void track.offsetWidth;
        track.style.transition = "transform 220ms var(--ease-snap)";
      } else {
        track.style.transition = "none";
      }
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    };

    const sync = (announce) => {
      slides.forEach((slide, i) => {
        slide.setAttribute("aria-hidden", String(i !== index));
      });
      buttons.forEach((button, i) => {
        button.setAttribute("aria-pressed", String(i === index));
      });
      if (announce && status) status.textContent = buttons[index].textContent.trim();
    };

    const commit = (next, animate) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, next));
      const changed = clamped !== index;
      index = clamped;
      apply(-index * width(), animate);
      sync(changed);
    };

    sync(false);

    buttons.forEach((button, i) => {
      button.addEventListener("click", () => commit(i, true));
    });

    root.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const button = event.target.closest("button");
      if (!button || !root.contains(button)) return;
      event.preventDefault();
      commit(event.key === "ArrowRight" ? index + 1 : index - 1, true);
      buttons[index]?.focus();
    });

    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || pointerId !== null) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      origin = readX();
      lastX = event.clientX;
      lastT = event.timeStamp;
      velocity = 0;
      axis = null;
      track.style.transition = "none";
      track.style.transform = `translate3d(${origin}px, 0, 0)`;
    });

    viewport.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (!axis) {
          if (Math.hypot(dx, dy) < 8) return;
          axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (axis === "y") return;
          viewport.setPointerCapture(event.pointerId);
          viewport.classList.add("is-dragging");
        }
        if (axis !== "x") return;
        event.preventDefault();
        const dt = event.timeStamp - lastT;
        if (dt > 0) velocity = (event.clientX - lastX) / dt;
        lastX = event.clientX;
        lastT = event.timeStamp;
        let x = origin + dx;
        const min = -(slides.length - 1) * width();
        if (x > 0) x *= 0.2;
        if (x < min) x = min + (x - min) * 0.2;
        track.style.transform = `translate3d(${x}px, 0, 0)`;
      },
      { passive: false },
    );

    const finishDrag = (event) => {
      if (event.pointerId !== pointerId) return;
      const wasHorizontal = axis === "x";
      pointerId = null;
      axis = null;
      viewport.classList.remove("is-dragging");
      if (!wasHorizontal) return;
      const x = readX();
      const w = width();
      const traveled = x - -index * w;
      let next = index;
      if (velocity < -0.45 || traveled < -w * 0.4) next = index + 1;
      else if (velocity > 0.45 || traveled > w * 0.4) next = index - 1;
      commit(next, true);
    };

    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", finishDrag);

    const refit = () => apply(-index * width(), false);
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(refit);
      observer.observe(viewport);
    } else {
      window.addEventListener("resize", refit);
    }
  });
}

initCaseGalleries();
