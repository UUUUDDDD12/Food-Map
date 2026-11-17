import {test} from 'node:test';
import assert from 'node:assert/strict';
import gcoord from 'gcoord';
import {queryAddresses} from '../src/address-query.js';
test('地址搜索不限制北京和餐饮，结果保留GCJ并转换地图内部坐标',async()=>{
 let options,searches=0;const AMap={PlaceSearch:class{constructor(opts){options=opts;}search(text,cb){searches++;assert.equal(text,'上海虹桥站');cb('complete',{poiList:{pois:[{id:'station',name:text,location:{lat:31.2,lng:121.3},pname:'上海市',address:'闵行区'}]}});}},Geocoder:class{constructor(){throw Error('已有地点不应再调用地理编码');}}};
 const rows=await queryAddresses(AMap,' 上海虹桥站 ');assert.equal(searches,1);assert.equal(options.city,'全国');assert.equal(options.citylimit,false);assert.equal(options.type,undefined);assert.equal(rows[0].gcj_lng,121.3);const point=gcoord.transform([rows[0].lng,rows[0].lat],gcoord.WGS84,gcoord.GCJ02);assert.ok(Math.abs(point[0]-121.3)<0.00001);assert.equal(rows[0].address,'上海市闵行区');
});
test('地址无POI时用地理编码补充，空结果与服务失败区别处理',async()=>{
 let geocodes=0;const AMap={PlaceSearch:class{search(text,cb){cb('no_data',{});}},Geocoder:class{getLocation(text,cb){geocodes++;cb('complete',{geocodes:[{formattedAddress:'北京市海淀区清华园1号',location:{lat:40,lng:116}}]});}}};
 assert.deepEqual(await queryAddresses(AMap,' '),[]);assert.equal(geocodes,0);const rows=await queryAddresses(AMap,'清华园1号');assert.equal(rows[0].name,'北京市海淀区清华园1号');assert.equal(geocodes,1);
 AMap.Geocoder=class{getLocation(text,cb){cb('no_data',{});}};assert.deepEqual(await queryAddresses(AMap,'不存在的地址'),[]);
 AMap.PlaceSearch=class{search(text,cb){cb('error',{info:'DAILY_QUERY_OVER_LIMIT'});}};await assert.rejects(queryAddresses(AMap,'清华园1号'),/额度/);
});
