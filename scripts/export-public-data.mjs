import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),dbPath=args[args.indexOf('--database')+1],output=args[args.indexOf('--output')+1];
if(!args.includes('--database')||!args.includes('--output')||!dbPath||!output)throw Error('Provide --database and --output explicitly.');
const db=new DatabaseSync(resolve(dbPath),{readOnly:true});
// Explicit allowlist: no sessions, reviews, favorites, personal notes, uploads or map credentials.
const rows=db.prepare("SELECT id,name,category,specialties,price,lat,lng,address,image,provider_id,gcj_lat,gcj_lng,provider_type,phone,source_updated_at FROM restaurants WHERE demo=0 AND provider_id LIKE 'amap:%' ORDER BY id").all();
const allowedUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'&&['amap.com','autonavi.com','tripcdn.com','c-ctrip.com','trip.com','dianping.com'].some(domain=>url.hostname===domain||url.hostname.endsWith('.'+domain));}catch{return false;}};
const photos=db.prepare('SELECT url,source_url FROM restaurant_photos WHERE restaurant_id=?');
const restaurants=rows.map(({id,...r})=>({...r,image:allowedUrl(r.image)?r.image:'',source:'公开地点资料 · 高德地图及公开餐厅网页',photos:photos.all(id).filter(p=>allowedUrl(p.url)&&allowedUrl(p.source_url))}));
const data={formatVersion:1,generatedAt:new Date().toISOString(),region:'华北电力大学北京校区及周边',notice:'门店与图片来自公开第三方来源，详见 DATA_NOTICE.md；不包含个人评价、收藏、密钥或实拍上传文件。',restaurants};
mkdirSync(dirname(resolve(output)),{recursive:true});const raw=Buffer.from(JSON.stringify(data));writeFileSync(resolve(output),raw);
const compressed=gzipSync(raw,{level:9}),parts=[];for(let start=0;start<compressed.length;start+=128*1024){const name='restaurants-'+String(parts.length+1).padStart(3,'0')+'.bin';writeFileSync(resolve(dirname(output),name),compressed.subarray(start,start+128*1024));parts.push(name);}
writeFileSync(resolve(dirname(output),'manifest.json'),JSON.stringify({compression:'gzip',parts,sha256:createHash('sha256').update(raw).digest('hex'),restaurants:restaurants.length,generatedAt:data.generatedAt},null,2));db.close();
console.log(JSON.stringify({restaurants:restaurants.length,photos:restaurants.reduce((n,r)=>n+r.photos.length,0),personalTablesExported:false,output:resolve(output)}));
