/* One shared clock for the original 18-second Figma conversation. */
(() => {
  const player = document.querySelector("[data-verification-player]");
  if (!player) return;

  const viewport = player.querySelector("[data-journey-viewport]");
  const scene = player.querySelector("[data-journey-scene]");
  const controls = player.querySelector("[data-journey-controls]");
  const toggle = player.querySelector("[data-journey-toggle]");
  const screenToggle = player.querySelector("[data-journey-screen-toggle]");
  const seek = player.querySelector("[data-journey-seek]");
  const duration = Number(player.dataset.duration) * 1000;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!scene.getAnimations || !Number.isFinite(duration) || duration <= 0) return;

  const animations = scene.getAnimations({ subtree: true });
  if (!animations.length) return;
  animations.forEach((animation) => {
    animation.pause();
    animation.currentTime = 0;
  });

  let position = 0;
  let playing = false;
  let inView = false;
  let canStart = false;
  let ready = false;
  let userPaused = false;
  let wantsPlayback = !reducedMotion.matches;
  let frame = 0;

  function resize() {
    scene.style.transform = `scale(${viewport.clientWidth / 400})`;
  }

  function updateControls() {
    seek.value = (position / 1000).toFixed(2);
    seek.setAttribute("aria-valuetext", `${(position / 1000).toFixed(1)} seconds of ${duration / 1000} seconds`);
    [toggle, screenToggle].forEach((button) => {
      button.dataset.playing = String(playing);
      button.setAttribute("aria-label", playing ? "Pause animation" : "Play animation");
      button.title = playing ? "Pause animation" : "Play animation";
    });
  }

  function readPosition() {
    const currentTime = Number(animations[0].currentTime);
    if (Number.isFinite(currentTime)) position = ((currentTime % duration) + duration) % duration;
  }

  function tick() {
    if (!playing) return;
    readPosition();
    updateControls();
    frame = requestAnimationFrame(tick);
  }

  function syncPlayback() {
    const shouldPlay = ready && wantsPlayback && inView && canStart && !document.hidden;
    if (shouldPlay === playing) return;

    if (shouldPlay) {
      player.classList.add("is-started");
      // Assign the same startTime to every track, including nested typing layers.
      const startTime = document.timeline.currentTime - Math.min(position, duration - 1);
      animations.forEach((animation) => {
        animation.play();
        animation.startTime = startTime;
      });
      playing = true;
      frame = requestAnimationFrame(tick);
    } else {
      readPosition();
      animations.forEach((animation) => animation.pause());
      playing = false;
      cancelAnimationFrame(frame);
    }
    updateControls();
  }

  function togglePlayback() {
    userPaused = playing;
    wantsPlayback = !playing;
    canStart = true;
    syncPlayback();
  }

  toggle.addEventListener("click", togglePlayback);
  screenToggle.addEventListener("click", togglePlayback);

  // Scrubbing pauses at the selected frame so the conversation can be inspected.
  // The native range input also supplies Arrow, Home and End keyboard controls.
  seek.addEventListener("input", () => {
    const next = Number(seek.value) * 1000;
    if (!Number.isFinite(next)) return;
    userPaused = true;
    wantsPlayback = false;
    syncPlayback();
    position = Math.max(0, Math.min(duration, next));
    player.classList.add("is-started");
    animations.forEach((animation) => {
      // An infinite animation wraps at exactly 18s; retain the last frame at End.
      animation.currentTime = Math.min(position, duration - 1);
    });
    updateControls();
  });

  reducedMotion.addEventListener("change", () => {
    wantsPlayback = !reducedMotion.matches && !userPaused;
    syncPlayback();
  });
  document.addEventListener("visibilitychange", syncPlayback);
  window.addEventListener("pagehide", () => {
    if (!playing) return;
    readPosition();
    animations.forEach((animation) => animation.pause());
    playing = false;
    cancelAnimationFrame(frame);
    updateControls();
  });
  window.addEventListener("pageshow", syncPlayback);

  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(viewport);
  else window.addEventListener("resize", resize, { passive: true });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (entry.intersectionRatio >= 0.25) canStart = true;
      syncPlayback();
    }, { threshold: [0, 0.25] }).observe(viewport);
  } else {
    // Older browsers retain manual playback rather than autoplaying off-screen.
    inView = true;
    canStart = true;
    wantsPlayback = false;
  }

  const images = Array.from(scene.querySelectorAll("img"));
  Promise.all(images.map((image) => image.decode())).then(() => {
    ready = true;
    controls.hidden = false;
    screenToggle.hidden = false;
    resize();
    updateControls();
    syncPlayback();
  }).catch(() => {
    // Keep the original static poster when an artwork asset cannot be loaded.
  });
})();
