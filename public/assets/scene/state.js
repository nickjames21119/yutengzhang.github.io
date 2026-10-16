/** Hover reveals; an active drag latches whichever view was on screen at press. */
export function viewTarget({mode,hovered,dragging,keyboardReveal,dragTarget}){
 if(mode==='city')return 0;
 if(mode==='agents')return 1;
 if(dragging&&(dragTarget===0||dragTarget===1))return dragTarget;
 return hovered||keyboardReveal?1:0;
}
export function effectiveMotion({paused,reducedMotion,hidden,intersecting}){return !paused&&!reducedMotion&&!hidden&&intersecting;}
