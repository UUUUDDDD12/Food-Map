import {openDb} from '../server/db.js';
import {center} from '../server/seed.js';
import {geoDistance} from '../server/poi-import.js';
import {classifyFood} from '../shared/food.js';
import {dataDirectory,importsDirectory} from '../server/paths.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const radius=Number(process.argv[2]||20000);
if(!Number.isFinite(radius)||radius<100||radius>20000)throw Error('半径需在 100–20000 米之间');
const query=`[out:json][timeout:45];(nwr[amenity~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"][name](around:${radius},${center.join(',')});nwr[shop=bakery][name](around:${radius},${center.join(',')}););out center tags;`;
let data,endpoint;
for(const url of [process.env.OSM_ENDPOINT||'https://maps.mail.ru/osm/tools/overpass/api/interpreter']){try{console.log('查询开放数据源：'+new URL(url).hostname);const response=await fetch(url+'?data='+encodeURIComponent(query),{headers:{'User-Agent':'TastyMap/1.0 local personal food map'},signal:AbortSignal.timeout(55000)});if(!response.ok)throw Error('HTTP '+response.status);data=await response.json();if(!Array.isArray(data.elements))throw Error('没有有效的要素列表');endpoint=url;break;}catch(e){console.log('请求失败：'+e.message);}}
if(!data)throw Error('开放数据端点均不可达；未修改数据库');
const db=openDb(),report={source:'OpenStreetMap / ODbL',endpoint,queried_at:new Date().toISOString(),radius_m:radius,received:data.elements.length,inserted:0,merged:0,outside:0};
const find=db.prepare('SELECT id,lat,lng,service_mode FROM restaurants WHERE name=?');
const add=db.prepare(`INSERT INTO restaurants(name,category,taste,price,lat,lng,address,description,source,provider_id,service_mode,service_evidence,phone,source_updated_at) VALUES(?,?,'',NULL,?,?,?,?,?,?,?,?,?,?)`);
db.exec('BEGIN');try{for(const e of data.elements){const t=e.tags||{},lat=e.lat??e.center?.lat,lng=e.lon??e.center?.lon,name=t['name:zh']||t.name,id=`osm:${e.type}/${e.id}`;if(!name||!Number.isFinite(lat)||!Number.isFinite(lng))continue;if(geoDistance(center,[lat,lng])>radius){report.outside++;continue;}
 let mode='';const seated=t.indoor_seating==='yes'||t.outdoor_seating==='yes'||t.seating==='yes';if(t.delivery==='yes')mode=seated?'both':'delivery';else if(seated)mode='dine_in';
 const evidence=Object.entries(t).filter(([k])=>['delivery','takeaway','indoor_seating','outdoor_seating','seating'].includes(k)).map(([k,v])=>`${k}=${v}`).join('；');
 const existing=db.prepare('SELECT id,service_mode FROM restaurants WHERE provider_id=?').get(id)||find.all(name).find(r=>geoDistance([lat,lng],[r.lat,r.lng])<40);
 if(existing){if(mode!==''&&existing.service_mode==='')db.prepare('UPDATE restaurants SET service_mode=?,service_evidence=? WHERE id=?').run(mode,'OSM '+id+'：'+evidence,existing.id);report.merged++;continue;}
 const address=[t['addr:city'],t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ')||'地址待补充';
 let category=t.amenity==='cafe'?'咖啡':t.shop==='bakery'||t.amenity==='ice_cream'?'甜品烘焙':classifyFood(name,t.cuisine||'');
 if(category==='其他餐饮'&&t.amenity==='fast_food')category='快餐便当';
 add.run(name,category,lat,lng,address,'OpenStreetMap 公开餐饮地点；营业信息以商家实际情况为准。',`OpenStreetMap · ${e.type}/${e.id} · ODbL`,id,mode,evidence?'OpenStreetMap：'+evidence:'',t.phone||t['contact:phone']||'',report.queried_at);report.inserted++;
}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
report.total=db.prepare('SELECT COUNT(*) n FROM restaurants').get().n;db.close();const directory=importsDirectory;mkdirSync(directory,{recursive:true});writeFileSync(resolve(directory,'osm-latest-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
