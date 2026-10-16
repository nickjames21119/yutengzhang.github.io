import {Pointer} from './Pointer.js';
try {
 const pointer=new Pointer();
 if(new URLSearchParams(location.search).get('debug')==='1')window.__YZ_POINTER__=pointer;
 addEventListener('pagehide',e=>{if(!e.persisted)pointer.dispose();});
}catch(error){console.warn('[pointer] CSS cursor remains available.',error);}
