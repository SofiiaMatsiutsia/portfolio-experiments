/* Introduce the interactive checklist once, then leave playback to the viewer. */
(() => {
  const demo = document.querySelector("verification-onboarding");
  if (!demo || !window.customElements) return;

  customElements.whenDefined("verification-onboarding").then(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let autoplayPending = !reducedMotion.matches && !demo.reducedMotion;
    let intersectionRatio = 0;
    let inView = false;

    function stopPlayback() {
      demo.stopDemo({ quiet: true });
    }

    function tryAutoplay() {
      if (!autoplayPending || !inView || intersectionRatio < 0.25 ||
          document.hidden || reducedMotion.matches || demo.reducedMotion) return;
      // Consume the introduction before starting; observer callbacks may repeat.
      autoplayPending = false;
      demo.playDemo().catch((error) => {
        stopPlayback();
        console.error("Verification demo playback failed.", error);
      });
    }

    function takeOver() {
      autoplayPending = false;
      stopPlayback();
    }

    demo.addEventListener("pointerdown", takeOver);
    demo.addEventListener("keydown", takeOver);
    demo.addEventListener("focusin", takeOver);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopPlayback();
      else tryAutoplay();
    });
    window.addEventListener("pagehide", stopPlayback);
    reducedMotion.addEventListener("change", () => {
      if (!reducedMotion.matches) return;
      autoplayPending = false;
      stopPlayback();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        intersectionRatio = entry.intersectionRatio;
        if (!inView) stopPlayback();
        else tryAutoplay();
      }, { threshold: [0, 0.25] }).observe(demo);
    }
  });
})();
