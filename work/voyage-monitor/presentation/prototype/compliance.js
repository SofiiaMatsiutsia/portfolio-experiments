(() => {
  "use strict";

  const actualColor = "#6aaaf0";
  const breachColor = "#ef2329";
  const instructionColor = "#737b81";
  const missingColor = "#e7eaec";
  const missingMessage = "Data wasn’t reported by the vessel.";
  const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
  const timestamp = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const measurement = (value, unit) => `${number.format(value)} ${unit}`;
  const isMissing = ({ value }) => value === null;
  const isBreach = ({ value, instruction }) => value !== null && instruction !== null && value > instruction.limit;

  function runs(start, end, getValue) {
    const result = [];
    let first = start;
    let value = getValue(start);
    for (let index = start + 1; index <= end; index++) {
      const next = getValue(index);
      if (next === value) continue;
      if (value) result.push({ first, last: index - 1, value });
      first = index;
      value = next;
    }
    if (value) result.push({ first, last: end, value });
    return result;
  }

  function drawBands(context, spans, y, height, fill, minimumWidth = 1, attributes = () => ({})) {
    const { svg, svgElement, x, start, end, left, right } = context;
    for (const { first, last } of spans) {
      const from = first === start ? left : (x(first - 1) + x(first)) / 2;
      const to = last === end ? right : (x(last) + x(last + 1)) / 2;
      const width = Math.min(right - left, Math.max(minimumWidth, to - from));
      const bandX = Math.max(left, Math.min(right - width, (from + to - width) / 2));
      svg.append(svgElement("rect", {
        x: bandX, y, width, height, fill, rx: minimumWidth > 1 ? 1 : 0,
        ...attributes({ first, last }),
      }));
    }
  }

  function timelineReading({ value, instruction }, unit) {
    if (value === null) {
      return instruction ? `${missingMessage} Limit ${measurement(instruction.limit, unit)}.` : missingMessage;
    }
    if (!instruction) return `${measurement(value, unit)} · No active instruction`;
    const result = value > instruction.limit ? "Non-compliance" : "Within limit";
    return `${measurement(value, unit)} · ${result} · Limit ${measurement(instruction.limit, unit)}`;
  }

  // Cache full-voyage periods so the tooltip describes the whole event even
  // when a chart has been zoomed into only part of it.
  const periodCache = new WeakMap();
  function breachPeriods(samples) {
    if (periodCache.has(samples)) return periodCache.get(samples);
    const periods = runs(0, samples.length - 1, (index) => {
      const { power, rpm } = samples[index].compliance;
      return isBreach(power) || isBreach(rpm);
    }).map(({ first, last }) => {
      const instructions = new Set();
      for (let index = first; index <= last; index++) {
        const { power, rpm } = samples[index].compliance;
        if (isBreach(power)) instructions.add(`ME Power limit: ${measurement(power.instruction.limit, "kW")}`);
        if (isBreach(rpm)) instructions.add(`RPM limit: ${measurement(rpm.instruction.limit, "RPM")}`);
      }
      return {
        first,
        last,
        startTime: first === 0 ? samples[first].time : (samples[first - 1].time + samples[first].time) / 2,
        endTime: last === samples.length - 1 ? samples[last].time : (samples[last].time + samples[last + 1].time) / 2,
        instructions: [...instructions],
      };
    });
    periodCache.set(samples, periods);
    return periods;
  }

  const timeline = {
    key: "non-compliance-timeline",
    title: "Non-compliance timeline",
    note: "Simulated compliance data",
    height: 48,
    legend: [
      { label: "Non-compliance", color: breachColor, kind: "block" },
      { label: "Missing data", color: missingColor, kind: "band" },
    ],
    readings: ({ compliance }) => [
      ["ME Power", timelineReading(compliance.power, "kW")],
      ["RPM", timelineReading(compliance.rpm, "RPM")],
    ],
    breachAt(samples, index) {
      return breachPeriods(samples).find(({ first, last }) => index >= first && index <= last) ?? null;
    },
    draw(context) {
      const { samples, start, end, y } = context;
      const missing = runs(start, end, (index) => {
        const { power, rpm } = samples[index].compliance;
        return isMissing(power) || isMissing(rpm);
      });
      const breaches = runs(start, end, (index) => {
        const { power, rpm } = samples[index].compliance;
        return isBreach(power) || isBreach(rpm);
      });
      const bandY = y(0.5) - 4;
      drawBands(context, missing, bandY, 8, missingColor, 3);
      drawBands(context, breaches, bandY, 8, breachColor, 3, ({ first, last }) => ({
        "data-breach-first": first,
        "data-breach-last": last,
      }));
    },
  };

  function complianceChart({ key, title, ticks, unit, metric, actualLabel = "Actual" }) {
    const getReading = (sample) => sample.compliance[metric];
    const getColor = (sample) => isBreach(getReading(sample)) ? breachColor : actualColor;

    return {
      key, title, ticks, unit,
      series: [{ get: (sample) => getReading(sample).value, color: actualColor, colorFor: getColor }],
      legend: [
        { label: actualLabel, color: actualColor, kind: "dot" },
        { label: "Non-compliance", color: breachColor, kind: "dot" },
        { label: "Instruction limit", color: instructionColor, kind: "line" },
        { label: "Missing data", color: missingColor, kind: "band" },
      ],
      readings(sample) {
        const reading = getReading(sample);
        const { value, instruction } = reading;
        const rows = value === null
          ? [["", missingMessage]]
          : [["Actual", measurement(value, unit)]];
        if (!instruction) return [...rows, ["", "No active instruction"]];
        if (!isMissing(reading)) rows.push(["Status", isBreach(reading) ? "Non-compliance" : "Within limit"]);
        rows.push(["Instruction limit", measurement(instruction.limit, unit)]);
        rows.push(["Effective from", `${timestamp.format(instruction.start)} UTC`]);
        return rows;
      },
      draw(context) {
        const { svg, svgElement, samples, start, end, x, y, top, bottom, markerIndexes } = context;
        const missing = runs(start, end, (index) => isMissing(getReading(samples[index])));
        drawBands(context, missing, top, bottom - top, missingColor);

        const instructions = runs(start, end, (index) => getReading(samples[index]).instruction);
        for (const { first, last, value } of instructions) {
          const instructionY = y(value.limit);
          svg.append(svgElement("line", {
            x1: x(first), x2: x(Math.min(last + 1, end)), y1: instructionY, y2: instructionY,
            stroke: instructionColor, "stroke-width": 1.25,
          }));
        }

        const markers = new Set(markerIndexes);
        const breaches = runs(start, end, (index) => isBreach(getReading(samples[index])));
        for (const { first, last } of breaches) {
          if (markerIndexes.some((index) => index >= first && index <= last)) continue;
          markers.add(Math.floor((first + last) / 2));
        }
        for (const index of markers) {
          const sample = samples[index];
          const { value } = getReading(sample);
          if (value === null) continue;
          svg.append(svgElement("circle", {
            cx: x(index), cy: y(value), r: 2.25, fill: getColor(sample),
          }));
        }
      },
    };
  }

  window.VoyageCompliance = {
    specs: [
      timeline,
      complianceChart({
        key: "cp-engine-power", title: "ME Power", ticks: [3000, 3500, 4000, 4500, 5000, 5500],
        unit: "kW", metric: "power", actualLabel: "Actual (kW)",
      }),
      complianceChart({
        key: "cp-rpm", title: "RPM", ticks: [80, 90, 100, 110, 120, 130], unit: "RPM", metric: "rpm",
      }),
    ],
  };
})();
