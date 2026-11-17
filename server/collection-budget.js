export class CollectionBudget {
 constructor(db){this.db=db;db.exec(`CREATE TABLE IF NOT EXISTS collection_budget(id INTEGER PRIMARY KEY CHECK(id=1),monthly_limit INTEGER,start_used INTEGER,reserve INTEGER,max_requests INTEGER,consumed INTEGER NOT NULL DEFAULT 0,state TEXT,started_at TEXT,updated_at TEXT)`);}
 status(){return this.db.prepare('SELECT * FROM collection_budget WHERE id=1').get()||null;}
 active(){return this.status()?.state==='running';}
 start({monthlyLimit=5000,used,reserve=1000,maxRequests=3300}){
   if(![monthlyLimit,used,reserve,maxRequests].every(Number.isSafeInteger)||used<0||reserve<1000||monthlyLimit<=used||maxRequests<1)throw Error('请填写有效的月额度、已用次数和保留次数');
   const old=this.status();if(old?.state==='running')return old;
   if(old&&used<old.start_used+old.consumed)throw Error('已用次数不能小于上次已用加本次实际请求数');
   const maximum=Math.min(maxRequests,monthlyLimit-used-reserve-100);if(maximum<1)throw Error('剩余额度不足以保留 1000 次并留出缓冲');
   const time=new Date().toISOString();this.db.prepare(`INSERT INTO collection_budget VALUES(1,?,?,?,?,0,'running',?,?) ON CONFLICT(id) DO UPDATE SET monthly_limit=excluded.monthly_limit,start_used=excluded.start_used,reserve=excluded.reserve,max_requests=excluded.max_requests,consumed=0,state='running',started_at=excluded.started_at,updated_at=excluded.updated_at`).run(monthlyLimit,used,reserve,maximum,time,time);return this.status();
 }
 take(){const now=new Date().toISOString();const result=this.db.prepare("UPDATE collection_budget SET consumed=consumed+1,updated_at=? WHERE id=1 AND state='running' AND consumed<max_requests").run(now);if(!result.changes)return false;return true;}
 finish(state='complete'){this.db.prepare('UPDATE collection_budget SET state=?,updated_at=? WHERE id=1').run(state,new Date().toISOString());return this.status();}
}
