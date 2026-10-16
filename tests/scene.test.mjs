import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import * as M from '../public/assets/scene/core/math.js';
import {Geometry,colorPair,curve} from '../public/assets/scene/core/geometry.js';
import {viewTarget,effectiveMotion} from '../public/assets/scene/state.js';
import {CityLayer} from '../public/assets/scene/layers/CityLayer.js';
import {AgentLayer} from '../public/assets/scene/layers/AgentLayer.js';
import {AmbientLayer} from '../public/assets/scene/layers/AmbientLayer.js';
import {rectangularRoute} from '../public/assets/scene/geometry/urbanDistrict.js';
import {SoftwareRenderer} from '../public/assets/scene/core/SoftwareRenderer.js';
const config=JSON.parse(readFileSync(new URL('../data/scene.json',import.meta.url)));
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
class MockRenderer{
 constructor(){this.meshes=new Set();this.draws=[];}
 create(g,mode='triangles'){const a=g.array||g;assert.equal(a.length%11,0);assert.ok([...a].every(Number.isFinite));const m={data:a,mode};this.meshes.add(m);return m;}
 update(m,g){assert.ok(this.meshes.has(m));m.data=g.array||g;assert.ok([...m.data].every(Number.isFinite));}
 draw(m,mvp,options){assert.ok(this.meshes.has(m));assert.equal(mvp.length,16);this.draws.push({m,options});}
 destroy(m){this.meshes.delete(m);}
}
test('identity multiplication preserves translation',()=>{const a=M.translation(2,3,4);assert.deepEqual(M.multiply(M.identity(),a),a);assert.deepEqual(M.multiply(a,M.identity()),a);});
test('matrix multiplication order is scale then translation',()=>{const p=M.project([1,1,1],M.multiply(M.translation(2,3,4),M.scale(2)));assert.deepEqual(p,[4,5,6,1]);});
test('perspective maps visible points into clip volume',()=>{const m=M.multiply(M.perspective(.7,1.5,.1,100),M.translation(0,0,-30));const p=M.project([0,0,0],m);near(p[0],0);near(p[1],0);assert.ok(p[2]>-1&&p[2]<1&&p[3]>0);});
test('trackball projects center to north pole',()=>assert.deepEqual(M.spherePoint(50,50,100,100),[0,0,1]));
test('off-canvas trackball points remain normalized',()=>near(Math.hypot(...M.spherePoint(-400,1000,100,100)),1));
test('quaternion between identical vectors is identity',()=>assert.deepEqual(M.quatBetween([1,0,0],[1,0,0]),[0,0,0,1]));
test('antipodal vectors produce a finite 180 degree rotation',()=>{const q=M.quatBetween([1,0,0],[-1,0,0]);near(Math.hypot(...q),1);near(M.project([1,0,0],M.quatMatrix(q))[0],-1);});
test('arcball delta maps start vector to end vector',()=>{const a=M.normalize([.3,.4,1]),b=M.normalize([-.8,.2,1]);const p=M.project(a,M.quatMatrix(M.quatBetween(a,b)));b.forEach((v,i)=>near(v,p[i]));});
test('continuous rotation crosses poles and remains unit length',()=>{let q=[0,0,0,1];for(let i=0;i<800;i++)q=M.quatMul(M.axisAngle([1,0,0],Math.PI/200),q);near(Math.abs(q[3]),1);near(Math.hypot(...q),1);});
test('4000 mixed-axis drags do not introduce NaN or quaternion drift',()=>{const r=M.random(9);let q=[0,0,0,1];for(let i=0;i<4000;i++){const a=M.normalize([r()-.5,r()-.5,1]),b=M.normalize([r()-.5,r()-.5,1]);q=M.quatMul(M.quatBetween(a,b),q);}assert.ok(q.every(Number.isFinite));near(Math.hypot(...q),1);});
test('seeded procedural scene is reproducible',()=>{const a=M.random(11),b=M.random(11);assert.deepEqual(Array.from({length:100},a),Array.from({length:100},b));});
test('transition damping is independent of frame partition',()=>near(M.damp(0,1,1),M.damp(M.damp(0,1,.5),1,.5)));
test('automatic view obeys pointer, drag, and keyboard state',()=>{for(const key of ['hovered','keyboardReveal'])assert.equal(viewTarget({mode:'auto',[key]:true}),1);assert.equal(viewTarget({mode:'auto'}),0);});
test('locked city ignores hovering; locked agents ignores pointer leave',()=>{assert.equal(viewTarget({mode:'city',hovered:true,dragging:true}),0);assert.equal(viewTarget({mode:'agents',hovered:false}),1);});
test('pause, reduced motion, visibility, and intersection stop ambient motion',()=>{const s={paused:false,reducedMotion:false,hidden:false,intersecting:true};assert.equal(effectiveMotion(s),true);for(const key of ['paused','reducedMotion','hidden'])assert.equal(effectiveMotion({...s,[key]:true}),false);assert.equal(effectiveMotion({...s,intersecting:false}),false);});
test('geometry box has 12 triangles and valid color pairs',()=>{const g=new Geometry().box(0,0,0,1,1,1,colorPair('#112233','#aabbcc'));assert.equal(g.array.length,36*11);assert.ok([...g.array].every(Number.isFinite));});
test('message paths connect exact sender and receiver endpoints',()=>{const a=[-5,3,0],b=[0,6,0];assert.deepEqual(curve(a,b,2,0),a);curve(a,b,2,1).forEach((v,i)=>near(v,b[i]));});
test('city creates deterministic real 3D geometry',()=>{const a=new CityLayer(new MockRenderer(),config),b=new CityLayer(new MockRenderer(),config);assert.deepEqual(a.buildings,b.buildings);assert.equal(a.buildings.length,config.city.grid**2-config.city.grid-1);assert.ok(a.buildings.some(x=>x.h>3));a.dispose();b.dispose();});
test('layers allocate fixed buffers and dispose every buffer',()=>{const r=new MockRenderer(),city=new CityLayer(r,config),agent=new AgentLayer(r,config);assert.equal(r.meshes.size,19);for(const time of [0,.1,1,1000]){city.update(time);agent.update(time);}assert.equal(r.meshes.size,19);for(const reveal of [0,.5,1]){const f={mvp:M.identity(),reveal,day:.5,time:1};city.render(f);agent.render(f);}city.dispose();agent.dispose();assert.equal(r.meshes.size,0);});
test('agent layer accepts an added agent without engine edits',()=>{const c=structuredClone(config);c.agents.push({id:'new-research',label:{en:'NEW',zh:'新增'},position:[3,5,8],color:'purple'});const r=new MockRenderer(),layer=new AgentLayer(r,c);assert.equal(layer.paths.length,2*(config.agents.length+1));layer.update(1);layer.dispose();assert.equal(r.meshes.size,0);});
test('all delivered JavaScript parses successfully',()=>{function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.js'))execFileSync(process.execPath,['--check',p]);}}walk(new URL('../public/assets',import.meta.url).pathname);});

test('every building stands on the same horizontal ground',()=>{
 const c=new CityLayer(new MockRenderer(),config);assert.ok(c.buildings.every(b=>b.base===0&&b.h>0));assert.ok(c.buildings.some(b=>b.h>4));c.dispose();
});
test('the world has no cubeCity geometry or scene labels',()=>{
 const template=readFileSync(new URL('../templates/index.html',import.meta.url),'utf8');
 assert.ok(!template.includes('scene-labels'));assert.ok(!template.includes('data-scene-view'));assert.ok(!template.includes('data-scene-zoom'));
});
test('closed traffic routes meet continuously at every corner',()=>{
 for(const t of [0,.125,.5,.625,1]){const a=rectangularRoute(-1,1,-3,3,t-1e-8).p,b=rectangularRoute(-1,1,-3,3,t+1e-8).p;assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))<1e-5);}
});
test('drag preserves city or agent view as it was at pointer down',()=>{
 assert.equal(viewTarget({mode:'auto',hovered:true,dragging:true,dragTarget:0}),0);
 assert.equal(viewTarget({mode:'auto',hovered:false,dragging:true,dragTarget:1}),1);
});
test('packet geometry is finite for long-running clocks and extreme views',()=>{
 const r=new MockRenderer(),c=new CityLayer(r,config),a=new AgentLayer(r,config),dust=new AmbientLayer(r,config);assert.equal(r.meshes.size,20);
 for(const t of [0,10,10000,1e7]){c.update(t);a.update(t);dust.update(t);}
 for(const reveal of [0,.1,.5,.9,1])for(const day of [0,1]){const f={mvp:M.identity(),reveal,day,time:1};c.render(f);a.render(f);dust.render(f);}
 c.dispose();a.dispose();dust.dispose();assert.equal(r.meshes.size,0);
});
function cpuFixture(){
 const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})};
 const canvas={width:0,height:0,getContext:()=>ctx};const r=new SoftwareRenderer(canvas);r.resize(20,20,1);r.begin(0,0);return r;
}
function triangle(z,rgb){return {points:[[1,1,z,1],[18,1,z,1],[1,18,z,1]],rgb,alpha:1,depthWrite:true};}
test('CPU opaque surfaces use depth, not painter order',()=>{
 const r=cpuFixture();r.rasterTriangle(triangle(.2,[255,0,0]));r.rasterTriangle(triangle(.8,[0,0,255]));
 const p=(Math.floor(4*r.dpr)*r.canvas.width+Math.floor(4*r.dpr))*4;assert.equal(r.image.data[p],255);assert.equal(r.image.data[p+2],0);r.dispose();
});
test('CPU line/point visibility respects foreground depth',()=>{
 const r=cpuFixture();r.rasterTriangle(triangle(.2,[255,0,0]));assert.equal(r.isVisible(4,4,.8),false);assert.equal(r.isVisible(4,4,.1),true);r.dispose();
});
test('CPU transparent surfaces blend without claiming opaque occlusion',()=>{
 const r=cpuFixture();r.rasterTriangle(triangle(.8,[0,0,255]));r.rasterTriangle({...triangle(.2,[255,0,0]),alpha:.5,depthWrite:false});
 const p=(Math.floor(4*r.dpr)*r.canvas.width+Math.floor(4*r.dpr))*4;assert.ok(r.image.data[p]>=127&&r.image.data[p]<=128);assert.ok(r.image.data[p+2]>=127&&r.image.data[p+2]<=128);r.dispose();
});

test('CPU honors explicit depth writes during the near-opaque city transition',()=>{
 const r=cpuFixture();r.rasterTriangle({...triangle(.2,[255,0,0]),alpha:.9,depthWrite:true});assert.equal(r.isVisible(4,4,.8),false);r.dispose();
});
