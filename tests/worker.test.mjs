import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker,{handle,bounds,coarseLocation,dailyToken,cleanup,SQL} from '../backend/worker.js';

// Execute the shipped migration and the exact prepared queries in real SQLite.
// This adapter is a D1 test double, not a claim of a deployed Cloudflare test.
class Database {
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('../backend/migrations/0001_visitors.sql',import.meta.url),'utf8'));}
 prepare(sql){const db=this.db;return {bind(...values){return {sql,values,async run(){const r=db.prepare(sql).run(...values);return {success:true,meta:{changes:Number(r.changes)}};},async all(){return {results:db.prepare(sql).all(...values)};}};}};}
 async batch(statements){this.db.exec('BEGIN');try{const out=[];for(const s of statements){if(s.sql.trim().startsWith('SELECT'))out.push({results:this.db.prepare(s.sql).all(...s.values)});else{const r=this.db.prepare(s.sql).run(...s.values);out.push({meta:{changes:Number(r.changes)}});}}this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 close(){this.db.close();}
}
function fixture(t){const env={VISITOR_DB:new Database(),VISITOR_SECRET:'a'.repeat(64),ALLOWED_ORIGINS:'https://academic.example'};t.after(()=>env.VISITOR_DB.close());return env;}
function req({method='POST',path='/api/visits',origin='https://academic.example',ip='198.51.100.3',body={consent:true},headers={},cf={country:'US',latitude:'47.61',longitude:'-122.33'}}={}){
 const h={'Origin':origin,'Content-Type':'application/json','CF-Connecting-IP':ip,'User-Agent':'Mozilla/5.0 TestDesktop',...headers};
 if(origin===null)delete h.Origin;
 const r=new Request('https://map.example'+path,{method,headers:h,...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
 Object.defineProperty(r,'cf',{value:cf});return r;
}
const json=async r=>(await r).json();
test('edge coordinates reduce to 2-degree cell centers',()=>assert.deepEqual(coarseLocation({country:'US',latitude:47.61,longitude:-122.33}),{country:'US',latitude:47,longitude:-123}));
test('equator and zero longitude are valid, not missing values',()=>assert.deepEqual(coarseLocation({country:'GH',latitude:0,longitude:0}),{country:'GH',latitude:1,longitude:1}));
test('missing, NaN, infinite and out-of-range coordinates are not guessed',()=>{for(const v of [null,undefined,'',true,'NaN',Infinity,91])assert.equal(coarseLocation({country:'US',latitude:v,longitude:0}),null);assert.equal(coarseLocation({country:'XX',latitude:0,longitude:0}),null);});
test('polar/dateline bin centers remain within geography bounds',()=>{const g=coarseLocation({country:'US',latitude:90,longitude:180});assert.equal(g.latitude,89);assert.equal(g.longitude,179);});
test('HMAC is deterministic within one day and different across days',async()=>{const a=await dailyToken('secret','198.51.100.1','2026-01-01');assert.equal(a.length,64);assert.equal(a,await dailyToken('secret','198.51.100.1','2026-01-01'));assert.notEqual(a,await dailyToken('secret','198.51.100.1','2026-01-02'));assert.notEqual(a,await dailyToken('other','198.51.100.1','2026-01-01'));});
test('one consenting edge visit is persisted and publicly aggregated',async t=>{const e=fixture(t);assert.equal((await json(handle(req(),e))).recorded,true);const stats=await json(handle(req({method:'GET',path:'/api/visitors'}),e));assert.equal(stats.total,1);assert.deepEqual(stats.points,[{country:'US',latitude:47,longitude:-123,count:1}]);});
test('duplicate refresh/browser attempts cannot inflate a daily count',async t=>{const e=fixture(t);const results=await Promise.all(Array.from({length:20},()=>json(handle(req(),e))));assert.equal(results.filter(r=>r.recorded).length,1);assert.equal((await json(handle(req({method:'GET',path:'/api/visitors'}),e))).total,1);});
test('two IPs in one coarse cell aggregate to two visits',async t=>{const e=fixture(t);await handle(req(),e);await handle(req({ip:'198.51.100.4'}),e);const s=await json(handle(req({method:'GET',path:'/api/visitors'}),e));assert.equal(s.points.length,1);assert.equal(s.points[0].count,2);});
test('raw IPs never enter the database or public response',async t=>{const e=fixture(t);await handle(req(),e);const stored=JSON.stringify(e.VISITOR_DB.db.prepare('SELECT * FROM visit_dedup').all());assert.ok(!stored.includes('198.51.100.3'));const publicResponse=await json(handle(req({method:'GET',path:'/api/visitors'}),e));assert.ok(!JSON.stringify(publicResponse).includes('token'));assert.ok(!JSON.stringify(publicResponse).includes('198.51.100.3'));});
test('unapproved cross-origin recording is denied',async t=>{const e=fixture(t);assert.equal((await handle(req({origin:'https://evil.example'}),e)).status,403);assert.equal(e.VISITOR_DB.db.prepare('SELECT COUNT(*) n FROM visit_dedup').get().n,0);});
test('missing/null origins cannot write even with a forged consent body',async t=>{const e=fixture(t);for(const origin of [null,'null'])assert.equal((await handle(req({origin}),e)).status,403);});
test('same-origin Worker website needs no extra CORS allowlist entry',async t=>{const e=fixture(t);assert.equal((await handle(req({origin:'https://map.example'}),e)).status,200);});
test('allowed origins get exact CORS headers, not a wildcard',async t=>{const e=fixture(t);const r=await handle(req({method:'OPTIONS'}),e);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://academic.example');assert.equal(r.headers.get('Vary'),'Origin');});
test('DNT and GPC disable recording before any persistence',async t=>{const e=fixture(t);for(const headers of [{'DNT':'1'},{'Sec-GPC':'1'}])assert.equal((await json(handle(req({headers}),e))).reason,'privacy_signal');assert.equal(e.VISITOR_DB.db.prepare('SELECT COUNT(*) n FROM visit_dedup').get().n,0);});
test('explicit consent is mandatory',async t=>{const e=fixture(t);for(const body of [{},{consent:false},{consent:'true'},[]])assert.equal((await handle(req({body}),e)).status,400);});
test('client-supplied location/IP attributes cannot override edge metadata',async t=>{const e=fixture(t);assert.equal((await handle(req({body:{consent:true,latitude:0}}),e)).status,400);});
test('malformed or excessive JSON is rejected',async t=>{const e=fixture(t);for(const body of ['{','x'.repeat(500),'null'])assert.equal((await handle(req({body}),e)).status,400);});
test('wrong content type is rejected',async t=>{const e=fixture(t);assert.equal((await handle(req({headers:{'Content-Type':'text/plain'}}),e)).status,415);});
test('localhost/missing edge metadata skips without invented locations',async t=>{const e=fixture(t);const q=await json(handle(req({cf:null,ip:'127.0.0.1'}),e));assert.equal(q.reason,'location_unavailable');});
test('missing secret/database returns unconfigured instead of false success',async()=>{assert.equal((await handle(req({origin:'https://map.example'}),{})).status,503);assert.equal((await handle(req({method:'GET',path:'/api/visitors'}),{})).status,503);});
test('obvious automated requests are excluded',async t=>{const e=fixture(t);const result=await json(handle(req({headers:{'User-Agent':'Googlebot'}}),e));assert.equal(result.reason,'automated');});
test('optional edge rate limit rejects excess writes',async t=>{const e=fixture(t);e.VISIT_LIMITER={limit:async()=>({success:false})};assert.equal((await handle(req(),e)).status,429);});
test('IPv6 addresses are hashed without being stored raw',async t=>{const e=fixture(t);assert.equal((await json(handle(req({ip:'2001:db8:abcd::1'}),e))).recorded,true);assert.ok(!JSON.stringify(e.VISITOR_DB.db.prepare('SELECT * FROM visit_dedup').all()).includes('2001:db8'));});
test('HTTP methods and unknown API routes fail explicitly',async t=>{const e=fixture(t);assert.equal((await handle(req({method:'GET'}),e)).status,405);assert.equal((await handle(req({path:'/api/nope'}),e)).status,404);});
test('static resource requests delegate to the asset binding',async()=>{const r=await handle(new Request('https://map.example/index.html'),{ASSETS:{fetch:async()=>new Response('static html')}});assert.equal(await r.text(),'static html');});
test('retention window uses UTC dates and includes exactly 90 calendar days',()=>{const b=bounds(Date.UTC(2026,9,15,23,59));assert.equal(b.day,'2026-10-15');assert.equal(b.dedupCutoff,'2026-10-14');assert.equal((Date.parse(b.day)-Date.parse(b.cutoff))/864e5+1,90);});
test('scheduled cleanup deletes old tokens and out-of-window aggregates',async t=>{const e=fixture(t),b=bounds();e.VISITOR_DB.db.exec("INSERT INTO visit_dedup VALUES('2000-01-01','old','US',47,-123)");await handle(req(),e);await cleanup(e);assert.equal(e.VISITOR_DB.db.prepare('SELECT COUNT(*) n FROM visit_dedup').get().n,1);assert.equal(e.VISITOR_DB.db.prepare('SELECT COUNT(*) n FROM visit_days').get().n,1);});
test('GET excludes expired aggregates even before cleanup runs',async t=>{const e=fixture(t);e.VISITOR_DB.db.exec("INSERT INTO visit_days VALUES('2000-01-01','US',47,-123,30)");assert.equal((await json(handle(req({method:'GET',path:'/api/visitors'}),e))).total,0);});
test('operational failures return no stack traces, credentials or IP',async t=>{const e=fixture(t);e.VISITOR_DB.batch=async()=>{throw new Error('database secret 198.51.100.3');};const r=await worker.fetch(req({method:'GET',path:'/api/visitors'}),e);assert.equal(r.status,503);assert.equal(await r.text(),'{"status":"error","reason":"service_unavailable"}');});
