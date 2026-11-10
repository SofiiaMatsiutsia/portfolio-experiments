(() => {
  const grid = document.querySelector(".garden-grid");
  const random = document.querySelector(".garden-random");
  const status = document.getElementById("garden-status");
  const tiles = Array.from(grid.children);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
  let layoutWidth = 0;

  function arrange(keepScroll = false) {
    const style = getComputedStyle(grid);
    const columns = Number(style.getPropertyValue("--columns"));
    const gap = parseFloat(style.columnGap);
    const bounds = grid.getBoundingClientRect();
    layoutWidth = bounds.width;
    const width = (layoutWidth - (columns - 1) * gap) / columns;
    const heights = Array(columns).fill(0);
    for (const tile of tiles) {
      const image = tile.firstElementChild;
      const col = heights.indexOf(Math.min(...heights));
      const height = width * Number(image.getAttribute("height")) / Number(image.getAttribute("width"));
      tile.style.width = width + "px";
      tile.style.left = col * (width + gap) + "px";
      tile.style.top = heights[col] + "px";
      heights[col] += height + gap;
    }
    // A shorter last column must not pull the document upward during a shuffle at the bottom.
    const bottomPadding = parseFloat(getComputedStyle(grid.parentElement).paddingBottom);
    const minimum = keepScroll ? innerHeight - bounds.top - bottomPadding : 0;
    grid.style.height = Math.max(Math.max(...heights) - gap, minimum) + "px";
  }

  // Clip long off-screen journeys at the viewport edge. Visible endpoints stay exact.
  function travelFraction(from, to) {
    const dy = to.top - from.top;
    if (to.top > innerHeight && dy > 0) return Math.max(0, (innerHeight - from.top) / dy);
    if (to.bottom < 0 && dy < 0) return Math.max(0, -from.bottom / dy);
    return 1;
  }

  function animateShuffle(before) {
    const after = tiles.map(tile => tile.getBoundingClientRect());
    tiles.forEach((tile, i) => {
      const start = before.get(tile);
      const end = after[i];
      const visible = rect => rect.bottom > 0 && rect.top < innerHeight;
      if (!visible(start) && !visible(end)) return;
      if (reducedMotion.matches) {
        tile.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 140 });
        return;
      }
      const dx = start.left - end.left;
      const dy = start.top - end.top;
      const offset = fraction => 'translate(' + dx * fraction + 'px, ' + dy * fraction + 'px)';
      tile.animate([
        { transform: offset(travelFraction(end, start)) },
        { transform: offset(1 - travelFraction(start, end)) },
      ], { duration: 450, easing });
    });
  }

  function shuffle(animate) {
    const before = animate && new Map(tiles.map(tile => [tile, tile.getBoundingClientRect()]));
    const original = tiles.slice();
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    if (tiles.every((tile, i) => tile === original[i])) tiles.push(tiles.shift());
    tiles.forEach(tile => tile.getAnimations().forEach(animation => animation.cancel()));
    grid.replaceChildren(...tiles);
    arrange(animate);
    if (animate) {
      animateShuffle(before);
      status.textContent = "Images shuffled. First image: " + tiles[0].firstElementChild.alt;
    }
  }

  grid.classList.add("is-positioned");
  shuffle(false);
  // The first screen changes on every visit. Give those specific thumbnails priority.
  for (const tile of tiles) {
    if (tile.getBoundingClientRect().top >= innerHeight) break;
    const image = tile.firstElementChild;
    image.fetchPriority = "high";
    image.loading = "eager";
  }
  random.hidden = false;
  random.addEventListener("click", () => shuffle(true));
  new ResizeObserver(() => {
    if (grid.getBoundingClientRect().width !== layoutWidth) arrange();
  }).observe(grid);

  const viewer = document.querySelector(".garden-viewer");
  if (typeof viewer.showModal !== "function") return; // The tiles also link to their images.
  const track = viewer.querySelector(".garden-viewer__track");
  const shade = viewer.querySelector(".garden-viewer__shade");
  const close = viewer.querySelector(".garden-viewer__close");
  const previous = viewer.querySelector(".garden-viewer__prev");
  const next = viewer.querySelector(".garden-viewer__next");
  const viewerStatus = document.getElementById("viewer-status");
  let selected = -1;
  let closing = false;

  function preview(index) {
    const slide = track.children[index];
    if (slide.firstElementChild) return slide.firstElementChild;
    const thumb = tiles[index].firstElementChild;
    const image = new Image();
    image.alt = thumb.alt;
    image.draggable = false;
    image.width = Number(thumb.getAttribute("width"));
    image.height = Number(thumb.getAttribute("height"));
    image.style.setProperty("--ratio", image.width / image.height);
    image.src = thumb.currentSrc || thumb.src;
    slide.append(image);
    return image;
  }

  function select(index) {
    if (selected === index) return;
    if (selected !== -1) {
      tiles[selected].classList.remove("is-viewed");
      track.children[selected].setAttribute("aria-hidden", "true");
    }
    selected = index;
    const tile = tiles[index];
    const image = preview(index);
    track.children[index].removeAttribute("aria-hidden");
    tile.classList.add("is-viewed");
    previous.disabled = index === 0;
    next.disabled = index === tiles.length - 1;
    viewerStatus.textContent = 'Image ' + (index + 1) + ' of ' + tiles.length + '. ' + image.alt;
    if (index > 0) preview(index - 1);
    if (index < tiles.length - 1) preview(index + 1);
    if (image.src !== tile.href) {
      const large = new Image();
      large.src = tile.href;
      large.decode().then(() => {
        if (image.isConnected) image.src = large.src;
      }).catch(() => {}); // Keep the visible thumbnail if the larger file cannot load.
    }
  }

  function indexInView() {
    return Math.min(tiles.length - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)));
  }

  function frameTransform(frame, destination) {
    return 'translate(' + (frame.left - destination.left) + 'px, ' + (frame.top - destination.top) +
      'px) scale(' + frame.width / destination.width + ', ' + frame.height / destination.height + ')';
  }

  function openViewer(tile) {
    const start = tile.getBoundingClientRect();
    const index = tiles.indexOf(tile);
    const slides = tiles.map(() => {
      const slide = document.createElement("div");
      slide.className = "garden-viewer__slide";
      slide.setAttribute("aria-hidden", "true");
      return slide;
    });
    track.replaceChildren(...slides);
    siteLenis?.stop();
    lockPageScroll(true);
    viewer.showModal();
    track.scrollTo({ left: track.clientWidth * index, behavior: "instant" });
    select(index);
    const image = preview(index);
    const end = image.getBoundingClientRect();
    const duration = reducedMotion.matches ? 140 : 360;
    shade.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing });
    image.animate(reducedMotion.matches ? [{ opacity: 0.5 }, { opacity: 1 }] : [
      { transform: frameTransform(start, end) }, { transform: "none" },
    ], { duration, easing });
  }

  grid.addEventListener("click", event => {
    const tile = event.target.closest(".garden-tile");
    if (!tile || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    openViewer(tile);
  });

  function step(direction) {
    if (closing) return;
    const index = Math.max(0, Math.min(tiles.length - 1, selected + direction));
    track.scrollTo({ left: index * track.clientWidth, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  track.addEventListener("scroll", () => {
    if (viewer.open && !closing) select(indexInView());
  }, { passive: true });
  previous.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  viewer.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    step(event.key === "ArrowLeft" ? -1 : 1);
  });

  async function closeViewer() {
    if (closing || !viewer.open) return;
    closing = true;
    select(indexInView());
    const tile = tiles[selected];
    const image = preview(selected);
    const start = image.getBoundingClientRect();
    const shadeOpacity = getComputedStyle(shade).opacity;
    image.getAnimations().forEach(animation => animation.cancel());
    shade.getAnimations().forEach(animation => animation.cancel());
    track.scrollTo({ left: selected * track.clientWidth, behavior: "instant" });
    track.style.overflowX = "hidden";
    let end = tile.getBoundingClientRect();
    // A swipe can take us to an artwork several screens away from the opening tile.
    const topInset = parseFloat(getComputedStyle(random).top) + random.offsetHeight;
    if (end.bottom <= topInset || end.top >= innerHeight) {
      const targetY = scrollY + end.top - Math.max(topInset, (innerHeight - end.height) / 2);
      if (siteLenis) siteLenis.scrollTo(targetY, { immediate: true, force: true });
      else window.scrollTo({ top: targetY, behavior: "instant" });
      end = tile.getBoundingClientRect();
    }
    const frame = image.getBoundingClientRect();
    const duration = reducedMotion.matches ? 120 : 280;
    const options = { duration, easing: "cubic-bezier(0.32, 0.72, 0, 1)", fill: "forwards" };
    const fade = shade.animate([{ opacity: shadeOpacity }, { opacity: 0 }], options);
    const zoom = image.animate(reducedMotion.matches ? [{ opacity: 1 }, { opacity: 0.4 }] : [
      { transform: frameTransform(start, frame) }, { transform: frameTransform(end, frame) },
    ], options);
    await Promise.allSettled([zoom.finished, fade.finished]);
    tile.classList.remove("is-viewed");
    viewer.close();
    lockPageScroll(false);
    siteLenis?.start();
    tile.focus({ preventScroll: true });
    fade.cancel();
    zoom.cancel();
    track.replaceChildren();
    track.style.overflowX = "";
    selected = -1;
    closing = false;
  }

  close.addEventListener("click", closeViewer);
  viewer.addEventListener("cancel", event => {
    event.preventDefault();
    closeViewer();
  });
  track.addEventListener("click", event => {
    if (event.target.classList.contains("garden-viewer__slide")) closeViewer();
  });

  let trackWidth = 0;
  new ResizeObserver(() => {
    if (!viewer.open || closing || trackWidth === track.clientWidth) return;
    trackWidth = track.clientWidth;
    track.scrollTo({ left: selected * trackWidth, behavior: "instant" });
  }).observe(track);
})();
