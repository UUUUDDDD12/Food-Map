import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapConfiguration,amapProxy} from '../server/amap.js';
test('高德前端配置不包含安全密钥，代理拒绝越界路径',async()=>{
 const saved={MAP_PROVIDER:process.env.MAP_PROVIDER,AMAP_JS_KEY:process.env.AMAP_JS_KEY,AMAP_SECURITY_CODE:process.env.AMAP_SECURITY_CODE};
 try{process.env.MAP_PROVIDER='amap';process.env.AMAP_JS_KEY='test-public-key';process.env.AMAP_SECURITY_CODE='test-private-code';
   const config=mapConfiguration();assert.equal(config.provider,'amap');assert.equal(config.serviceHost,'/_AMapService');assert.equal(config.allowNearbySearch,false);assert.ok(!JSON.stringify(config).includes('test-private-code'));
   let blocked;await amapProxy({method:'GET',path:'/v3/place/around'},{status(code){blocked=code;return this;},json(){return this;}});assert.equal(blocked,403);
   for(const path of ['/../../secrets','/https://example.com','/v4/map/styles/../secrets']){
     let status;const res={status(code){status=code;return this;},json(){return this;}};await amapProxy({method:'GET',path},res);assert.equal(status,400);
   }
   delete process.env.AMAP_SECURITY_CODE;assert.equal(mapConfiguration().provider,'osm');
 }finally{for(const[key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
