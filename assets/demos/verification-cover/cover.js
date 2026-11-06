/* HousingAnywhere Work cover.
 * Figma: 914:9029 / 914:9117 / 914:9120; checklist: 875:3914.
 * One 7-second clock drives every visual track; the surrounding card stays a link.
 */
(() => {
  'use strict';
  if (customElements.get('verification-work-cover')) return;

  const base = new URL('.', document.currentScript.src);
  const asset = name => new URL('../verification-onboarding/assets/' + name, base).href;
  const DURATION = 7000;
  const RESET = 6400;
  const COMPLETE_EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';
  const CAMERA_EASE = 'cubic-bezier(0.645, 0.045, 0.355, 1)';
  const ZOOM = 1341 / 463;
  const wide = 'translate(592px, 78px) scale(' + 545 / 463 + ')';
  const close = 'translate(193px, 78px) scale(' + ZOOM + ')';
  const bookingView = 'translate(193px, ' + (78 - 99 * ZOOM) + 'px) scale(' + ZOOM + ')';
  const payoutTop = 570 * ZOOM - 1310;
  const payoutView = 'translate(193px, ' + (payoutTop - 198 * ZOOM) + 'px) scale(' + ZOOM + ')';

  const cards = [
    {id:'listing', title:'Publish first listing', icon:'home', height:306, top:0, gap:8, collapse:1800, tasks:[
      {id:'email', label:'Email', initial:true},
      {id:'mobile', label:'Mobile', initial:true},
      {id:'identity', label:'Identity', start:600},
      {id:'publish', label:'Publish first listing', start:1500, unlock:820}
    ]},
    {id:'booking', title:'Get a booking', icon:'message', height:246, top:315, gap:6, collapse:3050, tasks:[
      {id:'profile', label:'Complete your profile', start:2150},
      {id:'message', label:'Respond to a message', start:2450, unlock:2370},
      {id:'booking', label:'Confirm a booking', start:2750, unlock:2670}
    ]},
    {id:'payout', title:'Receive first payout', icon:'payout', height:246, top:570, gap:6, collapse:4300, tasks:[
      {id:'kyc', label:'Verify KYC', start:3400},
      {id:'payment', label:'Add a payment method', start:3700},
      {id:'payout', label:'Receive first payout', start:4000, unlock:3920}
    ]}
  ];

  const css = [
    ':host{position:absolute;inset:0;display:block;overflow:hidden;opacity:0;pointer-events:none;transition:opacity 180ms ease;font-family:"Study Inter",Inter,sans-serif;font-optical-sizing:none;font-synthesis:none;letter-spacing:normal;color:#002630;-webkit-font-smoothing:antialiased}',
    ':host([data-ready]){opacity:1}*{box-sizing:border-box}',
    '.canvas{position:absolute;left:0;top:0;width:1728px;height:1117px;overflow:hidden;transform-origin:0 0}',
    '.background{position:absolute;left:0;top:0;display:block}.camera{position:absolute;left:0;top:0;width:463px;height:816px;transform-origin:0 0;transform:' + wide + '}',
    '.stack{position:absolute;inset:0}.card{position:absolute;left:0;top:0;width:463px;background:#fff;border-radius:8px;clip-path:inset(0 0 0 0 round 8px)}',
    '.header{position:absolute;top:20px;left:20px;right:20px;height:50px;padding-left:8px;display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.card[data-card=listing] .header{right:16px}',
    '.heading-main{display:flex;align-items:center;gap:12px;min-width:0;flex:1}.card-icon{position:relative;width:28px;height:28px;flex-shrink:0}.card-icon img{position:absolute;inset:0;display:block}',
    '.heading-copy{display:flex;flex-direction:column;min-width:0;flex:1}.title{margin:0;font-size:20px;line-height:26px;font-weight:600;white-space:nowrap}',
    '.count{display:grid;height:24px;color:#90a2b0;font-size:14px;line-height:24px;font-weight:400;font-variant-numeric:tabular-nums}.count span{grid-area:1/1;opacity:0}.count span:first-child{opacity:1}',
    '.chevrons{position:relative;width:26px;height:26px;flex-shrink:0;transform:rotate(180deg)}.chevrons img{position:absolute;inset:0;display:block}.complete-icon{opacity:0}',
    '.panel{position:absolute;left:20px;right:20px;top:82px;padding:12px;border-radius:8px;background:#fafdff;box-shadow:0 2px .5px #0000000a,0 0 2.5px #0000000a,0 0 1px #0000001a}',
    '.steps{display:flex;flex-direction:column;margin:0;padding:0;list-style:none;gap:var(--row-gap)}.task{position:relative;display:flex;align-items:flex-start;gap:12px;height:24px}',
    '.task-icon{position:relative;width:24px;height:24px;flex-shrink:0}.task-icon img,.ring{position:absolute;inset:0;display:block}.ring{border:2px dashed #90a2b0;border-radius:50%}.check{opacity:0}.lock{opacity:0}',
    '.task-label{display:grid;min-width:0;font-size:16px;line-height:24px;white-space:nowrap}.task-label span{grid-area:1/1}.pending-label{font-weight:600}.done-label{font-weight:400;color:#171615;opacity:0;text-decoration:line-through;text-decoration-skip-ink:none;text-underline-position:from-font}',
    '.task.initial .ring,.task.initial .pending-label{opacity:0}.task.initial .check{opacity:1}.task.initial .done-label{opacity:.4}',
    '.task.locked .ring{opacity:0}.task.locked .lock{opacity:1}.task.locked .pending-label{color:#90a2b0}',
    '.connector{position:relative;width:24px;height:12px;flex-shrink:0}.connector img{position:absolute;left:0;top:-1px;display:block}.connector .done{opacity:0}.connector.initial .done{opacity:1}.connector.initial .pending{opacity:0}',
    '@media(prefers-reduced-motion:reduce){:host{transition:none}}'
  ].join('\n');

  let fontReady;
  // The home carousel has an inert duplicate for seamless wrapping. Both
  // copies share a clock while only their visible animation tracks run.
  const showcaseClocks = new WeakMap();
  function showcaseClock(root) {
    if (!root) return null;
    if (!showcaseClocks.has(root)) {
      showcaseClocks.set(root, {elapsed:0, origin:null, active:new Set()});
    }
    return showcaseClocks.get(root);
  }

  function loadFont() {
    if (!fontReady) {
      const face = new FontFace('Study Inter', 'url("' + asset('inter-variable.woff2') + '")', {
        weight:'100 900', style:'normal', display:'swap'
      });
      fontReady = face.load().then(loaded => document.fonts.add(loaded));
    }
    return fontReady;
  }

  function img(name, width, height, className) {
    return '<img src="' + asset(name) + '" width="' + width + '" height="' + height +
      '" alt="" draggable="false" class="' + className + '">';
  }

  class VerificationWorkCover extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this.animations = [];
      this.playing = false;
      this.inView = false;
      this.loaded = false;
      this.suspended = false;
      this.epoch = 0;
      this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    }

    connectedCallback() {
      if (this.connected) return;
      this.connected = true;
      const epoch = ++this.epoch;
      this.link = this.closest('.work-item, .showcase__item');
      this.showcase = this.closest('.showcase');
      this.sharedClock = showcaseClock(this.showcase);
      this.dataset.playing = 'false';
      this.render();
      this.events = new AbortController();
      const options = {signal:this.events.signal};
      document.addEventListener('visibilitychange', () => this.syncPlayback(), options);
      window.addEventListener('pagehide', () => { this.suspended = true; this.syncPlayback(); }, options);
      window.addEventListener('pageshow', () => { this.suspended = false; this.syncPlayback(); }, options);
      this.motion.addEventListener('change', () => {
        if (this.motion.matches) {
          this.pauseTracks();
          for (const animation of this.animations) animation.currentTime = 0;
          if (this.sharedClock) {
            this.sharedClock.elapsed = 0;
            this.sharedClock.origin = null;
          }
          this.setPhase(0);
        }
        this.syncPlayback();
      }, options);

      this.resizeObserver = new ResizeObserver(entries => {
        const width = entries[0].contentRect.width;
        if (width > 0) this.shadowRoot.querySelector('.canvas').style.transform = 'scale(' + width / 1728 + ')';
      });
      this.resizeObserver.observe(this);
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
        this.syncPlayback();
      }, {threshold:[0,.25]});
      this.intersectionObserver.observe(this);
      this.filterObserver = new MutationObserver(() => this.syncPlayback());
      if (this.link) this.filterObserver.observe(this.link, {attributes:true, attributeFilter:['hidden']});

      const poster = this.parentElement.querySelector('img');
      const images = [...this.shadowRoot.querySelectorAll('img')];
      const posterReady = poster ? poster.decode().catch(() => {}) : Promise.resolve();
      Promise.all([loadFont(), posterReady, ...images.map(image => image.decode())]).then(() => {
        if (!this.isConnected || epoch !== this.epoch) return;
        this.buildTimeline();
        this.loaded = true;
        this.setAttribute('data-ready','');
        this.setPhase(0);
        this.syncPlayback();
      }).catch(error => {
        if (epoch !== this.epoch) return;
        // The native poster and project link remain usable if enhancement fails.
        this.removeAttribute('data-ready');
        console.error('Verification cover could not start.', error);
      });
    }

    disconnectedCallback() {
      this.epoch++;
      this.connected = false;
      this.loaded = false;
      this.pauseTracks();
      this.events?.abort();
      this.resizeObserver?.disconnect();
      this.intersectionObserver?.disconnect();
      this.filterObserver?.disconnect();
      for (const animation of this.animations) animation.cancel();
      this.animations = [];
      this.removeAttribute('data-ready');
    }

    render() {
      const markup = cards.map(card => {
        const initial = card.tasks.filter(task => task.initial).length;
        const counts = Array.from({length:card.tasks.length-initial+1}, (_, i) =>
          '<span>' + (initial+i) + '/' + card.tasks.length + ' completed</span>').join('');
        const steps = card.tasks.map((task, i) => {
          const locked = task.unlock !== undefined;
          const row = '<li class="task' + (task.initial?' initial':'') + (locked?' locked':'') + '" data-task="' + task.id + '">' +
            '<span class="task-icon"><span class="ring"></span>' +
            img(card.id==='listing'?'lock.svg':'lock-secondary.svg',24,24,'lock') +
            img('check.svg',24,24,'check') + '</span>' +
            '<span class="task-label"><span class="pending-label">' + task.label +
            '</span><span class="done-label">' + task.label + '</span></span></li>';
          return row + (i===card.tasks.length-1?'':'<li class="connector' + (task.initial?' initial':'') + '" data-after="' + task.id + '">' +
            img('connector-pending.svg',24,14,'pending') + img('connector-complete.svg',24,14,'done') + '</li>');
        }).join('');
        const chevron = card.id==='payout'?'chevron-payout.svg':'chevron.svg';
        return '<section class="card" data-card="' + card.id + '" style="height:' + card.height + 'px;transform:translateY(' + card.top + 'px)">' +
          '<div class="header"><div class="heading-main"><span class="card-icon">' +
          img(card.icon+'.svg',28,28,'pending-icon') + img(card.icon+'-complete.svg',28,28,'complete-icon') +
          '</span><span class="heading-copy"><span class="title">' + card.title +
          '</span><span class="count">' + counts + '</span></span></div><span class="chevrons">' +
          img(chevron,26,26,'pending-icon') + img('chevron-complete.svg',26,26,'complete-icon') +
          '</span></div><div class="panel"><ol class="steps" style="--row-gap:' + card.gap + 'px">' + steps + '</ol></div></section>';
      }).join('');
      this.shadowRoot.innerHTML = '<style>' + css + '</style><div class="canvas">' +
        '<img class="background" src="' + new URL('cover-background.webp',base).href +
        '" width="1728" height="1117" alt="" draggable="false"><div class="camera"><div class="stack">' + markup + '</div></div></div>';
    }

    track(element, property, points) {
      // Deduplicate coincident holds so the last value/easing owns that instant.
      const unique = new Map(points.map(point => [point[0],point]));
      const keyframes = [...unique.values()].sort((a,b) => a[0]-b[0]).map(point => ({
        [property]:point[1], offset:point[0]/DURATION, easing:point[2]||'linear'
      }));
      const animation = element.animate(keyframes, {duration:DURATION, iterations:Infinity, fill:'both', easing:'linear'});
      animation.pause();
      animation.currentTime = 0;
      this.animations.push(animation);
      return animation;
    }

    change(element, property, before, after, start, duration=220) {
      return this.track(element, property, [
        [0,before],[start,before,COMPLETE_EASE],[start+duration,after],
        [RESET-1,after],[RESET,before],[DURATION,before]
      ]);
    }

    buildTimeline() {
      const root = this.shadowRoot;
      this.clock = this.track(root.querySelector('.camera'),'transform',[
        [0,wide],[900,wide,CAMERA_EASE],[1500,close],
        [1800,close,COMPLETE_EASE],[2150,bookingView],
        [3050,bookingView,COMPLETE_EASE],[3400,payoutView],
        [5200,payoutView,CAMERA_EASE],[5850,wide],[DURATION,wide]
      ]);
      this.track(root.querySelector('.stack'),'opacity',[
        [0,1],[6250,1],[RESET,0],[6600,1],[DURATION,1]
      ]);

      for (const card of cards) {
        const node = root.querySelector('[data-card="' + card.id + '"]');
        this.change(node,'clipPath','inset(0px 0px 0px 0px round 8px)',
          'inset(0px 0px ' + (card.height-90) + 'px 0px round 8px)',card.collapse,350);
        this.change(node.querySelector('.panel'),'opacity',1,0,card.collapse,250);
        this.change(node.querySelector('.chevrons'),'transform','rotate(180deg)','rotate(0deg)',card.collapse,350);
        if (card.id==='booking') {
          this.track(node,'transform',[
            [0,'translateY(315px)'],[1800,'translateY(315px)',COMPLETE_EASE],[2150,'translateY(99px)'],
            [RESET-1,'translateY(99px)'],[RESET,'translateY(315px)'],[DURATION,'translateY(315px)']
          ]);
        } else if (card.id==='payout') {
          this.track(node,'transform',[
            [0,'translateY(570px)'],[1800,'translateY(570px)',COMPLETE_EASE],[2150,'translateY(354px)'],
            [3050,'translateY(354px)',COMPLETE_EASE],[3400,'translateY(198px)'],
            [RESET-1,'translateY(198px)'],[RESET,'translateY(570px)'],[DURATION,'translateY(570px)']
          ]);
        }

        const pending = card.tasks.filter(task => !task.initial);
        const completedAt = pending.map(task => task.start+220);
        const countNodes = [...node.querySelectorAll('.count span')];
        countNodes.forEach((count, i) => {
          const points = [[0,i===0?1:0]];
          if (i>0) points.push([completedAt[i-1]-90,0,COMPLETE_EASE],[completedAt[i-1],1]);
          if (i<completedAt.length) points.push([completedAt[i]-90,1,COMPLETE_EASE],[completedAt[i],0]);
          points.push([RESET-1,i===completedAt.length?1:0],[RESET,i===0?1:0],[DURATION,i===0?1:0]);
          this.track(count,'opacity',points);
        });
        const finish = completedAt[completedAt.length-1];
        this.change(node.querySelector('.title'),'color','#002630','#0b653a',finish-180,180);
        node.querySelectorAll('.header .pending-icon').forEach(icon => this.change(icon,'opacity',1,0,finish-180,180));
        node.querySelectorAll('.header .complete-icon').forEach(icon => this.change(icon,'opacity',0,1,finish-180,180));

        for (const task of pending) {
          const row = node.querySelector('[data-task="' + task.id + '"]');
          const initialRing = task.unlock===undefined?1:0;
          const ring = [[0,initialRing]];
          if (task.unlock!==undefined) {
            ring.push([task.unlock,0,COMPLETE_EASE],[task.unlock+80,1]);
            this.change(row.querySelector('.lock'),'opacity',1,0,task.unlock,80);
            this.change(row.querySelector('.pending-label'),'color','#90a2b0','#002630',task.unlock,80);
          }
          ring.push([task.start,1,COMPLETE_EASE],[task.start+180,0],
            [RESET-1,0],[RESET,initialRing],[DURATION,initialRing]);
          this.track(row.querySelector('.ring'),'opacity',ring);
          this.change(row.querySelector('.check'),'opacity',0,1,task.start);
          this.change(row.querySelector('.check'),'transform','scale(.82)','scale(1)',task.start);
          this.change(row.querySelector('.pending-label'),'opacity',1,0,task.start);
          this.change(row.querySelector('.done-label'),'opacity',0,.4,task.start);
          const connector = node.querySelector('[data-after="' + task.id + '"]');
          if (connector) {
            this.change(connector.querySelector('.pending'),'opacity',1,0,task.start);
            this.change(connector.querySelector('.done'),'opacity',0,1,task.start);
          }
        }
      }
    }

    pauseTracks() {
      cancelAnimationFrame(this.phaseFrame);
      const time = Number(this.clock?.currentTime)||0;
      if (this.sharedClock?.active.delete(this) && this.sharedClock.active.size===0) {
        this.sharedClock.elapsed = time;
        this.sharedClock.origin = null;
      }
      for (const animation of this.animations) { animation.pause(); animation.currentTime = time; }
      this.playing = false;
      this.dataset.playing = 'false';
      this.setPhase(time);
    }

    syncPlayback() {
      const canPlay = this.loaded && !this.motion.matches && this.inView && !document.hidden &&
        !this.suspended && !this.link?.hidden && this.isConnected;
      if (canPlay===this.playing) return;
      if (!canPlay) { this.pauseTracks(); return; }
      let time = Number(this.clock.currentTime)||0;
      const now = document.timeline.currentTime;
      let origin = now-time;
      if (this.sharedClock) {
        if (this.sharedClock.active.size===0) {
          this.sharedClock.origin = now-this.sharedClock.elapsed;
        }
        origin = this.sharedClock.origin;
        time = Math.max(0,now-origin);
        this.sharedClock.active.add(this);
      }
      for (const animation of this.animations) {
        animation.currentTime = time;
        animation.play();
        animation.startTime = origin;
      }
      this.playing = true;
      this.dataset.playing = 'true';
      const tick = () => {
        this.setPhase(Number(this.clock.currentTime)||0);
        this.phaseFrame = requestAnimationFrame(tick);
      };
      this.phaseFrame = requestAnimationFrame(tick);
    }

    setPhase(elapsed) {
      const time = elapsed%DURATION;
      const phases = [
        [0,'overview'],[600,'identity'],[900,'zoom'],[1500,'publishing'],[1800,'listing-collapse'],
        [2150,'booking'],[3050,'booking-collapse'],[3400,'payout'],[4300,'payout-collapse'],
        [4650,'complete'],[5200,'zoom-out'],[5850,'completed-overview'],[6250,'reset'],[6600,'overview']
      ];
      const phase = phases.findLast(entry => time>=entry[0])[1];
      if (this.dataset.phase!==phase) this.dataset.phase = phase;
    }
  }

  customElements.define('verification-work-cover',VerificationWorkCover);
})();
