import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const source = script.slice(script.indexOf('function initVideoVisibility()'));

function browser({ reduced = false, saveData = false } = {}) {
  const events = new Map();
  const microtasks = [];
  const preference = { matches: reduced, addEventListener: (name, fn) => events.set(`motion:${name}`, fn) };
  const connection = { saveData, addEventListener: (name, fn) => events.set(`connection:${name}`, fn) };
  const videos = Array.from({ length: 2 }, () => {
    const attributes = new Map();
    const source = { dataset: { src: 'preview.mp4' }, hasAttribute: (name) => attributes.has(name),
      set src(url) { attributes.set('src', url); }, get src() { return attributes.get('src'); } };
    return { source, plays: 0, loads: 0, paused: true,
      hasAttribute: () => true, querySelectorAll: () => [source],
      pause() { this.paused = true; }, load() { this.loads += 1; },
      play() { this.plays += 1; this.paused = false; return Promise.resolve(); },
    };
  });
  const root = { active: true, hasAttribute() { return this.active; } };
  const document = { hidden: false, documentElement: root, querySelectorAll: () => videos,
    addEventListener: (name, fn) => events.set(name, fn) };
  let intersect;
  class IntersectionObserver {
    constructor(fn) { intersect = fn; }
    observe() {}
  }
  const window = { IntersectionObserver, matchMedia: () => preference,
    addEventListener: (name, fn) => events.set(name, fn) };
  vm.runInNewContext(source + '\ninitVideoVisibility();', { window, document, navigator: { connection }, IntersectionObserver,
    queueMicrotask: (fn) => microtasks.push(fn) });
  return { videos, root, document, preference, connection,
    visible(index, value = true) { intersect([{ target: videos[index], isIntersecting: value }]); },
    emit(name) { events.get(name)(); },
    flush() { microtasks.splice(0).forEach((fn) => fn()); },
  };
}

test('withhold sources until intro completion AND visibility, including cloned tiles', () => {
  const b = browser();
  b.visible(0);
  assert.equal(b.videos[0].source.src, undefined);
  b.root.active = false;
  b.emit('homepageintrochange'); b.flush();
  assert.equal(b.videos[0].loads, 1);
  assert.equal(b.videos[0].paused, false);
  assert.equal(b.videos[1].source.src, undefined);
  b.visible(1);
  assert.equal(b.videos[1].loads, 1);
  b.emit('pageshow'); b.flush();
  assert.equal(b.videos[1].loads, 1);
  b.visible(0, false);
  assert.equal(b.videos[0].paused, true);
});

test('reduced motion and data-saving mode retain posters without fetching videos', () => {
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const b = browser(options);
    b.root.active = false;
    b.visible(0);
    assert.equal(b.videos[0].loads, 0);
    assert.equal(b.videos[0].paused, true);
    b.preference.matches = false;
    b.connection.saveData = false;
    b.emit('connection:change'); b.flush();
    assert.equal(b.videos[0].loads, 1);
  }
});

test('a replay handoff cannot start a video between finish and restart', () => {
  const b = browser();
  b.visible(0);
  b.root.active = false;
  b.emit('homepageintrochange');
  b.root.active = true;
  b.emit('homepageintrochange'); b.flush();
  assert.equal(b.videos[0].loads, 0);
});

test('hidden pages, pagehide and a new intro pause already active previews', () => {
  const b = browser();
  b.root.active = false;
  b.visible(0);
  b.document.hidden = true;
  b.emit('visibilitychange'); b.flush();
  assert.equal(b.videos[0].paused, true);
  b.document.hidden = false;
  b.emit('visibilitychange'); b.flush();
  assert.equal(b.videos[0].paused, false);
  b.root.active = true;
  b.emit('homepageintrochange'); b.flush();
  assert.equal(b.videos[0].paused, true);
  b.root.active = false;
  b.emit('homepageintrochange'); b.flush();
  b.emit('pagehide');
  assert.equal(b.videos[0].paused, true);
});
