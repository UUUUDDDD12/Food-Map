import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {openDb} from '../server/db.js';
import {createApp} from '../server/app.js';
test('本机表格编辑、字段保护和访问限制',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'tasty-admin-')),db=openDb(join(dir,'test.sqlite'),{seedDemo:true});
 const server=createApp(db,{uploadDir:join(dir,'uploads')}).listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 const patch=(body,headers={})=>fetch(base+'/api/admin/restaurants/1',{method:'PATCH',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 try{
   const tables=await fetch(base+'/api/admin/tables').then(r=>r.json());assert.equal(tables.total,8);assert.equal(tables.databasePath,join(dir,'test.sqlite'));assert.ok(tables.columns.some(c=>c.key==='price'));
   assert.equal((await patch({price:29,specialties:'可视化修改的招牌菜'})).status,200);assert.equal(db.prepare('SELECT price FROM restaurants WHERE id=1').get().price,29);
   const mapRows=await fetch(base+'/api/restaurants').then(r=>r.json());assert.equal(mapRows[0].specialties,'可视化修改的招牌菜');
   assert.equal((await patch({lat:180})).status,400);assert.equal((await patch({price:-1})).status,400);assert.equal((await patch({id:500})).status,400);
   assert.equal((await patch({price:1},{Origin:'https://unrelated.example'})).status,403);
   const blocked=await new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/admin/tables',{headers:{Host:'unrelated.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(blocked,403);
   const revs=await fetch(base+'/api/admin/tables?table=reviews').then(r=>r.json());assert.ok(!revs.columns.some(c=>c.key==='session_id'));
   const fav=await fetch(base+'/api/admin/tables?table=favorites').then(r=>r.json());assert.equal(fav.total,0);
 }finally{await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});}
});
