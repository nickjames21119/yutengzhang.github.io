import {SoftwareRenderer} from './core/SoftwareRenderer.js';
import {Renderer} from './core/Renderer.js';
import {ArcballControls} from './core/ArcballControls.js';
import {multiply,translation,quatMatrix,axisAngle,perspective,damp} from './core/math.js';
import {viewTarget,effectiveMotion} from './state.js';
import {layerFactories} from './layers/registry.js';

/** Lifecycle and interaction only. Geometry lives in layers/; math lives in core/.
 * Two renderers consume exactly the same 3D data, transformations and state.
 */
export class SceneController {
  constructor(root,config,lang='en') {
    this.root=root;this.canvas=root.querySelector('canvas');this.config=config;this.lang=lang;
    this.abort=new AbortController();this.disposed=false;this.contextLost=false;
    let paused=false;try{paused=localStorage.getItem('yz-motion')==='paused';}catch{}
    this.state={mode:'auto',hovered:false,dragging:false,keyboardReveal:false,paused,
      reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:document.hidden,intersecting:true};
    this.reveal=0;this.day=document.documentElement.dataset.theme==='light'?1:0;this.dayTarget=this.day;
    this.time=0;this.autoAngle=0;this.idleUntil=0;this.frameId=0;this.last=0;this.frameCount=0;
    this.fps=matchMedia('(pointer: coarse)').matches?config.performance.mobileFps:config.performance.maxFps;
    this.initGraphics();
    this.controls=new ArcballControls(this.canvas,config.camera,(kind)=>{
      if(kind==='reset')this.autoAngle=0;
      this.idleUntil=this.time+config.motion.idleResumeDelay;this.invalidate();
    },(dragging,event)=>this.onDrag(dragging,event));
    const on=(el,event,fn)=>el?.addEventListener(event,fn,{signal:this.abort.signal});
    on(this.canvas,'pointerenter',e=>{if(e.pointerType!=='touch'){this.state.hovered=true;this.updateUI();this.invalidate();}});
    on(this.canvas,'pointerleave',e=>{if(e.pointerType!=='touch'){this.state.hovered=false;this.updateUI();this.invalidate();}});
    on(this.canvas,'keydown',e=>{
      if(e.key===' '){e.preventDefault();this.state.keyboardReveal=!this.state.keyboardReveal;this.state.mode='auto';this.updateUI();this.invalidate();}
      if(e.key==='Escape'){this.state.keyboardReveal=false;this.state.hovered=false;this.state.mode='auto';this.updateUI();this.invalidate();}
    });
    on(this.canvas,'blur',()=>{this.state.keyboardReveal=false;this.updateUI();this.invalidate();});
    on(document,'yz:motion',e=>{this.state.paused=e.detail.paused;this.updateUI();this.invalidate();});
    on(document,'yz:theme',e=>{this.dayTarget=e.detail==='light'?1:0;this.invalidate();});
    on(document,'visibilitychange',()=>{this.state.hidden=document.hidden;if(document.hidden)this.stop();else this.invalidate();});
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    on(reduced,'change',e=>{this.state.reducedMotion=e.matches;this.invalidate();});
    on(this.canvas,'webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.stop();this.setFallback('lost');});
    on(this.canvas,'webglcontextrestored',()=>{
      try{this.layers.forEach(l=>l.dispose());this.renderer.dispose();this.initGraphics();this.contextLost=false;this.resize();this.invalidate();}
      catch(error){console.warn('[city-scene] restore failed',error);this.setFallback('unavailable');}
    });
    
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas.parentElement);
    this.intersectionObserver=new IntersectionObserver(entries=>{
      this.state.intersecting=entries[0].isIntersecting;
      if(this.state.intersecting)this.invalidate();else this.stop();
    },{rootMargin:'40px'});this.intersectionObserver.observe(root);
    this.resize();this.updateUI();this.invalidate();
  }
  initGraphics() {
    const forceCanvas=new URLSearchParams(location.search).get('renderer')==='canvas';
    try {
      if(forceCanvas)throw new Error('Canvas 3D explicitly selected.');
      this.renderer=new Renderer(this.canvas);
    } catch(error) {
      console.info('[city-scene] CPU 3D compatibility mode:',error.message);
      this.renderer=new SoftwareRenderer(this.canvas);this.fps=this.config.performance.softwareFps;
    }
    this.layers=[];
    try{for(const make of layerFactories)this.layers.push(make(this.renderer,this.config));}
    catch(error){this.layers.forEach(l=>l.dispose());this.renderer.dispose();throw error;}
    this.root.dataset.renderer=this.renderer.kind;
    this.root.querySelector('.scene-fallback').hidden=true;
  }
  onDrag(dragging,event) {
    if(dragging)this.state.dragTarget=this.reveal<.5?0:1;
    this.state.dragging=dragging;this.idleUntil=this.time+this.config.motion.idleResumeDelay;
    if(!dragging) {
      const b=this.canvas.getBoundingClientRect();
      this.state.hovered=event.pointerType!=='touch'&&event.clientX>=b.left&&event.clientX<=b.right&&event.clientY>=b.top&&event.clientY<=b.bottom;
      const [x,y]=this.controls.startXY||[0,0];
      if(event.type==='pointerup'&&event.pointerType==='touch'&&Math.hypot(event.clientX-x,event.clientY-y)<8)this.state.keyboardReveal=!this.state.keyboardReveal;
    }
    this.updateUI();this.invalidate();
  }
  resize() {
    if(this.disposed||this.contextLost)return;
    const r=this.canvas.parentElement.getBoundingClientRect();this.width=r.width;this.height=r.height;
    this.renderer.resize(r.width,r.height,Math.min(devicePixelRatio||1,this.config.performance.maxDpr));this.invalidate();
  }
  setView(mode) {
    if(!['auto','city','agents'].includes(mode))throw new Error('Unknown scene view: '+mode);
    this.state.mode=mode;this.state.keyboardReveal=false;this.updateUI();this.invalidate();
  }
  updateUI() {
    const target=viewTarget(this.state);this.root.dataset.view=target?'agents':'city';this.root.dataset.mode=this.state.mode;
  }

