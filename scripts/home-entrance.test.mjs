import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../home-entrance.js', import.meta.url), 'utf8');
function browser({ policy = 'always', stored = 'complete', denyStorage = false } = {}) {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const timers = new Map();
  let timerId = 0;
  let removed = 0;
  const root = { dataset: {}, style: { setProperty() {} }, removeAttribute(name) { if (name === 'data-home-intro') delete this.dataset.homeIntro; } };
  const settings = { replayPolicy: policy, writeMs: 1000, holdMs: 250, revealMs: 1750, readyLimitMs: 6000, rate: 1 };
  const window = {
    HomepageIntroSettings: { read: () => settings },
    addEventListener: (name, fn) => windowListeners.set(name, fn),
    dispatchEvent() {},
  };
  const sessionStorage = {
    getItem() { if (denyStorage) throw Error('blocked'); return stored; },
    setItem(key, value) { if (denyStorage) throw Error('blocked'); stored = value; },
  };
  const document = {
    documentElement: root,
    getElementById: () => ({ remove() { removed += 1; } }),
    addEventListener: (name, fn) => documentListeners.set(name, fn),
  };
  vm.runInNewContext(source, { window, document, sessionStorage, Event,
    performance: { now: () => 100 },
    setTimeout(fn, ms) { timers.set(++timerId, { fn, ms }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  return { state: window.homepageIntro, root, windowListeners, documentListeners, timers,
    removed: () => removed,
  };
}

test('every fresh visit starts the original intro even after prior completion', () => {
  const b = browser();
  assert.equal(b.state.active, true);
  assert.equal(b.root.dataset.homeIntro, 'pending');
  assert.equal(b.state.settings.writeMs, 1000);
  assert.equal(b.state.settings.revealMs, 1750);
});
test('finishing releases the curtain and executes cleanup once', () => {
  const b = browser();
  let cleanups = 0;
  b.state.cleanups.push(() => cleanups += 1);
  b.state.finish();
  b.state.finish();
  assert.equal(cleanups, 1);
  assert.equal(b.removed(), 1);
  assert.equal(b.root.dataset.homeIntro, undefined);
  assert.equal(b.timers.size, 0);
});
test('a cleanup failure cannot leave the page covered', () => {
  const b = browser();
  b.state.cleanups.push(() => { throw Error('failed'); });
  b.state.finish();
  assert.equal(b.state.active, false);
  assert.equal(b.root.dataset.homeIntro, undefined);
});
test('Escape skips a pending intro', () => {
  const b = browser();
  b.documentListeners.get('keydown')({ key: 'Escape' });
  assert.equal(b.state.active, false);
  assert.equal(b.root.dataset.homeIntro, undefined);
});
test('a missing animation controller is released by the bounded watchdog', () => {
  const b = browser();
  const watchdog = [...b.timers.values()][0];
  assert.ok(watchdog.ms < 10000);
  watchdog.fn();
  assert.equal(b.state.active, false);
  assert.equal(b.root.dataset.homeIntro, undefined);
});
test('Back restores replay from pristine controller markup', () => {
  const b = browser();
  let starts = 0;
  b.state.onStart = () => starts += 1;
  b.windowListeners.get('pagehide')();
  b.windowListeners.get('pageshow')({ persisted: true });
  assert.equal(starts, 1);
  assert.equal(b.state.id, 2);
  assert.equal(b.state.active, true);
});
test('ordinary pageshow does not duplicate the fresh-load intro', () => {
  const b = browser();
  b.windowListeners.get('pageshow')({ persisted: false });
  assert.equal(b.state.id, 1);
});
test('the signature sequence skips a competing native transition', () => {
  const b = browser();
  let skipped = 0;
  const event = { viewTransition: { skipTransition() { skipped += 1; } } };
  b.windowListeners.get('pagereveal')(event);
  assert.equal(skipped, 1);
  b.state.finish();
  b.windowListeners.get('pagereveal')(event);
  assert.equal(skipped, 1);
});
test('storage denial does not block the intro or its cleanup', () => {
  const b = browser({ denyStorage: true });
  assert.equal(b.state.active, true);
  b.state.finish();
  assert.equal(b.root.dataset.homeIntro, undefined);
});
