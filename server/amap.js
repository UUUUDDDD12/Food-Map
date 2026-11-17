export function mapConfiguration(allowNearbySearch=false,settings) {
 const credentials=settings?.credentials()||{provider:process.env.MAP_PROVIDER,key:process.env.AMAP_JS_KEY,securityCode:process.env.AMAP_SECURITY_CODE};
 const enabled=credentials.provider==='amap'&&!!credentials.key&&!!credentials.securityCode;
 return enabled?{provider:'amap',key:credentials.key,serviceHost:'/_AMapService',allowNearbySearch}:{provider:'osm'};
}
export async function amapProxy(req,res,budget,settings,assistant) {
 const searchRequest=/^\/v[35]\/(place\/|assistant\/inputtips|geocode\/)/.test(req.path);
 const job=searchRequest?assistant?.authorizeProxy(req):null;
 if(job&&!assistant.take(job))return res.status(429).json({status:'0',info:'TASTY_AI_BUDGET_LIMIT',error:'本次请求已达上限或需保留1000次额度'});
 if(searchRequest&&!job&&assistant?.budget.status().remaining!==null&&assistant?.budget.status().remaining!==undefined&&!assistant.budget.take())return res.status(429).json({status:'0',info:'TASTY_AI_BUDGET_LIMIT',error:'需保留1000次额度，请在AI设置校正剩余次数'});
 let worker=false;try{worker=new URL(req.get?.('referer')||'http://localhost').pathname==='/collection-worker.html';}catch{}
 if(searchRequest&&!job&&(worker||budget?.active())){if(!budget?.take())return res.status(429).json({status:'0',info:'TASTY_BUDGET_LIMIT',error:'本次采集已达到额度上限，已保留你的搜索额度'});}

 if(/^\/v[35]\/place\/around$/.test(req.path)&&!job&&(!worker||!budget?.active()))return res.status(403).json({status:'0',info:'NEARBY_SEARCH_DISABLED',error:'高德周边采集已停用'});
 if(mapConfiguration(false,settings).provider!=='amap')return res.status(503).json({error:'尚未配置高德地图'});
 if(req.method!=='GET'||!/^\/v[345]\/[a-zA-Z0-9/_-]+$/.test(req.path))return res.status(400).json({error:'不支持的地图请求'});
 const upstream=new URL(req.path,req.path.startsWith('/v4/map/styles')?'https://webapi.amap.com':'https://restapi.amap.com');
 const incoming=new URL(req.originalUrl,'http://localhost');
 for(const[k,v]of incoming.searchParams)upstream.searchParams.append(k,v);
 const credentials=settings?.credentials()||{key:process.env.AMAP_JS_KEY,securityCode:process.env.AMAP_SECURITY_CODE};
 upstream.searchParams.set('key',credentials.key);
 upstream.searchParams.set('jscode',credentials.securityCode);
 try{const response=await fetch(upstream,{signal:AbortSignal.timeout(15000),redirect:'error'});res.status(response.status).set('Content-Type',response.headers.get('content-type')||'application/json').set('Cache-Control','no-store').send(Buffer.from(await response.arrayBuffer()));}catch{res.status(502).json({error:'高德服务暂时不可达，请稍后重试'});}
}
