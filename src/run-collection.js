import {loadAMap} from './map-adapter.js';
import gcoord from 'gcoord';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(path,body){const response=await fetch('/api/admin/collection/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw Error(data.error||'采集请求失败');return data;}
const foodKeywords=['自助餐','火锅','烤肉','海鲜','烤鸭','牛排','川菜','湘菜','粤菜','日料','酒店餐厅'];
const landmarkNames=['沙河万达广场','TBD住总万科天地','北店时代广场','北京华联回龙观购物中心','北京华联回龙观东购物中心','霍营地铁站','龙旗购物中心','回龙观东大街地铁站','朱辛庄地铁站','清河万象汇','龙德广场','西三旗万象汇','龙域中心','回龙观万科广场','同成街华联商厦','积水潭医院回龙观院区','沙河高教园地铁站','沙河地铁站','昌平悦荟万科广场','北京昌平超极合生汇','上地华联购物中心','五彩城购物中心','永旺国际商城购物中心北清路店','温都水城','天通苑华联购物中心','立水桥地铁站','生命科学园地铁站'];
export async function runCollection({used,maxRequests=1000,signal,onProgress=()=>{}}={}){
 const budget=await api('start',{monthlyLimit:5000,used,reserve:1000,maxRequests});
 const config=await fetch('/api/config').then(r=>r.json());if(!config.map?.allowNearbySearch)throw Error('采集预算未开启');
 const AMap=await loadAMap(config.map);await new Promise(resolve=>AMap.plugin('AMap.PlaceSearch',resolve));
 const [centerLng,centerLat]=gcoord.transform([116.3042,40.0887],gcoord.WGS84,gcoord.GCJ02);
 const saved=await api('checkpoint');
 let queue,seen,report,landmarks;
 if(saved.run_started_at===budget.started_at&&saved.queue){({queue,report,landmarks}=saved);seen=new Set(saved.seen||[]);}else{
   queue=[{kind:'text',keyword:'柳州肥姨妈大骨螺蛳粉 回龙观',page:1,priority:true},{kind:'text',keyword:'肥姨妈 螺蛳粉 回龙观',page:1,priority:true},...landmarkNames.map(keyword=>({kind:'landmark',keyword,page:1,priority:true}))];
   const ringRadii=[0,6,12,20,35,50,75,100];
   for(const radius of ringRadii){const count=radius===0?1:Math.ceil(radius*2*Math.PI/10);for(let i=0;i<count;i++){const angle=2*Math.PI*i/count,x=radius*Math.cos(angle),y=radius*Math.sin(angle);const lng=centerLng+x/(111.32*Math.cos(centerLat*Math.PI/180)),lat=centerLat+y/111.32;for(const keyword of foodKeywords)queue.push({kind:'around',keyword,lng,lat,radius:radius<20?7000:10000,ring_km:radius,page:1});}}
   seen=new Set();landmarks=[];report={run_started_at:budget.started_at,scope:'从华电向外扩展，优先沙河万达/TBD/华联/霍营/北店时代广场',priority:'自助餐、火锅、烤肉、海鲜、烤鸭、牛排及较完整餐厅',state:'running',tasks_completed:0,inserted:0,updated:0,duplicate:0,invalid:0,outside:0,errors:[],target_stores:[],last_query:'',actual_requests:budget.consumed,max_requests:budget.max_requests};
 }
 async function checkpoint(){const status=await api('status');report.actual_requests=status.consumed;report.estimated_remaining=status.monthly_limit-status.start_used-status.consumed;report.pending_tasks=queue.length;await api('checkpoint',{run_started_at:budget.started_at,queue,seen:[...seen],landmarks,report});onProgress({...report,landmarks});}
 async function query(task){return new Promise(resolve=>{const timer=setTimeout(()=>resolve({status:'error',result:{info:'TIMEOUT'}}),18000);const search=new AMap.PlaceSearch({type:task.kind==='landmark'?'': '050000',city:'北京',citylimit:task.kind==='around'?false:true,pageSize:25,pageIndex:task.page||1,extensions:'all'});const done=(status,result)=>{clearTimeout(timer);resolve({status,result});};if(task.kind==='detail')search.getDetails(task.id,done);else if(task.kind==='around')search.searchNearBy(task.keyword,[task.lng,task.lat],task.radius,done);else search.search(task.keyword,done);});}
 async function savePois(pois){for(let i=0;i<pois.length;i+=25){const response=await fetch('/api/admin/import-amap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'expanding',pois:pois.slice(i,i+25)})});const result=await response.json();if(!response.ok)throw Error(result.error||'保存门店失败');for(const key of ['inserted','updated','duplicate','outside','invalid'])report[key]+=result[key]||0;report.total=result.total;}}
 let photoPhase=false;
 while(queue.length&&!signal?.aborted){const status=await api('status');if(status.consumed>=status.max_requests){report.state='budget_limit';break;}
   if(!photoPhase&&status.consumed>=status.max_requests-180){photoPhase=true;const missing=await api('missing-images');queue.unshift(...missing.map(p=>({kind:'detail',id:p.provider_id.replace('amap:',''),keyword:p.name,page:1})));}
   const task=queue.shift();report.last_query=task.keyword||task.id;report.last_ring_km=task.ring_km??0;
   const {status:resultStatus,result}=await query(task);report.tasks_completed++;
   if(resultStatus==='complete'){
     const pois=result.poiList?.pois||[];
     if(task.kind==='landmark'){
       const candidates=pois.filter(p=>Number.isFinite(p.location?.lng)&&Number.isFinite(p.location?.lat));const p=candidates[0];
       if(p){const landmark={query:task.keyword,name:p.name,address:p.address,lng:p.location.lng,lat:p.location.lat};landmarks.push(landmark);const tasks=[];
         for(const keyword of foodKeywords)tasks.push({kind:'around',keyword,lng:landmark.lng,lat:landmark.lat,radius:2200,page:1,priority:true,area:task.keyword});
         queue.unshift(...tasks);
       }
     }else{
       const fresh=[];for(const p of pois){if(!Number.isFinite(p.location?.lat)||!Number.isFinite(p.location?.lng)||(task.kind!=='detail'&&seen.has(p.id)))continue;seen.add(p.id);fresh.push({id:p.id,name:p.name,type:p.type,address:p.address,lat:p.location.lat,lng:p.location.lng,tel:p.tel,cost:p.biz_ext?.cost||p.cost,photos:p.photos||[]});if(/肥姨/.test(p.name)&&/回龙观/.test(p.name+' '+p.address))report.target_stores.push({id:p.id,name:p.name,address:p.address});}
       if(fresh.length)await savePois(fresh);
       if(pois.length===25&&task.page<24&&task.kind!=='detail'){
         const next={...task,page:task.page+1};
         // Finish the core shopping district before expanding outward.
         if(task.priority)queue.unshift(next);else queue.push(next);
       }
     }
   }else if(resultStatus!=='no_data'){
     const info=String(result.info||result||'UNKNOWN');report.errors.push({query:report.last_query,page:task.page,info});
     if(/TASTY_BUDGET|LIMIT|KEY|PLAT|SCODE|DOMAIN|SERVICE_NOT_AVAILABLE/.test(info)){report.state=/TASTY_BUDGET/.test(info)?'budget_limit':'upstream_limit';break;}
     if((task.retry||0)<1)queue.push({...task,retry:1});
   }
   if(report.tasks_completed%10===0)await checkpoint();else onProgress({...report,landmarks});
   await pause(370);
 }
 if(signal?.aborted)report.state='stopped';else if(!queue.length)report.state='complete';
 await checkpoint();report.finished_at=new Date().toISOString();
 await api('finish',{state:report.state});await api('checkpoint',{run_started_at:budget.started_at,queue,seen:[...seen],landmarks,report});onProgress({...report,landmarks});return report;
}
