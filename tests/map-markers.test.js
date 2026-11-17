import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clusterPoints} from '../src/map-clusters.js';
import {zoomPresentation,layoutMarkerNames,markerName} from '../src/map-markers.js';
test('逐级放大从聚合变成独立点，再显示店名；真实同址不虚构位置',()=>{
 const groupsAt=zoom=>clusterPoints([0,20].map((x,i)=>({r:{id:i+1,name:'餐厅'+i},p:{x:300+x*2**(zoom-16),y:200}})),zoomPresentation(zoom).clusterRadius);
 assert.equal(groupsAt(16).length,1);assert.equal(groupsAt(17).length,2);assert.equal(zoomPresentation(17).showNames,false);assert.equal(zoomPresentation(18).showNames,false);assert.equal(zoomPresentation(19).showNames,true);
 for(const zoom of [3,16,18,19,21])assert.equal(clusterPoints([1,2].map(id=>({r:{id},p:{x:250,y:250}})),zoomPresentation(zoom).clusterRadius).length,1);
});
test('名称在点下方避让，优先选中与收藏，保留所有点并约束边界',()=>{
 const groups=[{key:'1',x:100,y:100,members:[{id:1,name:'第一家餐厅'}]},{key:'2',x:120,y:100,members:[{id:2,name:'第二家餐厅',favorite:1}]},{key:'3',x:290,y:200,members:[{id:3,name:'名字特别长的餐厅分店'}]}];
 assert.equal(layoutMarkerNames(groups,{zoom:18,size:{x:320,y:400}}).size,0);
 const labels=layoutMarkerNames(groups,{zoom:19,size:{x:320,y:400},selected:1});assert.equal(labels.size,3);assert.equal(labels.get('1').visible,true);assert.equal(labels.get('2').visible,false);assert.equal(labels.get('3').visible,true);
 const last=labels.get('3');assert.ok(290-last.width/2+last.shift+last.width<=314);
 assert.equal(markerName({members:[{name:'同址店A'},{name:'同址店B'}]}),'同址店A等2家');
});
