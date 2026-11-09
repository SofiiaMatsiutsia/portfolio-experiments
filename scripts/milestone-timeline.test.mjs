import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../assets/demos/onboarding-copy/script.js', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../work/landlord-verification-milestones.js', import.meta.url), 'utf8');
const titles = ['Before', 'Grouped verbs', 'Clarified copy', 'Added mobile', 'Final'];
function target() {
  const listeners = new Map(), attributes = new Map();
  return {
    dataset: {}, style: {}, value: 0, textContent: '', clientWidth: 702,
    classList: { toggle() {} },
    addEventListener(type, fn) { listeners.set(type, [...(listeners.get(type) || []), fn]); },
    dispatch(type, event = {}) { for (const fn of listeners.get(type) || []) fn({ preventDefault() {}, ...event }); },
    setAttribute(key, value) { attributes.set(key, String(value)); },
    getAttribute(key) { return attributes.get(key); },
    removeAttribute(key) { attributes.delete(key); },
    getBoundingClientRect() { return { left: 100, width: 616, height: 20 }; },
    setPointerCapture() {},
    querySelector() { return target(); },
  };
}
function clock() {
  let now = 0, id = 0;
  const frames = new Map(), timers = new Map();
  return {
    performance: { now: () => now },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn, delay) { timers.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    advance(ms, render = true) {
      now += ms;
      if (render) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); }
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    },
  };
}
function explorer() {
  const time = clock(), window = target(), reduced = target(), parent = {}, messages = [];
  reduced.matches = false;
  const elements = Object.fromEntries(['diagram', 'progress', 'timeline', 'explorer', 'publishing-highlight', 'timeline-hint', 'stage-announcement', 'range-fill', 'paths'].map(key => [key, target()]));
  const nodes = ['email', 'account', 'id', 'identity', 'mobile', 'method', 'completeEmail', 'search', 'unlock', 'completeIdentity', 'publish', 'payout'].map(key => ({ ...target(), dataset: { node: key } }));
  const buttons = titles.map((_, i) => ({ ...target(), dataset: { stage: String(i) } }));
  const dots = titles.map(target);
  const document = {
    ...target(), hidden: false, activeElement: null, hasFocus: () => true,
    fonts: { ready: { then() {} } },
    querySelector: selector => elements[selector.slice(1)],
    querySelectorAll: selector => selector === '[data-node]' ? nodes : selector === '[data-stage]' ? buttons : dots,
  };
  elements.progress.focus = () => { document.activeElement = elements.progress; elements.timeline.dispatch('focusin'); };
  elements.timeline.contains = element => [elements.progress, ...buttons].includes(element);
  window.matchMedia = () => reduced;
  parent.postMessage = message => messages.push(message);
  vm.runInNewContext(source, { window, document, parent, location: { origin: 'https://portfolio.test' }, ...time, queueMicrotask: fn => fn(), ResizeObserver: class { observe() {} } });
  return {
    ...elements, buttons, nodes, window, document, reduced, time, messages,
    scroll(progress, extra = {}) { window.dispatch('message', { source: parent, origin: 'https://portfolio.test', data: { type: 'verification-copy:progress', progress, ...extra } }); },
    measure() { window.dispatch('message', { source: parent, origin: 'https://portfolio.test', data: { type: 'verification-copy:measure' } }); },
  };
}
function selected(b, index) {
  assert.equal(Number(b.progress.value), index * 25);
  assert.equal(b.progress.getAttribute('aria-valuetext'), `${titles[index]}, change ${index + 1} of 5`);
  assert.equal(b.explorer.dataset.stage, String(index));
  assert.equal(b.buttons.filter(button => button.getAttribute('aria-current') === 'step').length, 1);
  assert.equal(b.buttons[index].getAttribute('aria-current'), 'step');
}
function settled(b, index) {
  selected(b, index);
  assert.equal(Number(b.diagram.dataset.progress), index * 25);
}

