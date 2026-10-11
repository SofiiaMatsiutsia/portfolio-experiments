(() => {
  const artwork = document.querySelector('.not-found__artwork');
  const frames = [...(artwork?.querySelectorAll(':scope > img') || [])];
  if (frames.length < 2) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameDurationMs = 230;
  let frameIndex = Math.floor(Math.random() * frames.length);
  let timer = 0;

  function render() {
    frames.forEach((frame, index) => {
      frame.hidden = index !== frameIndex;
    });
    artwork.dataset.frame = String(frameIndex + 1);
  }

  function nextFrame() {
    frameIndex = (frameIndex + 1 + Math.floor(Math.random() * (frames.length - 1))) % frames.length;
    render();
  }

  function schedule() {
    window.clearTimeout(timer);
    if (document.hidden || reducedMotion.matches) return;
    timer = window.setTimeout(() => {
      nextFrame();
      schedule();
    }, frameDurationMs);
  }

  async function start() {
    await Promise.all(frames.map(async frame => {
      try {
        await frame.decode();
      } catch {
        // Keep the browser's normal image fallback if decoding is unavailable.
      }
    }));
    render();
    schedule();
  }

  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) render();
    schedule();
  });
  start();
})();
