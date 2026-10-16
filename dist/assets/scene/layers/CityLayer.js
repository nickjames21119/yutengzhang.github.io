import {Geometry,colorPair,tint} from '../core/geometry.js';
import {random} from '../core/math.js';
import {buildDistrict,rectangularRoute} from '../geometry/urbanDistrict.js';

export class CityLayer {
 constructor(renderer,config){
  this.renderer=renderer;this.config=config;this.meshes=[];this.lastTick=-1;
  this.colors=Object.fromEntries(Object.entries(config.palette).map(([k,v])=>[k,colorPair(...v)]));
  const district=buildDistrict(config,this.colors);this.buildings=district.buildings;this.lanes=district.lanes;this.railZ=district.railZ;
  for(const [key,g] of Object.entries(district.geometries))this[key]=this.make(g,['ground','solid','water'].includes(key)?'triangles':'lines');
  this.traffic=this.make(new Geometry(),'points',true);this.trails=this.make(new Geometry(),'lines',true);
  this.trains=this.make(new Geometry(),'triangles',true);this.trainEdges=this.make(new Geometry(),'lines',true);
  const rng=random(config.seed+7),n=this.lanes.length;
  this.routes=Array.from({length:config.city.trafficCount},(_,i)=>{
    const x0=Math.floor(rng()*(n-2)),x1=Math.min(n-1,x0+1+Math.floor(rng()*3));
    const z0=Math.floor(rng()*(n-2)),z1=Math.min(n-1,z0+1+Math.floor(rng()*3));
    return {x0:this.lanes[x0]+.07,x1:this.lanes[x1]-.07,z0:this.lanes[z0]+.07,z1:this.lanes[z1]-.07,phase:rng(),speed:.014+rng()*.025,reverse:i%2?-1:1};
  });
 }
 make(g,mode='triangles',dynamic=false){const m=this.renderer.create(g,mode,dynamic);this.meshes.push(m);return m;}
 update(time){
  if(Math.abs(time-this.lastTick)<.045)return;this.lastTick=time;
  const C=this.colors,points=new Geometry(),trails=new Geometry(),trains=new Geometry(),edges=new Geometry();
  for(const r of this.routes){
    const t=r.phase+time*r.speed*r.reverse;const loc=u=>rectangularRoute(r.x0,r.x1,r.z0,r.z1,u,.17).p;
    points.vertex(loc(t),C.white);
    for(let j=0;j<4;j++)trails.line(loc(t-j*.0015*r.reverse),loc(t-(j+1)*.0015*r.reverse),tint(C.cyan,1-j*.16));
  }
  const W=this.config.city.width/2;
  for(let direction of [-1,1]){
    const x=(((time*.033+(direction===1?.2:.72))%1)*2-1)*(W-1.1)*direction;
    for(let car=0;car<3;car++){
      trains.box(x-car*.58,.82,this.railZ+direction*.13,.51,.18,.17,C.purple);
      edges.boxEdges(x-car*.58,.82,this.railZ+direction*.13,.51,.18,.17,C.white);
    }
  }
  this.renderer.update(this.traffic,points);this.renderer.update(this.trails,trails);this.renderer.update(this.trains,trains);this.renderer.update(this.trainEdges,edges);
 }
 render(f){
  const r=this.renderer,fade=(1-f.reveal)**1.7,ghost=f.reveal*.055;
  r.draw(this.ground,f.mvp,{opacity:fade,depthWrite:fade>.94});
  r.draw(this.water,f.mvp,{opacity:fade*.88,depthWrite:fade>.94});
  r.draw(this.solid,f.mvp,{opacity:fade,depthWrite:fade>.94,scan:.9});
  r.draw(this.edges,f.mvp,{opacity:fade*.70+ghost,depthWrite:false});
  r.draw(this.roads,f.mvp,{opacity:fade*.65+f.reveal*.16,depthWrite:false});
  r.draw(this.windows,f.mvp,{opacity:fade*(.72+.10*Math.sin(f.time*.5)),depthWrite:false});
  r.draw(this.trails,f.mvp,{opacity:fade*.7,depthWrite:false});r.draw(this.traffic,f.mvp,{opacity:fade,pointSize:6,depthWrite:false});
  r.draw(this.trains,f.mvp,{opacity:fade,depthWrite:fade>.94});r.draw(this.trainEdges,f.mvp,{opacity:fade,depthWrite:false});
 }
 dispose(){this.meshes.forEach(m=>this.renderer.destroy(m));}
}
