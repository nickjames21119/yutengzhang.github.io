import {Geometry,tint} from '../core/geometry.js';
import {random} from '../core/math.js';

/** One x/z ground plane. Every building grows in +y; streets and bridges share
 * that same world frame. No six-sided city, no bitmap, no CSS perspective trick. */
export function buildDistrict(config,C) {
  const rng=random(config.seed), {grid,spacing,width,depth,buildingHeight}=config.city;
  const ground=new Geometry(),solid=new Geometry(),edges=new Geometry(),windows=new Geometry(),roads=new Geometry(),water=new Geometry();
  const buildings=[],W=width/2,D=depth/2;
  ground.box(0,-.32,0,width,.32,depth,C.platform);
  edges.boxEdges(0,-.3,0,width,.3,depth,tint(C.muted,.65));
  // A canal down the eastern side. Bridges carry cross-streets over it.
  const canalX=spacing;
  water.quad([canalX-.53,.026,D],[canalX+.53,.026,D],[canalX+.53,.026,-D],[canalX-.53,.026,-D],C.water);
  for(let z=-D;z<D;z+=.55)roads.line([canalX-.45,.032,z],[canalX+.45,.032,z+.15],tint(C.muted,.43));
  const lanes=Array.from({length:grid+1},(_,i)=>(i-grid/2)*spacing);
  for(const lane of lanes){
    // Two-way boulevards, not a dense technical coordinate grid.
    for(const delta of [-.16,.16]){
      roads.line([-W,.035,lane+delta],[W,.035,lane+delta],tint(C.grid,.9));
      roads.line([lane+delta,.035,-D],[lane+delta,.035,D],tint(C.grid,.9));
    }
    for(let p=-W+.3;p<W;p+=.7)roads.line([p,.04,lane],[p+.20,.04,lane],tint(C.muted,.52));
    solid.box(canalX,.045,lane,1.26,.10,.55,C.buildingAlt);
    for(const edge of [-.30,.30])edges.line([canalX-.66,.19,lane+edge],[canalX+.66,.19,lane+edge],C.cyan);
  }
  for(let ix=0;ix<grid;ix++)for(let iz=0;iz<grid;iz++){
    const x=(ix-(grid-1)/2)*spacing,z=(iz-(grid-1)/2)*spacing;
    if(Math.abs(x-canalX)<.65)continue;
    // Keep a small central plaza and let the skyline peak toward its rear.
    if(ix===3&&iz===4){
      for(let i=0;i<4;i++)roads.circle([x,.06,z],.3+i*.21,C.muted,'xz',32);
      continue;
    }
    const center=Math.exp(-((x+1.8)**2+(z+1.7)**2)/26),h=.65+center*buildingHeight*(.5+rng()*.48)+rng()*.55;
    const w=.98+rng()*.56,d=.92+rng()*.50,type=(ix*3+iz)%5,color=(ix+iz)%3?C.building:C.buildingAlt;
    buildings.push({x,z,h,w,d,base:0});
    solid.box(x,.025,z,w,h,d,color);edges.boxEdges(x,.025,z,w,h,d,tint(C.cyan,.82));
    // Setbacks, crowns and roof antennae give a varied metropolitan silhouette.
    if(type<3){
      solid.box(x,h+.025,z,w*.72,.22+center*.4,d*.72,color);
      edges.boxEdges(x,h+.025,z,w*.72,.22+center*.4,d*.72,C.muted);
    }
    if(h>3.1){
      const top=h+.46;edges.line([x,top,z],[x,top+.4+center*.7,z],C.purple);
      edges.line([x-.04,top+.4+center*.7,z],[x+.04,top+.4+center*.7,z],C.white);
      // An illuminated, floating-looking roof rim.
      edges.boxEdges(x,h-.03,z,w*1.02,.08,d*1.02,C.purple);
    }
    // Broken rows of facade light rather than flat cartoon feature panels.
    for(let y=.30;y<h-.12;y+=.36){
      for(let a=-w*.34;a<w*.38;a+=.28)if(rng()>.26){
        windows.line([x+a,y,z+d/2+.009],[x+a+.10,y,z+d/2+.009],C.purple);
        windows.line([x+a,y,z-d/2-.009],[x+a+.10,y,z-d/2-.009],C.cyan);
      }
      for(let b=-d*.34;b<d*.38;b+=.28)if(rng()>.36){
        windows.line([x+w/2+.009,y,z+b],[x+w/2+.009,y,z+b+.10],C.cyan);
        windows.line([x-w/2-.009,y,z+b],[x-w/2-.009,y,z+b+.10],C.purple);
      }
    }
  }
  // Elevated cross-city rail: a physical deck, piers, and two parallel rails.
  const railZ=-spacing*2.5;
  solid.box(0,.65,railZ,width,.12,.54,C.platform);
  for(const z of [railZ-.23,railZ+.23])edges.line([-W,.82,z],[W,.82,z],C.purple);
  for(let x=-W+.7;x<W;x+=2.2){solid.box(x,0,railZ,.12,.65,.18,C.building);edges.line([x,0,railZ],[x,.68,railZ],C.muted);}
  return {geometries:{ground,solid,edges,windows,roads,water},buildings,lanes,railZ};
}

/** Constant-speed traversal around a rectangular road loop, with no teleport
 * across buildings at corners. The returned heading also orients rail cars. */
export function rectangularRoute(x0,x1,z0,z1,t,y=.1){
 const w=x1-x0,d=z1-z0,p=((t%1+1)%1)*2*(w+d);
 if(p<w)return {p:[x0+p,y,z0],axis:'x'};
 if(p<w+d)return {p:[x1,y,z0+p-w],axis:'z'};
 if(p<2*w+d)return {p:[x1-(p-w-d),y,z1],axis:'x'};
 return {p:[x0,y,z1-(p-2*w-d)],axis:'z'};
}
