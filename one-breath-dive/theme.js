/* The retained chart bundle reads resolved values because canvas cannot paint
   CSS custom properties. Keep application theme choices in this small source. */
(() => {
  const style = getComputedStyle(document.documentElement);
  const color = (name) => style.getPropertyValue(name).trim();
  const black = color('--color-black');
  const white = color('--color-white');
  const grey = color('--color-grey');
  const channels = black.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16));
  const canvas = `rgb(${channels.map((channel) => Math.round(channel * 0.05 + 255 * 0.95)).join(', ')})`;
  window.PortfolioDiveTheme = {
    roles: { people: color('--color-rose'), animal: color('--color-orange'), freediver: color('--color-green'), scuba: grey, 'sea-animal': color('--color-blue') },
    canvas, panel: white, elevated: white, ink: black, muted: grey,
    line: grey, accent: color('--color-blue'), event: color('--color-rose'),
    map: color('--color-blue'), font: 'Folio Bk BT, Helvetica, Arial, sans-serif',
  };
  const studio = document.getElementById('studio');
  const ready = new MutationObserver(() => {
    if (studio.querySelector('.dive-widget')) {
      studio.querySelector('.dive-boot')?.remove();
      ready.disconnect();
      clearTimeout(limit);
    }
  });
  ready.observe(studio, { childList: true, subtree: true });
  const limit = setTimeout(() => {
    const message = studio.querySelector('.dive-boot');
    if (message) message.textContent = 'The dive explorer could not load. Refresh to try again, or return to the portfolio.';
    ready.disconnect();
  }, 15000);
})();
