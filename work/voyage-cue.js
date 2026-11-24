(() => {
  const host = document.querySelector("[data-voyage-cue]");
  if (!host) return;

  // The original lettering is filled artwork. Moving wide strokes through
  // masks reveals that artwork without turning its outlines into strokes.
  const artwork = "<svg xmlns=\"http://www.w3.org/2000/svg\" direction=\"ltr\" width=\"111.30448368097794\" height=\"151.28467732120825\" viewBox=\"-2141.5412258502033 7319.437048137845 111.30448368097794 151.28467732120825\" stroke-linecap=\"round\" stroke-linejoin=\"round\" data-color-mode=\"light\" class=\"tl-container tl-theme__force-sRGB tl-theme__light\" style=\"background-color: transparent;\"><defs/><g transform=\"matrix(1, 0, 0, 1, -2076.4009, 7343.7511)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M-1.52,-1.02 t.91,-1.2 3.38,-3.5 8.1,-5.2 11.62,-5.39 11.75,-4.17 7.24,-1.87 1.49,-.19 a2.27,2.27 0 0 1 .55,4.5 t-2.97,.24 -3.94,.53 -2.13,.38 -3.99,.67 -3.89,.92 -4.99,2.09 -9.16,4.54 -7.32,4.95 -2.85,3.44 -.76,1.3 a1.83,1.83 0 0 1 -3.04,-2.04 ZM42.71,-18.09 t-3.29,-.83 -6.3,-1.08 -8.05,-.28 -5.06,-.01 a2.08,2.08 0 0 1 .01,-4.16 t6.76,.12 9.46,.5 5.12,.86 2.42,.48 a2.27,2.27 0 0 1 -1.07,4.4 ZM20.02,-24.45 t4.78,.14 6.88,.18 4.36,.48 3.46,.77 2.26,.8 1.06,.47 a2.41,2.41 0 0 1 -2.41,4.18 t-1.47,-.64 -3.34,-1.21 -5.48,-.68 -6.86,-.23 -3.25,-.1 a2.08,2.08 0 0 1 .01,-4.16 ZM44.02,-19.46 t0,.07 0,.07 a2.41,2.41 0 0 1 -4.82,-.13 t0,-.06 0,-.07 a2.41,2.41 0 0 1 4.82,.12 ZM42.9,-17.34 t-2.73,2.09 -4.31,3.49 -2.38,2.34 -.79,.94 a2.4,2.4 0 0 1 -3.85,-2.85 t.68,-.89 4.11,-3.93 5.06,-4.16 1.63,-1.11 a2.41,2.41 0 0 1 2.58,4.08 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(1, 0, 0, 1, -2098.5379, 7430.8164)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.71,-.41 t.27,1.27 .76,2.44 1.27,2.45 2.07,2.88 2.7,3.02 3.5,2.97 6.79,4.31 10.31,5.47 7.96,3.61 6.31,1.98 4.48,1.16 .51,.08 a1.9,1.9 0 0 1 -.95,3.69 t-3.14,-1.13 -6.83,-2.83 -9.41,-4.43 -10.59,-5.52 -7.11,-4.43 -3.81,-3.11 -3,-3.15 -2.45,-3.11 -1.68,-2.85 -1.04,-2.68 -.34,-1.27 a1.76,1.76 0 0 1 3.42,-.82 ZM46.28,32.87 t-.02,-1.73 -.4,-4.52 -.57,-3.36 -.18,-.57 a2.11,2.11 0 0 1 4.08,-1.03 t.57,4.82 .43,5.81 -.13,.99 a1.9,1.9 0 0 1 -3.78,-.41 ZM47.54,24.24 t-.02,.01 -.02,.01 a2.11,2.11 0 0 1 -.79,-4.15 t.03,-.01 .02,0 a2.11,2.11 0 0 1 .78,4.14 ZM49.2,21.9 t.64,2.98 1.2,4.98 .05,3.15 -2.2,1.82 -6.05,1.96 -6.03,1.91 -1.67,.61 a1.45,1.45 0 0 1 -1.07,-2.69 t6.51,-2.74 5.48,-7.08 -1.05,-4.33 a2.11,2.11 0 0 1 4.19,-.57 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2112.6002, 7356.4414)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M-1.72,.94 t-.46,-.85 -1.36,-1.55 -2.33,-.53 -3.74,.92 -5,2.1 -5.29,2.89 -4.87,3.4 -3.63,3.43 -2.11,2.73 -.35,2.15 1.62,1.34 4.82,.7 8.39,-.01 4.8,-.37 a1.25,1.25 0 0 1 .25,2.49 t-5,.43 -8.87,.14 -5.58,-.71 -2.78,-1.41 -1.07,-2.08 1.28,-3.3 2.79,-3.94 3.87,-3.78 5.04,-3.69 5.48,-3.21 5.52,-2.53 5.03,-1.17 3.48,.5 1.86,1.49 1.18,1.69 .47,.85 a1.96,1.96 0 0 1 -3.44,1.88 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2105.1857, 7344.1616)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.73,1.02 t-1.54,2.39 -3.12,5.27 -5.36,11.96 -4.69,11.48 -.93,2.41 a1.28,1.28 0 0 1 -2.4,-.91 t.88,-2.42 4.46,-11.78 6.41,-14.9 2.83,-5.54 a2,2 0 0 1 3.46,2.04 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2094.0579, 7363.2198)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.44,1.13 t-2.02,2.56 -4.5,6.48 -3.39,5.89 -.91,1.98 a1.51,1.51 0 0 1 -2.72,-1.33 t2.4,-4.35 5.33,-8.92 2.93,-4.57 a1.83,1.83 0 0 1 2.88,2.26 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2095.4365, 7353.9594)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M 0 0 m -2.12, 0 a 2.12,2.12 0 1,1 4.24,0 a 2.12,2.12 0 1,1 -4.24,0\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2078.3808, 7365.3547)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M-1.06,1.52 t-1.01,-.76 -2.77,-.96 -2.98,.15 -2.49,1.19 -2.1,1.62 -1.21,1.81 .41,2.57 1.47,2.51 1.75,2.05 2.58,.42 1.5,-.67 a1.92,1.92 0 0 1 1.75,3.42 t-2.3,.97 -3.29,.49 -3.22,-3.28 -3.02,-4.17 -.97,-2.64 .13,-2.19 .96,-1.76 1.67,-1.76 2.59,-2.03 3.18,-1.66 3.34,-.65 2.89,.41 2.2,1.19 1.06,.69 a1.85,1.85 0 0 1 -2.12,3.04 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2063.1313, 7346.5584)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.5,1.18 t-.98,1.1 -2.52,3.43 -4.24,7.36 -4.23,9.04 -3.06,8.32 -1.51,4.31 a1.21,1.21 0 0 1 -2.29,-.79 t1.45,-4.32 2.97,-8.52 4.1,-9.47 4.95,-9.04 2.36,-3.78 a1.9,1.9 0 0 1 3,2.36 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2061.6031, 7362.4783)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.09,1.86 t-2.19,1.28 -3.57,2.26 -.19,3.12 2.31,5.02 1.93,4.41 .81,1.51 a2.01,2.01 0 0 1 -3.51,1.93 t-.91,-1.62 -2.58,-5.15 -2.42,-4.51 -1.25,-2.21 -.02,-2.38 1.97,-2.38 4.47,-3.11 2.97,-1.89 a2.15,2.15 0 0 1 2.18,3.72 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2131.0947, 7398.4251)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.78,.65 t-1.51,3.98 -2.32,7.31 -.91,4.79 -.1,1.46 a1.59,1.59 0 0 1 -3.18,-.19 t1.01,-5.15 2.22,-9.33 1.23,-4.17 a1.9,1.9 0 0 1 3.56,1.3 ZM-6.16,17.58 t.2,-.69 1.37,-2.44 2.08,-2.76 3.4,-3.11 2.49,-2.11 a1.78,1.78 0 0 1 2.07,2.9 t-1.37,.9 -2.28,1.77 -2.73,3.26 -2.02,2.86 -.19,.45 a1.59,1.59 0 0 1 -3.02,-1.03 ZM5.85,6.87 t.82,1.07 1.6,3.33 1.13,4.94 .35,2.68 a1.97,1.97 0 0 1 -3.94,.13 t-.11,-2.2 -.77,-4.09 -1.32,-2.82 -.64,-.94 a1.78,1.78 0 0 1 2.88,-2.1 ZM6.01,18.07 t.78,-1.49 3.08,-3.98 3.19,-3.18 1.82,-1.25 .94,-.55 a1.8,1.8 0 0 1 1.57,3.24 t-1.42,.75 -3.24,3.07 -2.5,3.74 -.69,1.42 a1.97,1.97 0 0 1 -3.53,-1.77 ZM17.81,7.89 t.56,.47 1.17,1.26 1.53,2.99 1.89,6.49 .97,4.3 a1.51,1.51 0 0 1 -2.92,.76 t-1.19,-4.02 -2.28,-6.28 -1.6,-2.78 -.53,-.49 a1.8,1.8 0 0 1 2.4,-2.7 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2098.087, 7404.7707)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M.44,-1.85 t2.62,.73 5.12,1.12 6.83,.62 5.36,.12 -1.6,-.5 -3.9,-.36 -2.43,.3 -2.12,.69 -1.77,1.05 -1.22,1.55 .77,1.42 4.86,.9 7.97,.51 4.3,.08 a1.41,1.41 0 0 1 .02,2.83 t-4.39,.14 -8.41,.06 -5.68,-.38 -3.07,-1.85 -1.16,-2.92 .94,-2.73 1.63,-2.21 2.49,-1.7 2.84,-1.18 2.97,-.49 3.99,.16 3.92,.99 2.4,1.27 1.16,1.78 -.24,2 -1.82,1.09 -2.36,.31 -5.65,-.02 -7.23,-.33 -5.36,-.82 -2.66,-.53 a1.9,1.9 0 0 1 .88,-3.7 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2048.279, 7388.1886)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.84,.29 t-.27,1.33 -.12,3.98 .15,2.66 a1.53,1.53 0 0 1 -3.05,.27 t-.35,-3.05 -.19,-4.41 .15,-1.36 a1.87,1.87 0 0 1 3.68,.58 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2041.7092, 7390.4153)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.93,.75 t-.39,.95 -.83,3.22 -.43,2.28 a2.01,2.01 0 0 1 -3.99,-.59 t.28,-1.79 .88,-3.68 .62,-1.89 a2.07,2.07 0 0 1 3.86,1.5 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g><g transform=\"matrix(0.9563, -0.2924, 0.2924, 0.9563, -2050.4601, 7400.6107)\" opacity=\"1\"><g transform=\"scale(1)\"><path d=\"M1.56,-.96 t.63,1.11 1.41,2.08 1.82,1.85 2.04,1.35 2.3,.46 3.63,-1.08 2.34,-1.07 a1.76,1.76 0 0 1 1.44,3.21 t-2.85,1.09 -4.04,1.16 -2.14,-.27 -2.26,-.95 -2.63,-1.63 -2.37,-2.13 -1.74,-2.19 -.7,-1.07 a1.83,1.83 0 0 1 3.12,-1.92 Z\" stroke-linecap=\"round\" fill=\"#9fa8b2\"/></g></g></svg>";
  host.innerHTML = artwork;
  const svg = host.querySelector("svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const groups = Array.from(svg.children).filter((node) => node.tagName.toLowerCase() === "g");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

  const ns = "http://www.w3.org/2000/svg";
  const defs = svg.querySelector("defs");
  const strokes = [
    "M -1 -1 Q 8 -13 24 -18 T 42 -20 M 20 -22 Q 34 -23 42 -20 L 31 -10",
    "M 0 0 Q 3 16 24 25 T 48 33 M 46 22 L 49 33 L 35 38",
    "M -1 1 Q -4 -5 -13 -1 T -28 12 Q -35 20 -24 21 L -10 21",
    "M 0 0 Q -8 14 -15 34",
    "M 0 0 Q -7 9 -11 17",
    "M 0 0 L 0 0.1",
    "M 0 0 Q -8 -4 -14 3 T -7 13",
    "M 0 0 Q -11 15 -16 34",
    "M 0 0 Q -9 5 -9 8 T -3 20",
    "M 0 0 Q -4 10 -5 18 Q 0 10 4 8 Q 8 12 8 19 Q 13 10 17 9 Q 21 14 22 23",
    "M 0 0 Q 13 3 20 2 Q 13 -1 8 3 T 8 7 Q 15 9 24 9",
    "M 0 0 Q -1 4 0 8",
    "M 0 0 Q -2 4 -2 7",
    "M 0 0 Q 5 9 11 8 L 16 6"
  ];

  const paths = strokes.map((d, index) => {
    const mask = document.createElementNS(ns, "mask");
    mask.id = `voyage-cue-mask-${index}`;
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("x", "-100");
    mask.setAttribute("y", "-100");
    mask.setAttribute("width", "200");
    mask.setAttribute("height", "200");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", "12");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("pathLength", "100");
    path.style.strokeDasharray = "100 110";
    path.style.strokeDashoffset = "110";
    mask.append(path);
    defs.append(mask);
    groups[index].firstElementChild.setAttribute("mask", `url(#${mask.id})`);
    return path;
  });

  const showComplete = () => {
    groups.forEach((group) => group.firstElementChild.removeAttribute("mask"));
  };
  const order = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 1];
  let started = false;
  let animationTimer;
  const start = () => {
    if (started) return;
    started = true;
    if (reducedMotion.matches || !paths[0].animate) {
      showComplete();
      return;
    }
    const lengths = order.map((index) => Math.max(4, paths[index].getTotalLength()));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    const writingTime = 1400;
    let delay = 0;
    order.forEach((index, sequence) => {
      const duration = writingTime * lengths[sequence] / total;
      paths[index].animate(
        [{ strokeDashoffset: "110" }, { strokeDashoffset: "0" }],
        { duration, delay, easing: "ease", fill: "forwards" }
      );
      delay += duration + 14;
    });
    animationTimer = window.setTimeout(showComplete, delay + 40);
  };
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      start();
    }
  }, { threshold: 0.15 });
  observer.observe(host);
  reducedMotion.addEventListener("change", (event) => {
    if (!event.matches) return;
    observer.disconnect();
    window.clearTimeout(animationTimer);
    started = true;
    showComplete();
  });
})();
