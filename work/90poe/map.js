(() => {
  "use strict";

  const MAP_WIDTH = 642;
  const MAP_HEIGHT = 618; // Includes clearance for the vessel at the start of the route.
  const BACKDROP = { x: -254, y: -397, width: 1021, height: 1070 };
  const COMPASS_CENTER = { x: 44, y: 47.5 };
  const BASE_BEARINGS = { course: 21, windDirection: 181, swellDirection: 90, currentDirection: 82 };
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC",
  });
  const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

  const compassArtwork = `
    <svg class="compass-dial" viewBox="0 0 93 97" width="93" height="97" aria-hidden="true">
      <image href="assets/compass-dial/817.svg" x="58.68" y="13.23" width="5" height="6"/>
      <image href="assets/compass-dial/818.svg" x="70.21" y="19.86" width="5" height="5"/>
      <image href="assets/compass-dial/819.svg" x="76.15" y="29.5" width="6" height="5"/>
      <image href="assets/compass-dial/822.svg" x="39.09" y="4.74" width="10" height="12"/>
      <image href="assets/compass-dial/823.svg" x="77.87" y="41.53" width="8" height="12"/>
      <image href="assets/compass-dial/824.svg" x="39.97" y="78.19" width="8" height="13"/>
      <image href="assets/compass-dial/825.svg" x="0" y="41.53" width="17" height="12"/>
      <image href="assets/compass-dial/826.svg" x="25.75" y="79.34" width="5" height="6"/>
      <image href="assets/compass-dial/827.svg" x="16.1" y="72.76" width="5" height="5"/>
      <image href="assets/compass-dial/828.svg" x="6.39" y="61.89" width="6" height="5"/>
      <image href="assets/compass-dial/829.svg" x="75.72" y="63.54" width="6" height="5"/>
      <image href="assets/compass-dial/830.svg" x="68.52" y="72.76" width="5" height="5"/>
      <image href="assets/compass-dial/831.svg" x="6.39" y="32.13" width="6" height="5"/>
      <image href="assets/compass-dial/832.svg" x="59.57" y="77.68" width="5" height="6"/>
      <image href="assets/compass-dial/833.svg" x="25.75" y="13.21" width="5" height="6"/>
      <image href="assets/compass-dial/834.svg" x="16.1" y="21.51" width="5" height="5"/>
      <g data-bearing="course">
        <image href="assets/compass-dial/820.svg" x="50.68" y="27.08" width="9" height="15"/>
        <image href="assets/compass-dial/821.svg" x="35.3" y="39.23" width="19" height="29"/>
      </g>
      <g data-bearing="windDirection">
        <image href="assets/compass-dial/835.svg" x="31.05" y="77.99" width="14" height="18"/>
      </g>
      <g data-bearing="swellDirection">
        <image href="assets/compass-dial/836.svg" x="75.28" y="43.83" width="17" height="14"/>
      </g>
      <g data-bearing="currentDirection">
        <image href="assets/compass-dial/837.svg" x="73.88" y="27.04" width="19" height="13"/>
      </g>
    </svg>
  `;

  const vesselArtwork = '<image href="assets/map-vessel.svg" x="-24" y="-24" width="48" height="48"/>';
  const mapArtwork = `
    <svg class="voyage-map-artwork" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img" aria-label="Vessel position on the voyage route">
      <image href="assets/map-basemap.png" x="-254" y="-397" width="1021" height="1070" preserveAspectRatio="none"/>
      <image href="assets/map-route-base.svg" x="95.37" y="85.52" width="242.154" height="175.375"/>
      <image href="assets/map-route-dashes.svg" x="94.72" y="84.55" width="243.307" height="176.75"/>
      <image href="assets/map-route-base.svg" x="95.37" y="85.52" width="242.154" height="175.375"/>
      <polyline class="voyage-route-awaiting" data-route="all"/>
      <polyline class="voyage-route-awaiting-dashes" data-route="all"/>
      <polyline class="voyage-route-completed-edge" data-route="sailed"/>
      <polyline class="voyage-route-completed" data-route="sailed"/>
      <g data-vessel-marker="historical" opacity="0.45" visibility="hidden">${vesselArtwork}</g>
      <g data-vessel-marker="current">${vesselArtwork}</g>
    </svg>
  `;

  function measurement(label, key) {
    return `<div class="compass-measurement">
      <dt>${label}</dt>
      <dd data-reading="${key}"></dd>
    </div>`;
  }

  function directionReading(label, key, amount) {
    return `<div class="compass-measurement compass-direction">
      <dt><img src="assets/compass-${key}.svg" width="8" height="9.20492" alt="">${label}</dt>
      <dd data-reading="${amount}"></dd>
      <dd class="compass-direction-bearing" data-reading="${key}Direction"></dd>
    </div>`;
  }

  function mapViewport(svg, width, height) {
    if (!width || !height) return;
    const aspect = width / height;
    const viewWidth = Math.max(MAP_WIDTH, MAP_HEIGHT * aspect);
    const viewHeight = Math.max(MAP_HEIGHT, MAP_WIDTH / aspect);
    const left = Math.max(BACKDROP.x, Math.min(
      (MAP_WIDTH - viewWidth) / 2, BACKDROP.x + BACKDROP.width - viewWidth
    ));
    const top = Math.max(BACKDROP.y, Math.min(
      (MAP_HEIGHT - viewHeight) / 2, BACKDROP.y + BACKDROP.height - viewHeight
    ));
    svg.setAttribute("viewBox", `${left} ${top} ${viewWidth} ${viewHeight}`);
  }

  function positionMarker(marker, sample) {
    marker.setAttribute("transform", `translate(${sample.x} ${sample.y}) rotate(${sample.course})`);
  }

  function mount({ map, compass, samples }) {
    map.innerHTML = mapArtwork;
    compass.innerHTML = `
      <div class="compass-meta">
        <time></time>
        <div>Course <strong data-reading="course"></strong></div>
      </div>
      <dl class="compass-atmosphere">
        ${measurement("BF", "bf")}
        ${measurement("DSS", "dss")}
        ${measurement("Air t°", "airTemp")}
        ${measurement("Sea t°", "seaTemp")}
      </dl>
      ${compassArtwork}
      <dl class="compass-directions">
        ${directionReading("Wind", "wind", "windSpeed")}
        ${directionReading("Swell", "swell", "swellHeight")}
        ${directionReading("Current", "current", "currentSpeed")}
      </dl>
      <dl class="compass-waves">${measurement("Wave height", "waveHeight")}</dl>
    `;

    const mapSvg = map.querySelector("svg");
    const currentMarker = map.querySelector('[data-vessel-marker="current"]');
    const historicalMarker = map.querySelector('[data-vessel-marker="historical"]');
    const timestamp = compass.querySelector("time");
    const readings = Object.fromEntries(
      [...compass.querySelectorAll("[data-reading]")].map((node) => [node.dataset.reading, node])
    );
    const bearings = [...compass.querySelectorAll("[data-bearing]")];
    const current = samples.at(-1);
    const currentLabel = `Current vessel position at ${dateFormat.format(current.time)} UTC`;
    map.dataset.currentTimestamp = new Date(current.time).toISOString();
    positionMarker(currentMarker, current);

    const routePoints = samples.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    for (const line of map.querySelectorAll("[data-route]")) {
      line.setAttribute("points", routePoints);
    }
    const resizeObserver = new ResizeObserver(([{ contentRect }]) => {
      mapViewport(mapSvg, contentRect.width, contentRect.height);
    });
    resizeObserver.observe(map);

    let renderedSample = null;
    function render(sample) {
      if (sample === renderedSample) return;
      const previous = renderedSample;
      renderedSample = sample;
      const instant = new Date(sample.time);
      const isoTime = instant.toISOString();
      map.dataset.timestamp = isoTime;
      compass.dataset.timestamp = isoTime;
      timestamp.dateTime = isoTime;
      const timeLabel = dateFormat.format(instant);
      timestamp.textContent = timeLabel;

      const showHistorical = sample.time !== current.time;
      historicalMarker.setAttribute("visibility", showHistorical ? "visible" : "hidden");
      if (showHistorical) positionMarker(historicalMarker, sample);
      mapSvg.setAttribute("aria-label", showHistorical
        ? `${currentLabel}. Historical vessel position at ${timeLabel} UTC.`
        : `${currentLabel}.`);

      const values = {
        course: `${sample.course}°`,
        bf: sample.bf,
        dss: sample.dss,
        airTemp: `${sample.airTemp}°`,
        seaTemp: `${sample.seaTemp}°`,
        windSpeed: `${numberFormat.format(sample.windSpeed)} kn`,
        windDirection: `${sample.windDirection}°`,
        swellHeight: `${numberFormat.format(sample.swellHeight)} m`,
        swellDirection: `${sample.swellDirection}°`,
        currentSpeed: `${numberFormat.format(sample.currentSpeed)} kn`,
        currentDirection: `${sample.currentDirection}°`,
        waveHeight: `${numberFormat.format(sample.waveHeight)} m`,
      };

      for (const [key, value] of Object.entries(values)) {
        const text = String(value);
        if (readings[key].textContent !== text) readings[key].textContent = text;
      }
      for (const rotor of bearings) {
        const key = rotor.dataset.bearing;
        if (sample[key] === previous?.[key]) continue;
        const angle = sample[key] - BASE_BEARINGS[key];
        rotor.setAttribute("transform", `rotate(${angle} ${COMPASS_CENTER.x} ${COMPASS_CENTER.y})`);
      }
    }

    return { render };
  }

  window.VoyagePanels = { mount };
})();
