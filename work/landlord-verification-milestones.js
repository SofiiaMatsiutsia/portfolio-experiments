/* Keep page scroll and the embedded copy explorer in sync until manual takeover. */
(() => {
  const frame = document.querySelector("[data-verification-milestones]");
  if (!frame) return;

  const figure = frame.closest(".verification-milestones-demo") || frame;
  const trustedOrigin = new URL(frame.src).origin;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frameDocument = null;
  let ready = false;
  let manualOverride = false;
  let controlFocused = false;
  let wasVisible = false;
  let pendingResume = true;
  let lastProgress = null;
  let syncFrame = 0;

  function adoptDocument() {
    const currentDocument = frame.contentDocument;
    if (currentDocument === frameDocument) return;
    frameDocument = currentDocument;
    ready = false;
    manualOverride = false;
    controlFocused = false;
    wasVisible = false;
    pendingResume = true;
    lastProgress = null;
  }

  function post(message) {
    frame.contentWindow?.postMessage(message, trustedOrigin);
  }

  function syncProgress() {
    syncFrame = 0;
    const bounds = figure.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const visible = bounds.bottom > 0 && bounds.top < viewportHeight;
    if (!visible && wasVisible) pendingResume = true;
    wasVisible = visible;
    if (!visible || !ready || reducedMotion.matches || controlFocused) return;
    if (manualOverride && !pendingResume) return;

    const progress = Math.round(Math.max(0, Math.min(100,
      (viewportHeight * 0.75 - bounds.top) / (viewportHeight * 0.6) * 100,
    )) / 25) * 25;
    if (!pendingResume && progress === lastProgress) return;
    post({ type: "verification-copy:progress", progress, resume: pendingResume });
    lastProgress = progress;
    if (pendingResume) {
      pendingResume = false;
      manualOverride = false;
    }
  }

  function scheduleSync() {
    if (!syncFrame) syncFrame = requestAnimationFrame(syncProgress);
  }

  function takeManualControl() {
    manualOverride = true;
    pendingResume = false;
    scheduleSync();
  }

  window.addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow || event.origin !== trustedOrigin) return;
    const message = event.data;
    if (!message || typeof message !== "object") return;
    adoptDocument();

    if (message.type === "verification-copy:resize" && Number.isFinite(message.height)) {
      const height = `${Math.max(300, Math.min(1000, Math.ceil(message.height)))}px`;
      if (frame.style.height !== height) frame.style.height = height;
      scheduleSync();
    } else if (message.type === "verification-copy:ready") {
      ready = true;
      scheduleSync();
    } else if (message.type === "verification-copy:manual") {
      takeManualControl();
    } else if (message.type === "verification-copy:focus" && typeof message.focused === "boolean") {
      controlFocused = message.focused;
      if (controlFocused) takeManualControl();
      else scheduleSync();
    }
  });

  function requestDimensions() {
    post({ type: "verification-copy:measure" });
  }

  frame.addEventListener("load", () => {
    // Ready can arrive before load; the document identity prevents a second reset.
    adoptDocument();
    requestDimensions();
    scheduleSync();
  });
  window.addEventListener("scroll", scheduleSync, { passive: true });
  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("pageshow", scheduleSync);
  reducedMotion.addEventListener("change", scheduleSync);
  new ResizeObserver(scheduleSync).observe(figure);

  // Cover cached frames whose first report and load preceded controller setup.
  requestDimensions();
  scheduleSync();
})();
