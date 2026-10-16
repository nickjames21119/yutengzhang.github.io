/** Visitor service for Cloudflare Workers + D1. No third-party GeoIP request,
 * no client-supplied coordinates, no public IPs, no tracking cookies.
 * The only trusted geolocation source is Cloudflare's request.cf metadata.
 */
export const RETENTION_DAYS=90;
export const GRID_DEGREES=2;
export const SQL={
 insert:'INSERT OR IGNORE INTO visit_dedup(day,token,country,latitude,longitude) VALUES(?,?,?,?,?)',
 points:'SELECT country,latitude,longitude,SUM(visits) AS count FROM visit_days WHERE day >= ? GROUP BY country,latitude,longitude ORDER BY count DESC,country,latitude,longitude LIMIT 1500',
 total:'SELECT COALESCE(SUM(visits),0) AS total FROM visit_days WHERE day >= ?',
 cleanDedup:'DELETE FROM visit_dedup WHERE day < ?',
 cleanDays:'DELETE FROM visit_days WHERE day < ?'
};
const dayAt=ms=>new Date(ms).toISOString().slice(0,10);
export function bounds(now=Date.now()){
 return {day:dayAt(now),dedupCutoff:dayAt(now-864e5),cutoff:dayAt(now-(RETENTION_DAYS-1)*864e5)};
}
function originAllowed(request,env){
 const origin=request.headers.get('Origin');
 const allowed=new Set([new URL(request.url).origin,...(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)]);
 return origin&&origin!=='null'&&allowed.has(origin)?origin:null;
}
function response(request,env,data,status=200,cache=false){
 const headers=new Headers({'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':cache?'public, max-age=30':'no-store','Vary':'Origin'});
 const origin=originAllowed(request,env);if(origin)headers.set('Access-Control-Allow-Origin',origin);
 headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type');
 return new Response(status===204?null:JSON.stringify(data),{status,headers});
}
export function coarseLocation(cf){
 if(!cf||typeof cf.country!=='string'||!/^[A-Z]{2}$/.test(cf.country)||cf.country==='XX')return null;
 const raw=[cf.latitude,cf.longitude];
 if(raw.some(v=>v===null||v===undefined||typeof v==='boolean'||typeof v==='string'&&!v.trim()))return null;
 const [lat,lon]=raw.map(Number);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
 // Bin centers; all values remain inside valid geographic coordinates.
 const latitude=Math.min(89,Math.max(-89,Math.floor((lat+90)/GRID_DEGREES)*GRID_DEGREES-90+GRID_DEGREES/2));
 const longitude=Math.min(179,Math.max(-179,Math.floor((lon+180)/GRID_DEGREES)*GRID_DEGREES-180+GRID_DEGREES/2));
 return {country:cf.country,latitude,longitude};
}
export async function dailyToken(secret,ip,day){
 const encode=new TextEncoder(),key=await crypto.subtle.importKey('raw',encode.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,encode.encode(day+'\0'+ip));
 return Array.from(new Uint8Array(signature),v=>v.toString(16).padStart(2,'0')).join('');
}
async function smallJson(request){
 const len=Number(request.headers.get('Content-Length')||'0');if(len>256)throw new Error('size');
 if(!request.body)throw new Error('body');
 const reader=request.body.getReader();let length=0,parts=[];
 try{
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>256){await reader.cancel();throw new Error('size');}parts.push(value);}
 }finally{reader.releaseLock();}
 const all=new Uint8Array(length);let i=0;for(const p of parts){all.set(p,i);i+=p.length;}
 return JSON.parse(new TextDecoder().decode(all));
}
export async function cleanup(env,now=Date.now()){
 if(!env.VISITOR_DB)return;const b=bounds(now);
 await env.VISITOR_DB.batch([env.VISITOR_DB.prepare(SQL.cleanDedup).bind(b.dedupCutoff),env.VISITOR_DB.prepare(SQL.cleanDays).bind(b.cutoff)]);
}
export async function handle(request,env){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
 if(!['/api/visitors','/api/visits'].includes(path))return response(request,env,{status:'error',reason:'not_found'},404);
 if(request.method==='OPTIONS')return originAllowed(request,env)?response(request,env,null,204):response(request,env,{status:'error',reason:'origin'},403);
 if(path==='/api/visitors'){
  if(request.method!=='GET')return response(request,env,{status:'error',reason:'method'},405);
  if(!env.VISITOR_DB)return response(request,env,{status:'unconfigured'},503);
  const {cutoff}=bounds();
  // Batch produces one consistent aggregate snapshot.
  const [points,total]=await env.VISITOR_DB.batch([env.VISITOR_DB.prepare(SQL.points).bind(cutoff),env.VISITOR_DB.prepare(SQL.total).bind(cutoff)]);
  return response(request,env,{status:'ok',points:points.results,total:Number(total.results[0]?.total||0),windowDays:RETENTION_DAYS,gridDegrees:GRID_DEGREES},200,true);
 }
 if(request.method!=='POST')return response(request,env,{status:'error',reason:'method'},405);
 if(!originAllowed(request,env))return response(request,env,{status:'error',reason:'origin'},403);
 if(request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1')return response(request,env,{status:'skipped',reason:'privacy_signal'});
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return response(request,env,{status:'error',reason:'content_type'},415);
 let input;try{input=await smallJson(request);}catch{return response(request,env,{status:'error',reason:'invalid_body'},400);}
 if(!input||input.consent!==true||Object.keys(input).length!==1)return response(request,env,{status:'error',reason:'consent_required'},400);
 if(!env.VISITOR_DB||typeof env.VISITOR_SECRET!=='string'||env.VISITOR_SECRET.length<32)return response(request,env,{status:'unconfigured'},503);
 // Ignore obvious automated requests. This is not a bot-proof analytics system.
 if(request.cf?.botManagement?.verifiedBot||/bot|spider|crawler|headless/i.test(request.headers.get('User-Agent')||''))return response(request,env,{status:'skipped',reason:'automated'});
 const location=coarseLocation(request.cf),ip=request.headers.get('CF-Connecting-IPv6')||request.headers.get('CF-Connecting-IP');
 if(!location||!ip||ip.length>64||!/^[:.0-9a-f]+$/i.test(ip))return response(request,env,{status:'skipped',reason:'location_unavailable'});
 const {day}=bounds(),token=await dailyToken(env.VISITOR_SECRET,ip,day);
 // Optional platform rate limiter (not a replacement for edge/WAF protection).
 if(env.VISIT_LIMITER){const limit=await env.VISIT_LIMITER.limit({key:token});if(!limit.success)return response(request,env,{status:'error',reason:'rate_limit'},429);}
 const result=await env.VISITOR_DB.prepare(SQL.insert).bind(day,token,location.country,location.latitude,location.longitude).run();
 return response(request,env,{status:'ok',recorded:Number(result.meta?.changes||0)>0});
}
export default {
 async fetch(request,env){try{return await handle(request,env);}catch{return response(request,env,{status:'error',reason:'service_unavailable'},503);}},
 async scheduled(controller,env,ctx){ctx.waitUntil(cleanup(env));}
};
