import {axisAngle,quatMul,quatBetween,spherePoint,clamp} from './math.js';
/** Full quaternion trackball: no yaw/pitch limits and no pole lock. */
export class ArcballControls {
 constructor(canvas,config,onChange,onDrag){
  this.canvas=canvas;this.config=config;this.onChange=onChange;this.onDrag=onDrag;this.abort=new AbortController();this.pointer=null;this.dragging=false;
  this.initial=quatMul(axisAngle([1,0,0],config.pitch),axisAngle([0,1,0],config.yaw));this.quaternion=[...this.initial];this.zoom=1;
  const listen=(name,fn)=>canvas.addEventListener(name,fn,{signal:this.abort.signal});
  listen('pointerdown',e=>this.down(e));listen('pointermove',e=>this.move(e));listen('pointerup',e=>this.up(e));listen('pointercancel',e=>this.up(e));listen('lostpointercapture',e=>this.up(e));listen('keydown',e=>this.key(e));
 }
 point(e){const r=this.canvas.getBoundingClientRect();return spherePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height);}
 down(e){if(e.button!==0||this.pointer!==null)return;this.pointer=e.pointerId;this.start=this.point(e);this.startQ=[...this.quaternion];this.startXY=[e.clientX,e.clientY];this.dragging=true;this.canvas.classList.add('is-dragging');this.canvas.setPointerCapture(e.pointerId);this.canvas.focus({preventScroll:true});this.onDrag(true,e);}
 move(e){if(this.pointer!==e.pointerId)return;const delta=quatBetween(this.start,this.point(e));this.quaternion=quatMul(delta,this.startQ);this.onChange();}
 up(e){if(this.pointer!==e.pointerId)return;this.pointer=null;this.dragging=false;this.canvas.classList.remove('is-dragging');if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);this.onDrag(false,e);}
 key(e){if(e.ctrlKey||e.metaKey||e.altKey)return;const map={ArrowLeft:[[0,1,0],-.13],ArrowRight:[[0,1,0],.13],ArrowUp:[[1,0,0],-.13],ArrowDown:[[1,0,0],.13],q:[[0,0,1],.13],e:[[0,0,1],-.13]};const k=e.key;
  if(map[k]){e.preventDefault();this.quaternion=quatMul(axisAngle(...map[k]),this.quaternion);this.onChange();}
  else if(k==='r'||k==='Home'){e.preventDefault();this.reset();}
 }
 setZoom(zoom){this.zoom=clamp(zoom,this.config.minZoom,this.config.maxZoom);this.onChange();}
 reset(){this.quaternion=[...this.initial];this.zoom=1;this.onChange('reset');}
 dispose(){this.abort.abort();if(this.pointer!==null&&this.canvas.hasPointerCapture(this.pointer))this.canvas.releasePointerCapture(this.pointer);this.pointer=null;}
}
