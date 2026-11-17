import {openDb} from '../server/db.js';
import {geoDistance} from '../server/poi-import.js';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {dataDirectory,importsDirectory} from '../server/paths.js';
const db=openDb();
db.exec(`CREATE TABLE IF NOT EXISTS restaurant_photos(restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),url TEXT NOT NULL,source_url TEXT NOT NULL,fetched_at TEXT NOT NULL,PRIMARY KEY(restaurant_id,url))`);
const report={started_at:new Date().toISOString(),source:'Trip.com public restaurant pages',pages:0,matched:0,photos:0,updated:0,unmatched:[],errors:[]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function readPage(url){const r=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const s=await r.text();const m=s.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);if(!m)throw Error('No public page data');report.pages++;return JSON.parse(m[1]).props.pageProps.initialState;}
const candidates=new Map(),retry=process.argv.includes('--retry-unmatched');
if(retry){const previous=JSON.parse(readFileSync(resolve(importsDirectory,'web-photo-report.json'),'utf8'));for(const p of previous.unmatched)candidates.set(p.poiId,p.url.replace('www.trip.com','hk.trip.com'));}else{
 for(const zone of [38786298,38786300,13572,896]){try{const url=`https://www.trip.com/restaurant/beijing-1/?nearbyDistrictIds=${zone}`;const d=await readPage(url);for(const p of d.resultList||[])if(p.jumpUrl)candidates.set(p.poiId,'https://www.trip.com'+p.jumpUrl);}catch(e){report.errors.push({zone,error:e.message});}await wait(700);}
 for(const id of [134026546,134816487,136620602,79422010,78416752,120803703,36974507,79422981,11115644,21579276])candidates.set(id,`https://www.trip.com/restaurant/china/beijing/detail/restaurant-${id}/`);
}
const normalize=s=>(s||'').replace(/\([^)]*\)|（[^）]*）/g,'').replace(/[·\s\-]/g,'').toLowerCase();
for(const [poiId,url] of candidates){try{
 const d=await readPage(url),p=d.poiData;if(!p)continue;
 const lat=Number(p.gdlat),lng=Number(p.gdlon);if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<39||lat>41||lng<115||lng>118)continue;
 const name=normalize(p.secondName||p.poiName);const rows=db.prepare("SELECT id,name,image,gcj_lat,gcj_lng FROM restaurants WHERE gcj_lat BETWEEN ? AND ? AND gcj_lng BETWEEN ? AND ? AND demo=0").all(lat-.005,lat+.005,lng-.006,lng+.006);
 const matches=rows.filter(r=>{const n=normalize(r.name);return geoDistance([lat,lng],[r.gcj_lat,r.gcj_lng])<400&&name.length>=3&&n.length>=3&&(n.includes(name)||name.includes(n)||n.slice(0,3)===name.slice(0,3));}).sort((a,b)=>geoDistance([lat,lng],[a.gcj_lat,a.gcj_lng])-geoDistance([lat,lng],[b.gcj_lat,b.gcj_lng]));
 const row=matches[0];if(!row){report.unmatched.push({poiId,name:p.poiName,address:p.poiAddress,url});continue;}
 const photos=(p.poiImage||[]).map(x=>x.source||x.imageUrl).filter(x=>/^https:\/\/(ak-d\.tripcdn\.com|dimg\d*\.c-ctrip\.com)\//.test(x));if(!photos.length)continue;
 report.matched++;for(const photo of new Set(photos)){report.photos+=db.prepare('INSERT OR IGNORE INTO restaurant_photos VALUES(?,?,?,?)').run(row.id,photo,url,new Date().toISOString()).changes;}
 if(!row.image||/autonavi\.com|amap\.com/.test(row.image)){report.updated+=db.prepare('UPDATE restaurants SET image=?,source_updated_at=? WHERE id=?').run(photos[0],new Date().toISOString(),row.id).changes;}
 console.log(JSON.stringify({name:row.name,photos:photos.length,matched:report.matched,updated:report.updated}));
 }catch(e){report.errors.push({url,error:e.message});}finally{await wait(600);}
}
report.finished_at=new Date().toISOString();mkdirSync(importsDirectory,{recursive:true});writeFileSync(resolve(importsDirectory,retry?'web-photo-retry-report.json':'web-photo-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));db.close();