test('every stage label commits selection before its diagram transition and settles exactly', () => {
  const b = explorer();
  for (const index of [4, 1, 3, 0, 2]) {
    b.buttons[index].dispatch('click', { detail: 1 });
    selected(b, index);
    b.time.advance(180);
    settled(b, index);
  }
});
test('rapid retargeting starts from the current diagram, while controls immediately select the destination', () => {
  const b = explorer();
  b.buttons[4].dispatch('click', { detail: 1 }); b.time.advance(80);
  const position = b.diagram.dataset.progress;
  b.buttons[1].dispatch('click', { detail: 1 });
  selected(b, 1); assert.equal(b.diagram.dataset.progress, position);
  b.time.advance(180); settled(b, 1);
});
test('clicking each dot and dragging between them always selects a complete stage', () => {
  const b = explorer();
  for (let i = 0; i < 5; i++) {
    b.progress.dispatch('pointerdown', { isPrimary: true, button: 0, pointerId: 1, clientX: 108 + i * 150 });
    selected(b, i);
    b.window.dispatch('pointerup'); b.time.advance(180); settled(b, i);
  }
  b.progress.dispatch('pointerdown', { isPrimary: true, button: 0, pointerId: 1, clientX: 108 });
  b.progress.dispatch('pointermove', { clientX: 108 + 600 * 0.62 }); settled(b, 2);
  b.progress.dispatch('pointermove', { clientX: 108 + 600 * 0.63 }); settled(b, 3);
  b.window.dispatch('pointercancel'); settled(b, 3);
});
test('scroll thresholds snap both directions and ignore invalid or untrusted messages', () => {
  const b = explorer();
  for (const [progress, index] of [[0, 0], [12.4, 0], [12.5, 1], [62.4, 2], [62.5, 3], [100, 4], [49, 2], [-20, 0]]) {
    b.scroll(progress); b.time.advance(180); settled(b, index);
  }
  b.scroll(NaN); b.scroll(Infinity);
  b.window.dispatch('message', { source: {}, origin: 'https://untrusted.test', data: { type: 'verification-copy:progress', progress: 100 } });
  settled(b, 0);
});
test('manual selection survives page scroll and only a trusted resume restores automatic control', () => {
  const b = explorer();
  b.buttons[2].dispatch('click', { detail: 0 });
  b.scroll(100); settled(b, 2);
  b.scroll(75, { resume: true }); b.time.advance(180); settled(b, 3);
  b.document.activeElement = b.buttons[1]; b.timeline.dispatch('focusin');
  b.scroll(100, { resume: true }); settled(b, 3);
});
test('keyboard controls advance one full stage without animation and clamp at endpoints', () => {
  const b = explorer();
  for (const [key, index] of [['End', 4], ['ArrowRight', 4], ['ArrowLeft', 3], ['Home', 0], ['ArrowDown', 0], ['PageUp', 1]]) {
    b.progress.dispatch('keydown', { key }); settled(b, index);
  }
  b.buttons[4].dispatch('click', { detail: 0 }); settled(b, 4);
});
test('hidden pages, reduced motion and suspended frame callbacks cannot leave a partial diagram', () => {
  const b = explorer();
  b.buttons[4].dispatch('click', { detail: 1 }); b.time.advance(60);
  b.document.hidden = true; b.document.dispatch('visibilitychange'); settled(b, 4);
  b.document.hidden = false;
  b.buttons[1].dispatch('click', { detail: 1 }); b.time.advance(220, false); settled(b, 1);
  b.reduced.matches = true; b.reduced.dispatch('change');
  b.buttons[3].dispatch('click', { detail: 1 }); settled(b, 3);
  b.scroll(0, { resume: true }); settled(b, 3);
});
test('remeasuring the iframe preserves selection and reports ready plus dimensions', () => {
  const b = explorer();
  b.buttons[3].dispatch('click', { detail: 0 }); b.measure(); settled(b, 3);
  assert.ok(b.messages.some(message => message.type === 'verification-copy:ready'));
  assert.ok(b.messages.some(message => message.type === 'verification-copy:resize' && Number.isFinite(message.height)));
});

function parentPage() {
  const time = clock(), window = target(), frame = target(), reduced = target(), messages = [];
  let bounds = { top: 750, bottom: 1250 };
  const figure = { getBoundingClientRect: () => bounds };
  frame.src = 'https://portfolio.test/assets/demos/onboarding-copy/embed.html';
  frame.contentDocument = {};
  frame.contentWindow = { postMessage: message => messages.push(message) };
  frame.closest = () => figure;
  window.innerHeight = 1000; reduced.matches = false;
  window.matchMedia = () => reduced;
  const document = { querySelector: () => frame };
  vm.runInNewContext(bridge, { window, document, URL, ...time, ResizeObserver: class { observe() {} } });
  return { time, messages, window, frame, reduced,
    message(data) { window.dispatch('message', { source: frame.contentWindow, origin: 'https://portfolio.test', data }); time.advance(16); },
    move(top) { bounds = { top, bottom: top + 500 }; window.dispatch('scroll'); time.advance(16); },
  };
}
test('parent waits for iframe readiness, sends exact stages, and resumes only after full viewport exit', () => {
  const b = parentPage(); b.move(400);
  assert.ok(!b.messages.some(message => message.type === 'verification-copy:progress'));
  b.message({ type: 'verification-copy:ready' });
  assert.equal(b.messages.at(-1).progress, 50);
  b.message({ type: 'verification-copy:manual' }); const count = b.messages.length;
  b.move(250); assert.equal(b.messages.length, count);
  b.move(-501); b.move(300);
  assert.equal(b.messages.at(-1).resume, true);
  assert.equal(b.messages.at(-1).progress, 75);
  b.message({ type: 'verification-copy:focus', focused: true });
  b.move(-501); const focusedCount = b.messages.length; b.move(100);
  assert.equal(b.messages.length, focusedCount);
});
