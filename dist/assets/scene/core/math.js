/** Small, independently tested 3D math module. Column-major matrices; q = [x,y,z,w]. */
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function normalize(a) {const n=Math.hypot(...a);return n>1e-10?a.map(x=>x/n):a.map((_,i)=>i===a.length-1?1:0);}
export function quatMul(a,b) {const [x,y,z,w]=a,[X,Y,Z,W]=b;return normalize([w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z]);}
export function axisAngle(axis,angle){const a=normalize(axis),s=Math.sin(angle/2);return [a[0]*s,a[1]*s,a[2]*s,Math.cos(angle/2)];}
export function quatBetween(a,b){const d=clamp(dot(a,b),-1,1);if(d<-.999999){let axis=cross(a,[1,0,0]);if(Math.hypot(...axis)<1e-6)axis=cross(a,[0,1,0]);return axisAngle(axis,Math.PI);}return normalize([...cross(a,b),1+d]);}
export function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
export function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
export function translation(x,y,z){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;}
export function scale(x,y=x,z=x){const m=identity();m[0]=x;m[5]=y;m[10]=z;return m;}
export function quatMatrix(q){const [x,y,z,w]=q;return new Float32Array([1-2*y*y-2*z*z,2*x*y+2*z*w,2*x*z-2*y*w,0,2*x*y-2*z*w,1-2*x*x-2*z*z,2*y*z+2*x*w,0,2*x*z+2*y*w,2*y*z-2*x*w,1-2*x*x-2*y*y,0,0,0,0,1]);}
export function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);}
export function project(v,m){const [x,y,z]=v;const w=m[3]*x+m[7]*y+m[11]*z+m[15];return [(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w,w];}
export function spherePoint(x,y,width,height){const r=Math.max(1,Math.min(width,height)*.52),nx=(x-width/2)/r,ny=(height/2-y)/r;const d=nx*nx+ny*ny;return d<=1?[nx,ny,Math.sqrt(1-d)]:normalize([nx,ny,0]);}
export function random(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function damp(current,target,dt,speed=7){return current+(target-current)*(1-Math.exp(-speed*dt));}
