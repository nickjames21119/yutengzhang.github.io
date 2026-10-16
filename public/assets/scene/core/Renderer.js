/** Native WebGL adapter. Layers do not access GL directly. All GPU resources are owned here. */
const vertexSource=`
attribute vec3 aPosition;
attribute vec4 aNight;
attribute vec4 aDay;
uniform mat4 uMVP;
uniform float uDay;
uniform float uOpacity;
uniform float uPointSize;
uniform float uTime;
uniform float uScan;
varying vec4 vColor;
void main(){
 gl_Position=uMVP*vec4(aPosition,1.0);
 gl_PointSize=uPointSize;
 vColor=mix(aNight,aDay,uDay);
 float scan=pow(max(0.0,1.0-abs(mod(aPosition.y-uTime*1.1+100.0,9.0)-4.5)*1.3),3.0);
 vColor.rgb+=vec3(0.22,0.16,0.065)*scan*uScan*(1.0-uDay*0.65);
 vColor.a*=uOpacity;
}`;
const fragmentSource=`
precision mediump float;
varying vec4 vColor;
uniform float uPoints;
void main(){
 vec4 c=vColor;
 if(uPoints>0.5){float d=length(gl_PointCoord-vec2(0.5))*2.0;if(d>1.0)discard;c.a*=exp(-3.5*d*d);}
 if(c.a<0.012)discard;
 gl_FragColor=c;
}`;
export class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.kind='webgl';this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});
  if(!this.gl)throw new Error('WebGL is unavailable.');
  const gl=this.gl;this.meshes=new Set();const shaders=[];
  try{
   for(const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]){
    const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader: '+gl.getShaderInfoLog(s));
   }
   this.program=gl.createProgram();shaders.forEach(s=>gl.attachShader(this.program,s));gl.linkProgram(this.program);
   if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('Shader link: '+gl.getProgramInfoLog(this.program));
  }catch(error){if(this.program)gl.deleteProgram(this.program);throw error;}finally{shaders.forEach(s=>gl.deleteShader(s));}
  this.attributes=['aPosition','aNight','aDay'].map(n=>gl.getAttribLocation(this.program,n));
  this.uniforms=Object.fromEntries(['uMVP','uDay','uOpacity','uPointSize','uTime','uScan','uPoints'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
 }
 create(geometry,mode='triangles',dynamic=false){const gl=this.gl;const data=geometry.array||geometry;const mesh={buffer:gl.createBuffer(),mode:({triangles:gl.TRIANGLES,lines:gl.LINES,points:gl.POINTS})[mode],count:data.length/11,dynamic};if(data.length%11)throw new Error('Invalid vertex buffer.');gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,data,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);this.meshes.add(mesh);return mesh;}
 update(mesh,geometry){const data=geometry.array||geometry;const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);mesh.count=data.length/11;}
 resize(w,h,dpr=1){this.dpr=Math.min(dpr,2);this.canvas.width=Math.max(1,Math.round(w*this.dpr));this.canvas.height=Math.max(1,Math.round(h*this.dpr));this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 begin(day,time){const gl=this.gl;gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniform1f(this.uniforms.uDay,day);gl.uniform1f(this.uniforms.uTime,time);this.calls=0;}
 draw(mesh,mvp,{opacity=1,depthWrite=true,pointSize=4,scan=0}={}){
  if(opacity<.012||mesh.count===0)return;
  const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
  [3,4,4].forEach((size,i)=>{const a=this.attributes[i];gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,44,[0,12,28][i]);});
  gl.uniformMatrix4fv(this.uniforms.uMVP,false,mvp);gl.uniform1f(this.uniforms.uOpacity,opacity);gl.uniform1f(this.uniforms.uPointSize,pointSize*this.dpr);gl.uniform1f(this.uniforms.uScan,scan);gl.uniform1f(this.uniforms.uPoints,mesh.mode===gl.POINTS?1:0);gl.depthMask(depthWrite);gl.drawArrays(mesh.mode,0,mesh.count);this.calls++;
 }
 end(){}
 destroy(mesh){if(!this.meshes.has(mesh))return;this.gl.deleteBuffer(mesh.buffer);this.meshes.delete(mesh);}
 dispose(){for(const mesh of [...this.meshes])this.destroy(mesh);this.gl.deleteProgram(this.program);}
}
