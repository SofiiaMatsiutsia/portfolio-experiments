import { bind, play, setEnabled, setVolume } from "./assets/vendor/cuelume/index.js";

const STORAGE_KEY = "portfolio:sound";
const VOLUME = 0.5;

// Every hover sound on the site. The header is duplicated across eleven pages,
// so the attributes are applied from here instead of the markup; bind() reads
// them when the event fires, so the result is the same.
const HOVER = {
  ".nav__link": "tick",
};

function readMuted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "muted";
  } catch {
    return false;
  }
}

function writeMuted(muted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "muted" : "on");
  } catch {
    // Private browsing and blocked storage: the preference just won't persist.
  }
}

function paint(toggle, muted) {
  toggle.classList.toggle("is-muted", muted);
  toggle.setAttribute("aria-pressed", String(muted));
  toggle.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
}

setVolume(VOLUME);

const stored = readMuted();
setEnabled(!stored);

const toggles = document.querySelectorAll(".sound-toggle");

if (stored) {
  // The module can resolve after first paint, so restoring the muted state
  // without this would play the crossfade at the visitor unprompted.
  toggles.forEach((toggle) => {
    toggle.classList.add("is-instant");
    paint(toggle, true);
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toggles.forEach((toggle) => toggle.classList.remove("is-instant"));
    });
  });
}

// script.js owns the visual flip and runs first, so by the time this fires
// aria-pressed already holds the new state.
document.addEventListener("click", (event) => {
  const toggle = event.target.closest?.(".sound-toggle");
  if (!toggle) return;

  const muted = toggle.getAttribute("aria-pressed") === "true";
  setEnabled(!muted);
  writeMuted(muted);
  // Muting confirms itself by going quiet; unmuting needs to be heard.
  if (!muted) play("toggle");
});

for (const [selector, sound] of Object.entries(HOVER)) {
  document.querySelectorAll(selector).forEach((element) => {
    element.setAttribute("data-cuelume-hover", sound);
  });
}

bind();

window.cuelume = { play };
