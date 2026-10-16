/** CPU compatibility renderer for restricted WebGL environments.
 * Opaque triangles use a real per-pixel depth buffer, so buildings and street surfaces occlude
 * each other correctly. Canvas draws antialiased lines and glow points afterwards,
 * also testing their depth. Transparent surfaces use back-to-front compositing.
 * The API and world geometry are identical to Renderer.js. No bitmap scene assets.
 */
export class SoftwareRenderer {
  constructor(canvas) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});
    if(!this.ctx)throw new Error('Neither WebGL nor Canvas is available.');
    this.meshes=new Set();this.kind='canvas3d';
  }
  create(geometry,mode='triangles',dynamic=false) {
    const data=geometry.array||geometry;if(data.length%11)throw new Error('Invalid vertex buffer.');
    const m={data,mode,dynamic,cache:null};this.meshes.add(m);return m;
  }
  update(mesh,geometry) {mesh.data=geometry.array||geometry;mesh.cache=null;}
  resize(w,h,dpr=1) {
    this.dpr=Math.min(Math.max(dpr,1.25),1.5);this.width=w;this.height=h;
    this.canvas.width=Math.max(1,Math.round(w*this.dpr));this.canvas.height=Math.max(1,Math.round(h*this.dpr));
    this.image=this.ctx.createImageData(this.canvas.width,this.canvas.height);
    this.depth=new Float32Array(this.canvas.width*this.canvas.height);
    for(const m of this.meshes)m.cache=null;
  }
  begin(day,time) {
    this.day=day;this.time=time;this.calls=0;this.queue=[];
    this.image.data.fill(0);this.depth.fill(Infinity);
  }
  draw(mesh,m,{opacity=1,pointSize=4,depthWrite=true}={}) {
    if(opacity<.012||!mesh.data.length)return;this.calls++;
    const data=mesh.data,step=mesh.mode==='triangles'?3:mesh.mode==='lines'?2:1;
    let vertices;
    if(mesh.cache&&mesh.cache.matrix.every((n,i)=>n===m[i]))vertices=mesh.cache.vertices;
    else {
      vertices=[];
      for(let i=0;i<data.length;i+=11) {
        const x=data[i],y=data[i+1],z=data[i+2],w=m[3]*x+m[7]*y+m[11]*z+m[15];
        vertices.push([(m[0]*x+m[4]*y+m[8]*z+m[12])/w*this.width*.5+this.width*.5,
          this.height*.5-(m[1]*x+m[5]*y+m[9]*z+m[13])/w*this.height*.5,
          (m[2]*x+m[6]*y+m[10]*z+m[14])/w,w]);
      }
      mesh.cache={matrix:[...m],vertices};
    }
    for(let i=0;i<vertices.length;i+=step) {
      const points=vertices.slice(i,i+step);
      if(points.some(p=>p[3]<=0||p[2]>1||!p.every(Number.isFinite)))continue;
      if(step===3) {
        const [a,b,c]=points,area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
        if(area>=0)continue;
      }
      const idx=i*11,colors=[0,1,2,3].map(k=>data[idx+3+k]*(1-this.day)+data[idx+7+k]*this.day);
      const alpha=Math.min(1,colors[3]*opacity);if(alpha<.012)continue;
      const rgb=colors.slice(0,3).map(c=>Math.round(Math.max(0,Math.min(1,c))*255));
      this.queue.push({points,rgb,alpha,step,pointSize,depthWrite,
        fill:`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(3)})`,z:points.reduce((a,p)=>a+p[2],0)/step});
    }
  }
  rasterTriangle(item) {
    const [a,b,c]=item.points,d=this.dpr,W=this.canvas.width,H=this.canvas.height;
    const x0=a[0]*d,y0=a[1]*d,x1=b[0]*d,y1=b[1]*d,x2=c[0]*d,y2=c[1]*d;
    const minX=Math.max(0,Math.floor(Math.min(x0,x1,x2))),maxX=Math.min(W-1,Math.ceil(Math.max(x0,x1,x2)));
    const minY=Math.max(0,Math.floor(Math.min(y0,y1,y2))),maxY=Math.min(H-1,Math.ceil(Math.max(y0,y1,y2)));
    if(maxX<minX||maxY<minY)return;
    const den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);if(Math.abs(den)<1e-10)return;
    const inv=1/den,dx0=(y1-y2)*inv,dy0=(x2-x1)*inv,dx1=(y2-y0)*inv,dy1=(x0-x2)*inv;
    let row0=((y1-y2)*(minX+.5-x2)+(x2-x1)*(minY+.5-y2))*inv;
    let row1=((y2-y0)*(minX+.5-x2)+(x0-x2)*(minY+.5-y2))*inv;
    const buffer=this.image.data,depth=this.depth,[r,g,bl]=item.rgb,alpha=item.alpha;
    for(let y=minY;y<=maxY;y++,row0+=dy0,row1+=dy1) {
      let w0=row0,w1=row1,index=y*W+minX;
      for(let x=minX;x<=maxX;x++,index++,w0+=dx0,w1+=dx1) {
        if(w0<-.000001||w1<-.000001||w0+w1>1.000001)continue;
        const z=w0*a[2]+w1*b[2]+(1-w0-w1)*c[2];if(z>depth[index]+.0000002)continue;
        const o=index*4;
        if(alpha>.995) {
          buffer[o]=r;buffer[o+1]=g;buffer[o+2]=bl;buffer[o+3]=255;
        } else {
          const dst=buffer[o+3]/255*(1-alpha),out=alpha+dst;
          if(out<=0)continue;
          buffer[o]=(r*alpha+buffer[o]*dst)/out;buffer[o+1]=(g*alpha+buffer[o+1]*dst)/out;
          buffer[o+2]=(bl*alpha+buffer[o+2]*dst)/out;buffer[o+3]=out*255;
        }
        if(item.depthWrite)depth[index]=z;
      }
    }
  }
  isVisible(x,y,z) {
    const X=Math.round(x*this.dpr),Y=Math.round(y*this.dpr);
    if(X<0||Y<0||X>=this.canvas.width||Y>=this.canvas.height)return false;
    return z<=this.depth[Y*this.canvas.width+X]+.000020;
  }
  drawLine(item) {
    const ctx=this.ctx,[a,b]=item.points,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)));let drawing=false,lastX=a[0],lastY=a[1];
    ctx.beginPath();
    for(let i=0;i<=steps;i++) {
      const t=i/steps,x=a[0]+dx*t,y=a[1]+dy*t,visible=this.isVisible(x,y,a[2]+dz*t);
      if(visible) {
        if(!drawing){ctx.moveTo(x,y);drawing=true;}else ctx.lineTo(x,y);
      } else if(drawing) {ctx.lineTo(lastX,lastY);drawing=false;}
      lastX=x;lastY=y;
    }
    ctx.strokeStyle=item.fill;ctx.stroke();
  }
  end() {
    // Opaque surfaces first; true depth makes their draw order irrelevant.
    this.queue.sort((a,b)=>b.z-a.z);
    for(const item of this.queue)if(item.step===3&&item.depthWrite)this.rasterTriangle(item);
    for(const item of this.queue)if(item.step===3&&!item.depthWrite)this.rasterTriangle(item);
    const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.putImageData(this.image,0,0);
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.lineWidth=.72;ctx.lineCap='round';ctx.lineJoin='round';
    for(const item of this.queue) {
      if(item.step===2)this.drawLine(item);
      else if(item.step===1) {
        const [x,y,z]=item.points[0];if(!this.isVisible(x,y,z))continue;
        const r=item.pointSize/2,gradient=ctx.createRadialGradient(x,y,0,x,y,r);
        gradient.addColorStop(0,item.fill);gradient.addColorStop(.28,item.fill);gradient.addColorStop(1,'transparent');
        ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
    }
    this.queue=[];
  }
  destroy(mesh) {this.meshes.delete(mesh);mesh.cache=null;}
  dispose() {this.meshes.clear();this.queue=[];this.depth=null;this.image=null;}
}
