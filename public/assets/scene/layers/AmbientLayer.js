import {Geometry,colorPair} from '../core/geometry.js';
import {random} from '../core/math.js';
/** Sparse 3D dust. Its only role is atmosphere; it is not an invented data feed. */
export class AmbientLayer {
  constructor(renderer,config) {
    this.renderer=renderer;this.lastTick=-1;this.color=colorPair(...config.palette.cyan,.52);
    const rng=random(config.seed+451);
    this.particles=Array.from({length:config.motion.ambientParticles},()=>({x:(rng()-.5)*23,y:(rng()-.5)*21,z:(rng()-.5)*20,phase:rng()*Math.PI*2}));
    this.mesh=renderer.create(new Geometry(),'points',true);
  }
  update(time) {
    if(Math.abs(time-this.lastTick)<.06)return;this.lastTick=time;const g=new Geometry();
    for(const p of this.particles)g.vertex([p.x+Math.sin(time*.12+p.phase)*.3,p.y+Math.sin(time*.24+p.phase)*.45,p.z],this.color);
    this.renderer.update(this.mesh,g);
  }
  render(frame) {this.renderer.draw(this.mesh,frame.mvp,{opacity:.5,depthWrite:false,pointSize:2.8});}
  dispose() {this.renderer.destroy(this.mesh);}
}
