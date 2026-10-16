/** Page-level enhancement. Content is readable even if this module never loads.
 * Owns the global pause preference, scroll reveals, progress and card spotlights.
 * No perpetual JavaScript animation loop: the 3D scene owns its own clock.
 */
export class PageMotion {
  constructor() {
    this.abort=new AbortController();this.root=document.documentElement;this.lang=this.root.lang.startsWith('zh')?'zh':'en';
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.paused=false;this.progressFrame=0;
    try{this.paused=localStorage.getItem('yz-motion')==='paused';}catch{}
    const on=(el,name,fn,options={})=>el.addEventListener(name,fn,{...options,signal:this.abort.signal});
    document.querySelectorAll('[data-motion-toggle]').forEach(b=>on(b,'click',()=>this.setPaused(!this.paused)));
    on(document,'yz:motion-set',e=>this.setPaused(Boolean(e.detail.paused)));
    on(this.reduced,'change',()=>this.sync());on(document,'visibilitychange',()=>this.sync());
    on(window,'scroll',()=>this.scheduleProgress(),{passive:true});on(window,'resize',()=>this.scheduleProgress(),{passive:true});
    this.addDust();this.addReveals();this.addSpotlights(on);this.sync();this.scheduleProgress();
    if(!this.paused&&!this.reduced.matches){
      this.root.classList.add('motion-intro');this.introTimer=setTimeout(()=>this.root.classList.remove('motion-intro'),1500);
    }
  }
  setPaused(paused) {
    this.paused=paused;try{localStorage.setItem('yz-motion',paused?'paused':'running');}catch{}
    this.sync();
  }
  sync() {
    this.root.dataset.motion=document.hidden?'hidden':this.reduced.matches?'reduced':this.paused?'paused':'running';
    const label=this.lang==='zh'?(this.paused?'恢复动态效果':'减少动态效果'):(this.paused?'Enable motion':'Reduce motion');
    document.querySelectorAll('[data-motion-toggle]').forEach(b=>{
      b.setAttribute('aria-pressed',String(this.paused));b.setAttribute('aria-label',label);b.title=label;
      b.textContent=label;
    });
    if(this.paused||this.reduced.matches)this.showAll();
    document.dispatchEvent(new CustomEvent('yz:motion',{detail:{paused:this.paused,reduced:this.reduced.matches}}));
  }
  addDust() {
    const parent=document.querySelector('.hero-atmosphere');if(!parent)return;
    for(let i=0;i<22;i++) {
      const p=document.createElement('i');p.style.cssText=`--x:${(i*47+9)%100}%;--y:${(i*31+13)%100}%;--s:${i%4===0?2:1}px;--duration:${12+i%9}s;--delay:-${i*.9}s`;
      parent.appendChild(p);
    }
  }
  addReveals() {
    this.revealElements=[...document.querySelectorAll('.section-heading,.about-content,.research-card,.timeline-item,.experience-item,.contact-grid')];
    if(!('IntersectionObserver' in window))return;
    this.observer=new IntersectionObserver(entries=>{
      for(const e of entries)if(e.isIntersecting){e.target.dataset.reveal='visible';this.observer.unobserve(e.target);}
    },{threshold:.08,rootMargin:'0px 0px -12px 0px'});
    this.revealElements.forEach((el,i)=>{
      el.dataset.reveal=el.getBoundingClientRect().top>innerHeight?'pending':'visible';
      el.style.setProperty('--reveal-delay',`${el.classList.contains('research-card')?(i%4)*55:0}ms`);
      this.observer.observe(el);
    });
  }
  showAll() {this.revealElements?.forEach(el=>el.dataset.reveal='visible');}
  addSpotlights(on) {
    document.querySelectorAll('.research-card').forEach(card=>on(card,'pointermove',e=>{
      if(this.paused||this.reduced.matches||e.pointerType==='touch')return;
      const b=card.getBoundingClientRect();card.style.setProperty('--spot-x',e.clientX-b.left+'px');card.style.setProperty('--spot-y',e.clientY-b.top+'px');
    },{passive:true}));
  }
  scheduleProgress() {
    if(this.progressFrame)return;
    this.progressFrame=requestAnimationFrame(()=>{
      this.progressFrame=0;const max=document.documentElement.scrollHeight-innerHeight;
      this.root.style.setProperty('--read-progress',String(max>0?Math.min(1,Math.max(0,scrollY/max)):0));
    });
  }
  dispose() {
    this.abort.abort();this.observer?.disconnect();clearTimeout(this.introTimer);this.root.classList.remove('motion-intro');if(this.progressFrame)cancelAnimationFrame(this.progressFrame);this.progressFrame=0;
    this.showAll();this.root.dataset.motion='paused';
  }
}
