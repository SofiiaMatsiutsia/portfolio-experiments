import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

// Exercise the production controller against a controllable animation clock.
// Fonts and media deliberately never resolve, as on a stalled connection.
function browser({ reduced = false, startupDelay = 0 } = {}) {
  let now = 0;
  let nextId = 0;
  let currentOverlay;
  const frames = new Map();
  const timers = new Map();
  const animations = [];
  const listeners = new Map();
  const page = { tagName: 'DIV', inert: false };
  const root = { dataset: {}, style: { setProperty() {} }, removeAttribute() { delete this.dataset.homeIntro; } };
  const node = () => ({
    style: {}, setAttribute() {},
    classList: { toggle() {} },
    getBoundingClientRect: () => ({ width: 390, height: 844 }),
    animate(keyframes, options) {
      const animation = { keyframes, options, currentTime: 0, paused: false, canceled: false,
        pause() { this.paused = true; }, play() { this.paused = false; },
        cancel() { this.canceled = true; }, effect: { setKeyframes() {} } };
      animations.push(animation);
      return animation;
    },
  });
  function overlay() {
    const element = node();
    const paths = Array.from({ length: 23 }, () => ({ ...node(), getTotalLength: () => 100 }));
    const signature = { ...node(), querySelector: (selector) => paths[Number(selector.split('-').at(-1))], querySelectorAll: () => paths };
    const cutout = { ...node(), querySelector: node };
    const bands = { ...node(), querySelectorAll: () => [node(), node(), node()] };
    const reveal = { ...node(), querySelector: (selector) => selector === '.home-intro__cutout' ? cutout : selector === '.home-intro__bands' ? bands : node(), querySelectorAll: () => [node(), node()] };
    element.querySelector = (selector) => selector === '.home-intro__signature' ? signature : reveal;
    element.cloneNode = overlay;
    element.remove = () => { if (currentOverlay === element) currentOverlay = null; };
    return element;
  }
  currentOverlay = overlay();
  const window = {
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    addEventListener(name, fn) { listeners.set(name, fn); },
    dispatchEvent() {},
  };
  const document = {
    documentElement: root,
    body: { get children() { return [page, currentOverlay].filter(Boolean); }, prepend(element) { currentOverlay = element; } },
    getElementById: () => currentOverlay,
    addEventListener() {},
    querySelector() { throw Error('Default intro must not query media readiness'); },
    fonts: { load() { throw Error('Default intro must not wait for fonts'); } },
  };
  const context = vm.createContext({ window, document, structuredClone, AbortController, Event, console,
    performance: { now: () => now }, sessionStorage: { getItem() {}, setItem() {} },
    setTimeout(fn, ms) { timers.set(++nextId, { fn, ms }); return nextId; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { frames.set(++nextId, fn); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  vm.runInContext(read('homepage-intro-settings.js'), context);
  vm.runInContext(read('home-entrance.js'), context);
  now = startupDelay;
  vm.runInContext(read('homepage-intro.js'), context);
  return { window, page, root, timers, animations, frames,
    step(time) {
      now = startupDelay + time;
      animations.filter((a) => !a.paused && !a.canceled).forEach((a) => { a.currentTime = time; });
      const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(now));
    },
  };
}

test('stalled media does not change the 1250ms reveal or 3000ms completion', () => {
  const b = browser();
  assert.equal(b.window.HomepageIntroSettings.read().waitForAssets, false);
  assert.equal(b.page.inert, true);
  b.step(1000);
  assert.equal(b.root.dataset.homeIntro, 'hold');
  b.step(1250);
  assert.equal(b.root.dataset.homeIntro, 'revealing');
  assert.equal(b.window.HomepageIntro.getStatus().waitingForAssets, false);
  assert.equal(b.animations.some((a) => a.paused), false);
  b.step(3000);
  assert.equal(b.window.homepageIntro.active, false);
  assert.equal(b.page.inert, false);
  assert.equal(b.root.dataset.homeIntro, undefined);
  assert.equal(b.frames.size, 0);
  assert.equal(b.timers.size, 0);
});

test('late controller initialization gets a full animation budget', () => {
  const b = browser({ startupDelay: 5000 });
  assert.equal([...b.timers.values()][0].ms, 3600);
  b.step(1250);
  assert.equal(b.window.homepageIntro.active, true);
  b.step(3000);
  assert.equal(b.window.homepageIntro.active, false);
});

test('the controller watchdog restores the page if animation frames stop', () => {
  const b = browser();
  [...b.timers.values()][0].fn();
  assert.equal(b.window.homepageIntro.active, false);
  assert.equal(b.page.inert, false);
  assert.equal(b.root.dataset.homeIntro, undefined);
  assert.equal(b.animations.every((a) => a.canceled), true);
});

test('reduced motion uses only a 180ms overlay fade without media waits', () => {
  const b = browser({ reduced: true });
  assert.equal(b.animations.length, 2); // opacity fade and clock; no strokes or rings
  assert.equal(b.animations[0].options.duration, 180);
  assert.equal([...b.timers.values()][0].ms, 780);
  b.step(180);
  assert.equal(b.page.inert, false);
  assert.equal(b.window.homepageIntro.active, false);
});

test('pause, seek, playback rate and resume keep the watchdog in sync', () => {
  const b = browser();
  const api = b.window.HomepageIntro;
  api.pause();
  assert.equal(b.timers.size, 0);
  api.seek(1500);
  assert.equal(api.getStatus().phase, 'revealing');
  assert.equal(api.getStatus().paused, true);
  api.setRate(2);
  api.resume();
  assert.equal(api.getStatus().rate, 2);
  assert.equal([...b.timers.values()][0].ms, 1350);
  api.skip();
  assert.equal(b.page.inert, false);
  assert.equal(b.animations.every((a) => a.canceled), true);
});

test('replay during an active intro cancels the old animation and restores interactivity afterward', () => {
  const b = browser();
  const old = [...b.animations];
  b.step(500);
  b.window.HomepageIntro.replay();
  assert.equal(old.every((a) => a.canceled), true);
  assert.equal(b.page.inert, true);
  assert.equal(b.window.HomepageIntro.getStatus().time, 0);
  b.window.HomepageIntro.skip();
  assert.equal(b.page.inert, false);
});
