(() => {
  const defaults = {
    delayMs: 0, writeMs: 1000, holdMs: 250, revealMs: 1750,
    fadeDelayMs: 0, fadeMs: 120, reducedFadeMs: 180,
    dotMs: 30, letterGapMs: 12, penLiftMs: 8, wordGapMs: 40,
    rate: 1, lengthWeighted: true,
    drawEase: [0.25, 0.1, 0.25, 1], revealEase: [0.16, 1, 0.3, 1], fadeEase: [0.25, 0.1, 0.25, 1],
    widthMin: 260, widthVw: 35, widthMax: 531, gutter: 24,
    signatureX: 50, signatureY: 50, strokeWidth: 4,
    originX: 50, originY: 100, seedDesktop: 92, seedMobileCap: 64, seedMobileVw: 12, overscan: 4,
    pinkWidth: 0.17, greenWidth: 0.17, peachWidth: 0.17,
    background: "var(--color-blue)", ink: "var(--color-white)", pink: "var(--color-rose)", green: "var(--color-green)", peach: "var(--color-orange)",
    waitForAssets: true, readyLimitMs: 6000, replayPolicy: "always", simulateReduced: false,
  };
  const bounds = {
    delayMs: [0, 5000], writeMs: [250, 15000], holdMs: [0, 10000], revealMs: [100, 8000],
    fadeDelayMs: [0, 5000], fadeMs: [0, 5000], reducedFadeMs: [0, 1000],
    dotMs: [0, 300], letterGapMs: [0, 300], penLiftMs: [0, 300], wordGapMs: [0, 1000], rate: [0.1, 3],
    widthMin: [80, 1200], widthVw: [10, 95], widthMax: [80, 1600], gutter: [0, 100],
    signatureX: [0, 100], signatureY: [0, 100], strokeWidth: [1, 12],
    originX: [0, 100], originY: [0, 150], seedDesktop: [1, 400], seedMobileCap: [1, 200], seedMobileVw: [1, 40], overscan: [0, 100],
    pinkWidth: [0.01, 0.4], greenWidth: [0.01, 0.4], peachWidth: [0.01, 0.4], readyLimitMs: [0, 20000],
  };
  function normalize(input = {}) {
    const result = structuredClone(defaults);
    Object.entries(defaults).forEach(([name, fallback]) => {
      const value = input?.[name];
      if (bounds[name] && Number.isFinite(Number(value)) && value !== null && value !== undefined) {
        result[name] = Math.min(bounds[name][1], Math.max(bounds[name][0], Number(value)));
      } else if (Array.isArray(fallback) && Array.isArray(value) && value.length === 4 && value.every(Number.isFinite)) {
        result[name] = value.map((number, index) => Math.min(index % 2 ? 2 : 1, Math.max(index % 2 ? -2 : 0, number)));
      } else if (typeof fallback === "boolean" && typeof value === "boolean") result[name] = value;
      else if (name === "replayPolicy" && ["session", "always", "off"].includes(value)) result[name] = value;
      else if (typeof fallback === "string" && /^#[\da-f]{6}$/i.test(value)) result[name] = value.toLowerCase();
    });
    return result;
  }
  function read() { return normalize(); }
  window.HomepageIntroSettings = { defaults, bounds, normalize, read };
})();
