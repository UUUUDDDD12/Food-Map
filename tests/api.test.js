import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {openDb} from '../server/db.js';
import {createApp} from '../server/app.js';
test('跨会话可读评价、归属保护、收藏隔离、参数校验与重启持久化',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'tasty-test-'));let db=openDb(join(dir,'test.sqlite'),{seedDemo:true});let server=createApp(db,{uploadDir:join(dir,'uploads')}).listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}/api`;let cookieA='',cookieB='';
 async function request(path,{body,method='GET',user='a'}={}){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:user==='a'?cookieA:cookieB},body:body?JSON.stringify(body):undefined});const cookie=r.headers.get('set-cookie');if(cookie){if(user==='a')cookieA=cookie.split(';')[0];else cookieB=cookie.split(';')[0];}return{status:r.status,data:await r.json()};}
 try{const initial=await request('/restaurants');assert.equal(initial.status,200);assert.equal(initial.data.length,8);assert.equal(initial.data[0].rating,null);await request('/restaurants',{user:'b'});assert.notEqual(cookieA,cookieB);
 db.prepare('INSERT INTO restaurant_photos VALUES(?,?,?,?)').run(1,'https://example.com/shop.jpg','https://example.com/shop','2026-11-16');
 assert.deepEqual((await request('/restaurants/1/photos',{user:'b'})).data,[{url:'https://example.com/shop.jpg'}]);assert.equal((await request('/restaurants/999999/photos')).status,404);
 const bad=await request('/restaurants/1/reviews',{method:'POST',body:{rating:8,body:'坏输入测试'}});assert.equal(bad.status,400);
 const created=await request('/restaurants/1/reviews',{method:'POST',body:{author:'测试食客',rating:4,body:'汤底很香，分量也足。'}});assert.equal(created.status,201);const id=created.data.id;
 const seen=await request('/restaurants/1/reviews',{user:'b'});assert.equal(seen.data[0].body,'汤底很香，分量也足。');assert.equal(seen.data[0].mine,0);assert.equal((await request(`/reviews/${id}`,{method:'DELETE',user:'b'})).status,404);
 assert.equal((await request('/restaurants')).data[0].rating,4);
 assert.equal((await request('/restaurants/1/favorite',{method:'POST',body:{}})).data.favorite,true);assert.equal((await request('/restaurants')).data[0].favorite,1);assert.equal((await request('/restaurants',{user:'b'})).data[0].favorite,0);
 assert.equal((await request('/uploads',{method:'POST',body:{data:'data:image/png;base64,SGVsbG9Xb3JsZA=='}})).status,400);
 assert.equal((await request('/restaurants',{method:'POST',body:{name:'新店',address:'校园东门',category:'面食简餐',price:null,lat:40.09,lng:116.3,coordinateSystem:'GCJ02'}})).status,400);
 const shop=await request('/restaurants',{method:'POST',body:{name:'新店',address:'校园东门',category:'面食简餐',price:null,lat:40.09,lng:116.3,coordinateSystem:'WGS84'}});assert.equal(shop.status,201);
 await new Promise(r=>server.close(r));db.close();db=openDb(join(dir,'test.sqlite'),{seedDemo:true});assert.equal(db.prepare('SELECT body FROM reviews WHERE id=?').get(id).body,'汤底很香，分量也足。');assert.equal(db.prepare('SELECT COUNT(*) n FROM favorites').get().n,1);
 }finally{if(server.listening)await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});}
});
