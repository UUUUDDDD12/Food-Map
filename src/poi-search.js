import {loadAMap} from './map-adapter.js';
export async function runPoiImport({maxRequests=1200,onProgress=()=>{},signal}={}){
 const config=await fetch('/api/config').then(r=>r.json());
 if(!config.map?.allowNearbySearch)throw Error('高德周边搜索已停用，避免消耗额度');
 if(config.map?.provider!=='amap')throw Error('请先配置高德 JS API');
 const AMap=await loadAMap(config.map);
 await new Promise(resolve=>AMap.plugin('AMap.PlaceSearch',resolve));
 const center=await new Promise((resolve,reject)=>AMap.convertFrom([[116.3042,40.0887]],'gps',(status,result)=>status==='complete'?resolve(result.locations[0]):reject(Error('校园坐标转换失败'))));
 const points=[];
 for(let y=-20;y<=20;y+=5)for(let x=-20;x<=20;x+=5){if(Math.hypot(x,y)>22)continue;points.push({x,y,lng:center.lng+x/(111.32*Math.cos(center.lat*Math.PI/180)),lat:center.lat+y/111.32,page:1});}
 points.sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));
 const queue=[...points],seen=new Set(),report={started_at:new Date().toISOString(),radius_m:20000,grid_spacing_m:5000,search_radius_m:3800,grid_cells:points.length,max_requests:maxRequests,requests:0,inserted:0,duplicate:0,outside:0,invalid:0,unique_seen:0,completed_cells:0,errors:[],status:'running'};
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 async function search(cell){return new Promise(resolve=>{const timer=setTimeout(()=>resolve({status:'error',result:{info:'TIMEOUT'}}),18000);const s=new AMap.PlaceSearch({type:'050000',pageSize:25,pageIndex:cell.page,extensions:'all',city:'北京',citylimit:true});s.searchNearBy('',[cell.lng,cell.lat],3800,(status,result)=>{clearTimeout(timer);resolve({status,result});});});}
 while(queue.length&&report.requests<maxRequests&&!signal?.aborted){const cell=queue.shift();report.requests++;const{status,result}=await search(cell);
   if(status==='complete'){
     const pois=result.poiList?.pois||[],fresh=[];
     for(const p of pois){if(seen.has(p.id))continue;seen.add(p.id);fresh.push({id:p.id,name:p.name,type:p.type,address:p.address,lat:p.location?.lat,lng:p.location?.lng,tel:p.tel,cost:p.biz_ext?.cost||p.cost,photos:p.photos||[]});}
     report.unique_seen=seen.size;
     if(fresh.length){const response=await fetch('/api/admin/import-amap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pois:fresh})});const saved=await response.json();if(!response.ok)throw Error(saved.error||'保存失败');for(const key of['inserted','duplicate','outside','invalid'])report[key]+=saved[key]||0;report.total=saved.total;}
     if(pois.length===25&&cell.page<24)queue.push({...cell,page:cell.page+1});else report.completed_cells++;
   }else if(status==='no_data'){report.completed_cells++;}
   else{const info=String(result.info||result||'UNKNOWN');report.errors.push({cell:[cell.x,cell.y],page:cell.page,info});if(/LIMIT|KEY|PLAT|PERMISSION|SCODE|DOMAIN|SERVICE_NOT_AVAILABLE/.test(info)){report.status='limited';break;}if((cell.retry||0)<2)queue.push({...cell,retry:(cell.retry||0)+1});}
   onProgress({...report,pending_pages:queue.length});await pause(220);
 }
 report.status=signal?.aborted?'stopped':report.status==='limited'?'limited':queue.length?'request_limit':'complete';report.pending_pages=queue.length;report.finished_at=new Date().toISOString();onProgress(report);
 await fetch('/api/admin/import-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
 return report;
}
