import {CityLayer} from './CityLayer.js';
import {AgentLayer} from './AgentLayer.js';
import {AmbientLayer} from './AmbientLayer.js';
/** Extend here: Layer(renderer, config) with update(time), render(frame), dispose().
 * frame = {mvp, reveal:0..1, day:0..1, time:seconds}.
 * Do not allocate new GPU buffers on every frame. Dispose all resources you own.
 */
export const layerFactories=[
  (renderer,config)=>new CityLayer(renderer,config),
  (renderer,config)=>new AgentLayer(renderer,config),
  (renderer,config)=>new AmbientLayer(renderer,config),
];
