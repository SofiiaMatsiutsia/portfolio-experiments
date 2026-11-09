(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const diagram=$('#diagram'),range=$('#progress'),timeline=$('.timeline'),explorer=$('.explorer');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const nodes=Object.fromEntries([...document.querySelectorAll('[data-node]')].map(el=>[el.dataset.node,el]));
  const checkpoints=[...document.querySelectorAll('[data-stage]')];
  const actionKeys=['email','account','id','identity','mobile','method'];
  const outcomeKeys=['completeEmail','search','unlock','completeIdentity','publish','payout'];
  const oldGoals=['completeEmail','search','unlock','completeIdentity'];
  const stages=[
    {title:'Before',description:'Original onboarding: verify email to complete verification; verify account to show listings in search results; verify ID to unlock listing; verify identity to complete verification and receive payouts.'},
    {title:'Grouped verbs',description:'Group the publishing phrases: complete verification, show listings in search results, and unlock listing. Receive payouts remains a separate goal.'},
    {title:'Clarified copy',description:'Publishing wording becomes Publish listing. ID is renamed identity; identity is renamed KYC. The vague account label is removed.'},
    {title:'Added mobile',description:'Add mobile verification alongside email and identity for publishing. KYC remains separate for payouts.'},
    {title:'Final',description:'To publish a listing, verify email, mobile, and identity. To receive payouts, verify KYC and add a payout method. Mobile is the only new step; the payout-method requirement already existed.'}
  ];
  const embedded=parent!==window;
  // Selection is always a complete stage. Only the diagram's visual progress interpolates.
  let progress=0,activeStage=0,animation=0,animationTarget=null,settleTimer=0;
  let manuallyControlled=false,controlFocused=false,pointerActive=false;
  let layouts=[],heights={},taskW=155,goalW=134,left=0,right=181,diagramHeight=320;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  const between=(p,a,b)=>clamp((p-a)/(b-a));
  // Solve cubic-bezier(0.2, 0, 0, 1) for the shared 180ms settle.
  const ease=t=>{
    let low=0,high=1;
    for(let i=0;i<14;i++){
      const s=(low+high)/2,x=.6*s*(1-s)*(1-s)+s*s*s;
      if(x<t)low=s;else high=s;
    }
    const s=(low+high)/2;
    return 3*(1-s)*s*s+s*s*s;
  };
  const pose=(x,y,opacity=1)=>({x,y,opacity});
  const stackHeight=(keys,gap=16)=>keys.reduce((total,key)=>total+heights[key],0)+Math.max(0,keys.length-1)*gap;

  function measure(){
    const width=diagram.clientWidth,gap=width>=315?26:16;
    taskW=width>=315?155:Math.min(155,Math.round((width-gap)*.535));
    goalW=Math.min(134,width-taskW-gap);
    left=(width-taskW-gap-goalW)/2;right=left+taskW+gap;
    for(const [key,el] of Object.entries(nodes)){
      el.style.width=`${actionKeys.includes(key)?taskW:goalW}px`;
      el.style.height='38px';
    }
    for(const [key,el] of Object.entries(nodes)){
      const label=el.querySelector('.outcome-label')||el.querySelector('.noun')||el.querySelector('.rename');
      const verb=el.querySelector('.verb');
      const content=Math.max(label.getBoundingClientRect().height,verb?.getBoundingClientRect().height||0);
      heights[key]=Math.max(38,Math.ceil(content+18.8));
      el.style.height=`${heights[key]}px`;
    }
  }

  function emptyState(){return Object.fromEntries(Object.keys(nodes).map(key=>[key,pose(actionKeys.includes(key)?left:right,0,0)]));}
  function addGroup(state,keys,outcome,top){
    const h=stackHeight(keys);
    let y=top;
    for(const key of keys){state[key]=pose(left,y);y+=heights[key]+16;}
    state[outcome]=pose(right,top+(h-heights[outcome])/2);
    return h;
  }
  function twoGroups(payoutKeys,publishingKeys){
    const state=emptyState(),a=stackHeight(payoutKeys),b=stackHeight(publishingKeys);
    const top=(diagramHeight-a-b-20)/2+1;
    addGroup(state,publishingKeys,'publish',top);
    addGroup(state,payoutKeys,'payout',top+b+20);
    return state;
  }

  function calculateLayouts(){
    measure();
    const beforeGroups=[['email',['completeEmail']],['account',['search']],['id',['unlock']],['identity',['completeIdentity','payout']]];
    const beforeHeights=beforeGroups.map(([action,goals])=>Math.max(heights[action],stackHeight(goals,12)));
    const beforeHeight=beforeHeights.reduce((a,b)=>a+b,0)+36;
    const finalHeight=stackHeight(['identity','method'])+20+stackHeight(['email','mobile','id']);
    diagramHeight=Math.max(320,beforeHeight+22,finalHeight+62);
    diagram.style.height=`${diagramHeight}px`;
    const original=emptyState();
    let y=(diagramHeight-beforeHeight)/2+1;
    beforeGroups.forEach(([action,goals],i)=>{
      original[action]=pose(left,y+(beforeHeights[i]-heights[action])/2);
      let gy=y+(beforeHeights[i]-stackHeight(goals,12))/2;
      for(const goal of goals){original[goal]=pose(right,gy);gy+=heights[goal]+12;}
      y+=beforeHeights[i]+12;
    });
    const grouped=Object.fromEntries(Object.entries(original).map(([key,value])=>[key,{...value}]));
    const groupedHeight=stackHeight(oldGoals,6)+24+heights.payout;
    let gy=(diagramHeight-groupedHeight)/2+1;
    for(const key of oldGoals){grouped[key]=pose(right,gy);gy+=heights[key]+6;}
    grouped.payout=pose(right,gy-6+24);
    const clarified=twoGroups(['identity'],['email','id']);
    clarified.account=pose(left,diagramHeight-heights.account-12,.32);
    const withMobile=twoGroups(['identity'],['email','mobile','id']);
    withMobile.account=pose(left,clarified.account.y,0);
    grouped.publish=pose(right,clarified.publish.y,0);
    for(const key of oldGoals)clarified[key]=pose(right,clarified.publish.y,0);
    clarified.mobile=pose(left,withMobile.mobile.y,0);
    withMobile.method=pose(left,withMobile.identity.y+heights.identity+16,0);
    const final=twoGroups(['identity','method'],['email','mobile','id']);
    layouts=[original,grouped,clarified,withMobile,final];
    const first=grouped.completeEmail.y,last=grouped.completeIdentity.y+heights.completeIdentity;
    const highlight=$('#publishing-highlight');
    highlight.style.transform=`translate(${right-6}px,${first-6}px)`;
    highlight.style.width=`${goalW+12}px`;highlight.style.height=`${last-first+12}px`;
    render();
    // Layout is sized for every checkpoint; progress changes never resize it.
    reportEmbedHeight();
  }

  function reportEmbedHeight(){
    notifyParent({type:'verification-copy:resize',height:Math.ceil(explorer.getBoundingClientRect().height)});
  }
  function notifyParent(message){
    if(embedded)parent.postMessage(message,location.origin);
  }
  function updateHint(){
    const automatic=embedded&&!reducedMotion.matches&&!manuallyControlled;
    explorer.dataset.automatic=String(automatic);
    explorer.dataset.mode=automatic?'scroll':'manual';
    $('#timeline-hint').textContent=automatic?'Scroll to explore, select a stage, or drag the timeline.':'Select a stage or drag the timeline.';
  }
  window.addEventListener('message',event=>{
    if(!embedded||event.source!==parent||event.origin!==location.origin)return;
    const message=event.data;
    if(message?.type==='verification-copy:measure'){
      calculateLayouts();
      notifyParent({type:'verification-copy:ready'});
    }
    if(message?.type!=='verification-copy:progress'||!Number.isFinite(message.progress)||reducedMotion.matches)return;
    if(controlFocused)return;
    if(message.resume===true)manuallyControlled=false;
    if(manuallyControlled)return;
    updateHint();
    goTo(message.progress,{animate:true});
  });

  function updateStage(index){
    activeStage=index;
    checkpoints.forEach((el,i)=>{if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    const valueText=`${stages[index].title}, change ${index+1} of 5`;
    diagram.setAttribute('aria-label',stages[index].description);
    range.value=index*25;
    range.setAttribute('aria-valuetext',valueText);
    $('#range-fill').style.transform=`scaleX(${index/4})`;
    document.querySelectorAll('.range-rail i').forEach((el,j)=>el.classList.toggle('passed',index>=j));
    explorer.dataset.stage=String(index);
  }

  function render(){
    if(!layouts.length)return;
    const p=progress/25;
    const i=Math.min(3,Math.floor(p)),t=p===4?1:p-i,current={};
    for(const [key,el] of Object.entries(nodes)){
      const a=layouts[i][key],b=layouts[i+1][key];
      const n={x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),opacity:mix(a.opacity,b.opacity,t)};
      if(p>=1&&p<=2){
        if(oldGoals.includes(key))n.opacity=1-between(p,1,1.4);
        if(key==='publish')n.opacity=between(p,1.35,1.6);
        if(key==='account')n.opacity=p<1.5?1-between(p,1,1.25):.32*between(p,1.75,2);
        if(key==='identity')n.opacity=p<1.5?1-between(p,1,1.2):between(p,1.94,2);
        if(key==='payout')n.opacity=p<1.5?1-between(p,1,1.15):between(p,1.8,2);
      }
      if(key==='method'&&p>=3)n.opacity=between(p,3.8,4);
      if(key==='mobile'&&p>=2&&p<=3)n.opacity=between(p,2.42,3);
      current[key]=n;
      el.style.transform=`translate(${n.x.toFixed(2)}px,${n.y.toFixed(2)}px)`;
      el.style.opacity=n.opacity.toFixed(3);el.style.visibility=n.opacity<.005?'hidden':'visible';
    }
    ['id','identity'].forEach(key=>{
      nodes[key].querySelector('.old').style.opacity=p<1.5?1:0;
      nodes[key].querySelector('.new').style.opacity=p<1.5?0:1;
    });
    nodes.account.querySelector('.noun').style.textDecoration=p>=1.65?'line-through':'none';
    nodes.payout.querySelector('.outcome-label').textContent=p>=1.5?'Receive payouts':'receive payouts';
    $('#publishing-highlight').style.opacity=Math.max(0,1-Math.abs(p-1));
    drawConnections(current,p);
    diagram.dataset.progress=progress.toFixed(1);
  }

  function roundedPath(points,radius=4){
    const p=points.filter((v,i)=>i===0||Math.hypot(v[0]-points[i-1][0],v[1]-points[i-1][1])>.001);
    if(p.length<2)return '';
    let d=`M${p[0]}`;
    for(let i=1;i<p.length-1;i++){
      const a=p[i-1],b=p[i],c=p[i+1],u=[a[0]-b[0],a[1]-b[1]],v=[c[0]-b[0],c[1]-b[1]];
      const incoming=Math.hypot(...u),outgoing=Math.hypot(...v);
      if(Math.abs(u[0]*v[1]-u[1]*v[0])<.001){d+=`L${b}`;continue;}
      const r=Math.min(radius,incoming/2,outgoing/2),entry=[b[0]+u[0]*r/incoming,b[1]+u[1]*r/incoming],exit=[b[0]+v[0]*r/outgoing,b[1]+v[1]*r/outgoing];
      d+=`L${entry}Q${b} ${exit}`;
    }
    return d+`L${p[p.length-1]}`;
  }
  function drawConnections(current,p){
    const paths=[];
    function link(from,to,opacity){
      opacity*=Math.min(current[from].opacity,current[to].opacity);
      if(opacity<.006)return;
      const a=current[from],b=current[to],ax=a.x+taskW,ay=a.y+heights[from]/2,bx=b.x,by=b.y+heights[to]/2,mid=(ax+bx)/2;
      const d=roundedPath([[ax,ay],[mid,ay],[mid,by],[bx,by]]);
      paths.push(`<path d="${d}" opacity="${opacity.toFixed(3)}"/>`);
    }
    const merge=between(p,1,2);
    [['email','completeEmail'],['account','search'],['id','unlock'],['identity','completeIdentity'],['identity','payout']].forEach(([a,b])=>link(a,b,1-merge));
    [['email','publish'],['id','publish'],['mobile','publish'],['identity','payout'],['method','payout']].forEach(([a,b])=>link(a,b,merge));
    $('#paths').innerHTML=paths.join('');
  }

  function stop(){cancelAnimationFrame(animation);clearTimeout(settleTimer);animation=0;animationTarget=null;settleTimer=0;}
  function settle(){stop();progress=activeStage*25;render();}
  function beginManual(){
    if(!manuallyControlled){
      manuallyControlled=true;
      notifyParent({type:'verification-copy:manual'});
    }
    updateHint();
  }
  function announceStage(){
    $('#stage-announcement').textContent=`${stages[activeStage].title}, change ${activeStage+1} of 5`;
  }
  function setProgress(value){
    progress=clamp(value,0,100);
    render();
  }
  function directionalTarget(direction){
    return (activeStage+direction)*25;
  }
  function goTo(value,{animate=false,announce=false}={}){
    const target=Math.round(clamp(value,0,100)/25)*25;
    updateStage(target/25);
    if(announce)announceStage();
    if(animate&&animation&&animationTarget===target)return;
    stop();
    if(!animate||reducedMotion.matches||document.hidden||progress===target){setProgress(target);return;}
    const start=performance.now(),from=progress;
    animationTarget=target;
    function frame(now){
      const t=clamp((now-start)/180);
      setProgress(t===1?target:mix(from,target,ease(t)));
      if(t<1)animation=requestAnimationFrame(frame);
      else{stop();}
    }
    animation=requestAnimationFrame(frame);
    // A suspended frame callback must never strand the diagram mid-stage.
    settleTimer=setTimeout(settle,220);
  }
  function commitRange(){
    pointerActive=false;
    announceStage();
  }
  function pointerProgress(event){
    const bounds=range.getBoundingClientRect();
    return clamp((event.clientX-bounds.left-8)/(bounds.width-16))*100;
  }
  range.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    event.preventDefault();
    range.focus({preventScroll:true});
    beginManual();pointerActive=true;
    range.setPointerCapture(event.pointerId);
    goTo(pointerProgress(event),{animate:true});
  });
  range.addEventListener('pointermove',event=>{
    if(pointerActive)goTo(pointerProgress(event));
  });
  range.addEventListener('input',()=>{beginManual();goTo(Number(range.value));});
  range.addEventListener('change',()=>{beginManual();goTo(Number(range.value));commitRange();});
  window.addEventListener('pointerup',()=>{if(pointerActive)commitRange();});
  window.addEventListener('pointercancel',()=>{if(pointerActive){commitRange();settle();}});
  range.addEventListener('lostpointercapture',()=>{if(pointerActive){commitRange();settle();}});
  range.addEventListener('keydown',event=>{
    let target;
    if(event.key==='Home')target=0;else if(event.key==='End')target=100;
    else if(['ArrowRight','ArrowUp','PageUp'].includes(event.key))target=directionalTarget(1);
    else if(['ArrowLeft','ArrowDown','PageDown'].includes(event.key))target=directionalTarget(-1);
    if(target!==undefined){event.preventDefault();beginManual();goTo(target,{announce:true});}
  });
  checkpoints.forEach(el=>el.addEventListener('click',event=>{
    beginManual();goTo(Number(el.dataset.stage)*25,{animate:event.detail!==0,announce:true});
  }));
  function syncControlFocus(){
    const focused=document.hasFocus()&&timeline.contains(document.activeElement);
    if(focused===controlFocused)return;
    controlFocused=focused;
    if(focused)beginManual();
    notifyParent({type:'verification-copy:focus',focused});
  }
  timeline.addEventListener('focusin',syncControlFocus);
  timeline.addEventListener('focusout',()=>queueMicrotask(syncControlFocus));
  // A parent-page click blurs the iframe window but can leave its activeElement unchanged.
  window.addEventListener('blur',syncControlFocus);
  window.addEventListener('focus',syncControlFocus);
  reducedMotion.addEventListener('change',()=>{
    settle();
    updateHint();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)settle();});
  window.addEventListener('pagehide',settle);
  new ResizeObserver(calculateLayouts).observe(diagram);
  updateHint();
  updateStage(0);
  calculateLayouts();
  notifyParent({type:'verification-copy:ready'});
  document.fonts.ready.then(calculateLayouts);
})();
