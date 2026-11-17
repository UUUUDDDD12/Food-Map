import {existsSync,readFileSync,mkdirSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
export class AISettings{
 constructor({file,env=process.env}={}){this.file=file;this.current={baseUrl:'https://api.deepseek.com',model:'deepseek-v4-pro',apiKey:env.DEEPSEEK_API_KEY||'',maxRequests:2000};if(file&&existsSync(file)){try{this.current={...this.current,...JSON.parse(readFileSync(file,'utf8'))};}catch{throw Error('AI配置文件无法读取，请恢复备份');}}}
 credentials(){return {...this.current};}
 publicSettings(){const{apiKey,...rest}=this.current;return {...rest,hasApiKey:!!apiKey};}
 save(input){if(!input||typeof input!=='object')throw Error('配置无效');const next={...this.current};if(input.baseUrl!==undefined){if(typeof input.baseUrl!=='string')throw Error('API地址无效');next.baseUrl=input.baseUrl.trim().replace(/\/+$/,'');if(!/^https:\/\/api\.deepseek\.com(?:\/(?:v1|beta))?$/.test(next.baseUrl))throw Error('请填写官方DeepSeek API地址 https://api.deepseek.com 或其 /v1 路径');}if(input.model!==undefined){if(!['deepseek-flash','deepseek-v4-pro'].includes(input.model))throw Error('请选择deepseek-flash或deepseek-v4-pro');next.model=input.model;}if(input.apiKey){if(typeof input.apiKey!=='string'||!/^sk-[a-zA-Z0-9_-]{8,200}$/.test(input.apiKey))throw Error('API Key格式无效');next.apiKey=input.apiKey;}if(input.clearApiKey)next.apiKey='';if(input.maxRequests!==undefined){if(!Number.isInteger(input.maxRequests)||input.maxRequests<2||input.maxRequests>2000)throw Error('单次高德请求上限为2–2000次');next.maxRequests=input.maxRequests;}
 if(this.file){mkdirSync(dirname(this.file),{recursive:true});const tmp=this.file+'.'+randomUUID()+'.tmp';try{writeFileSync(tmp,JSON.stringify(next,null,2),{mode:0o600,flag:'wx'});renameSync(tmp,this.file);}catch{try{unlinkSync(tmp);}catch{}throw Error('AI配置保存失败，请检查文件夹写入权限');}}this.current=next;return this.publicSettings();}
}
export class AIBudget{
 constructor(db){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS ai_amap_budget(id INTEGER PRIMARY KEY CHECK(id=1),remaining INTEGER NOT NULL,period TEXT NOT NULL)');const previous=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='collection_budget'").get()?db.prepare('SELECT * FROM collection_budget WHERE id=1').get():null;const month=this.month();if(previous?.updated_at?.startsWith(month)&&!this.row())this.set(Math.max(0,previous.monthly_limit-previous.start_used-previous.consumed-100));}
 month(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).format(new Date());}
 row(){return this.db.prepare('SELECT remaining,period FROM ai_amap_budget WHERE id=1').get();}
 status(){const row=this.row();return{remaining:row?.period===this.month()?row.remaining:null,reserve:1000,period:this.month()};}
 set(n){if(!Number.isSafeInteger(n)||n<0||n>100000000)throw Error('请填写高德控制台当前剩余次数');this.db.prepare('INSERT INTO ai_amap_budget VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET remaining=excluded.remaining,period=excluded.period').run(n,this.month());return this.status();}
 take(){return !!this.db.prepare('UPDATE ai_amap_budget SET remaining=remaining-1 WHERE id=1 AND period=? AND remaining>1000').run(this.month()).changes;}
}
