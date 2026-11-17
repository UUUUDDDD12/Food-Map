import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {MapSettings} from '../server/map-settings.js';
import {openDb} from '../server/db.js';
import {createApp} from '../server/app.js';

test('地图配置持久化、密钥不回传、保存后立即生效，跨站修改被拒绝',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'tasty-settings-')),file=join(dir,'map-settings.json');
 const settings=new MapSettings({file,env:{}}),db=openDb(':memory:');
 const server=createApp(db,{settings,uploadDir:join(dir,'uploads')}).listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const get=path=>fetch(base+path).then(r=>r.json());
 const put=(body,headers={})=>fetch(base+'/api/settings',{method:'PUT',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const key='a'.repeat(32),secret='b'.repeat(32);
 try{
  assert.equal((await get('/api/config')).setupRequired,true);assert.equal((await get('/api/config')).map.provider,'osm');
  assert.equal((await put({provider:'amap',key})).status,400);
  assert.equal((await put({provider:'osm'},{Origin:'https://example.com'})).status,403);
  const hostBlocked=await new Promise((resolve,reject)=>{const request=httpRequest(base+'/api/settings',{method:'PUT',headers:{Host:'example.com','Content-Type':'application/json'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end(JSON.stringify({provider:'osm'}));});assert.equal(hostBlocked,403);
  assert.equal((await put({provider:'osm'},{'Sec-Fetch-Site':'cross-site'})).status,403);
  const response=await put({provider:'amap',key,securityCode:secret});assert.equal(response.status,200);const result=await response.json();assert.equal(result.hasSecurityCode,true);assert.equal(JSON.stringify(result).includes(secret),false);
  const config=await get('/api/config');assert.equal(config.setupRequired,false);assert.equal(config.map.provider,'amap');assert.equal(config.map.key,key);assert.equal(JSON.stringify(config).includes(secret),false);
  assert.equal(JSON.stringify(await get('/api/settings')).includes(secret),false);
  assert.equal((await put({provider:'amap',key})).status,200);assert.equal(JSON.parse(readFileSync(file,'utf8')).securityCode,secret);
  assert.equal((await put({provider:'amap',key:'c'.repeat(32)})).status,400);
  const restored=new MapSettings({file,env:{MAP_PROVIDER:'osm'}});assert.equal(restored.credentials().securityCode,secret);assert.equal(restored.credentials().provider,'amap');
  assert.equal((await put({provider:'osm',key})).status,200);assert.equal((await get('/api/config')).map.provider,'osm');
 }finally{await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});}
});
