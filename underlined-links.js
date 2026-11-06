(() => {
  const links = [...document.querySelectorAll('.hero__community, a.about-company')];
  if (!links.length) return;

  // Shared wave settings for the Home and About links.
  const settings = {
    amplitude: 2.2,
    wavelength: 25.9,
    strokeWidth: 1.3,
    samplingInterval: 4,
    verticalOffset: 0,
    phase: 360,
    overhang: 0,
  };
  const svgNamespace = 'http://www.w3.org/2000/svg';
  let scheduled = 0;

  const decorations = links.map(link => {
    const layer = document.createElement('span');
    layer.className = 'wave-link__layer';
    layer.setAttribute('aria-hidden', 'true');
    link.classList.add('wave-link');
    link.append(layer);
    return { link, layer };
  });

  function render() {
    scheduled = 0;
    const { amplitude, wavelength, strokeWidth, samplingInterval, verticalOffset, phase, overhang } = settings;
    const padding = amplitude + strokeWidth / 2 + 1;
    const height = padding * 2;

    decorations.forEach(({ link, layer }) => {
      const origin = layer.getBoundingClientRect();
      const fontSize = parseFloat(getComputedStyle(link).fontSize);
      const baselineInset = link.classList.contains('hero__community') ? fontSize * 0.06 : 2;
      // Inline links can wrap. Draw each fragment separately without changing
      // wrapping or stretching the wavelength to fit the text.
      const fragments = [...link.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
      const waves = fragments.map(rect => {
        const width = rect.width + overhang * 2;
        const segments = Math.max(1, Math.ceil(width / samplingInterval));
        const data = Array.from({ length: segments + 1 }, (_, index) => {
          const x = width * index / segments;
          const y = padding + amplitude * Math.sin(x * Math.PI * 2 / wavelength + phase * Math.PI / 180);
          return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(' ');
        const svg = document.createElementNS(svgNamespace, 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('focusable', 'false');
        svg.style.left = `${rect.left - origin.left - overhang}px`;
        svg.style.top = `${rect.bottom - origin.top - baselineInset - padding + verticalOffset}px`;
        const path = document.createElementNS(svgNamespace, 'path');
        path.setAttribute('d', data);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', strokeWidth);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.append(path);
        return svg;
      });
      layer.replaceChildren(...waves);
      link.classList.toggle('wave-link--ready', waves.length > 0);
    });
  }

  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(render);
  }

  const observer = new ResizeObserver(schedule);
  links.forEach(link => {
    observer.observe(link);
    // An inline anchor itself may not emit resize notifications.
    observer.observe(link.parentElement);
  });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);

  render();
})();
