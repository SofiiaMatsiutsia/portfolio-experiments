/* Original design: Sofiia Matsiutsia, Figma node 875:3914.
 * A dependency-free, reusable interactive case-study component. */
(() => {
  'use strict';
  if (customElements.get('verification-onboarding')) return;
  const base = new URL('.', document.currentScript.src);
  const asset = name => new URL(`assets/${name}`, base).href;
  if (!document.getElementById('verification-study-font')) {
    const font = document.createElement('style');
    font.id = 'verification-study-font';
    font.textContent = `@font-face{font-family:Study Inter;src:url("${asset('inter-variable.woff2')}") format("woff2");font-style:normal;font-weight:100 900;font-display:swap}`;
    document.head.append(font);
  }

  const cards = [
    {id:'listing',title:'Publish first listing',icon:'home.svg',completedIcon:'home-complete.svg',chevron:'chevron.svg',gap:8,tasks:[
      {id:'email',label:'Email',initial:true},
      {id:'mobile',label:'Mobile',initial:true},
      {id:'identity',label:'Identity',busy:'Verifying identity…',needs:[]},
      {id:'publish',label:'Publish first listing',busy:'Publishing listing…',needs:['identity']}
    ]},
    {id:'booking',title:'Get a booking',icon:'message.svg',completedIcon:'message-complete.svg',chevron:'chevron.svg',gap:6,tasks:[
      {id:'profile',label:'Complete your profile',busy:'Saving profile…',needs:[]},
      {id:'message',label:'Respond to a message',busy:'Sending response…',needs:['publish','profile']},
      {id:'booking',label:'Confirm a booking',busy:'Confirming booking…',needs:['message']}
    ]},
    {id:'payout',title:'Receive first payout',icon:'payout.svg',completedIcon:'payout-complete.svg',chevron:'chevron-payout.svg',gap:6,tasks:[
      {id:'kyc',label:'Verify KYC',busy:'Verifying KYC…',needs:['booking']},
      {id:'payment',label:'Add a payment method',busy:'Adding payment method…',needs:['booking']},
      {id:'payout',label:'Receive first payout',busy:'Preparing payout…',needs:['booking','kyc','payment']}
    ]}
  ];
  const allTasks = cards.flatMap(card => card.tasks.map(task => ({...task,cardId:card.id})));
  const byId = new Map(allTasks.map(task => [task.id,task]));
  // Figma presents the original 463px checklist at 400px, inside a fixed frame.
  const designScale = 400 / 463;
  const ease = 'cubic-bezier(0.25, 1, 0.5, 1)';
  const css = `
    :host{display:block;width:100%;height:100%;letter-spacing:normal;font-family:Study Inter,Inter,sans-serif;color:#002630;-webkit-font-smoothing:antialiased;font-optical-sizing:none;font-size:16px;text-align:left}
    *{box-sizing:border-box}button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
    .demo{width:100%;height:100%}.cards{display:flex;flex-direction:column;gap:7.775378px;isolation:isolate;width:100%;max-width:400px;margin-inline:auto}
    .card{position:relative;flex-shrink:0;width:100%;height:212.526998px;border-radius:6.911447px;overflow:clip}
    .card:first-child{height:264.362851px}.surface{position:absolute;inset:0 0 auto;height:100%;background:#fff;border-radius:6.911447px;pointer-events:none}
    .header{position:absolute;top:17.278618px;left:17.278618px;right:17.278618px;display:flex;align-items:center;justify-content:space-between;gap:8.639309px;width:calc(100% - 34.557235px);padding:0 0 0 6.911447px;margin:0;border:0;border-radius:3.455724px;background:transparent;text-align:left;cursor:pointer}
    .heading-main{display:flex;align-items:center;gap:10.367171px;min-width:0;flex:1}
    .card-icon{width:24.190065px;height:24.190065px;flex-shrink:0;display:block;transition:transform 150ms ease}
    .heading-copy{display:flex;flex-direction:column;min-width:0;flex:1}
    .title{font-size:17.278618px;font-weight:600;line-height:1.3;letter-spacing:0;overflow-wrap:break-word}
    .count{font-size:12.095032px;line-height:20.734341px;font-weight:400;color:#90a2b0;display:block;font-variant-numeric:tabular-nums;transition:color 180ms ease}
    .card.is-complete .title,.card.is-complete .header:hover .title{color:#0b653a}.chevron{display:block;width:22.462203px;height:22.462203px;flex-shrink:0;transform:rotate(180deg)}
    .body{position:absolute;left:17.278618px;right:17.278618px;top:70.842333px}
    .panel{background:#fafdff;padding:10.367171px;border-radius:6.911447px;box-shadow:0 1.727862px 0.431965px #0000000a,0 0 2.159827px #0000000a,0 0 0.863931px #0000001a}
    .steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--row-gap)}
    .step{position:relative;height:20.734341px;margin:0;padding:0}
    .task{position:relative;z-index:0;display:flex;align-items:flex-start;gap:10.367171px;width:100%;min-height:20.734341px;text-align:left;border:0;padding:0;margin:0;background:transparent;border-radius:3.455724px;cursor:pointer;transition:transform 150ms cubic-bezier(.25,.46,.45,.94)}
    .task:before{content:'';position:absolute;inset:-8.639309px -5.183585px;z-index:-1;border-radius:5.183585px;transition:background-color 150ms ease}
    .task:active:not([aria-disabled=true]){transform:scale(.985)}
    .task:focus-visible,.header:focus-visible{outline:1.727862px solid #00728b;outline-offset:4.319654px}
    .task[aria-disabled=true]{cursor:not-allowed}.task[data-state=complete]{cursor:default}
    .task-icon{position:relative;display:block;flex-shrink:0;width:20.734341px;height:20.734341px}
    .task-icon img,.ring,.spinner{position:absolute;left:0;top:0;width:20.734341px;height:20.734341px;display:block}
    .task-icon img{opacity:0}.task-icon .check{z-index:2}.ring{border:1.727862px dashed #90a2b0;border-radius:50%;opacity:0}
    .spinner{border:1.727862px solid #dce8ec;border-top-color:#00728b;border-radius:50%;opacity:0}
    .task[data-state=available] .ring{opacity:1}.task[data-state=locked] .lock{opacity:1}.task[data-state=complete] .check{opacity:1}
    .task[data-state=checking] .spinner{opacity:1;animation:spin .7s linear infinite}
    .task-label{display:block;position:relative;min-width:0;font-size:13.822894px;font-weight:600;line-height:20.734341px;transition:color 180ms ease,opacity 180ms ease;overflow-wrap:break-word}
    .task[data-state=locked] .task-label{color:#90a2b0}
    .task[data-state=checking] .task-label{font-weight:400;color:#567580}
    .task[data-state=complete] .task-label{font-weight:400;color:#171615;opacity:.4;text-decoration:line-through;text-decoration-skip-ink:none;text-underline-position:from-font}
    .connector{position:relative;height:10.367171px;width:20.734341px;flex-shrink:0;pointer-events:none}
    .connector img{position:absolute;left:0;top:-0.863931px;width:20.734341px;height:12.095032px;display:block;transition:opacity 180ms ease}
    .connector .done{opacity:0}.connector.is-complete .done{opacity:1}.connector.is-complete .pending{opacity:0}
    .toolbar{display:flex;align-items:center;justify-content:center;height:24px;min-height:24px;margin-bottom:24px}
    .control{display:inline-flex;align-items:center;justify-content:center;width:44px;min-height:44px;border:0;border-radius:7px;padding:0;background:transparent;color:#B0B0B0;cursor:pointer;transition:transform 150ms cubic-bezier(.25,.46,.45,.94)}
    .control:active{transform:scale(.97)}.control:focus-visible{outline:2px solid #00728b;outline-offset:3px}
    .control-icon{display:block;width:24px;height:24px;position:relative}
    .reset-icon{font-family:Arial,sans-serif;font-size:24px;line-height:24px}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .keyboard .task,.keyboard .control,.keyboard .card-icon{transition:none!important;transform:none!important}
    .reduced-motion *,.reduced-motion *:before{transition:none!important}.reduced-motion .task:active:not([aria-disabled=true]),.reduced-motion .control:active,.reduced-motion .header:hover .card-icon{transform:none}.reduced-motion .task[data-state=checking] .spinner{animation:none;border-style:dashed;border-color:#7095a3}.reduced-motion .reset-icon{transform:none}
    @media(hover:hover) and (pointer:fine){.header:hover .title{color:#006078}.header:hover .card-icon{transform:translateY(-1px)}.task[data-state=available]:hover:before{background:#eaf3f6}.task[data-state=available]:hover .task-label{color:#006078}}
    @media(prefers-reduced-motion:reduce){*,*:before{transition:none!important}.task:active:not([aria-disabled=true]),.control:active,.header:hover .card-icon{transform:none}.task[data-state=checking] .spinner{animation:none;border-style:dashed;border-color:#7095a3}.reset-icon{transform:none}}
    @keyframes spin{to{transform:rotate(360deg)}}
  `;

  class VerificationOnboarding extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this.done = new Set(allTasks.filter(t => t.initial).map(t => t.id));
      this.openCards = new Set(cards.map(c => c.id));
      this.pending = new Map();
      this.completionClosures = new Map();
      this.animations = new Set();
      this.version = 0;
      this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
      this.uid = `onboarding-${Math.random().toString(36).slice(2,9)}`;
    }

    connectedCallback() {
      if (this.ready) return;
      this.ready = true;
      this.render();
      if(!this.listenersAttached){
        this.shadowRoot.addEventListener('click', event => this.onClick(event));
        this.shadowRoot.addEventListener('keydown', event => {
          if (event.key === 'Tab') this.shadowRoot.querySelector('.demo').classList.add('keyboard');
        });
        this.shadowRoot.addEventListener('pointerdown', () => this.shadowRoot.querySelector('.demo').classList.remove('keyboard'));
        this.listenersAttached=true;
      }
      this.onMotionChange = () => {
        this.cancelAnimations();
        this.shadowRoot.querySelector('.demo').classList.toggle('reduced-motion',this.reducedMotion);
        this.measure();
      };
      this.reduce.addEventListener('change', this.onMotionChange);
      this.resizeObserver = new ResizeObserver(() => {
        const width = this.getBoundingClientRect().width;
        if (width !== this.measuredWidth) {
          this.measuredWidth = width;
          this.cancelAnimations();
          this.measure();
        }
        this.notifyHeight();
      });
      this.resizeObserver.observe(this);
      document.fonts.ready.then(() => { if(this.isConnected) this.measure(); });
      this.measure();
    }

    disconnectedCallback() {
      this.stopDemo();
      this.clearPending();
      this.cancelAnimations();
      this.resizeObserver?.disconnect();
      this.reduce.removeEventListener('change', this.onMotionChange);
      this.ready = false;
    }

    render() {
      this.shadowRoot.innerHTML = `<style>${css}</style><div class="demo${this.reducedMotion?' reduced-motion':''}"><div class="toolbar"><button type="button" class="control reset" data-action="reset" aria-label="Reset demo"><img class="control-icon" src="${asset('reset.svg')}" width="24" height="24" alt="" aria-hidden="true"></button></div><div class="cards">${cards.map(card => `
        <section class="card" data-card="${card.id}" aria-label="${card.title}">
          <div class="surface"></div>
          <button type="button" class="header" data-toggle="${card.id}" aria-expanded="true" aria-controls="${this.uid}-${card.id}">
            <span class="heading-main"><img class="card-icon" src="${asset(card.icon)}" width="28" height="28" alt=""><span class="heading-copy"><span class="title">${card.title}</span><span class="count">${card.tasks.filter(t=>t.initial).length}/${card.tasks.length} completed</span></span></span>
            <img class="chevron" src="${asset(card.chevron)}" width="26" height="26" alt="">
          </button>
          <div class="body" id="${this.uid}-${card.id}"><div class="panel"><ol class="steps" style="--row-gap:${card.gap*designScale}px">${card.tasks.map((task,i) => `
            <li class="step"><button class="task" type="button" data-task="${task.id}" aria-describedby="${this.uid}-help-${task.id}">
              <span class="task-icon" aria-hidden="true"><span class="ring"></span><img class="lock" src="${asset(card.id==='listing'?'lock.svg':'lock-secondary.svg')}" width="24" height="24" alt=""><span class="spinner"></span><img class="check" src="${asset('check.svg')}" width="24" height="24" alt=""></span>
              <span class="task-label">${task.label}</span>
            </button><span class="sr-only" id="${this.uid}-help-${task.id}"></span></li>
            ${i<card.tasks.length-1?`<li class="connector" data-after="${task.id}" aria-hidden="true"><img class="pending" src="${asset('connector-pending.svg')}" width="24" height="14" alt=""><img class="done" src="${asset('connector-complete.svg')}" width="24" height="14" alt=""></li>`:''}
          `).join('')}</ol></div></div>
        </section>`).join('')}</div>
        <div class="sr-only live" role="status" aria-live="polite" aria-atomic="true"></div>
      </div>`;
      this.update();
    }

    get reducedMotion(){return this.reduce.matches||this.hasAttribute('reduced-motion');}

    stateOf(id) {
      if (this.done.has(id)) return 'complete';
      if (this.pending.has(id)) return 'checking';
      return (byId.get(id).needs || []).every(need => this.done.has(need)) ? 'available' : 'locked';
    }

    missingRequirements(task) {
      if(task.cardId==='payout'&&!this.done.has('booking'))return [byId.get('booking').label];
      return (task.needs||[]).filter(id=>!this.done.has(id)).map(id=>byId.get(id).label);
    }

    update(changedId, animated=true) {
      for (const task of allTasks) {
        const element = this.shadowRoot.querySelector(`[data-task="${task.id}"]`);
        const previous = element.dataset.state;
        const state = this.stateOf(task.id);
        element.dataset.state = state;
        element.setAttribute('aria-disabled', String(state==='complete'||state==='locked'||state==='checking'));
        element.setAttribute('aria-busy', String(state==='checking'));
        element.tabIndex=state==='complete'||state==='checking'?-1:0;
        element.setAttribute('aria-label', `${task.label}, ${state==='available'?'start step':state==='checking'?'in progress':state}`);
        element.querySelector('.task-label').textContent = state==='checking'?task.busy:task.label;
        const missing = this.missingRequirements(task);
        const help = state==='locked'?`Finish ${missing.map(label=>`“${label}”`).join(' and ')} first.`:state==='complete'?'This step is complete.':state==='checking'?'Demo step in progress.':'Click to complete this demo step.';
        this.shadowRoot.getElementById(`${this.uid}-help-${task.id}`).textContent=help;
        element.title=state==='locked'?help:'';
        if (state==='complete' && previous && previous!=='complete') {
          this.animate(element.querySelector('.check'),this.reducedMotion||!animated?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'scale(.82)'},{opacity:1,transform:'scale(1)'}],{duration:220},animated);
          this.animate(element.querySelector('.task-label'),[{opacity:.8},{opacity:.4}],{duration:220},animated);
        } else if (state==='available' && previous==='locked') {
          this.animate(element.querySelector('.ring'),[{opacity:0},{opacity:1}],{duration:180},animated);
          this.animate(element.querySelector('.task-label'),[{opacity:.5},{opacity:1}],{duration:180},animated);
        }
        const connector=this.shadowRoot.querySelector(`[data-after="${task.id}"]`);
        connector?.classList.toggle('is-complete',state==='complete');
      }
      for (const card of cards) {
        const element=this.cardElement(card.id);
        const count=card.tasks.filter(t=>this.done.has(t.id)).length;
        const label=`${count}/${card.tasks.length} completed`;
        const counter=element.querySelector('.count');
        if(counter.textContent!==label){
          counter.textContent=label;
          this.animate(counter,this.reducedMotion||!animated?[{opacity:.25},{opacity:1}]:[{opacity:.25,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180},animated);
        }
        const complete=count===card.tasks.length;
        const wasComplete=element.classList.contains('is-complete');
        element.classList.toggle('is-complete',complete);
        const icon=element.querySelector('.card-icon');
        const chevron=element.querySelector('.chevron');
        const iconSource=asset(complete?card.completedIcon:card.icon);
        const chevronSource=asset(complete?'chevron-complete.svg':card.chevron);
        if(icon.src!==iconSource)icon.src=iconSource;
        if(chevron.src!==chevronSource)chevron.src=chevronSource;
        if(complete&&!wasComplete&&changedId){
          const version=this.version;
          const timer=setTimeout(()=>{
            this.completionClosures.delete(card.id);
            if(version===this.version)this.setOpen(card.id,false,{animated});
          },320);
          this.completionClosures.set(card.id,timer);
        }
      }
      if(changedId){
        const task=byId.get(changedId);
        const card=cards.find(c=>c.id===task.cardId);
        const count=card.tasks.filter(t=>this.done.has(t.id)).length;
        this.announce(`${task.label} complete. ${card.title}: ${count} of ${card.tasks.length} completed.`);
        this.dispatchEvent(new CustomEvent('onboarding:change',{bubbles:true,composed:true,detail:{completed:[...this.done],task:changedId}}));
      }
      this.notifyHeight();
    }

    cardElement(id){return this.shadowRoot.querySelector(`[data-card="${id}"]`);}

    measure() {
      for(const card of cards){
        const element=this.cardElement(card.id);
        const header=element.querySelector('.header');
        const body=element.querySelector('.body');
        const headerHeight=header.getBoundingClientRect().height;
        const collapsed=40*designScale+headerHeight;
        const expanded=collapsed+12*designScale+body.getBoundingClientRect().height;
        element.dataset.collapsed=collapsed;
        element.dataset.expanded=expanded;
        element.style.height=`${this.openCards.has(card.id)?expanded:collapsed}px`;
        element.querySelector('.surface').style.height=`${expanded}px`;
        body.style.top=`${32*designScale+headerHeight}px`;
        this.setCardVisual(card.id);
      }
      this.notifyHeight();
    }

    setCardVisual(id) {
      const element=this.cardElement(id);
      const open=this.openCards.has(id);
      const expanded=Number(element.dataset.expanded);
      const collapsed=Number(element.dataset.collapsed);
      const body=element.querySelector('.body');
      element.querySelector('.surface').style.clipPath=`inset(0px 0px ${open?0:expanded-collapsed}px 0px round ${8*designScale}px)`;
      body.style.clipPath=open?'inset(-4px -4px -4px -4px)':'inset(0px 0px 100% 0px)';
      body.style.opacity=open?'1':'0';
      body.style.visibility=open?'visible':'hidden';
      body.inert=!open;
      element.querySelector('.header').setAttribute('aria-expanded',String(open));
      element.querySelector('.chevron').style.transform=`rotate(${open?180:0}deg)`;
    }

    setOpen(id,open,{animated=true}={}) {
      if(this.openCards.has(id)===open)return;
      const snapshots=cards.map(c=>{
        const element=this.cardElement(c.id);
        return {id:c.id,top:element.getBoundingClientRect().top,surface:getComputedStyle(element.querySelector('.surface')).clipPath,clip:getComputedStyle(element.querySelector('.body')).clipPath,opacity:getComputedStyle(element.querySelector('.body')).opacity,chevron:getComputedStyle(element.querySelector('.chevron')).transform};
      });
      const priorHeight=Math.max(this.holdHeight||0,document.body.getBoundingClientRect().height);
      const layoutVersion=(this.layoutVersion||0)+1;
      this.layoutVersion=layoutVersion;
      this.cancelAnimations();
      open?this.openCards.add(id):this.openCards.delete(id);
      const element=this.cardElement(id);
      const body=element.querySelector('.body');
      if(!open && body.contains(this.shadowRoot.activeElement))element.querySelector('.header').focus({preventScroll:true});
      this.measure();
      const moving=animated&&!this.reducedMotion;
      const duration=open?280:230;
      if(moving)this.holdHeight=Math.max(this.holdHeight||0,priorHeight);
      for(const snapshot of snapshots){
        const node=this.cardElement(snapshot.id);
        const delta=snapshot.top-node.getBoundingClientRect().top;
        if(moving&&Math.abs(delta)>.1)this.animate(node,[{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration},true);
        const nodeBody=node.querySelector('.body');
        const nodeOpen=this.openCards.has(snapshot.id);
        if(moving){
          node.style.overflow='visible';
          const surface=node.querySelector('.surface');
          const surfaceAnimation=this.animate(surface,[{clipPath:snapshot.surface},{clipPath:surface.style.clipPath}],{duration},true);
          surfaceAnimation.finished.then(()=>{
            if(this.layoutVersion!==layoutVersion)return;
            node.style.overflow='clip';
            this.holdHeight=0;
            this.notifyHeight();
          }).catch(()=>{});
          if(nodeOpen||Number(snapshot.opacity)>0){
            nodeBody.style.visibility='visible';
            const animation=this.animate(nodeBody,[{clipPath:snapshot.clip,opacity:snapshot.opacity},{clipPath:nodeBody.style.clipPath,opacity:nodeOpen?1:0}],{duration},true);
            animation?.finished.then(()=>{if(!this.openCards.has(snapshot.id))nodeBody.style.visibility='hidden';}).catch(()=>{});
          }
          this.animate(node.querySelector('.chevron'),[{transform:snapshot.chevron},{transform:`rotate(${nodeOpen?180:0}deg)`}],{duration:220,easing:'cubic-bezier(.645,.045,.355,1)'},true);
        }else if(snapshot.id===id&&open&&animated){
          this.animate(nodeBody,[{opacity:0},{opacity:1}],{duration:100},true);
        }
      }
      this.notifyHeight();
    }

    animate(element,keyframes,options={},enabled=true) {
      if(!enabled)return null;
      const animation=element.animate(keyframes,{easing:ease,...options});
      this.animations.add(animation);
      animation.finished.then(()=>this.animations.delete(animation)).catch(()=>this.animations.delete(animation));
      animation.finished.then(()=>this.notifyHeight()).catch(()=>{});
      return animation;
    }

    cancelAnimations(){for(const animation of this.animations)animation.cancel();this.animations.clear();for(const node of this.shadowRoot.querySelectorAll('.card'))node.style.overflow='clip';this.holdHeight=0;}

    onClick(event) {
      const button=event.target.closest('button');
      if(!button)return;
      const animated=event.detail!==0;
      if(button.dataset.action==='reset'){this.reset();return;}
      this.stopDemo({quiet:true});
      if(button.dataset.toggle){
        const id=button.dataset.toggle;
        clearTimeout(this.completionClosures.get(id));
        this.completionClosures.delete(id);
        this.setOpen(id,!this.openCards.has(id),{animated});
        this.setHint('Open a card. Try a step.');
      }else if(button.dataset.task){
        const id=button.dataset.task;
        if(this.stateOf(id)==='locked'){
          const missing=this.missingRequirements(byId.get(id));
          const message=`Finish ${missing.map(label=>`“${label}”`).join(' and ')} first.`;
          this.setHint(message,'locked');
          this.announce(message);
        }else if(this.stateOf(id)==='available')this.completeTask(id,{animated});
        else if(this.stateOf(id)==='complete'){this.setHint('Already complete. Keep going.');this.announce(`${byId.get(id).label} is already complete.`);}
      }
    }

    completeTask(id,{animated=true}={}) {
      if(this.stateOf(id)!=='available')return Promise.resolve(false);
      const version=this.version;
      return new Promise(resolve=>{
        const duration=['identity','kyc'].includes(id)?850:650;
        const timer=setTimeout(()=>{
          this.pending.delete(id);
          if(version!==this.version){resolve(false);return;}
          this.done.add(id);
          this.update(id,animated);
          const complete=allTasks.every(t=>this.done.has(t.id));
          this.setHint(complete?'All set. Every step is complete.':'Step complete. Your next step is ready.','success');
          resolve(true);
        },duration);
        this.pending.set(id,{timer,resolve});
        this.update(null,animated);
        this.setHint(byId.get(id).busy);
        this.announce(byId.get(id).busy);
      });
    }

    clearPending(){for(const action of this.pending.values()){clearTimeout(action.timer);action.resolve(false);}this.pending.clear();for(const timer of this.completionClosures.values())clearTimeout(timer);this.completionClosures.clear();}

    reset({quiet=false}={}) {
      this.stopDemo({quiet:true});
      this.version++;
      this.clearPending();
      this.cancelAnimations();
      this.done=new Set(allTasks.filter(t=>t.initial).map(t=>t.id));
      this.openCards=new Set(cards.map(c=>c.id));
      this.update(null,false);
      this.measure();
      this.setHint('Open a card. Try a step.');
      if(!quiet)this.announce('Demo reset. Two of four listing steps complete.');
    }

    async playDemo() {
      this.reset({quiet:true});
      const controller=new AbortController();
      this.replayController=controller;
      const signal=controller.signal;
      this.setHint('Watch the flow, or click to take over.');
      const wait=ms=>new Promise((resolve,reject)=>{
        if(signal.aborted){reject(new DOMException('Aborted','AbortError'));return;}
        const stop=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};
        const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},ms);
        signal.addEventListener('abort',stop,{once:true});
      });
      const check=()=>{if(signal.aborted)throw new DOMException('Aborted','AbortError');};
      const finish=async id=>{check();await this.completeTask(id);check();await wait(430);};
      try{
        await wait(650);
        this.setOpen('booking',false);this.setOpen('payout',false);
        await wait(500);
        this.setOpen('listing',false);
        await wait(500);
        this.setOpen('listing',true);
        await wait(650);
        await finish('identity');
        await finish('publish');
        await wait(350);
        this.setOpen('listing',false);this.setOpen('booking',true);
        await wait(550);
        await finish('profile');await finish('message');await finish('booking');
        await wait(350);
        this.setOpen('booking',false);this.setOpen('payout',true);
        await wait(550);
        await finish('kyc');await finish('payment');await finish('payout');
        this.setHint('All set. Every step is complete.','success');
        this.announce('Onboarding complete. All ten steps are finished.');
      }catch(error){if(error.name!=='AbortError')throw error;}
      finally{
        if(this.replayController===controller)this.replayController=null;
      }
    }

    stopDemo({quiet=false}={}) {
      if(!this.replayController)return;
      this.replayController.abort();
      this.replayController=null;
      // Keep completed steps, but cancel queued tasks and completion closures.
      this.version++;
      this.clearPending();
      this.cancelAnimations();
      this.update(null,false);
      this.measure();
      if(!quiet){this.setHint('Your turn. Continue from here.');this.announce('Demo stopped. You can continue exploring.');}
    }

    setHint(message,tone=''){const hint=this.shadowRoot.querySelector('.hint');if(hint){hint.textContent=message;hint.dataset.tone=tone;}}
    announce(message){const live=this.shadowRoot.querySelector('.live');if(live)live.textContent=message;}
    notifyHeight(){
      if(this.heightFrame)cancelAnimationFrame(this.heightFrame);
      this.heightFrame=requestAnimationFrame(()=>{
        const visualBottom=this.shadowRoot.querySelector('.demo').getBoundingClientRect().bottom;
        const cardBottom=Math.max(...[...this.shadowRoot.querySelectorAll('.card')].map(card=>card.getBoundingClientRect().bottom));
        const intrinsic=document.body.getBoundingClientRect().height;
        const height=Math.ceil(Math.max(this.holdHeight||0,intrinsic,cardBottom+scrollY,visualBottom+scrollY));
        if(parent!==window)parent.postMessage({type:'verification-onboarding:resize',height},'*');
      });
    }
  }
  customElements.define('verification-onboarding',VerificationOnboarding);
})();
