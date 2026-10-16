import {VisitorMap} from './VisitorMap.js';
const root=document.querySelector('[data-visitors]');
if(root){try{
 const visitors=new VisitorMap(root,JSON.parse(document.getElementById('visitors-data').textContent));
 if(new URLSearchParams(location.search).get('debug')==='1')window.__YZ_VISITORS__=visitors;
 addEventListener('pagehide',e=>{if(!e.persisted)visitors.dispose();});
}catch(error){
 root.querySelector('[data-visit-status]').textContent=document.documentElement.lang.startsWith('zh')?'访客地图暂不可用。':'Visitor map is temporarily unavailable.';
 console.warn('[visitors]',error);
}}
