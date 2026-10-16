import {Geometry,colorPair,curve,tint} from '../core/geometry.js';
import {multiply,translation,quatMatrix,axisAngle,random} from '../core/math.js';

/** Abstract machine intelligence: nested geodesic cages, crystalline nodes,
 * orbital traces and a spatial message graph. Deliberately no faces, robots,
 * labels or UI panels. This is decorative, not a live LLM call. */
function cage(g,r,color){
 const phi=(1+Math.sqrt(5))/2;
 const pts=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(p=>p.map(x=>x*r/Math.hypot(1,phi)));
 const edge=2*r/Math.hypot(1,phi);
 for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)if(Math.abs(Math.hypot(...pts[i].map((x,k)=>x-pts[j][k]))-edge)<.001)g.line(pts[i],pts[j],color);
}
function octa(g,p,r,c){
 const [x,y,z]=p,ring=[[x+r,y,z],[x,y,z+r],[x-r,y,z],[x,y,z-r]];
 for(let i=0;i<4;i++){g.line(ring[i],ring[(i+1)%4],c);g.line(ring[i],[x,y+r*1.3,z],c);g.line(ring[i],[x,y-r*1.3,z],c);}
}
export class AgentLayer {
 constructor(renderer,config){
  this.renderer=renderer;this.config=config;this.meshes=[];this.paths=[];this.lastTick=-1;
  const C=Object.fromEntries(Object.entries(config.palette).map(([k,v])=>[k,colorPair(...v)]));this.C=C;
  const core=new Geometry(),inner=new Geometry(),orbit=new Geometry(),nodes=new Geometry(),network=new Geometry(),dots=new Geometry(),rays=new Geometry();
  cage(core,2.05,C.cyan);cage(inner,1.32,C.purple);octa(inner,[0,0,0],.72,C.white);
  for(let i=0;i<3;i++)orbit.circle([0,0,0],2.65+i*.20,i%2?C.purple:C.cyan,['xy','xz','yz'][i],90,.13+i*.9,5.3+i*.9);
  const center=config.core.position,rng=random(config.seed+30);
  config.agents.forEach((a,i)=>{
    const p=a.position,c=C[a.color];octa(nodes,p,.57,c);
    nodes.circle(p,.83,c,i%2?'xz':'xy',42,.35,5.7);nodes.circle(p,1.02,tint(c,.6),i%2?'xy':'yz',42,.85,5.1);
    dots.vertex(p,C.white);
    const b=config.agents[(i+1)%config.agents.length].position;
    for(const target of [center,b]){
      const h=target===center?1.3:.7;this.paths.push({a:p,b:target,h,phase:rng()});
      network.path(Array.from({length:35},(_,j)=>curve(p,target,h,j/34)),c);
    }
    // Projection to the corresponding urban footprint links the two views.
    const base=[p[0],.1,p[2]];rays.line(base,p,tint(c,.55));nodes.circle(base,.56,tint(c,.6),'xz',32);
  });
  // Tiny geometry points, not a blank spherical icon.
  for(let i=0;i<82;i++){
    const az=rng()*Math.PI*2,cz=rng()*2-1,r=.62+rng()*.64,s=Math.sqrt(1-cz*cz);
    const p=[Math.cos(az)*s*r,cz*r,Math.sin(az)*s*r];
    if(i%4===0)inner.line(p,p.map(v=>v*.55),tint(C.purple,.65));
  }
  this.core=this.make(core);this.inner=this.make(inner);this.orbit=this.make(orbit);
  this.nodes=this.make(nodes);this.network=this.make(network);this.rays=this.make(rays);this.dots=this.make(dots,'points');
  this.packets=this.make(new Geometry(),'points',true);this.packetTrails=this.make(new Geometry(),'lines',true);
 }
 make(g,mode='lines',dynamic=false){const m=this.renderer.create(g,mode,dynamic);this.meshes.push(m);return m;}
 update(time){
  if(Math.abs(time-this.lastTick)<.04)return;this.lastTick=time;
  const points=new Geometry(),tails=new Geometry();
  this.paths.forEach((p,i)=>{
    for(let j=0;j<2;j++){
      const t=(time*(.13+i%3*.013)+p.phase+j*.5)%1;
      points.vertex(curve(p.a,p.b,p.h,t),this.C.white);
      for(let k=0;k<3;k++){
        const a=Math.max(0,t-k*.008),b=Math.max(0,t-(k+1)*.008);
        tails.line(curve(p.a,p.b,p.h,a),curve(p.a,p.b,p.h,b),tint(this.C.purple,1-k*.2));
      }
    }
  });
  this.renderer.update(this.packets,points);this.renderer.update(this.packetTrails,tails);
 }
 render(f){
  const a=f.reveal*f.reveal;if(a<.005)return;
  const r=this.renderer,at=multiply(f.mvp,translation(...this.config.core.position)),spin=(axis,speed)=>multiply(at,quatMatrix(axisAngle(axis,f.time*speed)));
  r.draw(this.network,f.mvp,{opacity:a*.56,depthWrite:false});r.draw(this.rays,f.mvp,{opacity:a*.22,depthWrite:false});
  r.draw(this.nodes,f.mvp,{opacity:a*.86,depthWrite:false});r.draw(this.dots,f.mvp,{opacity:a,pointSize:16,depthWrite:false});
  r.draw(this.orbit,spin([.3,1,.2],.18),{opacity:a*.59,depthWrite:false});
  r.draw(this.core,spin([.3,1,0],.20),{opacity:a*.92,depthWrite:false});
  r.draw(this.inner,spin([1,.25,.4],-.31),{opacity:a*(.78+.1*Math.sin(f.time)),depthWrite:false});
  r.draw(this.packetTrails,f.mvp,{opacity:a*.85,depthWrite:false});r.draw(this.packets,f.mvp,{opacity:a,pointSize:7,depthWrite:false});
 }
 dispose(){this.meshes.forEach(m=>this.renderer.destroy(m));}
}
