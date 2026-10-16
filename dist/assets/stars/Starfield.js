/** Restrained, drifting night stars. Never uses canvas or modifies the 3D scene. */
export class Starfield {
 constructor(root=document) {
  this.root=root;
  this.layer=root.createElement('div');
  this.layer.className='site-night-sky';
  this.layer.setAttribute('aria-hidden','true');
  this.layer.dataset.component='starfield';
  let state=20261016;
  const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
  // Sparse star points, four with subtle four-point diffraction spikes.
  const count=26;
  for(let n=0;n<count;n++){
    const star=root.createElement('i');
    const glint=n%7===0;
    star.className='star'+(glint?' star-glint':'');
    const x=3+random()*94, y=3+random()*94;
    const size=glint?1.7:(.95+random()*.55);
    const driftX=(random()-.5)*22, driftY=(random()-.5)*19;
    const sparkleDuration=5.6+random()*7.9, travelDuration=26+random()*23;
    star.style.cssText=`--sx:${x.toFixed(2)}%;--sy:${y.toFixed(2)}%;--ss:${size.toFixed(2)}px;--dx:${driftX.toFixed(1)}px;--dy:${driftY.toFixed(1)}px;--sp:${sparkleDuration.toFixed(1)}s;--dp:${travelDuration.toFixed(1)}s;--sd:-${(random()*15).toFixed(1)}s;--dd:-${(random()*18).toFixed(1)}s;`;
    const core=root.createElement('span');
    core.className='star-core';
    star.appendChild(core);
    this.layer.appendChild(star);
  }
  root.body.prepend(this.layer);
 }
 dispose(){this.layer.remove();}
}
