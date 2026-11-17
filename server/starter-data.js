import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {appDirectory} from './paths.js';
export function initializeStarterData(db,file=resolve(appDirectory,'starter-data/restaurants.json')){
 const manifestFile=resolve(dirname(file),'manifest.json');
 if(!existsSync(file)&&!existsSync(manifestFile))return {inserted:0};
 db.exec('CREATE TABLE IF NOT EXISTS app_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 if(db.prepare("SELECT 1 FROM app_metadata WHERE key='starter-data-imported'").get())return {inserted:0};
 if(db.prepare('SELECT COUNT(*) n FROM restaurants').get().n){db.prepare("INSERT INTO app_metadata VALUES('starter-data-imported','existing-database-preserved')").run();return {inserted:0};}
 let snapshot;
 if(existsSync(file))snapshot=JSON.parse(readFileSync(file,'utf8'));
 else{
  const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
  if(manifest.compression!=='gzip'||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>100||!manifest.parts.every(p=>/^restaurants-\d{3}\.bin$/.test(p))||!/^[a-f0-9]{64}$/.test(manifest.sha256))throw Error('附带门店清单校验失败');
  const data=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(resolve(dirname(file),p)))),{maxOutputLength:32*1024*1024});
  if(createHash('sha256').update(data).digest('hex')!==manifest.sha256)throw Error('附带门店数据完整性校验失败');
  snapshot=JSON.parse(data.toString('utf8'));
 }
 if(snapshot.formatVersion!==1||!Array.isArray(snapshot.restaurants)||snapshot.restaurants.length>50000)throw Error('附带门店数据格式不正确');
 const rows=snapshot.restaurants;
 for(const r of rows)if(typeof r.name!=='string'||!r.name||typeof r.provider_id!=='string'||!/^amap:B[A-Z0-9]{6,30}$/i.test(r.provider_id)||!Number.isFinite(r.lat)||!Number.isFinite(r.lng)||Math.abs(r.lat)>90||Math.abs(r.lng)>180)throw Error('附带门店数据校验失败');
 const insert=db.prepare(`INSERT INTO restaurants(name,category,specialties,taste,service_mode,price,lat,lng,address,description,image,source,provider_id,gcj_lat,gcj_lng,provider_type,phone,source_updated_at) VALUES(?,?,?,'','',?,?,?,?,?,?,?,?,?,?,?,?,?)`);
 const photoInsert=db.prepare('INSERT OR IGNORE INTO restaurant_photos VALUES(?,?,?,?)');
 db.exec('BEGIN');try{
  for(const r of rows){const result=insert.run(r.name,r.category||'其他餐饮',r.specialties||'',r.price??null,r.lat,r.lng,r.address||'地址待补充','公开门店基础资料，营业状态、口味及就餐方式以商家实际情况为准。',r.image||'',r.source||'公开地点资料',r.provider_id,r.gcj_lat??null,r.gcj_lng??null,r.provider_type||'',r.phone||'',r.source_updated_at||'');for(const p of r.photos||[])if(/^https:\/\//.test(p.url)&&/^https:\/\//.test(p.source_url))photoInsert.run(Number(result.lastInsertRowid),p.url,p.source_url,snapshot.generatedAt);}
  db.prepare("INSERT INTO app_metadata VALUES('starter-data-imported',?)").run(snapshot.generatedAt);db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
 return {inserted:rows.length};
}
