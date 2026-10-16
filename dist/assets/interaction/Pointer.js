/** An ornamental follow-ring on top of reliable CSS cursor assets. The browser
 * cursor never becomes invisible, even if JavaScript fails or a tab loses focus. */
export class Pointer {
 constructor(){
  this.abort=new AbortController();this.fine=matchMedia('(hover: hover) and (pointer: fine)');this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.ring=document.createElement('div');this.ring.className='cursor-halo';this.ring.setAttribute('aria-hidden','true');document.body.append(this.ring);
  this.x=this.y=this.tx=this.ty=0;this.frame=0;this.visible=false;
  const on=(el,key,fn)=>el.addEventListener(key,fn,{signal:this.abort.signal});
  on(document,'pointermove',e=>{
    if(!this.fine.matches||e.pointerType==='touch')return this.hide();
    this.tx=e.clientX;this.ty=e.clientY;
    if(!this.visible){this.x=this.tx;this.y=this.ty;this.visible=true;this.ring.classList.add('is-visible');}
    this.ring.classList.toggle('is-action',!!e.target.closest('a,button,summary,[role="button"]'));
    this.ring.classList.toggle('is-scene',!!e.target.closest('#city-canvas'));
    this.schedule();
  });
  on(document,'pointerdown',()=>this.ring.classList.add('is-down'));
  on(document,'pointerup',()=>this.ring.classList.remove('is-down'));
  on(document,'pointercancel',()=>this.hide());on(document,'pointerout',e=>{if(!e.relatedTarget)this.hide();});
  on(window,'blur',()=>this.hide());on(document,'visibilitychange',()=>{if(document.hidden)this.hide();});
  on(this.fine,'change',()=>this.hide());
 }
 schedule(){if(this.frame||!this.visible)return;this.frame=requestAnimationFrame(()=>{
  this.frame=0;const immediate=this.reduced.matches||document.documentElement.dataset.motion==='paused';
  const k=immediate?1:.24;this.x+=(this.tx-this.x)*k;this.y+=(this.ty-this.y)*k;
  this.ring.style.transform=`translate3d(${this.x}px,${this.y}px,0)`;
  if(Math.hypot(this.tx-this.x,this.ty-this.y)>.15)this.schedule();
 });}
 hide(){this.visible=false;this.ring.classList.remove('is-visible','is-down');if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
 dispose(){this.hide();this.abort.abort();this.ring.remove();}
}
