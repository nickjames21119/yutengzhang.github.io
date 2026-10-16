/** Isolated enhancement: no dependency of navigation, bibliography or static content. */
(async()=>{
  if(location.protocol==='file:')return;
  try {
    const {PageMotion}=await import('./PageMotion.js');const motion=new PageMotion();
    if(new URLSearchParams(location.search).get('debug')==='1')window.__YZ_MOTION__=motion;
    addEventListener('pagehide',e=>{if(!e.persisted)motion.dispose();});
  }catch(error){console.info('[page-motion] static content retained:',error.message);}
})();
