(() => {
  const letter = document.querySelector('.animated-letter');
  const trigger = letter?.querySelector('.animated-letter__trigger');
  if (!trigger) return;

  const presetName = letter.dataset.animationPreset || 'mixedLetterO';
  const letterName = letter.dataset.letter || 'letter';
  const preset = window.PortfolioAnimationPresets?.[presetName];
  if (!preset) {
    console.warn(`Letter animation preset "${presetName}" was not found.`);
    return;
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = window.matchMedia('(any-hover: hover)');
  const originalFrames = [...trigger.querySelectorAll(':scope > img')];
  letter.style.setProperty('--letter-scale', preset.imageScale);
  const mix = document.createElement('span');
  mix.className = 'animated-letter__mix';
  mix.hidden = true;
  mix.setAttribute('aria-hidden', 'true');

  const assetRoot = new URL('.', originalFrames[0].src);
  function addLayer(filename) {
    const image = new Image(1024, 1024);
    image.alt = '';
    image.draggable = false;
    image.src = new URL(filename, assetRoot).href;
    mix.append(image);
    return image;
  }

  const bases = preset.baseLayers.map(addLayer);
  const accents = Array.from({ length: preset.regionCount }, (_, region) =>
    Array.from({ length: preset.sourceCount }, (_, frame) => addLayer(
      preset.accentLayerPattern
        .replace('{frame}', String(frame + 1))
        .replace('{region}', String(region)),
    )));
  trigger.append(mix);

  let frames = [];
  let mixedReady = false;
  let frameIndex = 0;
  let sources = Array.from({ length: preset.regionCount }, (_, region) => region % preset.sourceCount);
  let paused = preset.interaction.respectReducedMotion && reducedMotion.matches;
  let visible = true;
  let pointerType = '';
  let timer;

  function render() {
    originalFrames.forEach(frame => {
      frame.hidden = mixedReady || frame !== frames[frameIndex];
    });
    mix.hidden = !mixedReady;

    if (mixedReady) {
      bases.forEach((image, index) => {
        image.hidden = index !== frameIndex;
      });
      accents.forEach((variants, region) => variants.forEach((image, source) => {
        image.hidden = source !== sources[region];
      }));
    }

    trigger.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} ${letterName} animation`);
    letter.dataset.composition = mixedReady ? 'mixed' : 'original';
    letter.dataset.frame = String(frameIndex + 1);
    letter.dataset.sources = sources.map(source => source + 1).join(',');
    letter.dataset.paused = String(paused);
  }

  function nextFrame() {
    if (frames.length > 1) {
      frameIndex = preset.order === 'random'
        ? (frameIndex + 1 + Math.floor(Math.random() * (frames.length - 1))) % frames.length
        : (frameIndex + 1) % frames.length;
    }

    if (preset.order === 'random') {
      const previous = sources;
      do {
        // Every area changes source while the final arrangement stays varied.
        sources = previous.map(source =>
          (source + 1 + Math.floor(Math.random() * (preset.sourceCount - 1))) % preset.sourceCount);
      } while (new Set(sources).size < preset.minimumSourcesPerComposition);
    } else {
      sources = sources.map(source => (source + 1) % preset.sourceCount);
    }
    render();
  }

  function schedule() {
    window.clearTimeout(timer);
    const hidden = preset.interaction.pauseWhenDocumentHidden && document.hidden;
    const offscreen = preset.interaction.pauseWhenOffscreen && !visible;
    if (paused || hidden || offscreen || frames.length < 2) return;
    timer = window.setTimeout(() => {
      nextFrame();
      schedule();
    }, preset.frameDurationMs);
  }

  function setPaused(value) {
    paused = value;
    render();
    schedule();
  }

  // Each desktop hover toggles playback; touch and keyboard activate by click.
  trigger.addEventListener('pointerenter', event => {
    if (preset.interaction.toggleOnDesktopHover && event.pointerType === 'mouse' && hover.matches) {
      setPaused(!paused);
    }
  });
  trigger.addEventListener('pointerdown', event => { pointerType = event.pointerType; });
  trigger.addEventListener('click', event => {
    if (preset.interaction.toggleOnTouchOrKeyboard &&
        (event.detail === 0 || (event.pointerType || pointerType) !== 'mouse' || !hover.matches)) {
      setPaused(!paused);
    }
  });
  reducedMotion.addEventListener('change', event => {
    if (preset.interaction.respectReducedMotion) setPaused(event.matches);
  });
  document.addEventListener('visibilitychange', schedule);
  if (preset.interaction.pauseWhenOffscreen && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      schedule();
    }).observe(letter);
  }

  const decode = async image => {
    try { await image.decode(); return image; } catch { return null; }
  };
  Promise.all([
    Promise.all(originalFrames.map(decode)),
    Promise.all([...bases, ...accents.flat()].map(decode)),
  ]).then(([loaded, layers]) => {
    frames = loaded.filter(Boolean);
    if (!frames.length) return;
    mixedReady = preset.composition === 'mixed' && bases.length === frames.length && layers.every(Boolean);
    trigger.disabled = frames.length < 2;
    render();
    schedule();
  });
})();
