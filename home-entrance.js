/* Restore the original signature-and-rings intro before the first paint. */
(() => {
  const key = "portfolio:homepage-intro:v1";
  const root = document.documentElement;
  let watchdog;
  const state = window.homepageIntro = {
    startedAt: 0, active: false, cleanups: [], id: 0,
    armWatchdog(ms) {
      clearTimeout(watchdog);
      if (ms !== null) watchdog = setTimeout(state.finish, ms);
    },
    start(settings = window.HomepageIntroSettings?.read()) {
      state.finish();
      state.settings = settings;
      state.startedAt = performance.now();
      state.active = true;
      state.id += 1;
      root.style.setProperty("--home-intro-bg", settings?.background || "var(--color-blue)");
      root.dataset.homeIntro = "pending";
      // The controller replaces this startup limit with its own animation budget.
      state.armWatchdog(6000);
      state.onStart?.(settings);
    },
    finish() {
      if (!state.active) return;
      state.active = false;
      clearTimeout(watchdog);
      state.cleanups.splice(0).forEach((cleanup) => { try { cleanup(); } catch {} });
      root.removeAttribute("data-home-intro");
      document.getElementById("homepage-intro")?.remove();
      try { sessionStorage.setItem(key, "complete"); } catch {}
      window.dispatchEvent(new Event("homepageintrochange"));
    },
  };
  window.addEventListener("pagehide", state.finish);
  window.addEventListener("pageshow", (event) => { if (event.persisted) state.start(); });
  window.addEventListener("pagereveal", (event) => {
    if (!state.active || !event.viewTransition) return;
    event.viewTransition.ready?.catch(() => {});
    event.viewTransition.finished?.catch(() => {});
    event.viewTransition.skipTransition();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") state.finish(); });
  const settings = window.HomepageIntroSettings?.read();
  if (settings?.replayPolicy === "off") return;
  try { if (settings?.replayPolicy !== "always" && sessionStorage.getItem(key)) return; } catch {}
  state.start(settings);
})();

