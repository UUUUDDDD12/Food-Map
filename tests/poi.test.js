import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDb} from '../server/db.js';
import {importPois} from '../server/poi-import.js';
import {clusterPoints} from '../src/map-clusters.js';
import {matchesDining,classifyFood} from '../shared/food.js';
test('空库不重建演示数据；POI 来源去重、20km边界、服务未知及坐标保留',()=>{
 const db=openDb(':memory:');assert.equal(db.prepare('SELECT COUNT(*) n FROM restaurants').get().n,0);
 const near={id:'B0TESTPOI123',name:'测试咖啡',type:'餐饮服务;咖啡厅',address:'校园内',lng:116.3103,lat:40.09};
 assert.equal(importPois(db,[near]).inserted,1);assert.equal(importPois(db,[near]).duplicate,1);
 assert.equal(importPois(db,[{...near,id:'B0TESTFAR123',lat:39.5}]).outside,1);
 const row=db.prepare('SELECT * FROM restaurants').get();assert.equal(row.service_mode,'');assert.equal(row.gcj_lng,near.lng);assert.notEqual(row.lng,row.gcj_lng);assert.equal(row.category,'咖啡');assert.equal(row.price,null);db.close();
});
test('同址和跨网格边界的相邻点聚合；远距离点独立；成员不丢失',()=>{
 const points=[{r:{id:1},p:{x:49,y:49}},{r:{id:2},p:{x:51,y:51}},{r:{id:3},p:{x:49,y:49}},{r:{id:4},p:{x:200,y:200}}];
 const groups=clusterPoints(points,50);assert.equal(groups.length,2);assert.equal(groups[0].members.length,3);assert.deepEqual(groups.flatMap(g=>g.members.map(r=>r.id)),[1,2,3,4]);assert.equal(clusterPoints([{r:{id:1},p:{x:0,y:0}},{r:{id:2},p:{x:100,y:0}}],50).length,2);
});

test('扩展采集允许20km外门店；重复补图保留人工修改，照片去重',()=>{
 const db=openDb(':memory:');
 const poi={id:'B0TESTFAR456',name:'海鲜自助餐厅',type:'餐饮服务',address:'北京远郊',lng:116.4,lat:39.7};
 assert.equal(importPois(db,[poi]).outside,1);
 assert.equal(importPois(db,[poi],{radiusLimit:Infinity}).inserted,1);
 db.prepare("UPDATE restaurants SET name='人工修正名称',taste='清淡',service_mode='dine_in'").run();
 const full={...poi,photos:[{url:'https://example.com/photo.jpg'}],tel:'010-12345678',cost:128};
 const result=importPois(db,[full],{radiusLimit:Infinity});assert.equal(result.updated,1);assert.equal(result.inserted,0);
 const row=db.prepare('SELECT * FROM restaurants').get();assert.equal(row.name,'人工修正名称');assert.equal(row.taste,'清淡');assert.equal(row.service_mode,'dine_in');assert.equal(row.image,full.photos[0].url);assert.equal(row.category,'自助餐');
 importPois(db,[full],{radiusLimit:Infinity});assert.equal(db.prepare('SELECT COUNT(*) n FROM restaurant_photos').get().n,1);db.close();
});
test('堂食和外卖兼容双服务，未知不混入；分类覆盖常见外卖类型',()=>{
 assert.equal(matchesDining('both','delivery'),true);assert.equal(matchesDining('both','dine_in'),true);assert.equal(matchesDining('','delivery'),false);assert.equal(matchesDining('',''),true);assert.equal(classifyFood('张亮麻辣烫'),'快餐便当');assert.equal(classifyFood('华电一食堂'),'食堂');assert.equal(classifyFood('一点点奶茶'),'奶茶果饮');
});
