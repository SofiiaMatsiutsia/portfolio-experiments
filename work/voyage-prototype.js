(() => {
  const viewport = document.querySelector('[data-voyage-prototype]');
  if (!viewport) return;

  const updateScale = () => {
    viewport.style.setProperty('--voyage-prototype-scale', viewport.clientWidth / 1440);
  };

  updateScale();
  if ('ResizeObserver' in window) {
    new ResizeObserver(updateScale).observe(viewport);
  } else {
    window.addEventListener('resize', updateScale);
  }
})();
