const NS='http://www.w3.org/2000/svg';
const PREF_KEY='yz-visitor-choice-v1';
export function mapPoint(latitude,longitude){return [(longitude+180)/360*1000,(90-latitude)/180*500];}
export function privacySignal(nav=navigator){return nav.doNotTrack==='1'||nav.globalPrivacyControl===true;}
export function validAggregate(p){return p&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180&&Number.isSafeInteger(p.count)&&p.count>0&&typeof p.country==='string'&&/^[A-Z]{2}$/.test(p.country);}
const M={
 en:{offline:'Visitor service not connected. No visits are being recorded.',empty:'No shared visits yet.',live:'Approximate IP regions · refreshed from recorded visits.',private:'Your browser privacy preference disables visit recording.',shared:'Your approximate region has been added.',duplicate:'This network has already been counted today.',skipped:'Location unavailable; no visit was recorded.',declined:'Your visits will not be recorded.',failed:'The visitor service is unavailable. Your visit was not confirmed.',region:'Approximate region',visits:'daily-deduplicated visits'},
 zh:{offline:'访客服务尚未连接，当前不记录访问。',empty:'暂时还没有共享的访问记录。',live:'IP 推断的粗略区域 · 根据实际记录刷新。',private:'你的浏览器隐私偏好已禁用访问记录。',shared:'已加入你的粗略区域。',duplicate:'这个网络今天已被计数。',skipped:'无法获得位置，本次未记录。',declined:'不会记录你的访问。',failed:'访客服务暂不可用，本次记录未得到确认。',region:'粗略区域',visits:'日去重访问'}
};
export class VisitorMap {
 constructor(root,config){
  this.root=root;this.config=config;this.lang=document.documentElement.lang.startsWith('zh')?'zh':'en';this.text=M[this.lang];
  this.abort=new AbortController();this.pending=new Set();this.disposed=false;this.visible=false;this.busy=false;this.connected=false;this.choice=this.readChoice();
  this.base=new URL(config.apiBase.replace(/\/$/,'')+'/',location.href);
  this.markerRoot=root.querySelector('[data-map-markers]');this.tooltip=root.querySelector('[data-map-tooltip]');
  const on=(el,key,fn)=>el?.addEventListener(key,fn,{signal:this.abort.signal});
  on(root.querySelector('[data-visit-allow]'),'click',()=>{this.setChoice('allow');this.record();});
  on(root.querySelector('[data-visit-deny]'),'click',()=>{this.setChoice('deny');this.status(this.text.declined);});
  on(root.querySelector('[data-visit-settings]'),'click',()=>{root.querySelector('[data-visit-consent]').hidden=false;root.querySelector('[data-visit-allow]').disabled=privacySignal();});
  on(document,'visibilitychange',()=>this.schedule());
  this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.refresh();this.schedule();},{rootMargin:'200px'});this.observer.observe(root);
  this.syncChoice();
  if(this.choice==='allow'&&!privacySignal())this.record();
 }
 readChoice(){try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'null');return p&&Date.now()-p.time<180*864e5&&['allow','deny'].includes(p.value)?p.value:null;}catch{return null;}}
 setChoice(value){this.choice=value;try{localStorage.setItem(PREF_KEY,JSON.stringify({value,time:Date.now()}));}catch{}this.syncChoice();}
 syncChoice(){
  const signal=privacySignal();this.root.querySelector('[data-visit-consent]').hidden=Boolean(this.choice)||signal;
  this.root.querySelector('[data-visit-allow]').disabled=signal;
  if(signal)this.status(this.text.private);
 }
 status(text){if(!this.disposed)this.root.querySelector('[data-visit-status]').textContent=text;}
 async request(path,options={}){
  const ctrl=new AbortController();this.pending.add(ctrl);const timeout=setTimeout(()=>ctrl.abort(),this.config.requestTimeoutMs);
  try{
    const response=await fetch(new URL(path,this.base),{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',...options,signal:ctrl.signal});
    if(!response.ok)throw new Error('Visitor API status '+response.status);
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Expected visitor API JSON');
    return await response.json();
  }finally{clearTimeout(timeout);this.pending.delete(ctrl);}
 }
 async refresh(){
  if(this.disposed||this.loading)return;this.loading=true;
  try{
    const data=await this.request('visitors');
    if(this.disposed)return;
    if(data.status!=='ok'||!Array.isArray(data.points)||!Number.isSafeInteger(data.total)||data.total<0)throw new Error('Invalid aggregate response');
    this.connected=true;const points=data.points.filter(validAggregate).slice(0,1500);this.render(points);
    this.root.querySelector('[data-visit-total]').textContent=data.total.toLocaleString(this.lang);
    this.root.querySelector('[data-visit-regions]').textContent=points.length.toLocaleString(this.lang);
    this.status(privacySignal()?this.text.private:data.total===0?this.text.empty:this.text.live);
  }catch(error){if(!this.disposed){this.connected=false;this.status(this.text.offline);}}
  finally{this.loading=false;}
 }
 async record(){
  if(this.busy||this.disposed||this.choice!=='allow'||privacySignal())return;
  this.busy=true;
  try{
    const result=await this.request('visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true})});
    if(this.disposed)return;
    if(result.status==='ok'){
      await this.refresh();this.status(result.recorded?this.text.shared:this.text.duplicate);
    }else this.status(result.reason==='privacy_signal'?this.text.private:this.text.skipped);
  }catch{this.status(this.text.failed);}finally{this.busy=false;}
 }
 render(points){
  this.markerRoot.replaceChildren();this.tooltip.hidden=true;
  let displayNames;try{displayNames=new Intl.DisplayNames([this.lang],{type:'region'});}catch{}
  for(const point of points){
    const [x,y]=mapPoint(point.latitude,point.longitude),r=Math.min(8,3+Math.log2(point.count+1));
    const group=document.createElementNS(NS,'g');group.classList.add('map-marker');group.setAttribute('transform',`translate(${x},${y})`);group.setAttribute('tabindex','0');group.setAttribute('role','img');group.style.setProperty('--visitor-delay',`${(Math.abs(Math.sin(x*12.9898+y*78.233))*2.9).toFixed(2)}s`);
    let country=point.country;try{country=displayNames?.of(point.country)||country;}catch{}
    const label=`${country} · ${this.text.region}: ${point.count} ${this.text.visits}`;
    group.setAttribute('aria-label',label);
    for(const [cls,radius] of [['marker-hit',15],['marker-pulse',r+3],['marker-dot',r]]){const circle=document.createElementNS(NS,'circle');circle.setAttribute('r',radius);circle.setAttribute('class',cls);group.append(circle);}
    const show=()=>{
      this.tooltip.textContent=label;this.tooltip.hidden=false;
      const bounds=this.root.querySelector('.visitor-map').getBoundingClientRect(),rect=this.root.querySelector('.visitor-map-wrap').getBoundingClientRect();
      // viewBox uses preserveAspectRatio meet; account for letterboxing.
      const scale=Math.min(bounds.width/1000,bounds.height/500),dx=(bounds.width-1000*scale)/2,dy=(bounds.height-500*scale)/2;
      this.tooltip.style.left=Math.max(100,Math.min(rect.width-100,dx+x*scale))+'px';this.tooltip.style.top=dy+y*scale+'px';
    };
    group.addEventListener('pointerenter',show);group.addEventListener('focus',show);group.addEventListener('pointerleave',()=>this.tooltip.hidden=true);group.addEventListener('blur',()=>this.tooltip.hidden=true);
    this.markerRoot.append(group);
  }
 }
 schedule(){clearTimeout(this.timer);if(!this.disposed&&this.visible&&!document.hidden)this.timer=setTimeout(()=>{this.refresh();this.schedule();},this.config.refreshSeconds*1000);}
 dispose(){this.disposed=true;this.abort.abort();this.observer.disconnect();clearTimeout(this.timer);for(const p of this.pending)p.abort();this.pending.clear();this.markerRoot.replaceChildren();}
}
