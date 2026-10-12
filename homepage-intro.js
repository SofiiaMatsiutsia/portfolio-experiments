(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // This also runs when the intro is skipped. Clones are present by this point.
  document.querySelectorAll("video[data-home-preview]").forEach((video) => {
    const frame = video.closest(".showcase__item");
    const sync = () => {
      const staticPreview = reducedMotion.matches || video.error || video.readyState < 2;
      frame.classList.toggle("home-preview--static", Boolean(staticPreview));
      if (reducedMotion.matches) video.pause();
      else video.play().catch(() => {});
    };
    video.addEventListener("loadeddata", sync);
    video.addEventListener("error", sync);
    reducedMotion.addEventListener("change", sync);
    sync();
  });


  const settings = window.HomepageIntroSettings;
  const state = window.homepageIntro;
  const initialOverlay = document.getElementById("homepage-intro");
  if (!state || !initialOverlay || !settings) { state?.finish(); return; }
  // Preserve pristine SVG markup so replay never inherits a previous animation.
  const template = initialOverlay.cloneNode(true);
  const root = document.documentElement;
  const easing = (curve) => `cubic-bezier(${curve.join(", ")})`;
  let controller = null;
  let lastStatus = { active: false, paused: false, phase: "ready", time: 0, duration: 2400, rate: 1 };

  function begin(input) {
    const config = settings.normalize(input);
    const id = state.id;
    const isActive = () => state.active && state.id === id;
    document.getElementById("homepage-intro")?.remove();
    const overlay = template.cloneNode(true);
    document.body.prepend(overlay);
    const abort = new AbortController();
    const { signal } = abort;
    const animations = new Set();
    const inertElements = new Map();
    const signature = overlay.querySelector(".home-intro__signature");
    const reveal = overlay.querySelector(".home-intro__reveal");
    const cutout = reveal.querySelector(".home-intro__cutout");
    const bands = reveal.querySelector(".home-intro__bands");
    const reduced = reducedMotion.matches || config.simulateReduced;
    const writeEnd = config.delayMs + (reduced ? 0 : config.writeMs);
    const revealStart = writeEnd + (reduced ? 0 : config.holdMs);
    const duration = revealStart + (reduced ? config.reducedFadeMs : Math.max(config.revealMs, config.fadeDelayMs + config.fadeMs));
    const deadline = state.startedAt + Math.max(config.readyLimitMs, revealStart / config.rate);
    let rate = config.rate;
    let manualPaused = false;
    let waitingForAssets = false;
    let assetsReady = !config.waitForAssets;
    let scrubbing = false;
    let viewportVersion = 0;
    let frameId;
    let phase;
    let clock;
    let seedTransform;
    let endTransform;

    const currentTime = () => Math.min(duration, Math.max(0, Number(clock?.currentTime) || 0));
    const status = () => ({ active: isActive(), paused: manualPaused, waitingForAssets, phase, time: currentTime(), duration, rate });
    const notify = () => window.dispatchEvent(new Event("homepageintrochange"));
    const armWatchdog = () => state.armWatchdog(manualPaused ? null : (duration - currentTime()) / rate + Math.max(0, deadline - performance.now()) + 600);

    state.cleanups.push(() => {
      if (state.id === id) lastStatus = { ...status(), active: false, paused: false, phase: currentTime() >= duration - 1 ? "complete" : "skipped" };
      abort.abort();
      cancelAnimationFrame(frameId);
      animations.forEach((animation) => animation.cancel());
      inertElements.forEach((inert, element) => { element.inert = inert; });
      if (state.id === id) controller = null;
    });

    function animate(element, frames, options) {
      const animation = element.animate(frames, options);
      animations.add(animation);
      return animation;
    }

    function align(time, paused) {
      animations.forEach((animation) => {
        animation.pause();
        animation.currentTime = time;
        animation.playbackRate = rate;
        if (!paused) animation.play();
      });
    }

    function applyPhase(time) {
      const next = waitingForAssets ? "loading" : time < config.delayMs ? "delay" : time < writeEnd ? "writing" : time < revealStart ? "hold" : "revealing";
      if (next === phase) return;
      phase = next;
      root.dataset.homeIntro = next;
      overlay.classList.toggle("is-revealing", next === "revealing" && !reduced);
      notify();
    }

    function configureReveal() {
      const { width, height } = overlay.getBoundingClientRect();
      const x = width * config.originX / 100;
      const y = height * config.originY / 100;
      const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + config.overscan + 1;
      const widths = [config.pinkWidth, config.greenWidth, config.peachWidth].map((value) => value * radius);
      const outerRadius = radius + widths.reduce((sum, value) => sum + value, 0);
      reveal.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const mask = reveal.querySelector("mask");
      Object.entries({ x: 0, y: 0, width, height }).forEach(([name, value]) => mask.setAttribute(name, String(value)));
      reveal.querySelectorAll("rect").forEach((rect) => {
        rect.setAttribute("width", String(width));
        rect.setAttribute("height", String(height));
      });
      cutout.querySelector("circle").setAttribute("r", String(outerRadius));
      bands.querySelectorAll("circle").forEach((circle, index) => {
        const innerBands = widths.slice(index + 1).reduce((sum, value) => sum + value, 0);
        circle.setAttribute("r", String(radius + innerBands + widths[index] / 2));
        circle.setAttribute("stroke-width", String(widths[index] + 1));
        circle.setAttribute("stroke", [config.pink, config.green, config.peach][index]);
      });
      reveal.querySelector(".home-intro__curtain").setAttribute("fill", config.background);
      const seedRadius = width > 1024 ? config.seedDesktop : Math.min(config.seedMobileCap, width * config.seedMobileVw / 100);
      seedTransform = `translate(${x}px, ${y}px) scale(${Math.min(0.95, seedRadius / outerRadius)})`;
      endTransform = `translate(${x}px, ${y}px) scale(1)`;
      cutout.style.transform = seedTransform;
      bands.style.transform = seedTransform;
    }

    function drawSignature() {
      const order = [7, 8, 0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 15, 14, 16, 18, 17, 19, 20, 21, 22];
      const dots = new Set([3, 5, 14, 21]);
      const penLifts = new Set([1, 3, 5, 12, 14, 17, 21]);
      const strokes = order.map((index) => ({
        index,
        path: signature.querySelector(`#intro-stroke-${index}`),
        gap: index === 9 ? config.wordGapMs : index === 7 ? 0 : penLifts.has(index) ? config.penLiftMs : config.letterGapMs,
      }));
      const weight = (stroke) => dots.has(stroke.index) ? 0 : config.lengthWeighted ? stroke.path.getTotalLength() : 1;
      const totalWeight = strokes.reduce((sum, stroke) => sum + weight(stroke), 0);
      const fixedTime = dots.size * config.dotMs + strokes.reduce((sum, stroke) => sum + stroke.gap, 0);
      // Fit extreme gap combinations into the chosen total, reserving time for ink.
      const fixedScale = fixedTime ? Math.min(1, config.writeMs * 0.8 / fixedTime) : 1;
      const available = config.writeMs - fixedTime * fixedScale;
      let delay = config.delayMs;
      strokes.forEach((stroke) => {
        const { index, path, gap } = stroke;
        delay += gap * fixedScale;
        const strokeMs = dots.has(index) ? config.dotMs * fixedScale : available * weight(stroke) / totalWeight;
        if (!dots.has(index)) path.style.strokeDasharray = "100 110";
        animate(path, dots.has(index)
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 1, strokeDashoffset: "110px" }, { opacity: 1, strokeDashoffset: "0px" }],
        { duration: strokeMs, delay, easing: easing(config.drawEase), fill: "forwards" });
        delay += strokeMs;
      });
    }

  function waitForImage(image) {
    return new Promise((resolve) => {
      let settled = false;
      const done = async () => {
        if (settled) return;
        settled = true;
        image.removeEventListener("load", done);
        image.removeEventListener("error", done);
        signal.removeEventListener("abort", done);
        if (signal.aborted || !image.naturalWidth) return resolve(false);
        try { await image.decode(); } catch { return resolve(false); }
        resolve(true);
      };
      image.addEventListener("load", done);
      image.addEventListener("error", done);
      signal.addEventListener("abort", done, { once: true });
      if (image.complete || signal.aborted) done();
    });
  }

  async function waitForVideo(video) {
    if (video.readyState >= 2) return true;
    const poster = video.getAttribute("poster");
    if (poster) {
      const image = new Image();
      image.src = poster;
      // A decoded poster is a complete, painted fallback until the first frame arrives.
      if (await waitForImage(image)) return true;
    }
    return new Promise((resolve) => {
      const done = () => {
        video.removeEventListener("loadeddata", done);
        video.removeEventListener("error", done);
        signal.removeEventListener("abort", done);
        resolve(!signal.aborted && video.readyState >= 2);
      };
      video.addEventListener("loadeddata", done);
      video.addEventListener("error", done);
      signal.addEventListener("abort", done, { once: true });
      if (video.readyState >= 2 || video.error || signal.aborted) done();
    });
  }

  function visibleImages(container) {
    return [...container.querySelectorAll("img")].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  async function waitForFirstScreen() {
    // Font metrics determine which showcase tiles intersect the clipped viewport.
    await document.fonts?.load('400 32px "Folio Bk BT"').catch(() => {});
    await document.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const pending = new Map();
    do {
      const version = viewportVersion;
      const media = visibleImages(document.querySelector(".hero"));
      const logo = document.querySelector(".logo__mark");
      if (logo) media.push(logo);
      const showcase = document.querySelector(".showcase");
      const viewport = showcase.getBoundingClientRect();
      showcase.querySelectorAll(".showcase__item").forEach((frame) => {
        const rect = frame.getBoundingClientRect();
        if (rect.right <= viewport.left || rect.left >= viewport.right || rect.bottom <= viewport.top || rect.top >= viewport.bottom) return;
        const element = frame.querySelector(":scope > video, :scope > img");
        if (element) media.push(element);
      });
      await Promise.all(media.map(async (element) => {
        const video = element.tagName === "VIDEO";
        const url = video ? element.currentSrc || element.querySelector("source")?.src : element.currentSrc || element.src;
        if (!pending.has(url)) pending.set(url, video ? waitForVideo(element) : waitForImage(element));
        const ready = await pending.get(url);
        if (ready && isActive()) {
          const frame = element.closest(".media-slot");
          frame?.classList.remove("is-pending");
          frame?.classList.add("is-ready", "is-settled");
        }
      }));
      if (version === viewportVersion) return;
    } while (isActive() && performance.now() < deadline);
  }


    function tick() {
      if (!isActive()) return;
      try {
        let time = currentTime();
        if (time >= revealStart && !assetsReady && !scrubbing && performance.now() < deadline) {
          if (!waitingForAssets) {
            waitingForAssets = true;
            align(Math.max(0, revealStart - 0.001), true);
            time = currentTime();
          }
        } else if (waitingForAssets) {
          waitingForAssets = false;
          if (!manualPaused) align(time, false);
        }
        applyPhase(time);
        if (time >= duration && !manualPaused && !waitingForAssets) { state.finish(); return; }
        frameId = requestAnimationFrame(tick);
      } catch (error) {
        console.warn("Homepage intro ended early:", error);
        state.finish();
      }
    }

    try {
      [...document.body.children].forEach((element) => {
        if (element === overlay || element.tagName === "SCRIPT") return;
        inertElements.set(element, element.inert);
        element.inert = true;
      });
      const blockScroll = (event) => { event.preventDefault(); };
      document.addEventListener("wheel", blockScroll, { passive: false, signal });
      document.addEventListener("touchmove", blockScroll, { passive: false, signal });
      window.addEventListener("resize", () => {
        viewportVersion += 1;
        if (phase === "revealing") state.finish();
        else {
          configureReveal();
          [cutout, bands].forEach((element) => element.getAnimations().forEach((animation) => {
            animation.effect.setKeyframes([{ transform: seedTransform }, { transform: endTransform }]);
          }));
        }
      }, { signal });
      reducedMotion.addEventListener("change", state.finish, { signal });
      signature.style.width = `clamp(${config.widthMin}px, ${config.widthVw}vw, ${config.widthMax}px)`;
      signature.style.maxWidth = `calc(100vw - ${config.gutter * 2}px)`;
      signature.style.left = `${config.signatureX}%`;
      signature.style.top = `${config.signatureY}%`;
      overlay.classList.toggle("home-intro--reduced", reduced);
      signature.querySelectorAll("path").forEach((path) => {
        path.setAttribute("stroke", config.ink);
        path.setAttribute("stroke-width", String(config.strokeWidth));
        if (reduced) path.style.opacity = "1";
      });
      configureReveal();
      if (!reduced) {
        drawSignature();
        const frames = [{ transform: seedTransform }, { transform: endTransform }];
        const options = { duration: config.revealMs, delay: revealStart, easing: easing(config.revealEase), fill: "both" };
        animate(cutout, frames, options);
        animate(bands, frames, options);
        animate(signature, [{ opacity: 1 }, { opacity: 0 }], {
          duration: config.fadeMs, delay: revealStart + config.fadeDelayMs, easing: easing(config.fadeEase), fill: "both",
        });
      } else {
        animate(overlay, [{ opacity: 1 }, { opacity: 0 }], { duration: config.reducedFadeMs, delay: revealStart, easing: easing(config.fadeEase), fill: "both" });
      }
      clock = animate(overlay, [], { duration, fill: "both" });
      // Let the browser resolve an initially null document timeline before syncing.
      align(0, false);
      controller = {
        status,
        pause() { manualPaused = true; align(currentTime(), true); armWatchdog(); notify(); },
        resume() { manualPaused = false; if (!waitingForAssets) align(currentTime(), false); armWatchdog(); notify(); },
        seek(time) {
          manualPaused = true;
          scrubbing = true;
          waitingForAssets = false;
          align(Math.min(duration, Math.max(0, time)), true);
          applyPhase(currentTime());
          armWatchdog();
          notify();
        },
        setRate(value) {
          rate = settings.normalize({ ...config, rate: value }).rate;
          align(currentTime(), manualPaused || waitingForAssets);
          armWatchdog();
          notify();
        },
      };
      applyPhase(0);
      if (config.waitForAssets) waitForFirstScreen().then(() => { assetsReady = true; }).catch(() => { assetsReady = true; });
      frameId = requestAnimationFrame(tick);
    } catch (error) {
      console.warn("Homepage intro ended early:", error);
      if (isActive()) state.finish();
    }
  }

  state.onStart = begin;
  window.HomepageIntro = {
    replay(config = settings.read()) { state.start(settings.normalize(config)); },
    pause() { controller?.pause(); },
    resume() { controller?.resume(); },
    seek(time) { if (!state.active) this.replay(); controller?.seek(time); },
    skip() { state.finish(); },
    setRate(rate) { controller?.setRate(rate); },
    getStatus() { return controller?.status() || lastStatus; },
  };
  if (state.active) begin(state.settings);
  else initialOverlay.remove();
})();
