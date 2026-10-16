/** Geometry assembly only. Every vertex carries night/day colors; no DOM or renderer. */
export function rgb(hex,alpha=1){const s=hex.replace('#','');return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255,alpha];}
export function colorPair(night,day,alpha=1){return [rgb(night,alpha),rgb(day,alpha)];}
export function tint(pair,k){return pair.map(c=>[c[0]*k,c[1]*k,c[2]*k,c[3]]);}
export class Geometry {
 constructor(){this.data=[];}
 vertex(p,c){this.data.push(...p,...c[0],...c[1]);return this;}
 line(a,b,c){this.vertex(a,c);this.vertex(b,c);return this;}
 triangle(a,b,c,color){this.vertex(a,color);this.vertex(b,color);this.vertex(c,color);return this;}
 quad(a,b,c,d,color){this.triangle(a,b,c,color);this.triangle(a,c,d,color);return this;}
 tiledQuad(a,b,c,d,color){
  const u=b.map((v,i)=>v-a[i]),v=d.map((n,i)=>n-a[i]);const nu=Math.max(1,Math.ceil(Math.hypot(...u)/.8)),nv=Math.max(1,Math.ceil(Math.hypot(...v)/.8));
  const pt=(i,j)=>a.map((n,k)=>n+u[k]*i/nu+v[k]*j/nv);
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++)this.quad(pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1),color);return this;
 }
 box(x,y,z,w,h,d,color){const a=x-w/2,b=x+w/2,f=z-d/2,k=z+d/2,t=y+h;const face=this.quad.bind(this);
  face([a,y,k],[b,y,k],[b,t,k],[a,t,k],tint(color,.82));
  face([b,y,f],[a,y,f],[a,t,f],[b,t,f],tint(color,.62));
  face([a,y,f],[a,y,k],[a,t,k],[a,t,f],tint(color,.57));
  face([b,y,k],[b,y,f],[b,t,f],[b,t,k],tint(color,.95));
  face([a,t,k],[b,t,k],[b,t,f],[a,t,f],tint(color,1.12));
  face([a,y,f],[b,y,f],[b,y,k],[a,y,k],tint(color,.42));return this;}
 boxEdges(x,y,z,w,h,d,c){const a=x-w/2,b=x+w/2,f=z-d/2,k=z+d/2,t=y+h;
  for(const Y of [y,t]){this.line([a,Y,f],[b,Y,f],c);this.line([b,Y,f],[b,Y,k],c);this.line([b,Y,k],[a,Y,k],c);this.line([a,Y,k],[a,Y,f],c);}
  for(const X of [a,b])for(const Z of [f,k])this.line([X,y,Z],[X,t,Z],c);return this;}
 path(points,c,closed=false){for(let i=1;i<points.length;i++)this.line(points[i-1],points[i],c);if(closed)this.line(points.at(-1),points[0],c);return this;}
 circle(center,r,c,plane='xz',n=80,start=0,end=Math.PI*2){const points=[];for(let i=0;i<=n;i++){const a=start+(end-start)*i/n,u=Math.cos(a)*r,v=Math.sin(a)*r;points.push(plane==='xz'?[center[0]+u,center[1],center[2]+v]:plane==='xy'?[center[0]+u,center[1]+v,center[2]]:[center[0],center[1]+u,center[2]+v]);}return this.path(points,c);}
 get array(){return new Float32Array(this.data);}
}
export function curve(a,b,height,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t+Math.sin(Math.PI*t)*height,a[2]+(b[2]-a[2])*t];}
