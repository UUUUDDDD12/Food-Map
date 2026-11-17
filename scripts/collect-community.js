import {openDb} from '../server/db.js';
import {dataDirectory,importsDirectory} from '../server/paths.js';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const db=openDb();db.exec(`CREATE TABLE IF NOT EXISTS discoveries(source_url TEXT PRIMARY KEY,name TEXT NOT NULL,address TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT '待定位',matched_id INTEGER REFERENCES restaurants(id),collected_at TEXT NOT NULL)`);
const report={source:'回龙观社区网公开商户目录',started_at:new Date().toISOString(),pages:0,found:0,matched:0,pending:0,errors:[]};
const clean=s=>(s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();
const normalize=s=>s.replace(/[（]/g,'(').replace(/[）]/g,')').replace(/[\s·•]/g,'').toLowerCase();
const restaurants=db.prepare('SELECT id,name,address FROM restaurants').all();
const add=db.prepare('INSERT INTO discoveries(source_url,name,address,phone,status,matched_id,collected_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source_url) DO NOTHING');
let failures=0;
for(const page of process.argv.includes('--cached-only')?[11]:[11,...Array.from({length:36},(_,i)=>i+1).filter(p=>p!==11)]){
 let html;try{const cached=resolve(importsDirectory,'hlgnet-source.html');if(page===11&&existsSync(cached))html=readFileSync(cached,'utf8');else{const response=await fetch(`https://guide.hlgnet.com/list/meishi-1-1--${page}/`,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('HTTP '+response.status);html=await response.text();if(!html.includes('lilcc_r'))throw Error('未获得公开商户列表');}failures=0;report.pages++;}catch(e){report.errors.push({page,error:e.message});if(++failures>=3)break;continue;}
 for(const block of html.split('<div class="lilcc">').slice(1)){
   const title=block.match(/<dl class="dl_tit">\s*<a href="\/shop\/(\d+)\/"[^>]*>([\s\S]*?)<\/a>/);if(!title)continue;
   const name=clean(title[2]),address=clean(block.match(/<dl class="dl_tid">\s*地址[：:]([\s\S]*?)<a/)?.[1]),phone=clean(block.match(/<dl class="dl_tic">\s*电话[：:]([\s\S]*?)<\/dl>/)?.[1]);
   const exact=restaurants.filter(r=>normalize(r.name)===normalize(name));const match=exact.length===1?exact[0]:null;
   const url=`https://guide.hlgnet.com/shop/${title[1]}/`,result=add.run(url,name,address,phone,match?'已匹配现有点位':'待定位',match?.id||null,new Date().toISOString());
   if(!result.changes)continue;report.found++;if(match){report.matched++;const row=db.prepare('SELECT source FROM restaurants WHERE id=?').get(match.id);if(!row.source.includes(url))db.prepare('UPDATE restaurants SET source=? WHERE id=?').run(row.source+'；回龙观社区网 '+url,match.id);}else report.pending++;
 }
 console.log(`目录页 ${page}：已发现 ${report.found} 家，匹配 ${report.matched} 家，待定位 ${report.pending} 家`);
 await new Promise(r=>setTimeout(r,250));
}
report.finished_at=new Date().toISOString();const directory=importsDirectory;mkdirSync(directory,{recursive:true});writeFileSync(resolve(directory,'community-latest-report.json'),JSON.stringify(report,null,2));db.close();console.log(JSON.stringify(report));
