/** Lazy-load graphics in isolation: a scene error cannot break publications or navigation. */
(async()=>{
 const root=document.querySelector('[data-city-scene]');if(!root)return;
 const lang=document.documentElement.lang.startsWith('zh')?'zh':'en';
 function fallback(message){root.dataset.renderer='fallback';const f=root.querySelector('.scene-fallback');f.hidden=false;f.querySelector('[data-fallback-message]').textContent=message;}
 if(location.protocol==='file:'){fallback(lang==='zh'?'三维模块需要本地服务器：请双击 run.bat 或运行 python scripts/serve.py --open。':'Start the local server with run.bat or python scripts/serve.py --open to enable 3D.');return;}
 try{
  const [{SceneController}]=await Promise.all([import('./SceneController.js')]);
  const config=JSON.parse(document.getElementById('scene-data').textContent);
  const scene=new SceneController(root,config,lang);
  // Developer diagnostics are exposed only with ?debug=1, not on the public page.
  if(new URLSearchParams(location.search).get('debug')==='1')window.__YZ_SCENE__=scene;
  addEventListener('pagehide',e=>{if(!e.persisted)scene.dispose();});
 }catch(error){console.warn('[city-scene]',error);fallback(lang==='zh'?'三维场景未能加载。请使用本地服务器，并检查浏览器的图形加速设置。':'The 3D scene could not load. Use the local server and check browser graphics acceleration.');}
})();