  setFallback(kind) {
    this.root.dataset.renderer='fallback';const f=this.root.querySelector('.scene-fallback');f.hidden=false;
    f.querySelector('[data-fallback-message]').textContent=this.lang==='zh'?
      (kind==='lost'?'图形上下文中断，等待浏览器恢复。':'图形场景未能加载。可尝试在地址后添加 ?renderer=canvas。'):
      (kind==='lost'?'Graphics context interrupted. Waiting for restoration.':'Graphics could not load. Try appending ?renderer=canvas to the URL.');
  }
  invalidate() {
    if(this.disposed||this.contextLost||this.state.hidden||!this.state.intersecting)return;
    if(!this.frameId)this.frameId=requestAnimationFrame(t=>this.frame(t));
  }
  stop() {if(this.frameId)cancelAnimationFrame(this.frameId);this.frameId=0;this.last=0;}
  frame(timestamp) {
    this.frameId=0;if(this.disposed||this.contextLost||this.state.hidden||!this.state.intersecting)return;
    if(this.last&&timestamp-this.last<1000/this.fps-1){this.invalidate();return;}
    const dt=this.last?Math.min((timestamp-this.last)/1000,.08):1/this.fps;this.last=timestamp;this.frameCount++;
    const moving=effectiveMotion(this.state);
    if(moving) {
      this.time+=dt;
      if(!this.state.dragging&&!this.state.hovered&&this.time>=this.idleUntil)this.autoAngle+=dt*this.config.motion.autoRotateSpeed;
    }
    const target=viewTarget(this.state);
    this.reveal=this.state.reducedMotion?target:damp(this.reveal,target,dt,this.config.transitionSpeed);
    if(Math.abs(this.reveal-target)<.001)this.reveal=target;
    this.day=this.state.reducedMotion?this.dayTarget:damp(this.day,this.dayTarget,dt,10);
    if(Math.abs(this.day-this.dayTarget)<.001)this.day=this.dayTarget;
    const aspect=Math.max(.3,this.width/this.height),camera=this.config.camera,fit=Math.max(1,1.06/aspect);
    const distance=camera.distance*fit;
    const bob=this.state.reducedMotion?0:Math.sin(this.time*this.config.motion.floatSpeed)*this.config.motion.floatAmplitude;
    const spin=quatMatrix(axisAngle([0,1,0],this.autoAngle));
    const center=translation(...(camera.target||[0,0,0]).map(n=>-n));
    const view=multiply(translation(0,bob,-distance),multiply(quatMatrix(this.controls.quaternion),multiply(spin,center)));
    const mvp=multiply(perspective(camera.fov*Math.PI/180,aspect,.1,200),view);
    const frame={mvp,reveal:this.reveal,day:this.day,time:this.time};this.renderer.begin(this.day,this.time);
    for(const layer of this.layers){layer.update(this.time);layer.render(frame);}this.renderer.end();

    if(moving||this.reveal!==target||this.day!==this.dayTarget)this.invalidate();
  }
  snapshot() {
    return {renderer:this.root.dataset.renderer,reveal:this.reveal,day:this.day,time:this.time,autoAngle:this.autoAngle,frameCount:this.frameCount,
      state:{...this.state},quaternion:[...this.controls.quaternion],zoom:this.controls.zoom,drawCalls:this.renderer.calls,
      resources:this.renderer.meshes.size,frameScheduled:!!this.frameId,width:this.canvas.width,height:this.canvas.height};
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;this.stop();this.abort.abort();this.resizeObserver?.disconnect();this.intersectionObserver?.disconnect();
    this.controls?.dispose();this.layers.forEach(l=>l.dispose());this.renderer.dispose();this.root.dataset.renderer='disposed';
  }
}
