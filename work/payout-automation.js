function initPayoutIterations() {
  document.querySelectorAll("[data-payout-iterations]").forEach((root) => {
    const tabs = Array.from(root.querySelectorAll("[data-iteration-tab]"));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    if (!tabs.length || panels.some((panel) => !root.contains(panel))) return;

    let selectedIndex = -1;

    const activate = (index, { animate = false, moveFocus = false } = {}) => {
      if (selectedIndex === index) return;

      selectedIndex = index;
      root.toggleAttribute("data-animate-iteration", animate);
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;

        const panel = panels[tabIndex];
        // Keep the layers mounted so each transition can continue from its current frame.
        panel.dataset.iterationPosition = tabIndex < index ? "before" : "after";
        panel.inert = !selected;
        panel.setAttribute("aria-hidden", String(!selected));
        panel.hidden = false;
      });
      if (moveFocus) tabs[index].focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", (event) => activate(index, { animate: event.detail > 0 }));
      tab.addEventListener("keydown", (event) => {
        let nextIndex = index;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = tabs.length - 1;
        else return;

        event.preventDefault();
        activate(nextIndex, { moveFocus: true });
      });
    });

    const initialIndex = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    activate(initialIndex < 0 ? tabs.length - 1 : initialIndex);
  });
}

initPayoutIterations();
