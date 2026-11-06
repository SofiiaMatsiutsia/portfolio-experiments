(() => {
  const hero = document.querySelector('.home .hero');
  const heading = hero?.querySelector('h1.hero__heading');
  const mark = heading?.querySelector('.hero__mark');
  if (!mark) return;

  const context = document.createElement('canvas').getContext('2d');
  let scheduled = 0;

  function layout() {
    scheduled = 0;
    const style = getComputedStyle(heading);
    const lineHeight = parseFloat(style.lineHeight);
    mark.style.setProperty('--cap-leading', `${lineHeight}px`);
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = context.measureText('H');
    const capHeight = metrics.actualBoundingBoxAscent;
    if (Number.isFinite(capHeight)) {
      mark.style.setProperty('--cap-height', `${capHeight}px`);
    }

    // Measure the real text and font in the two-line state, independently of
    // the currently displayed state. This avoids resize feedback and flicker.
    const probe = heading.cloneNode(true);
    probe.removeAttribute('id');
    probe.classList.add('hero__heading--measure');
    probe.setAttribute('aria-hidden', 'true');
    probe.inert = true;
    probe.dataset.capLines = '2';
    probe.style.width = `${heading.getBoundingClientRect().width}px`;
    const baseline = document.createElement('span');
    baseline.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    probe.querySelector('.hero__opening').prepend(baseline);
    hero.append(probe);
    const bounds = probe.getBoundingClientRect();
    const fitsTwoLines = bounds.height <= 2 * lineHeight + 0.5;
    if (Number.isFinite(capHeight)) {
      // DOM baseline measurements include the browser's actual font leading
      // and rounding, unlike the canvas font bounding-box approximation.
      mark.style.setProperty('--cap-top', `${baseline.getBoundingClientRect().top - bounds.top - capHeight}px`);
    }
    probe.remove();
    heading.dataset.capLines = fitsTwoLines ? '2' : '3';
  }

  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(layout);
  }

  // Width and font changes both matter; a viewport breakpoint alone cannot
  // decide whether this paragraph fits in two lines.
  new ResizeObserver(schedule).observe(hero);
  window.addEventListener('resize', schedule, { passive: true });
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  layout();
})();
