(() => {
  const startTime = Date.UTC(2020, 6, 2);
  const sampleInterval = 15 * 60 * 1000;
  const intervalCount = 9 * 24 * 4;

  // Reference points in the basemap's 642 × 600 coordinate system.
  const waypoints = [
    [549, 593], [543, 567], [527, 530], [498, 513], [474, 506], [360, 495],
    [274, 520], [176, 547], [136, 554], [110, 537], [67, 530], [68, 501],
    [56, 479], [72, 453], [67, 408], [71, 373], [56, 352], [73, 320],
    [85, 296], [96, 267],
  ];

  let routeLength = 0;
  const route = waypoints.slice(1).map(([x, y], index) => {
    const [startX, startY] = waypoints[index];
    const dx = x - startX;
    const dy = y - startY;
    const length = Math.hypot(dx, dy);
    const from = routeLength;
    routeLength += length;
    return { startX, startY, dx, dy, length, from, to: routeLength };
  });

  function positionAt(progress) {
    const distance = progress * routeLength;
    const segment = route.find(({ to }) => distance <= to) ?? route.at(-1);
    const { startX, startY, dx, dy, length, from } = segment;
    const portion = (distance - from) / length;
    return {
      x: startX + dx * portion,
      y: startY + dy * portion,
      course: degrees(Math.atan2(dx, -dy) * 180 / Math.PI),
    };
  }

  function degrees(value) {
    return (Math.round(value) % 360 + 360) % 360;
  }

  function interpolate(values, progress) {
    const position = progress * (values.length - 1);
    const start = Math.floor(position);
    const next = Math.min(start + 1, values.length - 1);
    return values[start] + (values[next] - values[start]) * (position - start);
  }

  const simulatedFuel = [8, 13, 10, 10.4, 10, 13.3, 11, 12.9, 14, 11.7, 13, 12.4, 13.7, 14.2, 15.3, 15.1, 14.9];
  const performanceDeviation = [0, 1.3, -1.7, 0.5, 1, 0.9, 0, 0, -1.9, -2, 8.8, 1.2, -0.1, -1.7, 0, 0.1, 0.3];
  const weatherDeviation = [-1, 0.9, -1.5, 0.3, 0.7, 0.2, 0.1, -2.3, -2.2, 8.6, 1.1, -1.8, -3.4, -2.1, -2, 0.1, 0.3];
  const engineLoads = [77, 79, 74, 76, 69, 71, 65, 68, 62, 72, 69, 65, 60, 62, 58, 63];
  const engineSpeeds = [109, 113, 108, 111, 114, 107, 104, 111, 106];
  const beaufort = [0, 2, 1, 3, 2, 5, 1, 3, 2, 0, 3, 2, 4, 2, 3, 1, 4, 3, 3];
  const douglas = [1, 3, 1, 1, 2, 3, 1, 4, 2, 1, 4, 3, 2, 1, 2, 2, 3, 3, 2];

  const hoursAfterDeparture = (hours) => startTime + hours * 60 * 60 * 1000;
  const instruction = (startHour, endHour, limit) => ({
    start: hoursAfterDeparture(startHour), end: hoursAfterDeparture(endHour), limit,
  });
  // Simulated maximum instructions and reporting gaps, relative to the voyage start.
  const powerInstructions = [instruction(84, 108, 4380), instruction(156, 180, 4150)];
  const rpmInstructions = [instruction(120, 144, 109), instruction(192, Infinity, 109)];
  const powerGaps = [[54, 62]];
  const rpmGaps = [[23, 44], [120, 124]];

  function complianceReading(value, time, instructions, gaps) {
    const missing = gaps.some(([start, end]) => time >= hoursAfterDeparture(start) && time < hoursAfterDeparture(end));
    return {
      value: missing ? null : value,
      instruction: instructions.find(({ start, end }) => time >= start && time < end) ?? null,
    };
  }

  window.voyageSamples = Array.from({ length: intervalCount + 1 }, (_, index) => {
    const progress = index / intervalCount;
    const edge = Math.sin(Math.PI * progress);
    const ripple = edge * Math.sin(index * 0.32);
    const broadSwell = edge * Math.sin(progress * Math.PI * 7);
    const simulatedFoc = interpolate(simulatedFuel, progress) + 0.35 * ripple;
    const performance = interpolate(performanceDeviation, progress) + 0.48 * ripple;
    const weather = interpolate(weatherDeviation, progress) + 0.38 * ripple;
    const engineLoad = interpolate(engineLoads, progress) + 1.15 * ripple;
    const enginePower = engineLoad * 64.8;
    const rpm = interpolate(engineSpeeds, progress) + 1.2 * ripple;
    const time = startTime + index * sampleInterval;

    return {
      ...positionAt(progress),
      time,
      actualFoc: simulatedFoc * (1 + performance / 100),
      simulatedFoc,
      goodWeatherFoc: simulatedFoc / (1 + weather / 100),
      engineLoad,
      enginePower,
      compliance: {
        power: complianceReading(Math.round(enginePower), time, powerInstructions, powerGaps),
        rpm: complianceReading(Math.round(rpm * 10) / 10, time, rpmInstructions, rpmGaps),
      },
      sog: interpolate([9.4, 10.8, 10.6, 12, 13.1, 11.4, 8.9, 11.8, 10.6], progress) + 0.24 * ripple,
      stw: interpolate([8.1, 10.3, 11.2, 10.5, 11.6, 10.9, 7.8, 10.6, 9.7], progress) - 0.16 * ripple,
      bf: beaufort[Math.min(Math.floor(progress * beaufort.length), beaufort.length - 1)],
      dss: douglas[Math.min(Math.floor(progress * douglas.length), douglas.length - 1)],
      airTemp: 11 + Math.round(10 * (1 - progress) + 2 * broadSwell),
      seaTemp: 2 + Math.round(9 * (1 - progress) + broadSwell),
      windSpeed: interpolate([8, 3, 6, 7, 6, 10, 13, 8, 2, 9], progress) + 0.6 * ripple,
      windDirection: degrees(181 + 80 * (1 - progress) + 32 * broadSwell + 6 * ripple),
      swellHeight: interpolate([2.1, 0.9, 1.9, 1.6, 1.6, 3.7, 5, 3.1, 0.5, 2.3], progress) + 0.12 * ripple,
      swellDirection: degrees(90 + 112 * (1 - progress) + 38 * broadSwell + 4 * ripple),
      currentSpeed: interpolate([1.4, 0.5, 1.1, 1.2, 1.1, 2, 3.3, 2.8, 0.7, 0.4], progress) + 0.09 * ripple,
      currentDirection: degrees(82 + 83 * (1 - progress) - 29 * broadSwell + 5 * ripple),
      waveHeight: 1.5 + 0.9 * (1 - progress) + 0.46 * broadSwell + 0.1 * ripple,
    };
  });
})();
