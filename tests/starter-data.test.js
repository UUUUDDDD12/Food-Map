import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDb} from '../server/db.js';
import {initializeStarterData} from '../server/starter-data.js';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
test('公开快照只在首次空库导入；重启不重复，已有数据、主动清空均保留',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tasty-public-')),file=join(dir,'restaurants.json');
 const row={name:'公开餐厅',provider_id:'amap:B0PUBLIC123',category:'自助餐',lat:40.09,lng:116.3,address:'公开地址',photos:[{url:'https://example.com/photo.jpg',source_url:'https://example.com/restaurant'}]};
 writeFileSync(file,JSON.stringify({formatVersion:1,generatedAt:'2026-11-17T00:00:00Z',restaurants:[row]}));
 const db=openDb(':memory:');try{
  assert.equal(initializeStarterData(db,file).inserted,1);assert.equal(initializeStarterData(db,file).inserted,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM restaurant_photos').get().n,1);
  assert.equal(db.prepare('SELECT taste,service_mode FROM restaurants').get().taste,'');assert.equal(db.prepare('SELECT COUNT(*) n FROM favorites').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM reviews').get().n,0);
  db.exec('DELETE FROM restaurant_photos;DELETE FROM restaurants');assert.equal(initializeStarterData(db,file).inserted,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM restaurants').get().n,0);
 }finally{db.close();}
 const existing=openDb(':memory:',{seedDemo:true});try{assert.equal(initializeStarterData(existing,file).inserted,0);assert.equal(existing.prepare('SELECT COUNT(*) n FROM restaurants').get().n,8);}finally{existing.close();rmSync(dir,{recursive:true,force:true});}
});
test('分片快照解压后核对SHA256，损坏时不导入任何门店',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tasty-compressed-')),file=join(dir,'restaurants.json');
 const raw=Buffer.from(JSON.stringify({formatVersion:1,generatedAt:'2026-11-17T00:00:00Z',restaurants:[{name:'压缩快照餐厅',provider_id:'amap:B0PUBLIC456',lat:40.09,lng:116.3}]}));
 writeFileSync(join(dir,'restaurants-001.bin'),gzipSync(raw));const manifest={compression:'gzip',parts:['restaurants-001.bin'],sha256:createHash('sha256').update(raw).digest('hex')};writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));
 const db=openDb(':memory:');try{assert.equal(initializeStarterData(db,file).inserted,1);}finally{db.close();}
 manifest.sha256='0'.repeat(64);writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest));const broken=openDb(':memory:');try{assert.throws(()=>initializeStarterData(broken,file),/完整性/);assert.equal(broken.prepare('SELECT COUNT(*) n FROM restaurants').get().n,0);}finally{broken.close();rmSync(dir,{recursive:true,force:true});}
});
