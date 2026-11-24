(() => {
  const samples = window.voyageSamples;
  const kpiButtons = [...document.querySelectorAll("button[data-kpi]")];
  const kpiRow = document.querySelector(".kpi-row");
  const kpiScrollbar = document.querySelector(".kpi-scrollbar");
  const chartPanel = document.getElementById("voyage-charts");
  const workbench = document.querySelector(".workbench");
  const resizer = document.querySelector(".chart-resizer");
  const compass = document.getElementById("voyage-compass");
  const status = document.getElementById("voyage-status");
  const last = samples.length - 1;
  let view = { kpi: "performance", start: 0, end: last };

  function updateKpiScrollbar() {
    kpiScrollbar.firstElementChild.style.width = `${kpiRow.scrollWidth}px`;
    kpiScrollbar.hidden = kpiRow.scrollWidth <= kpiRow.clientWidth;
    kpiScrollbar.scrollLeft = kpiRow.scrollLeft;
  }
  kpiRow.addEventListener("scroll", () => { kpiScrollbar.scrollLeft = kpiRow.scrollLeft; }, { passive: true });
  kpiScrollbar.addEventListener("scroll", () => { kpiRow.scrollLeft = kpiScrollbar.scrollLeft; }, { passive: true });
  new ResizeObserver(updateKpiScrollbar).observe(kpiRow);

  const panels = window.VoyagePanels.mount({
    map: document.getElementById("voyage-map"),
    compass: document.getElementById("voyage-compass"),
    samples,
  });

  const charts = window.VoyageCharts.mount({
    container: chartPanel,
    samples,
    onInspect: showSample,
    onRangeChange(start, end, inspection) {
      render({ ...view, start, end }, inspection);
      status.textContent = start === 0 && end === last
        ? "Showing the full voyage."
        : `Showing ${formatTime(samples[start])} to ${formatTime(samples[end])} UTC.`;
    },
  });

  function formatTime(sample) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    }).format(sample.time);
  }

  function showSample(index) {
    panels.render(samples[index ?? last]);
  }

  function resizeLimits() {
    const gap = parseFloat(getComputedStyle(workbench).columnGap) || 0;
    const max = Math.max(260, workbench.clientWidth - compass.getBoundingClientRect().width - gap * 2 - 200);
    return { min: 260, max: Math.floor(max) };
  }

  function setChartWidth(width) {
    const { min, max } = resizeLimits();
    const next = Math.round(Math.min(max, Math.max(min, width)));
    workbench.style.setProperty("--chart-width", `${next}px`);
    updateResizeValue();
  }

  function updateResizeValue() {
    const { min, max } = resizeLimits();
    resizer.setAttribute("aria-valuemin", min);
    resizer.setAttribute("aria-valuemax", max);
    resizer.setAttribute("aria-valuenow", Math.round(chartPanel.getBoundingClientRect().width));
  }

  resizer.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    resizer.focus({ preventScroll: true });
    resizer.dataset.dragging = "";
    resizer.setPointerCapture(event.pointerId);
    setChartWidth(event.clientX - workbench.getBoundingClientRect().left);
  });
  resizer.addEventListener("pointermove", (event) => {
    if (resizer.hasPointerCapture(event.pointerId)) {
      setChartWidth(event.clientX - workbench.getBoundingClientRect().left);
    }
  });
  const endResize = () => { delete resizer.dataset.dragging; };
  resizer.addEventListener("pointerup", endResize);
  resizer.addEventListener("pointercancel", endResize);
  resizer.addEventListener("lostpointercapture", endResize);
  resizer.addEventListener("keydown", (event) => {
    const { min, max } = resizeLimits();
    const current = chartPanel.getBoundingClientRect().width;
    const step = event.shiftKey ? 50 : 10;
    const next = event.key === "ArrowLeft" ? current - step
      : event.key === "ArrowRight" ? current + step
      : event.key === "Home" ? min : event.key === "End" ? max : null;
    if (next === null) return;
    event.preventDefault();
    setChartWidth(next);
  });
  new ResizeObserver(() => {
    if (window.matchMedia("(max-width: 810px)").matches) return;
    const { max } = resizeLimits();
    if (workbench.style.getPropertyValue("--chart-width") && chartPanel.getBoundingClientRect().width > max) {
      setChartWidth(max);
    } else {
      updateResizeValue();
    }
  }).observe(workbench);

  function render(nextView, inspection) {
    view = nextView;
    for (const button of kpiButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.kpi === view.kpi));
    }
    charts.render(view, inspection);
  }

  for (const button of kpiButtons) {
    button.addEventListener("click", () => {
      const kpi = button.dataset.kpi;
      if (kpi === view.kpi) return;
      render({ ...view, kpi });
      status.textContent = `${button.querySelector(".kpi-title").textContent} charts.`;
    });
  }

  render(view);
})();
