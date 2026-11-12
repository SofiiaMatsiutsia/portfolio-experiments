/* Reveal fixed, aligned screenshots without adding momentum to the divider. */
(() => {
  const comparison = document.querySelector("[data-verification-compare]");
  const stage = comparison?.querySelector(".verification-compare__stage");
  const before = comparison?.querySelector(".verification-compare__before img");
  const control = comparison?.querySelector(".verification-compare__control");
  const divider = comparison?.querySelector(".verification-compare__divider");
  const handle = comparison?.querySelector(".verification-compare__handle");
  const instructions = comparison?.querySelector("#verification-compare-instructions");
  if (!stage || !before || !control || !divider || !handle || !instructions ||
      !("PointerEvent" in window)) return;

  let position = 50;
  let activePointer = null;

  function setPosition(value) {
    position = Math.max(0, Math.min(100, value));
    before.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
    divider.style.left = `${position}%`;
    // Keep the handle reachable even when an entire screenshot is revealed.
    handle.style.left = `clamp(22px, ${position}%, calc(100% - 22px))`;
    const rounded = Math.round(position);
    control.setAttribute("aria-valuenow", String(rounded));
    control.setAttribute("aria-valuetext", `${rounded}% before, ${100 - rounded}% after`);
  }

  function setFromPointer(event) {
    const bounds = stage.getBoundingClientRect();
    if (bounds.width) setPosition((event.clientX - bounds.left) / bounds.width * 100);
  }

  control.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || activePointer !== null) return;
    activePointer = event.pointerId;
    control.setPointerCapture(activePointer);
    control.focus({ preventScroll: true });
    setFromPointer(event);
  });
  control.addEventListener("pointermove", (event) => {
    if (event.pointerId === activePointer) setFromPointer(event);
  });
  control.addEventListener("pointerup", (event) => {
    if (event.pointerId !== activePointer) return;
    setFromPointer(event);
    activePointer = null;
    if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId);
  });
  function cancelPointer(event) {
    if (event.pointerId === activePointer) activePointer = null;
  }
  control.addEventListener("pointercancel", cancelPointer);
  control.addEventListener("lostpointercapture", cancelPointer);
  control.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 10 : 1;
    let next;
    switch (event.key) {
      case "ArrowLeft": case "ArrowDown": next = position - step; break;
      case "ArrowRight": case "ArrowUp": next = position + step; break;
      case "Home": next = 0; break;
      case "End": next = 100; break;
      default: return;
    }
    event.preventDefault();
    setPosition(next);
  });

  setPosition(50);
  comparison.classList.add("is-ready");
  control.hidden = false;
  instructions.hidden = false;
})();
