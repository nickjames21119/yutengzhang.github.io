import {Starfield} from './Starfield.js';
const field = new Starfield(document);
window.addEventListener('pagehide',()=>field.dispose(),{once:true});
