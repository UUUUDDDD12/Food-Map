import gcoord from 'gcoord';
import {classifyFood} from '../shared/food.js';
import {center} from './seed.js';
export function geoDistance(a,b){const rad=x=>x*Math.PI/180;const h=Math.sin(rad(b[0]-a[0])/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(rad(b[1]-a[1])/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
export function importPois(db,pois,{radiusLimit=20000}={}){
 const insert=db.prepare(`INSERT INTO restaurants(name,category,specialties,taste,price,lat,lng,address,description,image,source,provider_id,gcj_lat,gcj_lng,provider_type,phone,source_updated_at,service_mode) VALUES(?,?,?,'',?,?,?,?,?,?,?,?,?,?,?,?,?,'') ON CONFLICT(provider_id) DO NOTHING`);
 let inserted=0,duplicate=0,outside=0,invalid=0,updated=0;
 db.exec('BEGIN');try{for(const p of pois){
   if(/外卖柜|取餐柜|智能柜|取餐点|外卖取餐|售货机|自动贩卖|配送站|送餐站/.test(p.name||'')){invalid++;continue;}
   if(typeof p.id!=='string'||!/^B[A-Z0-9]{6,30}$/i.test(p.id)||typeof p.name!=='string'||!Number.isFinite(p.lng)||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||Math.abs(p.lng)>180){invalid++;continue;}
   const[lng,lat]=gcoord.transform([p.lng,p.lat],gcoord.GCJ02,gcoord.WGS84);
   if(geoDistance(center,[lat,lng])>radiusLimit){outside++;continue;}
   const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
   const photos=Array.isArray(p.photos)?p.photos.filter(x=>typeof x.url==='string'&&/^https:\/\//.test(x.url)):[];const photo=(photos.find(x=>/门头|门面|外观|店面|招牌|门口/.test(x.title||''))||photos[0])?.url||'';
   const cost=Number(p.cost),price=cost>0&&cost<10000?cost:null;
   const name=text(p.name,80),type=text(p.type,200),address=text(p.address,200)||'详细地址待核实';
   const result=insert.run(name,classifyFood(name,type),type.split(';').filter(Boolean).slice(1).join(' · '),price,lat,lng,address,'高德地点搜索记录。口味、营业情况、堂食与外卖服务请以商家实际信息为准。',photo||'','高德地图 POI · 尚未实地核验','amap:'+p.id,p.lat,p.lng,type,text(p.tel,100),new Date().toISOString());
   if(result.changes)inserted++;else{duplicate++;const existing=db.prepare('SELECT id,image,price,phone FROM restaurants WHERE provider_id=?').get('amap:'+p.id);if(existing&&((!existing.image&&photo)||(!existing.phone&&p.tel)||(existing.price===null&&price!==null))){db.prepare("UPDATE restaurants SET image=CASE WHEN image='' THEN ? ELSE image END,phone=CASE WHEN phone='' THEN ? ELSE phone END,price=COALESCE(price,?),source_updated_at=? WHERE id=?").run(photo||'',text(p.tel,100),price,new Date().toISOString(),existing.id);updated++;}}
   if(photos.length){const saved=db.prepare('SELECT id FROM restaurants WHERE provider_id=?').get('amap:'+p.id);if(saved){const addPhoto=db.prepare('INSERT OR IGNORE INTO restaurant_photos VALUES(?,?,?,?)');for(const entry of photos)addPhoto.run(saved.id,entry.url,'https://www.amap.com/place/'+p.id,new Date().toISOString());}}
 }db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 return{inserted,duplicate,outside,invalid,updated,total:db.prepare('SELECT COUNT(*) n FROM restaurants WHERE demo=0').get().n};
}
