#!/usr/bin/env python3
"""Browser regression and previews. --offline-inject is provided for managed
browsers that block loopback navigation. Only that mode was used in the report.
Install Playwright separately to rerun. Screenshot previews never use fake points.
"""
from pathlib import Path
import re,base64,json,argparse,shutil,threading,functools
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];dist=R/'dist'
def load_offline(page,width=1440,theme='dark',lang='en',api_mode='offline'):
 html=(dist/('zh.html' if lang=='zh' else 'index.html')).read_text()
 def css(m):
  path=dist/re.search(r'href="([^"]+)"',m[0])[1];s=path.read_text()
  def localurl(match):
   rel=match[1];p=path.parent/rel
   if not p.is_file():return match[0]
   return 'url("data:image/svg+xml;base64,'+base64.b64encode(p.read_bytes()).decode()+'")'
  s=re.sub(r'url\("([^\"]+\.svg)"\)',localurl,s)
  return '<style>'+s+'</style>'
 html=re.sub(r'<link[^>]+rel="stylesheet"[^>]*>',css,html)
 html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
 html=html.replace('src="assets/portrait/avatar.jpg"','src="data:image/jpeg;base64,'+base64.b64encode((dist/'assets/portrait/avatar.jpg').read_bytes()).decode()+'"')
 page.set_content(html,wait_until='domcontentloaded');page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
 page.add_script_tag(content=(dist/'assets/app.js').read_text())
 sources={str(p.relative_to(dist/'assets')):p.read_text() for p in (dist/'assets').rglob('*.js')}
 page.evaluate('''async ({sources,lang,api_mode})=>{
 const urls={};function resolve(base,rel){const a=base.split('/');a.pop();for(const s of rel.split('/')){if(s==='..')a.pop();else if(s!=='.')a.push(s);}return a.join('/');}
 function compile(path){if(urls[path])return urls[path];const source=sources[path].replace(/from\\s+['"]([^'"]+)['"]/g,(m,p)=>`from '${compile(resolve(path,p))}'`);urls[path]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));return urls[path];}
 const {PageMotion}=await import(compile('motion/PageMotion.js'));window.__YZ_MOTION__=new PageMotion();
 const {SceneController}=await import(compile('scene/SceneController.js'));window.__YZ_SCENE__=new SceneController(document.querySelector('[data-city-scene]'),JSON.parse(document.getElementById('scene-data').textContent),lang);
 const {Pointer}=await import(compile('interaction/Pointer.js'));window.__YZ_POINTER__=new Pointer();
 const {Starfield}=await import(compile('stars/Starfield.js'));window.__YZ_STARS__=new Starfield(document);
 const {ClickPulse}=await import(compile('interaction/ClickPulse.js'));window.__YZ_PULSE__=new ClickPulse(document);
 // Test-only transport. No synthetic markers in production or in page previews.
 window.__requests=[];window.__apiMode=api_mode;
 window.fetch=async (url,opts={})=>{window.__requests.push({url:String(url),method:opts.method||'GET',body:opts.body||null});if(window.__apiMode==='offline')return new Response('{"status":"unconfigured"}',{status:503,headers:{'content-type':'application/json'}});return new Response(JSON.stringify(opts.method==='POST'?{status:'ok',recorded:true}:{status:'ok',total:0,points:[]}),{headers:{'content-type':'application/json'}});};
 const {VisitorMap}=await import(compile('visitors/VisitorMap.js'));const cfg=JSON.parse(document.getElementById('visitors-data').textContent);cfg.apiBase='https://visitor-test.example/api';window.__YZ_VISITORS__=new VisitorMap(document.querySelector('[data-visitors]'),cfg);
 window.__moduleURLs=urls;
 }''',{'sources':sources,'lang':lang,'api_mode':api_mode})
 page.wait_for_timeout(800)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--offline-inject',action='store_true');parser.add_argument('--output',type=Path,default=R/'test-results/browser');parser.add_argument('--chromium',default=None)
 args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 report={'mode':'offline source-module injection' if args.offline_inject else 'local HTTP navigation','checks':[],'errors':[],'renderers':[]}
 def check(name,value):
  if not value: raise AssertionError(name)
  report['checks'].append(name)
  print(f"PASS {len(report['checks'])}: {name}",flush=True)
 def snap(page):return page.evaluate('window.__YZ_SCENE__.snapshot()')
 server=None
 if not args.offline_inject:
  server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(dist)));threading.Thread(target=server.serve_forever,daemon=True).start()
 def open_page(browser,width=1440,height=980,theme='dark',lang='en',reduced=False,touch=False):
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=touch,is_mobile=touch,reduced_motion='reduce' if reduced else 'no-preference')
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  if args.offline_inject:load_offline(page,theme=theme,lang=lang)
  else:
   page.add_init_script(f"localStorage.setItem('yz-theme','{theme}')")
   page.goto(f'http://127.0.0.1:{server.server_port}/'+('zh.html' if lang=='zh' else 'index.html')+'?debug=1',wait_until='networkidle')
  page.wait_for_function('!!window.__YZ_SCENE__');report['renderers'].append(snap(page)['renderer']);return page
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=args.chromium or shutil.which('chromium'),headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=open_page(browser);page.mouse.move(2,2);page.wait_for_timeout(600)
  check('city uses a 3D renderer, not a static picture',snap(page)['renderer'] in ['webgl','canvas3d'])
  check('all buildings stand on a single ground',page.evaluate('window.__YZ_SCENE__.layers[0].buildings.every(b=>b.base===0&&b.h>0)'))
  check('scene has 20 reusable graphics buffers',snap(page)['resources']==20)
  check('no scene toolbar of any kind',page.locator('.scene-controls,[data-scene-view],[data-scene-zoom],[data-scene-pause]').count()==0)
  check('no city/agent text labels',page.locator('.scene-labels,.agent-label').count()==0)
  check('scene has no external panel border',page.locator('.city-experience').evaluate('(e)=>getComputedStyle(e).borderTopWidth')=='0px')
  check('scene has a transparent background',page.locator('.city-experience').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)')
  check('name remains at most 40px',page.locator('.hero-name').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')<=40)
  check('selected avatar loads',page.locator('.profile-avatar').evaluate('(e)=>e.complete&&e.naturalWidth>500'))
  check('avatar colors are unchanged',page.locator('.profile-avatar').evaluate('(e)=>getComputedStyle(e).filter')=='none')
  check('black/gold theme token remains correct',page.locator('html').evaluate('(e)=>getComputedStyle(e).getPropertyValue("--accent").trim()')=='#d9b56e')
  check('custom SVG cursor is used',page.locator('body').evaluate('(e)=>getComputedStyle(e).cursor.includes("url(")'))
  check('custom cursor follower is present',page.locator('.cursor-halo').count()==1)
  t=snap(page)['time'];page.wait_for_timeout(180);check('traffic and ambient clock run',snap(page)['time']>t)
  page.evaluate('window.__YZ_POINTER__.hide()');page.screenshot(path=str(args.output/'dark-city.png'))
  canvas=page.locator('#city-canvas');canvas.hover();page.wait_for_timeout(120)
  check('hover fades progressively rather than replacing a still image',0<snap(page)['reveal']<.99)
  page.wait_for_function('window.__YZ_SCENE__.reveal>.99');page.evaluate('window.__YZ_POINTER__.hide()');page.screenshot(path=str(args.output/'dark-agents.png'))
  check('hover fully reveals abstract agent network',snap(page)['reveal']>.99)
  check('agent reveal does not create labels or tooltips',page.locator('.agent-label,.scene-controls').count()==0)
  box=canvas.bounding_box();x=box['x']+box['width']*.48;y=box['y']+box['height']*.48
  q=snap(page)['quaternion'];page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+115,y-95,steps=10);page.mouse.up();page.wait_for_timeout(100)
  check('drag rotates the scene on more than one axis',sum(abs(a-b) for a,b in zip(q,snap(page)['quaternion']))>.2)
  check('agent view remains stable while dragging',snap(page)['reveal']>.9)
  check('drag quaternion remains normalized',abs(sum(v*v for v in snap(page)['quaternion'])-1)<1e-6)
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(box['x']-40,box['y']-30,steps=8);page.mouse.up();page.wait_for_function('window.__YZ_SCENE__.reveal<.01')
  check('dragging beyond canvas releases pointer capture',not snap(page)['state']['dragging'])
  check('pointer leave fades back to city',snap(page)['reveal']<.01)
  canvas.focus();canvas.press('Home');q=snap(page)['quaternion'];canvas.press('ArrowUp');canvas.press('q');check('keyboard rotates and rolls the city',snap(page)['quaternion']!=q)
  canvas.press('Home');check('Home resets the orientation',snap(page)['quaternion']==q)
  canvas.press('Space');page.wait_for_function('window.__YZ_SCENE__.reveal>.99');check('keyboard can reveal agents',snap(page)['reveal']>.99)
  canvas.press('Escape');page.wait_for_function('window.__YZ_SCENE__.reveal<.01');check('Escape returns to automatic city mode',snap(page)['state']['mode']=='auto')
  # Start a drag while the city is still visible, before the hover fade completes.
  page.mouse.move(2,2);page.wait_for_timeout(100);page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-90,y+80,steps=8)
  check('quick press latches the city view during rotation',snap(page)['state']['dragTarget']==0)
  page.mouse.up();page.mouse.move(2,2);page.wait_for_function('window.__YZ_SCENE__.reveal<.01');canvas.focus();canvas.press('Home')
  page.locator('.theme-toggle').click();page.mouse.move(2,2);page.wait_for_function('window.__YZ_SCENE__.day>.99');page.wait_for_timeout(3500)
  check('light palette reaches both page and geometry',page.locator('html').get_attribute('data-theme')=='light' and snap(page)['day']>.99)
  check('avatar is not recolored in light mode',page.locator('.profile-avatar').evaluate('(e)=>getComputedStyle(e).filter')=='none')
  page.evaluate('window.__YZ_POINTER__.hide()');page.screenshot(path=str(args.output/'light-city.png'))
  check('theme/reveal changes do not leak graphics buffers',snap(page)['resources']==20)
  check('paper thumbnails are absent',page.locator('.paper-art').count()==0)
  check('Cite buttons and dialogs are absent',page.locator('[data-cite],#citation-dialog').count()==0)
  check('unpublished work has no request link',page.locator('a[href*="Paper%20request"]').count()==0)
  check('Path heading is concise',page.locator('#journey-heading').inner_text()=='Path.')
  check('Contact heading is concise',page.locator('#contact-heading').inner_text()=='Let’s connect.')
  check('Publication heading is concise',page.locator('#publications-heading').inner_text().startswith('Publication'))
  check('all five publications visible without categories',page.locator('.publication:visible').count()==5)
  check('filter/search controls removed',page.locator('.filter-buttons,#publication-search,[data-filter]').count()==0)
  check('Freight summary reads A benchmark.',page.locator('#pub-freight .paper-summary').inner_text()=='A benchmark.')
  check('advisor is linked and underlined within About',page.locator('.about-content .advisor-inline-link').count()==1 and page.locator('.about-content .advisor-inline-link').evaluate('(e)=>getComputedStyle(e).textDecorationLine.includes("underline")'))
  check('the header role replaces old research subline',page.locator('.brand-subline').inner_text()=='Ph.D. student · HKUST (Guangzhou)')
  check('stars are sparse and drift independently',page.locator('.site-night-sky .star').count()==26 and page.locator('.site-night-sky .star-core').count()==26 and page.locator('.site-night-sky .star').first.evaluate('(e)=>getComputedStyle(e).animationName.includes("v8-star-drift")'))
  page.locator('.theme-toggle').click();page.mouse.move(2,2);page.wait_for_timeout(3600)
  page.locator('#publications').evaluate('(e)=>window.scrollTo({top:e.offsetTop-95,behavior:"instant"})');page.wait_for_timeout(350);page.evaluate('window.__YZ_POINTER__.hide()');page.screenshot(path=str(args.output/'publications.png'))
  page.locator('#visitors').scroll_into_view_if_needed();page.wait_for_timeout(1100)
  check('world coastlines render without an online map vendor',page.locator('.map-land path').count()>10)
  check('no fabricated visitor markers are shipped',page.locator('.map-marker').count()==0)
  check('unconfigured service is clearly identified', 'not connected' in page.locator('[data-visit-status]').inner_text())
  check('unconfigured count is unknown, not a fabricated total',page.locator('[data-visit-total]').inner_text()=='—')
  if args.offline_inject:
   check('no recording before explicit consent',not page.evaluate('window.__requests.some(r=>r.method==="POST")'))
  page.evaluate('window.__YZ_POINTER__.hide()');page.screenshot(path=str(args.output/'visitor-map.png'))
  page.evaluate('window.__YZ_MOTION__.showAll(); document.activeElement?.blur(); scrollTo({top:0,behavior:"instant"})');page.mouse.move(2,2)
  page.wait_for_function('window.__YZ_SCENE__.day<.01 && window.__YZ_SCENE__.reveal<.01');page.wait_for_timeout(900)
  page.evaluate('window.__YZ_POINTER__.hide()');page.wait_for_timeout(250);page.screenshot(path=str(args.output/'full.png'),full_page=True)
  page.locator('#visitors').scroll_into_view_if_needed();page.wait_for_timeout(200)
  if args.offline_inject:
   # Explicitly mocked API interaction tests. Not real visitors, not used in previews.
   page.evaluate('window.__apiMode="empty"');page.evaluate('window.__YZ_VISITORS__.refresh()');page.wait_for_timeout(100)
   check('connected empty service returns actual zero',page.locator('[data-visit-total]').inner_text()=='0')
   page.locator('[data-visit-allow]').click();page.wait_for_timeout(120)
   check('consent sends exactly the approved minimal body',page.evaluate('window.__requests.some(r=>r.method==="POST"&&r.body===JSON.stringify({consent:true}))'))
   check('confirmation appears only after acknowledged POST', 'added' in page.locator('[data-visit-status]').inner_text())
   page.evaluate('window.__YZ_VISITORS__.render([{country:"US",latitude:47,longitude:-123,count:2}])')
   check('recorded aggregate response creates a map marker',page.locator('.map-marker').count()==1)
   check('marker has readable accessible count', '2 daily-deduplicated' in page.locator('.map-marker').get_attribute('aria-label'))
   page.locator('.map-marker').focus();check('marker focus exposes its count',page.locator('[data-map-tooltip]').is_visible())
   page.evaluate('Object.defineProperty(navigator,"globalPrivacyControl",{value:true,configurable:true});window.__YZ_VISITORS__.syncChoice()')
   check('GPC disables further consent recording',page.locator('[data-visit-allow]').is_disabled())
   before=page.evaluate('window.__requests.filter(r=>r.method==="POST").length');page.evaluate('window.__YZ_VISITORS__.record()');check('GPC is enforced by the client',page.evaluate('window.__requests.filter(r=>r.method==="POST").length')==before)
   page.evaluate('delete navigator.globalPrivacyControl')
  page.locator('[data-motion-toggle]').click();check('footer motion preference works without scene tools',page.locator('html').get_attribute('data-motion')=='paused')
  page.evaluate('scrollTo({top:0,behavior:"instant"})');page.mouse.move(2,2);page.wait_for_timeout(700);t=snap(page)['time'];page.wait_for_timeout(250)
  check('reduced animation preference freezes background motion',snap(page)['time']==t)
  canvas.hover();page.wait_for_function('window.__YZ_SCENE__.reveal>.99');check('hover remains usable with idle motion disabled',snap(page)['reveal']>.99)
  page.wait_for_function('window.__YZ_SCENE__.reveal===1 && !window.__YZ_SCENE__.frameId')
  check('stationary paused scene stops requesting frames',not snap(page)['frameScheduled'])
  page.evaluate('window.__YZ_SCENE__.dispose();window.__YZ_POINTER__.dispose();window.__YZ_VISITORS__.dispose()')
  check('graphics disposal releases all buffers',page.evaluate('window.__YZ_SCENE__.renderer.meshes.size')==0)
  check('pointer disposal removes its DOM overlay',page.locator('.cursor-halo').count()==0)
  page.close()
  for width in [360,390,768,1024]:
   mobile=open_page(browser,width=width,height=1100,touch=width<500)
   check(f'no horizontal overflow at {width}px',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   check(f'canvas initializes at {width}px',snap(mobile)['width']>200)
   if width==390:
    mobile.evaluate('window.__YZ_MOTION__.showAll()');mobile.wait_for_timeout(900);mobile.screenshot(path=str(args.output/'mobile.png'),full_page=True)
    c=mobile.locator('#city-canvas');c.scroll_into_view_if_needed();r=c.bounding_box();mx=r['x']+r['width']/2;my=r['y']+r['height']/2
    mobile.touchscreen.tap(mx,my);mobile.wait_for_function('window.__YZ_SCENE__.reveal>.99');check('touch tap reveals agents',snap(mobile)['reveal']>.99)
    mobile.touchscreen.tap(mx,my);mobile.wait_for_function('window.__YZ_SCENE__.reveal<.01');check('second touch tap returns to city',snap(mobile)['reveal']<.01)
    q=snap(mobile)['quaternion'];cdp=mobile.context.new_cdp_session(mobile);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':mx,'y':my}]})
    for i in range(1,9):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':mx+i*5,'y':my-i*5}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});check('touch drag rotates the city',snap(mobile)['quaternion']!=q)
    check('touch devices do not show a desktop cursor ring',not mobile.locator('.cursor-halo').is_visible())
    mobile.locator('#visitors').scroll_into_view_if_needed();mobile.wait_for_timeout(200);check('mobile map and consent controls do not overflow',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   mobile.close()
  reduced=open_page(browser,reduced=True);check('system reduced-motion disables automatic 3D animation',snap(reduced)['time']==0)
  reduced.locator('#city-canvas').hover();reduced.wait_for_timeout(150);check('reduced-motion reveal changes immediately',snap(reduced)['reveal']==1);reduced.close()
  zh=open_page(browser,lang='zh');check('Chinese Path title is concise',zh.locator('#journey-heading').inner_text()=='历程。');check('Chinese visitor controls are localized',zh.locator('[data-visit-allow]').inner_text()=='加入我的访问');check('Chinese layout has no overflow',zh.evaluate('document.documentElement.scrollWidth<=innerWidth'));zh.close()
  check('no uncaught browser exceptions',not report['errors']);browser.close()
 if server:server.shutdown();server.server_close()
 report['passed']=len(report['checks']);report['status']='PASS';(args.output/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':report['passed'],'mode':report['mode'],'renderers':sorted(set(report['renderers']))}))
if __name__=='__main__':main()
