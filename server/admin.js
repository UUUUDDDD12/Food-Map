import express from 'express';
import { mkdirSync,writeFileSync,existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dataDirectory,importsDirectory } from './paths.js';
import { importPois } from './poi-import.js';
import { diningModes } from '../shared/food.js';

const restaurantColumns = [
 ['image','照片','image'],['name','店铺名称','text'],['category','分类','text'],['service_mode','就餐方式','dining-mode'],['price','人均（元）','nullable-number'],['specialties','特色','text'],['taste','口味','text'],['address','地址','text'],['phone','电话','text'],['description','介绍','longtext'],['service_evidence','就餐方式来源','text'],['source','来源','text'],['source_updated_at','采集时间','readonly'],['created_at','创建时间','readonly'],['demo','演示数据','boolean'],['id','编号','readonly'],['provider_id','来源编号','readonly'],['lat','纬度 WGS84','number'],['lng','经度 WGS84','number'],['gcj_lat','原始纬度 GCJ02','readonly'],['gcj_lng','原始经度 GCJ02','readonly'],
];
const reviewColumns = [['id','编号','readonly'],['restaurant_id','门店编号','readonly'],['restaurant_name','门店名称','readonly'],['author','昵称','text'],['rating','评分','number'],['body','评价正文','longtext'],['image','图片地址','readonly'],['created_at','发布时间','readonly']];
export function adminRouter(db,budget) {
 const router=express.Router();
 router.use((req,res,next)=>{
   const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
   const host=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(req.get('host')||'');
   let sameOrigin=true;
   if(req.get('origin')){try{sameOrigin=new URL(req.get('origin')).host===req.get('host');}catch{sameOrigin=false;}}
   if(!local||!host||!sameOrigin)return res.status(403).json({error:'数据库管理仅允许本机访问'});
   next();
 });
 router.get('/collection/known',(_,res)=>res.json(db.prepare('SELECT provider_id,image FROM restaurants WHERE provider_id IS NOT NULL').all()));
 router.get('/collection/missing-images',(_,res)=>res.json(db.prepare("SELECT provider_id,name,address FROM restaurants WHERE provider_id LIKE 'amap:%' AND image='' AND (category IN ('自助餐','火锅','烧烤烤肉','海鲜','西餐披萨','日韩料理','北京菜','地方菜') OR name LIKE '%自助%' OR name LIKE '%酒店%') ORDER BY source_updated_at DESC LIMIT 200").all()));
 router.get('/collection/status',(_,res)=>res.json(budget?.status()||{}));
 router.post('/collection/start',(req,res)=>{try{res.json(budget.start(req.body));}catch(e){res.status(400).json({error:e.message});}});
 router.post('/collection/finish',(req,res)=>res.json(budget.finish(req.body.state||'complete')));
 router.get('/collection/checkpoint',(_,res)=>{const file=resolve(importsDirectory,'collection-checkpoint.json');res.json(existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{});});
 router.post('/collection/checkpoint',(req,res)=>{const dir=importsDirectory;mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,'collection-checkpoint.json'),JSON.stringify(req.body));res.json({ok:true});});
 router.post('/import-report',(req,res)=>{const directory=importsDirectory;mkdirSync(directory,{recursive:true});const allowed=['started_at','finished_at','radius_m','grid_spacing_m','search_radius_m','grid_cells','max_requests','requests','inserted','duplicate','outside','invalid','unique_seen','completed_cells','errors','status','pending_pages','total'];const report=Object.fromEntries(allowed.filter(k=>Object.hasOwn(req.body,k)).map(k=>[k,req.body[k]]));writeFileSync(resolve(directory,'amap-latest-report.json'),JSON.stringify(report,null,2));res.json({ok:true});});
 router.post('/import-amap',(req,res)=>{if(!Array.isArray(req.body.pois)||req.body.pois.length>25)return res.status(400).json({error:'每批最多 25 家店铺'});res.json(importPois(db,req.body.pois,{radiusLimit:req.body.scope==='expanding'&&budget?.active()?Infinity:20000}));});
 router.get('/tables',(req,res)=>{
   const table=req.query.table||'restaurants',q=String(req.query.q||'').slice(0,100);
   const page=Math.max(0,Math.min(100000,Number.parseInt(req.query.page,10)||0));
   let rows,columns,total;
   if(table==='restaurants'){
     const where="WHERE name LIKE ? OR address LIKE ? OR specialties LIKE ?";
     const params=Array(3).fill('%'+q+'%');
     total=db.prepare('SELECT COUNT(*) n FROM restaurants '+where).get(...params).n;
     rows=db.prepare('SELECT * FROM restaurants '+where+' ORDER BY id LIMIT 50 OFFSET ?').all(...params,page*50);columns=restaurantColumns;
   }else if(table==='reviews'){
     const where='FROM reviews v JOIN restaurants r ON r.id=v.restaurant_id WHERE r.name LIKE ? OR v.author LIKE ? OR v.body LIKE ?';
     const params=Array(3).fill('%'+q+'%');
     total=db.prepare('SELECT COUNT(*) n '+where).get(...params).n;
     rows=db.prepare('SELECT v.id,v.restaurant_id,r.name restaurant_name,v.author,v.rating,v.body,v.image,v.created_at '+where+' ORDER BY v.id DESC LIMIT 50 OFFSET ?').all(...params,page*50);columns=reviewColumns;
   }else if(table==='favorites'){
     const where='FROM restaurants r JOIN favorites f ON f.restaurant_id=r.id WHERE r.name LIKE ? GROUP BY r.id';
     rows=db.prepare('SELECT r.id,r.name,COUNT(*) favorite_count '+where+' ORDER BY favorite_count DESC LIMIT 50 OFFSET ?').all('%'+q+'%',page*50);
     total=db.prepare('SELECT COUNT(*) n FROM (SELECT r.id '+where+')').get('%'+q+'%').n;
     columns=[['id','门店编号','readonly'],['name','店铺名称','readonly'],['favorite_count','收藏人数','readonly']];
   }else if(table==='discoveries'){const search='%'+q+'%';total=db.prepare('SELECT COUNT(*) n FROM discoveries WHERE name LIKE ? OR address LIKE ?').get(search,search).n;rows=db.prepare('SELECT * FROM discoveries WHERE name LIKE ? OR address LIKE ? ORDER BY collected_at DESC LIMIT 50 OFFSET ?').all(search,search,page*50);columns=[['name','店铺名称','readonly'],['address','登记地址','readonly'],['status','定位状态','readonly'],['phone','电话','readonly'],['source_url','公开来源','readonly'],['matched_id','已匹配店铺编号','readonly'],['collected_at','采集时间','readonly']];
   }else return res.status(400).json({error:'未知数据表'});
   res.json({rows,columns:columns.map(([key,label,type])=>({key,label,type})),total,page,pageSize:50,databasePath:db.prepare('PRAGMA database_list').get().file});
 });
 router.patch('/:table/:id',(req,res)=>{
   const {table}=req.params,id=Number(req.params.id);
   if(!['restaurants','reviews'].includes(table)||!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'无效数据记录'});
   const existing=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
   if(!existing)return res.status(404).json({error:'记录不存在'});
   const allowed=(table==='restaurants'?restaurantColumns:reviewColumns).filter(c=>c[2]!=='readonly');
   const values={};
   for(const[key,,type]of allowed){
     if(!Object.hasOwn(req.body,key))continue;
     const v=req.body[key];
     if(type==='boolean'){if(v!==0&&v!==1)return res.status(400).json({error:'演示标记必须为 0 或 1'});}
     else if(type.includes('number')){if(!(type==='nullable-number'&&v===null)&&(typeof v!=='number'||!Number.isFinite(v)))return res.status(400).json({error:'请填写有效数值'});}
     else if(typeof v!=='string'||v.length>(type==='longtext'?2000:500))return res.status(400).json({error:'文本格式错误或内容过长'});
     values[key]=typeof v==='string'?v.trim():v;
   }
   if(!Object.keys(values).length)return res.status(400).json({error:'没有可保存的字段'});
   const next={...existing,...values};
   if(table==='restaurants'){
     if(!Object.hasOwn(diningModes,next.service_mode))return res.status(400).json({error:'未知就餐方式'});
     if(!next.name||next.name.length>80||!next.category||!next.address||Math.abs(next.lat)>90||Math.abs(next.lng)>180||(next.price!==null&&(next.price<0||next.price>10000))||!(/^(https:\/\/|\/uploads\/)/.test(next.image)||next.image===''))return res.status(400).json({error:'请检查店名、分类、地址、坐标、价格或图片地址（HTTPS / 本地上传）'});
   }else if(!next.author||!Number.isInteger(next.rating)||next.rating<1||next.rating>5||next.body.length<5)return res.status(400).json({error:'评价需要昵称、1–5 星和至少 5 字正文'});
   if(table==='restaurants'&&((Object.hasOwn(values,'lat')&&values.lat!==existing.lat)||(Object.hasOwn(values,'lng')&&values.lng!==existing.lng))){values.gcj_lat=null;values.gcj_lng=null;}
   db.prepare(`UPDATE ${table} SET ${Object.keys(values).map(k=>k+'=?').join(',')} WHERE id=?`).run(...Object.values(values),id);
   res.json({ok:true});
 });
 return router;
}
