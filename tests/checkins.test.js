import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {openDb} from '../server/db.js';
import {createApp} from '../server/app.js';
test('每次打卡独立保留日期和1–3星，访客隔离，重启持久化',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'tasty-checkins-')),file=join(directory,'test.sqlite');let db=openDb(file,{seedDemo:true});let server=createApp(db,{uploadDir:join(directory,'uploads')}).listen(0,'127.0.0.1');await once(server,'listening');const cookies={a:'',b:''};
 async function request(path,{user='a',method='GET',body}={}){const response=await fetch(`http://127.0.0.1:${server.address().port}/api${path}`,{method,headers:{Cookie:cookies[user],'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(response.headers.get('set-cookie'))cookies[user]=response.headers.get('set-cookie').split(';')[0];return{status:response.status,data:await response.json()};}
 try{
  const first=await request('/restaurants/1/checkins',{method:'POST',body:{}});assert.equal(first.status,201);assert.match(first.data.visited_on,/^\d{4}-\d{2}-\d{2}$/);assert.equal(first.data.rating,null);assert.equal('session_id' in first.data,false);
  const second=await request('/restaurants/1/checkins',{method:'POST',body:{}});assert.notEqual(first.data.id,second.data.id);assert.equal(first.data.visited_on,second.data.visited_on);
  assert.equal((await request(`/checkins/${first.data.id}`,{method:'PATCH',body:{rating:2}})).data.rating,2);
  for(const rating of [0,4,2.5,'2',null])assert.equal((await request(`/checkins/${first.data.id}`,{method:'PATCH',body:{rating}})).status,400);
  assert.equal((await request(`/checkins/${first.data.id}`,{user:'b',method:'PATCH',body:{rating:3}})).status,404);
  assert.equal((await request('/restaurants',{user:'b'})).data[0].checkins.length,0);const visits=(await request('/restaurants')).data[0].checkins;assert.equal(visits.length,2);assert.equal(visits[1].rating,2);assert.equal('body' in visits[1],false);
  await new Promise(r=>server.close(r));db.close();db=openDb(file);server=createApp(db,{uploadDir:join(directory,'uploads')}).listen(0,'127.0.0.1');await once(server,'listening');assert.equal((await request('/restaurants')).data[0].checkins.length,2);assert.equal((await request('/restaurants')).data[0].checkins[1].rating,2);
  assert.equal((await request(`/checkins/${first.data.id}`,{user:'b',method:'DELETE'})).status,404);assert.equal((await request('/restaurants')).data[0].checkins.length,2);
  assert.equal((await request(`/checkins/${first.data.id}`,{method:'DELETE'})).status,200);const remaining=(await request('/restaurants')).data[0].checkins;assert.equal(remaining.length,1);assert.equal(remaining[0].id,second.data.id);assert.equal((await request(`/checkins/${first.data.id}`,{method:'DELETE'})).status,404);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM checkins').get().n,1);
 }finally{if(server.listening)await new Promise(r=>server.close(r));db.close();rmSync(directory,{recursive:true,force:true});}
});
