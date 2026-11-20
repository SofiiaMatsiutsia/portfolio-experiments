(() => {
  "use strict";

  const accent = "#00a8e1";
  const navy = "#32435c";
  const svgNamespace = "http://www.w3.org/2000/svg";
  const plotHeight = 109;
  const minimumRange = 3;
  const dragThreshold = 5;
  const markerSpacing = 8;
  const tooltipOffset = 12;
  const viewportInset = 8;
  const dayMs = 24 * 60 * 60 * 1000;
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", day: "numeric", month: "long",
  });
  const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const difference = (actual, baseline) => actual - baseline;
  const percent = (actual, baseline) => difference(actual, baseline) / baseline * 100;
  const signed = (value, digits) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
  const measure = (value, unit, digits = 1) => `${value.toFixed(digits)} ${unit}`;
  const series = (value, label, options = {}) => ({
    get: typeof value === "function" ? value : (sample) => sample[value],
    label,
    color: accent,
    ...options,
  });
  const reading = (label, value) => [label, value];

  function fuelRows(actual, baseline, actualLabel, baselineLabel) {
    const deviation = percent(actual, baseline);
    return [
      reading("Deviation", `${signed(deviation, 1)}%, ${signed(difference(actual, baseline), 2)} mt`),
      reading(actualLabel, measure(actual, "mt", 2)),
      reading(baselineLabel, measure(baseline, "mt", 2)),
    ];
  }

  const performanceRows = (sample) =>
    fuelRows(sample.actualFoc, sample.simulatedFoc, "Actual FOC", "Simulated FOC");
  const weatherRows = (sample) =>
    fuelRows(sample.simulatedFoc, sample.goodWeatherFoc, "In actual weather", "In good weather");
  const deviationTicks = [-10, -5, 0, 5, 10];
  const fuelTicks = [0, 5, 10, 15, 20];
  const seaState = {
    key: "sea-state", title: "BF & DSS", ticks: [0, 3, 6, 9, 12],
    series: [series("bf", "BF", { kind: "step", area: true }), series("dss", "DSS", { color: navy, kind: "step" })],
    readings: (sample) => [reading("BF", sample.bf), reading("DSS", sample.dss)],
  };
  const speed = {
    key: "ship-speed", title: "SOG & STW", ticks: [0, 5, 10, 15, 20], unit: "kn",
    series: [series("sog", "SOG", { detailDots: true }), series("stw", "STW", { color: navy, detailDots: true })],
    readings: (sample) => [reading("SOG", measure(sample.sog, "kn", 2)), reading("STW", measure(sample.stw, "kn", 2))],
  };
  const overallPerformance = {
    key: "overall-performance", title: "Overall Performance", ticks: deviationTicks, unit: "%",
    series: [series((sample) => percent(sample.actualFoc, sample.simulatedFoc), "Deviation")],
    readings: performanceRows,
  };
  const totalFuel = {
    key: "total-foc", title: "Total FOC", detailTitle: "Total FOC & Digital twins simulated",
    ticks: fuelTicks, unit: "mt", detailUnit: "t",
    series: [series("actualFoc", "Actual FOC", { detailDots: true }), series("simulatedFoc", "Simulated by OOS Digital Twin", { color: navy, detailDots: true })],
    readings: performanceRows,
  };
  const engineLoad = {
    key: "engine-load", title: "Engine Load", ticks: [0, 20, 40, 60, 80, 100], unit: "% MCR",
    series: [series("engineLoad", "Engine Load", { area: true })],
    readings: (sample) => [reading("Engine Load", `${sample.engineLoad.toFixed(0)}% MCR, ${measure(sample.enginePower, "kW", 0)}`)],
  };
  const performance = [overallPerformance, totalFuel, engineLoad, speed, seaState];
  const prioritize = (...leading) => [...leading, ...performance.filter((spec) => !leading.includes(spec))];
  const stacks = {
    performance,
    "cp-risk": window.VoyageCompliance.specs,
    emissions: prioritize(totalFuel),
    instructions: prioritize(speed, engineLoad),
    engine: prioritize(engineLoad),
    "hull-propeller": prioritize(speed, totalFuel),
    weather: [
      {
        key: "weather-impact", title: "Weather & Sea Impact", ticks: deviationTicks, unit: "%",
        series: [series((sample) => percent(sample.simulatedFoc, sample.goodWeatherFoc), "Deviation")],
        readings: weatherRows,
      },
      {
        key: "weather-foc", title: "FOC simulated by Digital Twins", ticks: fuelTicks, unit: "mt",
        series: [series("simulatedFoc", "In actual weather", { detailDots: true }), series("goodWeatherFoc", "In good weather", { color: navy, detailDots: true })],
        readings: weatherRows,
      },
      seaState,
      {
        key: "wind-speed", title: "Wind Speed", ticks: [0, 8, 16, 22, 30], unit: "kn",
        series: [series("windSpeed", "Wind Speed")],
        readings: (sample) => [reading("Wind Speed", measure(sample.windSpeed, "kn")), reading("Direction", `${Math.round(sample.windDirection)}°`)],
      },
      {
        key: "swell-height", title: "Swell Height", ticks: [0, 2, 4, 6, 8, 10], unit: "m",
        series: [series("swellHeight", "Swell Height")],
        readings: (sample) => [reading("Swell Height", measure(sample.swellHeight, "m")), reading("Direction", `${Math.round(sample.swellDirection)}°`)],
      },
      {
        key: "current-speed", title: "Current Speed", ticks: [0, 2, 4, 6, 8], unit: "kn",
        series: [series("currentSpeed", "Current Speed")],
        readings: (sample) => [reading("Current Speed", measure(sample.currentSpeed, "kn")), reading("Direction", `${Math.round(sample.currentDirection)}°`)],
      },
      speed,
    ],
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgElement(tag, attrs = {}, text) {
    const node = document.createElementNS(svgNamespace, tag);
    setAttrs(node, attrs);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setAttrs(node, attrs) {
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  }

  function rangeLabel(time, duration) {
    if (duration <= dayMs) return timeFormatter.format(time);
    if (duration < 3 * dayMs) {
      return `${dateFormatter.format(time)} ${timeFormatter.format(time)}`;
    }
    return dateFormatter.format(time);
  }

  function pathFor(points, step) {
    return points.reduce((path, point, index) => {
      const [x, y] = point;
      if (index === 0) return `M${x} ${y}`;
      return path + (step ? `H${x}V${y}` : `L${x} ${y}`);
    }, "");
  }

  function mount({ container, samples, onInspect, onRangeChange }) {
    const last = samples.length - 1;
    const help = element("p", "voyage-chart-sr-only",
      "Scroll horizontally to see more of the timeline. Drag across the plot to zoom, or double-click to show the full voyage. Use the arrow keys to inspect a point, Space to lock it, Shift and an arrow key to select a range, Enter to zoom, R to reset zoom, or Escape to clear the selection.");
    help.id = "voyage-chart-keyboard-help";
    const scroll = element("div", "voyage-chart-list");
    const timelineScroll = element("div", "voyage-chart-timeline-scroll");
    const timelineSpacer = element("div", "voyage-chart-timeline-spacer");
    timelineScroll.setAttribute("aria-label", "Scroll chart timeline");
    timelineScroll.tabIndex = 0;
    timelineScroll.append(timelineSpacer);
    const tooltip = element("div", "voyage-chart-tooltip");
    const tooltipDate = element("time");
    const tooltipReadings = element("div");
    tooltip.hidden = true;
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.append(tooltipDate, tooltipReadings);
    const breachTooltip = element("div", "voyage-chart-tooltip voyage-breach-tooltip");
    breachTooltip.hidden = true;
    breachTooltip.setAttribute("aria-hidden", "true");
    container.replaceChildren(help, scroll, timelineScroll, tooltip, breachTooltip);
    let view;
    let figures = [];
    let plotWidth;
    let active = null;
    // Keep the selection independent of transient pointer inspection and rebuilt SVG nodes.
    let locked = null;
    let brush = null;
    let shownBrush = null;
    let keyboardAnchor = null;
    let pendingPointer = null;
    let pointerFrame = null;
    let tooltipSize = null;
    let hoveredBreach = null;
    let timelineOffset = 0;
    let synchronizingScroll = false;

    function updateScrollEdges() {
      for (const { plot, plotFrame } of figures) {
        const max = plot.scrollWidth - plot.clientWidth;
        plotFrame.classList.toggle("has-more-left", plot.scrollLeft > 1);
        plotFrame.classList.toggle("has-more-right", max - plot.scrollLeft > 1);
      }
    }

    function syncTimeline(source) {
      if (synchronizingScroll) return;
      synchronizingScroll = true;
      timelineOffset = source.scrollLeft;
      for (const figure of figures) {
        if (figure.plot !== source) figure.plot.scrollLeft = timelineOffset;
      }
      if (source !== timelineScroll) timelineScroll.scrollLeft = timelineOffset;
      synchronizingScroll = false;
      updateScrollEdges();
      clearBreach();
      if (active?.source === "locked") positionTooltip();
    }
    timelineScroll.addEventListener("scroll", () => syncTimeline(timelineScroll), { passive: true });

    function clearBreach() {
      if (!hoveredBreach) return;
      hoveredBreach.bar.classList.remove("voyage-breach-highlight");
      hoveredBreach = null;
      breachTooltip.hidden = true;
      positionTooltip();
    }

    function showBreach(figure, event) {
      if (!figure.spec.breachAt || brush) {
        clearBreach();
        return;
      }
      const bars = figure.plot.querySelectorAll("[data-breach-first]");
      const bar = [...bars].find((candidate) => {
        const bounds = candidate.getBoundingClientRect();
        return event.clientX >= bounds.left && event.clientX <= bounds.right
          && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      });
      if (!bar) {
        clearBreach();
        return;
      }
      const first = Number(bar.dataset.breachFirst);
      const lastIndex = Number(bar.dataset.breachLast);
      const index = clamp(pointerSample(figure.hit, event.clientX), first, lastIndex);
      const period = figure.spec.breachAt(samples, index);
      if (!period) { clearBreach(); return; }
      if (hoveredBreach?.bar !== bar || hoveredBreach?.first !== period.first) {
        clearBreach();
        bar.classList.add("voyage-breach-highlight");
        hoveredBreach = { bar, first: period.first };
        const dates = element("div", null,
          `${timestampFormatter.format(period.startTime).replace(",", "")} – ${timestampFormatter.format(period.endTime).replace(",", "")} UTC`);
        const instructions = period.instructions.map((instruction) => {
          const row = element("div");
          row.append("Instruction: ", element("strong", null, instruction));
          return row;
        });
        breachTooltip.replaceChildren(dates, ...instructions, element("div", "voyage-breach-status", "Non-compliance period"));
      }
      tooltip.hidden = true;
      breachTooltip.hidden = false;
      const bounds = bar.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const right = left + (viewport?.width ?? document.documentElement.clientWidth);
      const bottom = top + (viewport?.height ?? document.documentElement.clientHeight);
      const width = breachTooltip.offsetWidth;
      const height = breachTooltip.offsetHeight;
      const x = clamp((bounds.left + bounds.right - width) / 2, left + viewportInset, Math.max(left + viewportInset, right - width - viewportInset));
      const above = bounds.bottom + tooltipOffset + height > bottom - viewportInset;
      const y = above ? Math.max(top + viewportInset, bounds.top - tooltipOffset - height) : bounds.bottom + tooltipOffset;
      breachTooltip.classList.toggle("is-above", above);
      breachTooltip.style.setProperty("--breach-pointer-x", `${clamp((bounds.left + bounds.right) / 2 - x, 8, width - 8)}px`);
      breachTooltip.style.transform = `translate(${x}px, ${y}px)`;
    }

    function showBrush(first, second) {
      const start = Math.min(first, second);
      const end = Math.max(first, second);
      if (shownBrush?.start === start && shownBrush.end === end) return;
      shownBrush = { start, end };
      for (const figure of figures) {
        const left = figure.x(start);
        const right = figure.x(end);
        setAttrs(figure.brush, { x: left, width: Math.max(1, right - left), visibility: "visible" });
      }
    }

    function clearBrush() {
      if (!shownBrush) return;
      shownBrush = null;
      for (const figure of figures) figure.brush.setAttribute("visibility", "hidden");
    }

    function updateSlider(figure, index, time, readings) {
      setAttrs(figure.plot, {
        "aria-valuenow": index,
        "aria-valuetext": `${time}. ${readings.map(([label, value]) => label ? `${label} ${value}` : value).join(". ")}`,
      });
    }

    function positionTooltip() {
      if (hoveredBreach) { tooltip.hidden = true; return; }
      if (!active) return;
      const { figure, index, point } = active;
      const anchor = point ?? figure.point(index, samples[index]);
      const plotBounds = figure.hit.getBoundingClientRect();
      const plotViewport = figure.plot.getBoundingClientRect();
      const scrollBounds = scroll.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const right = left + (viewport?.width ?? document.documentElement.clientWidth);
      const bottom = top + (viewport?.height ?? document.documentElement.clientHeight);
      const x = anchor.x;
      const y = anchor.y;
      const inView = x >= Math.max(scrollBounds.left, plotViewport.left, left)
        && x <= Math.min(scrollBounds.right, plotViewport.right, right)
        && y >= Math.max(scrollBounds.top, top) && y <= Math.min(scrollBounds.bottom, bottom);
      const inPlot = x >= plotBounds.left - 0.5 && x <= plotBounds.right + 0.5
        && y >= plotBounds.top - 0.5 && y <= plotBounds.bottom + 0.5;
      tooltip.hidden = !inView || (!inPlot && !brush);
      if (tooltip.hidden) return;
      tooltipSize ??= { width: tooltip.offsetWidth, height: tooltip.offsetHeight };
      const { width, height } = tooltipSize;
      const place = (value, size, start, end) => clamp(
        value + tooltipOffset + size <= end - viewportInset ? value + tooltipOffset : value - tooltipOffset - size,
        start + viewportInset,
        Math.max(start + viewportInset, end - viewportInset - size),
      );
      tooltip.style.transform = `translate(${place(x, width, left, right)}px, ${place(y, height, top, bottom)}px)`;
    }

    function inspect(figure, index, source, point) {
      if (active?.figure === figure && active.index === index && active.source === source) {
        active.point = point;
        positionTooltip();
        return;
      }
      const sample = samples[index];
      const time = timestampFormatter.format(sample.time);
      const readings = figure.spec.readings(sample);
      const moved = active?.index !== index;
      active = { figure, index, source, point };

      if (moved) {
        for (const row of figures) {
          const x = row.x(index);
          setAttrs(row.rule, { x1: x, x2: x, visibility: "visible" });
          for (const { marker, line } of row.markers) {
            const value = line.get(sample);
            if (Number.isFinite(value)) {
              setAttrs(marker, {
                transform: `translate(${x} ${row.y(value)})`,
                color: line.colorFor?.(sample) ?? line.color,
                visibility: "visible",
              });
            } else {
              marker.setAttribute("visibility", "hidden");
            }
          }
        }
        onInspect(index);
      }

      updateSlider(figure, index, time, readings);
      const focused = figures.find(({ plot }) => plot === document.activeElement);
      if (focused && focused !== figure) {
        updateSlider(focused, index, time, focused.spec.readings(sample));
      }
      tooltipDate.dateTime = new Date(sample.time).toISOString();
      tooltipDate.textContent = time.replace(",", "");
      tooltipReadings.replaceChildren(...readings.map(([label, value]) => {
        const row = element("div");
        if (label) row.append(`${label}: `, element("strong", null, value));
        else row.textContent = value;
        return row;
      }));
      tooltipSize = null;
      positionTooltip();
    }

    function cancelPointerUpdate() {
      if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
      pointerFrame = null;
      pendingPointer = null;
    }

    function clearInspection() {
      locked = null;
      cancelPointerUpdate();
      keyboardAnchor = null;
      clearBrush();
      if (!active) return;
      active = null;
      tooltip.hidden = true;
      const latest = timestampFormatter.format(samples[view.end].time);
      for (const figure of figures) {
        figure.rule.setAttribute("visibility", "hidden");
        for (const { marker } of figure.markers) marker.setAttribute("visibility", "hidden");
        setAttrs(figure.plot, { "aria-valuenow": view.end, "aria-valuetext": latest });
      }
      onInspect(null);
    }

    function selectRange(first, second, figure, source, point) {
      const span = Math.min(view.end - view.start, Math.max(minimumRange, Math.abs(second - first)));
      const firstIndex = clamp(Math.round((first + second - span) / 2), view.start, view.end - span);
      const lastIndex = firstIndex + span;
      if (firstIndex === view.start && lastIndex === view.end) return false;
      locked = null;
      onRangeChange(firstIndex, lastIndex, {
        chart: figure.spec.key,
        index: clamp(second, firstIndex, lastIndex),
        source,
        point,
      });
      return true;
    }

    function pointerSample(hit, clientX) {
      const area = hit.getBoundingClientRect();
      const percentAcross = clamp((clientX - area.left) / area.width, 0, 1);
      return Math.round(view.start + percentAcross * (view.end - view.start));
    }

    function classifyTouch(gesture, event) {
      if (!gesture.touch || gesture.intent) return;
      const dx = Math.abs(event.clientX - gesture.x);
      const dy = Math.abs(event.clientY - gesture.y);
      if (Math.max(dx, dy) >= dragThreshold) {
        gesture.intent = dx > dy ? "horizontal" : "vertical";
      }
    }

    function updatePointer() {
      const { figure, point, source } = pendingPointer;
      pointerFrame = null;
      pendingPointer = null;
      if (locked && !brush) return;
      const index = pointerSample(figure.hit, point.x);
      keyboardAnchor = null;
      if (brush && Math.abs(point.x - brush.x) >= dragThreshold) showBrush(brush.index, index);
      else clearBrush();
      inspect(figure, index, source, point);
    }

    function bindEvents(figure) {
      const { hit, plot } = figure;
      hit.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.button !== 0 || brush) return;
        clearBreach();
        cancelPointerUpdate();
        const index = pointerSample(hit, event.clientX);
        const touch = event.pointerType === "touch";
        brush = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, index, touch, intent: null };
        hit.setPointerCapture(event.pointerId);
        if (!touch && !locked) {
          keyboardAnchor = null;
          clearBrush();
          inspect(figure, index, "pointer", { x: event.clientX, y: event.clientY });
        }
      });
      hit.addEventListener("pointermove", (event) => {
        if (!event.isPrimary || (brush && brush.pointerId !== event.pointerId)) return;
        if (event.pointerType !== "touch") showBreach(figure, event);
        if (event.pointerType === "touch") {
          if (!brush) return;
          classifyTouch(brush, event);
          if (brush.intent !== "horizontal") return;
        }
        pendingPointer = {
          figure,
          point: { x: event.clientX, y: event.clientY },
          source: event.pointerType === "touch" ? "touch" : "pointer",
        };
        if (pointerFrame === null) pointerFrame = requestAnimationFrame(updatePointer);
      });
      hit.addEventListener("pointerleave", (event) => {
        clearBreach();
        if (brush || event.pointerType === "touch") return;
        if (pendingPointer?.figure === figure) cancelPointerUpdate();
        if (!locked && active?.figure === figure && active.source === "pointer") clearInspection();
      });
      hit.addEventListener("pointerup", (event) => {
        if (brush?.pointerId !== event.pointerId) return;
        const gesture = brush;
        brush = null;
        cancelPointerUpdate();
        classifyTouch(gesture, event);
        if (gesture.intent === "vertical") return;
        keyboardAnchor = null;
        clearBrush();
        const endIndex = pointerSample(hit, event.clientX);
        const isDrag = Math.abs(event.clientX - gesture.x) >= dragThreshold && endIndex !== gesture.index;
        const source = gesture.touch ? "touch" : "pointer";
        const point = { x: event.clientX, y: event.clientY };
        if (isDrag) {
          if (selectRange(gesture.index, endIndex, figure, source, point)) return;
          if (locked) inspect(figure, locked.index, "locked");
          return;
        }
        locked = { chart: figure.spec.key, index: endIndex };
        inspect(figure, endIndex, "locked");
      });
      function cancelGesture(event) {
        if (brush?.pointerId !== event.pointerId) return;
        const { touch, intent } = brush;
        brush = null;
        cancelPointerUpdate();
        if (!touch || intent === "horizontal") {
          if (locked) inspect(figure, locked.index, "locked");
          else clearInspection();
        }
      }
      hit.addEventListener("pointercancel", cancelGesture);
      hit.addEventListener("lostpointercapture", cancelGesture);
      hit.addEventListener("dblclick", (event) => {
        event.preventDefault();
        clearInspection();
        if (view.start !== 0 || view.end !== last) onRangeChange(0, last);
      });
      plot.addEventListener("focus", () => {
        if (!active) return;
        const { index, source } = active;
        if (source === "keyboard") {
          inspect(figure, index, source);
        } else {
          const sample = samples[index];
          updateSlider(figure, index, timestampFormatter.format(sample.time), figure.spec.readings(sample));
        }
      });
      plot.addEventListener("keydown", (event) => {
        const index = active?.index ?? view.end;
        const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
        if (direction || event.key === "Home" || event.key === "End") {
          event.preventDefault();
          cancelPointerUpdate();
          const nextIndex = event.key === "Home" ? view.start
            : event.key === "End" ? view.end : clamp(index + direction, view.start, view.end);
          if (event.shiftKey) {
            keyboardAnchor ??= index;
            showBrush(keyboardAnchor, nextIndex);
          } else {
            keyboardAnchor = null;
            clearBrush();
          }
          if (locked && !event.shiftKey) locked = { chart: figure.spec.key, index: nextIndex };
          const nextX = figure.x(nextIndex);
          if (nextX < plot.scrollLeft) plot.scrollLeft = nextX;
          else if (nextX > plot.scrollLeft + plot.clientWidth - 1) {
            plot.scrollLeft = nextX - plot.clientWidth + 1;
          }
          inspect(figure, nextIndex, locked && !event.shiftKey ? "locked" : "keyboard");
        } else if (event.key === " " && keyboardAnchor === null) {
          event.preventDefault();
          locked = { chart: figure.spec.key, index };
          inspect(figure, index, "locked");
        } else if (event.key.toLowerCase() === "r") {
          event.preventDefault();
          clearInspection();
          if (view.start !== 0 || view.end !== last) onRangeChange(0, last);
        } else if (event.key === "Enter" && keyboardAnchor !== null) {
          event.preventDefault();
          cancelPointerUpdate();
          const first = keyboardAnchor;
          keyboardAnchor = null;
          clearBrush();
          if (first !== index) selectRange(first, index, figure, "keyboard");
        } else if (event.key === "Escape") {
          event.preventDefault();
          clearInspection();
        }
      });
    }

    function buildFigure(spec, width, duration) {
      const detail = duration <= dayMs;
      const title = detail && spec.detailTitle ? spec.detailTitle : spec.title;
      const unit = detail && spec.detailUnit ? spec.detailUnit : spec.unit;
      const article = element("section", "voyage-chart");
      if (spec.note) article.append(element("p", "voyage-chart-note", spec.note));
      const headingRow = element("div", "voyage-chart-heading-row");
      headingRow.append(element("h2", "voyage-chart-heading", title));
      if (unit) headingRow.append(element("span", "voyage-chart-unit", unit));
      article.append(headingRow);
      const plotRow = element("div", "voyage-chart-plot-row");
      const plotFrame = element("div", "voyage-chart-plot-frame");
      const plot = element("div", "voyage-plot");
      plot.tabIndex = 0;
      plot.dataset.chart = spec.key;
      plot.title = "Scroll horizontally to see more; drag to zoom; double-click to reset";
      setAttrs(plot, {
        role: "slider", "aria-label": `${title} timeline`, "aria-describedby": help.id,
        "aria-valuemin": view.start, "aria-valuemax": view.end, "aria-valuenow": view.end,
        "aria-valuetext": timestampFormatter.format(samples[view.end].time),
      });
      const height = spec.height ?? plotHeight;
      const svg = svgElement("svg", { width, height, viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" });
      const axis = element("div", "voyage-chart-axis-column");
      axis.setAttribute("aria-hidden", "true");
      const left = 1;
      const right = width - 1;
      const top = 8;
      const bottom = height - 23;
      const min = spec.ticks?.[0] ?? 0;
      const max = spec.ticks?.at(-1) ?? 1;
      const x = (index) => left + (index - view.start) / (view.end - view.start) * (right - left);
      const y = (value) => bottom - (clamp(value, min, max) - min) / (max - min) * (bottom - top);

      for (const value of spec.ticks ?? []) {
        const tick = y(value);
        svg.append(svgElement("line", {
            x1: left, y1: tick, x2: right, y2: tick,
            class: value === min || value === 0 ? "voyage-chart-baseline" : "voyage-chart-grid",
          }));
        const label = element("span", "voyage-chart-axis-value", value);
        label.style.top = `${tick}px`;
        axis.append(label);
      }
      if (!spec.ticks) svg.append(svgElement("line", {
        x1: left, y1: bottom, x2: right, y2: bottom, class: "voyage-chart-baseline",
      }));

      const hasDateAndTime = duration > dayMs && duration < 3 * dayMs;
      const labelSpacing = hasDateAndTime ? 140 : 90;
      const tickCount = Math.min(Math.max(2, Math.floor(width / labelSpacing) + 1), view.end - view.start + 1);
      for (let tick = 0; tick < tickCount; tick++) {
        const index = Math.round(view.start + (view.end - view.start) * tick / (tickCount - 1));
        const tickX = x(index);
        const anchor = tick === 0 ? "start" : tick === tickCount - 1 ? "end" : "middle";
        svg.append(
          svgElement("line", { x1: tickX, x2: tickX, y1: bottom, y2: bottom + 5, class: "voyage-chart-baseline" }),
          svgElement("text", { x: tickX, y: bottom + 16, "text-anchor": anchor, class: "voyage-chart-axis" }, rangeLabel(samples[index].time, duration)),
        );
      }

      const lines = spec.series ?? [];
      const { start, end } = view;
      const markerCount = Math.min(end - start, Math.max(1, Math.floor((right - left) / markerSpacing)));
      const markerIndexes = Array.from({ length: markerCount + 1 }, (_, index) =>
        start + Math.round(index / markerCount * (end - start)));
      if (spec.draw) {
        spec.draw({ svg, svgElement, samples, start, end, x, y, left, right, top, bottom, markerIndexes });
      } else {
        for (const line of lines) {
          if (!(detail && line.detailDots)) {
            const points = [];
            for (let index = start; index <= end; index++) {
              points.push([Number(x(index).toFixed(2)), Number(y(line.get(samples[index])).toFixed(2))]);
            }
            const path = pathFor(points, line.kind === "step");
            if (line.area) svg.append(svgElement("path", {
              d: `${path}V${bottom}H${left}Z`, fill: line.color, "fill-opacity": 0.08,
            }));
            svg.append(svgElement("path", {
              d: path, fill: "none", stroke: line.color,
              "stroke-width": 1, "stroke-linecap": "round", "stroke-linejoin": "round",
            }));
          }
          svg.append(...markerIndexes.map((index) => svgElement("circle", {
            cx: x(index), cy: y(line.get(samples[index])), r: 1.8,
            fill: line.color,
            stroke: line.color, "stroke-width": 0.9, class: "voyage-chart-point",
          })));
        }
      }

      const rangeBrush = svgElement("rect", { y: top, height: bottom - top, visibility: "hidden", class: "voyage-chart-brush" });
      const rule = svgElement("line", { y1: top, y2: bottom, visibility: "hidden", class: "voyage-chart-rule" });
      const markers = lines.map((line) => {
        const marker = svgElement("g", { visibility: "hidden", class: "voyage-chart-active-point" });
        marker.append(
          svgElement("circle", { r: 5.7, fill: "#fff" }),
          svgElement("circle", { r: 4.4, fill: "none", stroke: "currentColor", "stroke-width": 1 }),
          svgElement("circle", { r: 2.5, fill: "currentColor", stroke: "currentColor", "stroke-width": 0.8 }),
        );
        return { marker, line };
      });
      const hit = svgElement("rect", {
        x: left, y: top, width: right - left, height: bottom - top,
        fill: "transparent", class: "voyage-chart-hit",
      });
      svg.append(rangeBrush, rule, ...markers.map(({ marker }) => marker), hit);
      plot.append(svg);
      plotFrame.append(plot);
      plotRow.append(plotFrame, axis);
      article.append(plotRow);

      const entries = spec.legend ?? lines.map(({ label, color }) => ({
        label, color, kind: "dot",
      }));
      if (entries.length) {
        const legend = element("ul", "voyage-chart-legend");
        for (const { label, color, kind = "dot" } of entries) {
          const item = element("li", null, label);
          const swatch = element("span", `voyage-chart-legend-swatch is-${kind}`);
          swatch.style.color = color;
          item.append(swatch);
          legend.append(item);
        }
        article.append(legend);
      }

      const figure = {
        article, spec, plot, plotFrame, hit, rule, markers, brush: rangeBrush, x, y,
        point(index, sample) {
          const value = spec.anchor?.(sample) ?? lines.map((line) => line.get(sample)).find(Number.isFinite);
          const pointY = Number.isFinite(value) ? y(value) : (top + bottom) / 2;
          const bounds = hit.getBoundingClientRect();
          return {
            x: bounds.left + (x(index) - left) / (right - left) * bounds.width,
            y: bounds.top + (pointY - top) / (bottom - top) * bounds.height,
          };
        },
      };
      plot.addEventListener("scroll", () => syncTimeline(plot), { passive: true });
      bindEvents(figure);
      return figure;
    }

    function render(nextView, inspection) {
      const scrollTop = view?.kpi === nextView.kpi ? scroll.scrollTop : 0;
      const focusedChart = document.activeElement?.dataset.chart;
      cancelPointerUpdate();
      clearBreach();
      view = nextView;
      const { kpi, start, end } = view;
      active = null;
      tooltip.hidden = true;
      tooltipSize = null;
      brush = null;
      shownBrush = null;
      keyboardAnchor = null;
      plotWidth = scroll.clientWidth;
      const duration = samples[end].time - samples[start].time;
      const visibleWidth = Math.max(100, plotWidth - 28 - 30);
      const fullVoyage = start === 0 && end === last;
      const width = fullVoyage ? visibleWidth : Math.max(visibleWidth, Math.ceil(duration / dayMs * 80));
      if (fullVoyage) timelineOffset = 0;
      figures = stacks[kpi].map((spec) => buildFigure(spec, width, duration));
      scroll.replaceChildren(...figures.map(({ article }) => article));
      scroll.scrollTop = scrollTop;
      timelineScroll.style.width = `${figures[0].plot.clientWidth}px`;
      timelineSpacer.style.width = `${width}px`;
      timelineScroll.hidden = width <= figures[0].plot.clientWidth;
      timelineOffset = Math.min(timelineOffset, Math.max(0, width - figures[0].plot.clientWidth));
      timelineScroll.scrollLeft = timelineOffset;
      for (const figure of figures) figure.plot.scrollLeft = timelineOffset;
      updateScrollEdges();
      const focusTarget = figures.find(({ spec }) => spec.key === focusedChart);
      if (focusTarget) focusTarget.plot.focus({ preventScroll: true });
      const lockedFigure = locked && figures.find(({ spec }) => spec.key === locked.chart);
      const inspected = inspection && figures.find(({ spec }) => spec.key === inspection.chart);
      if (lockedFigure && locked.index >= start && locked.index <= end) {
        inspect(lockedFigure, locked.index, "locked");
      } else if (inspected) {
        locked = null;
        inspect(inspected, inspection.index, inspection.source, inspection.point);
      } else {
        locked = null;
        onInspect(null);
      }
    }

    document.addEventListener("pointerdown", (event) => {
      if (locked && !container.contains(event.target) && !event.target.closest?.(".chart-resizer")) clearInspection();
    });
    container.addEventListener("pointerleave", (event) => {
      if (brush || event.pointerType === "touch") return;
      cancelPointerUpdate();
      if (!locked && active?.source === "pointer") clearInspection();
    });
    window.addEventListener("scroll", () => {
      clearBreach();
      if (!locked && (active?.source === "pointer" || active?.source === "touch")) clearInspection();
      else positionTooltip();
    }, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", () => {
      tooltipSize = null;
      positionTooltip();
    });
    container.addEventListener("focusout", (event) => {
      if (!locked && active?.source === "keyboard" && !container.contains(event.relatedTarget)) {
        clearInspection();
      }
    });
    new ResizeObserver(() => {
      if (!view || plotWidth === scroll.clientWidth) return;
      const inspection = active && {
        chart: active.figure.spec.key, index: active.index, source: active.source, point: active.point,
      };
      render(view, inspection);
    }).observe(scroll);

    return { render, clearInspection };
  }

  window.VoyageCharts = { mount };
})();
