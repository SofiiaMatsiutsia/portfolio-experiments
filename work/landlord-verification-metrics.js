/* Count the two impact figures once when each card enters the viewport. */
(() => {
  const cards = Array.from(document.querySelectorAll("[data-verification-metric]"));
  if (!cards.length || !window.matchMedia || !window.IntersectionObserver ||
      !window.requestAnimationFrame || !window.cancelAnimationFrame) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // The HTML contains the real results for reduced motion and no-JavaScript use.
  if (reducedMotion.matches) return;

  const records = cards.flatMap((card) => {
    const value = card.querySelector("[data-metric-value]");
    const target = Number(value?.dataset.target);
    if (!value || value.dataset.metricState || !Number.isFinite(target) || target < 0) return [];
    return [{ card, value, target, elapsed: 0, lastTime: null }];
  });
  if (!records.length) return;

  const duration = 3500;
  const waiting = new Map(records.map((record) => [record.card, record]));
  const unfinished = new Set(records);
  const active = new Set();
  let frame = null;

  function easeInOutCubic(progress) {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function pause() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    active.forEach((record) => { record.lastTime = null; });
  }

  function cleanup() {
    pause();
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", pause);
    window.removeEventListener("pageshow", schedule);
    if (reducedMotion.removeEventListener) {
      reducedMotion.removeEventListener("change", onReducedMotionChange);
    } else {
      reducedMotion.removeListener(onReducedMotionChange);
    }
  }

  function finish(record) {
    record.value.textContent = String(record.target);
    record.value.dataset.metricState = "complete";
    active.delete(record);
    unfinished.delete(record);
    if (!unfinished.size) cleanup();
  }

  function tick(timestamp) {
    frame = null;
    if (document.hidden) {
      pause();
      return;
    }
    active.forEach((record) => {
      if (record.lastTime !== null) record.elapsed += timestamp - record.lastTime;
      record.lastTime = timestamp;
      const progress = Math.min(record.elapsed / duration, 1);
      record.value.textContent = String(Math.round(record.target * easeInOutCubic(progress)));
      if (progress === 1) finish(record);
    });
    schedule();
  }

  function schedule() {
    if (frame === null && active.size && !document.hidden) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
    else schedule();
  }

  function onReducedMotionChange() {
    if (reducedMotion.matches) Array.from(unfinished).forEach(finish);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.25) return;
      const record = waiting.get(entry.target);
      if (!record) return;
      waiting.delete(entry.target);
      observer.unobserve(entry.target);
      record.value.dataset.metricState = "running";
      active.add(record);
    });
    if (!waiting.size) observer.disconnect();
    schedule();
  }, { threshold: 0.25 });

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", pause);
  window.addEventListener("pageshow", schedule);
  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", onReducedMotionChange);
  } else {
    reducedMotion.addListener(onReducedMotionChange);
  }
  records.forEach((record) => {
    record.value.textContent = "0";
    record.value.dataset.metricState = "pending";
    observer.observe(record.card);
  });
})();
