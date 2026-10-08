/* A little paper playground. Click/tap twice, or use Enter + arrow keys. */
(() => {
  const board = document.querySelector(".talks-reviews__board");
  if (!board) return;

  const section = board.closest(".talks-reviews");
  const status = section.querySelector("#reviews-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const notes = [...board.querySelectorAll(".review-note")].map((element) => ({
    element,
    paper: element.querySelector(".review-note__paper"),
    button: element.querySelector(".review-note__pick"),
    x: 0, y: 0, angle: 0, animation: null,
  }));
  let held = null;
  let original = null;
  let anchor = { x: 0, y: 0 };
  let pointer = null;
  let frame = 0;
  let topLayer = notes.length;
  let measuredWidth = 0;
  let pageHeight = document.documentElement.scrollHeight;

  function paint(note) {
    note.element.style.transform = `translate3d(${note.x}px, ${note.y}px, 0)`;
    note.element.style.setProperty("--note-angle", `${note.angle}deg`);
  }

  function clampPosition(note, x, y, withinBoard = false) {
    // Include the rotated paper and the bit of tape above its top edge.
    const radians = Math.abs(note.angle) * Math.PI / 180;
    const width = note.element.offsetWidth;
    const height = note.element.offsetHeight;
    const padX = Math.max(12, (width * Math.cos(radians) + height * Math.sin(radians) - width) / 2 + 5);
    const padY = Math.max(30, (height * Math.cos(radians) + width * Math.sin(radians) - height) / 2 + 24);
    const rect = board.getBoundingClientRect();
    const left = withinBoard ? 0 : -rect.left;
    const top = withinBoard ? 0 : -rect.top - window.scrollY;
    const availableWidth = withinBoard ? board.clientWidth : document.documentElement.clientWidth;
    const availableHeight = withinBoard ? board.clientHeight : pageHeight;
    note.x = Math.max(left + padX, Math.min(x, left + availableWidth - width - padX));
    note.y = Math.max(top + padY, Math.min(y, top + availableHeight - height - padY));
    paint(note);
  }

  function announce(message) {
    status.textContent = message;
  }

  function finish({ cancel = false, keyboard = false } = {}) {
    if (!held) return;
    cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    const note = held;
    held = null;
    if (cancel) Object.assign(note, original);
    else if (!keyboard && !reducedMotion.matches) note.angle = Math.random() * 10 - 5;
    clampPosition(note, note.x, note.y);
    note.element.classList.remove("is-picked");
    note.button.setAttribute("aria-pressed", "false");
    document.body.classList.remove("is-holding-review");
    if (!cancel && !keyboard && !reducedMotion.matches) {
      const rotation = `rotate(${note.angle}deg)`;
      note.animation = note.paper.animate([
        { transform: `translateY(-9px) ${rotation} scale(1.025)` },
        { transform: `${rotation} scale(0.99)`, offset: 0.7 },
        { transform: rotation },
      ], { duration: 260, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    }
    announce(cancel ? "Note returned to its previous spot." : "Note placed.");
  }

  function pickUp(note, event) {
    note.animation?.cancel();
    held = note;
    pageHeight = document.documentElement.scrollHeight;
    original = { x: note.x, y: note.y, angle: note.angle };
    const keyboard = event.detail === 0;
    pointer = !keyboard && event.pointerType !== "touch"
      ? { x: event.clientX, y: event.clientY }
      : null;
    note.element.classList.toggle("is-keyboard", keyboard);
    note.element.classList.add("is-picked");
    note.element.style.zIndex = ++topLayer;
    note.button.setAttribute("aria-pressed", "true");
    document.body.classList.add("is-holding-review");
    const rect = board.getBoundingClientRect();
    anchor = keyboard
      ? { x: note.element.offsetWidth / 2, y: note.element.offsetHeight / 2 }
      : { x: event.clientX - rect.left - note.x, y: event.clientY - rect.top - note.y };
    announce(keyboard
      ? "Arrow keys to move. Enter to stick. Esc to put back."
      : "Click a spot to stick it. Esc to put it back.");
  }

  function moveToPointer(clientX, clientY, center = false) {
    if (!held) return;
    const rect = board.getBoundingClientRect();
    const x = center ? held.element.offsetWidth / 2 : anchor.x;
    const y = center ? held.element.offsetHeight / 2 : anchor.y;
    clampPosition(held, clientX - rect.left - x, clientY - rect.top - y);
  }

  function schedulePointerMove() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (pointer && held && !held.element.classList.contains("is-keyboard")) {
        moveToPointer(pointer.x, pointer.y);
      }
    });
  }

  document.addEventListener("pointermove", (event) => {
    if (!held || event.pointerType === "touch" || held.element.classList.contains("is-keyboard")) return;
    pointer = { x: event.clientX, y: event.clientY };
    schedulePointerMove();
  });

  window.addEventListener("scroll", () => {
    if (held && pointer && !held.element.classList.contains("is-keyboard")) schedulePointerMove();
  }, { passive: true });

  document.addEventListener("click", (event) => {
    if (held) {
      // This click places the paper, even over a link or another control.
      // Subsequent clicks work normally again.
      event.preventDefault();
      event.stopImmediatePropagation();
      const keyboard = event.detail === 0;
      if (!keyboard) moveToPointer(event.clientX, event.clientY, event.pointerType === "touch");
      finish({ keyboard });
      return;
    }
    const note = notes.find(({ element }) => element === event.target.closest(".review-note"));
    if (note) pickUp(note, event);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!held) return;
    if (event.key === "Escape") {
      event.preventDefault();
      finish({ cancel: true, keyboard: true });
      return;
    }
    if (event.key === "Tab") {
      finish({ cancel: true, keyboard: true });
      return;
    }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    held.element.classList.add("is-keyboard");
    const step = event.shiftKey ? 40 : 12;
    clampPosition(held, held.x + direction[0] * step, held.y + direction[1] * step);
  });

  window.addEventListener("blur", () => finish({ cancel: true }));
  document.addEventListener("pointercancel", () => finish({ cancel: true }));

  function layout() {
    finish({ cancel: true });
    measuredWidth = board.clientWidth;
    const compact = window.matchMedia("(max-width: 640px)").matches;
    board.classList.add("is-ready");
    notes.forEach((note, index) => {
      note.animation?.cancel();
      note.element.classList.remove("is-keyboard");
      note.element.style.zIndex = index + 1;
      note.angle = [3, -6, 3, -4][index];
    });
    const heights = notes.map((note) => note.element.offsetHeight);
    if (compact) {
      let y = 38;
      notes.forEach((note, index) => {
        note.x = measuredWidth * (index % 2 ? 0.075 : 0.035);
        note.y = y;
        y += heights[index] + 56;
      });
    } else {
      const secondRow = Math.max(heights[0], heights[1]) + 104;
      const positions = [[0.02, 48], [0.51, 54], [0.075, secondRow], [0.51, secondRow + 100]];
      notes.forEach((note, index) => {
        note.x = measuredWidth * positions[index][0];
        note.y = positions[index][1];
      });
    }
    board.style.height = `${Math.max(...notes.map((note, index) => note.y + heights[index])) + 60}px`;
    notes.forEach((note) => clampPosition(note, note.x, note.y, true));
    topLayer = notes.length;
  }

  notes.forEach(({ button }) => { button.hidden = false; });
  layout();
  document.fonts?.ready.then(layout);
  const observer = new ResizeObserver(() => {
    if (Math.abs(board.clientWidth - measuredWidth) > 1) layout();
  });
  observer.observe(board);
})();
