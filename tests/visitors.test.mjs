import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPoint,validAggregate,privacySignal} from '../public/assets/visitors/VisitorMap.js';
test('map projection uses longitude as x and latitude as y',()=>{assert.deepEqual(mapPoint(0,0),[500,250]);assert.deepEqual(mapPoint(90,-180),[0,0]);assert.deepEqual(mapPoint(-90,180),[1000,500]);});
test('valid map data is finite, bounded and countable',()=>{assert.equal(validAggregate({latitude:47,longitude:-123,country:'US',count:2}),true);for(const q of [{latitude:91},{longitude:Infinity},{country:'<img>'},{count:-2},{count:1.5}])assert.equal(validAggregate({latitude:47,longitude:-123,country:'US',count:2,...q}),false);});
test('privacy signal respects either GPC or DNT',()=>{assert.equal(privacySignal({doNotTrack:'1'}),true);assert.equal(privacySignal({globalPrivacyControl:true}),true);assert.equal(privacySignal({doNotTrack:'0'}),false);});
