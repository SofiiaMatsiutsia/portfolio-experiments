/* Play the verification confirmation loop only while it is in view. */
(() => {
  const figure = document.querySelector(".verification-card-animation");
  const video = figure?.querySelector("[data-verification-card-video]");
  const toggle = figure?.querySelector("[data-verification-card-toggle]");
  if (!figure || !video || !toggle || !window.matchMedia ||
      !("IntersectionObserver" in window) || typeof video.play !== "function") return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let inView = false;
  let hasEntered = false;
  let userPaused = false;
  let playPending = false;

  function updateToggle() {
    const playing = !video.paused && !video.ended;
    toggle.dataset.state = playing ? "playing" : "paused";
    toggle.setAttribute(
      "aria-label",
      playing ? "Pause verification card animation" : "Play verification card animation"
    );
  }

  function pause() {
    video.pause();
    updateToggle();
  }

  function play(restart = false) {
    if (restart) video.currentTime = 0;
    if (!video.paused || playPending) return;
    playPending = true;
    const result = video.play();
    if (!result || typeof result.then !== "function") {
      playPending = false;
      updateToggle();
      return;
    }
    result
      .catch(() => {})
      .finally(() => {
        playPending = false;
        updateToggle();
      });
  }

  function shouldPlay() {
    return hasEntered && inView && !document.hidden &&
      !reducedMotion.matches && !userPaused;
  }

  function syncPlayback(restart = false) {
    if (shouldPlay()) play(restart);
    else pause();
  }

  function syncMotionPreference() {
    pause();
    video.loop = !reducedMotion.matches;
    video.controls = reducedMotion.matches;
    toggle.hidden = reducedMotion.matches;
    video.preload = reducedMotion.matches ? "none" : "metadata";
    if (reducedMotion.matches) {
      // Reset to the representative poster instead of the clip's blank first frame.
      video.load();
      updateToggle();
    } else {
      syncPlayback();
    }
  }

  toggle.addEventListener("click", () => {
    if (video.paused) {
      userPaused = false;
      play();
    } else {
      userPaused = true;
      pause();
    }
  });
  video.addEventListener("play", updateToggle);
  video.addEventListener("pause", updateToggle);
  video.addEventListener("ended", () => {
    if (reducedMotion.matches) video.load();
    updateToggle();
  });

  document.addEventListener("visibilitychange", () => syncPlayback());
  window.addEventListener("pagehide", pause);
  window.addEventListener("pageshow", () => syncPlayback());

  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", syncMotionPreference);
  } else {
    reducedMotion.addListener(syncMotionPreference);
  }

  new IntersectionObserver(([entry]) => {
    const wasEntered = hasEntered;
    inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
    if (inView) hasEntered = true;
    syncPlayback(inView && !wasEntered);
  }, { threshold: [0, 0.25] }).observe(figure);

  syncMotionPreference();
})();
