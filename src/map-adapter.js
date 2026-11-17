import L from 'leaflet';
import {tileOptions,MIN_MAP_ZOOM,MAX_MAP_ZOOM} from './map-options.js';
let sdkPromise;
export function loadAMap(config){
 if(window.AMap)return Promise.resolve(window.AMap);
 if(sdkPromise)return sdkPromise;
 window._AMapSecurityConfig={serviceHost:location.origin+config.serviceHost};
 sdkPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   const timer=setTimeout(()=>{script.remove();reject(Error('高德地图加载超时'));},20000);
   window.__tastyMapReady=()=>{clearTimeout(timer);delete window.__tastyMapReady;resolve(window.AMap);};
   script.src=`https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}&callback=__tastyMapReady`;
   script.onerror=()=>{clearTimeout(timer);script.remove();delete window.__tastyMapReady;reject(Error('高德地图加载失败'));};document.head.appendChild(script);
 }).catch(error=>{sdkPromise=undefined;throw error;});
 return sdkPromise;
}
function accessibleMarker(element,name,expanded,click){
 element.setAttribute('role','button');element.setAttribute('tabindex','0');
 element.setAttribute('aria-label',`${expanded?'收起':'展开'} ${name} 地图卡片`);element.setAttribute('aria-expanded',String(expanded));
 element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();click();}});
}
export async function createMapAdapter(element,config,{center,onChange,onZoom,onError}){
 if(config.provider==='amap')return createAMap(element,config,{center,onChange,onZoom,onError});
 const map=L.map(element,{center,zoom:16,zoomControl:false,minZoom:MIN_MAP_ZOOM,maxZoom:MAX_MAP_ZOOM,zoomSnap:1,zoomDelta:1,zoomAnimation:false,fadeAnimation:false});
 const markers=L.layerGroup().addTo(map),origin=L.layerGroup().addTo(map),searchLocation=L.layerGroup().addTo(map);
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',tileOptions(L.Browser.retina)).on('tileerror',()=>onError('底图加载遇到问题')).addTo(map);
 L.control.scale({imperial:false,position:'bottomright'}).addTo(map);
 map.on('move zoom resize',onChange);map.on('zoomend',()=>onZoom(map.getZoom()));
 return{
  clearSearchLocation:()=>searchLocation.clearLayers(),
  drawSearchLocation(place){searchLocation.clearLayers();const label=document.createElement('span');label.textContent=place.name;L.marker([place.lat,place.lng],{icon:L.divIcon({className:'',html:'<div class="address-pin"></div>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(searchLocation).bindTooltip(label,{permanent:true,direction:'top',className:'address-pin-label',offset:[0,-12]});},
  provider:'osm',getZoom:()=>map.getZoom(),getSize:()=>map.getSize(),latLngToContainerPoint:p=>map.latLngToContainerPoint(p),
  prepare:async()=>{},flyTo:(p,z)=>map.flyTo(p,z,{duration:.6}),setZoom:z=>map.setZoom(z),invalidateSize:()=>map.invalidateSize(),remove:()=>map.remove(),
  drawOrigin(point){origin.clearLayers();L.circle(point,{radius:180,color:'#427866',weight:1,fillColor:'#64947f',fillOpacity:.06,dashArray:'4 6',interactive:false}).addTo(origin);L.marker(point,{icon:L.divIcon({className:'',html:'<div class="origin-dot"><span></span></div>',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(origin);},
  drawMarkers(rows,selected,collapsed,toggle){markers.clearLayers();for(const r of rows){const click=()=>toggle(r.id);const marker=L.circleMarker([r.lat,r.lng],{radius:selected===r.id?7:5,color:'#fff',weight:2,fillColor:selected===r.id?'#c87940':'#3b6b55',fillOpacity:1}).addTo(markers).on('click',click);const text=document.createElement('span');text.textContent=r.name;marker.bindTooltip(text);accessibleMarker(marker.getElement(),r.name,!collapsed.has(r.id),click);}},
 };
}
async function createAMap(element,config,{center,onChange,onZoom}){
 const AMap=await loadAMap(config),converted=new Map();
 async function prepare(points,records=[]){
   for(const r of records)if(Number.isFinite(r.gcj_lat)&&Number.isFinite(r.gcj_lng))converted.set([r.lat,r.lng].join(','),new AMap.LngLat(r.gcj_lng,r.gcj_lat));
   const missing=[...new Map(points.filter(p=>!converted.has(p.join(','))).map(p=>[p.join(','),p])).values()];
   for(let start=0;start<missing.length;start+=40){const batch=missing.slice(start,start+40);await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(Error('高德坐标转换超时')),15000);
     AMap.convertFrom(batch.map(p=>[p[1],p[0]]),'gps',(status,result)=>{clearTimeout(timer);if(status!=='complete'||result.locations?.length!==batch.length)return reject(Error('高德坐标转换失败'));batch.forEach((p,i)=>converted.set(p.join(','),result.locations[i]));resolve();});
   });}
 }
 await prepare([center]);
 const position=p=>converted.get(p.join(','));
 const map=new AMap.Map(element,{center:position(center),zoom:16,zooms:[MIN_MAP_ZOOM,MAX_MAP_ZOOM],viewMode:'2D',pitch:0,rotation:0,rotateEnable:false,pitchEnable:false,animateEnable:false,resizeEnable:true,showLabel:true,mapStyle:'amap://styles/normal',features:['bg','road','building','point']});
 const markerObjects=[],originObjects=[];let searchMarker;
 map.on('mapmove',onChange);map.on('zoomchange',onChange);map.on('complete',onChange);map.on('zoomend',()=>{onZoom(map.getZoom());onChange();});
 AMap.plugin('AMap.Scale',()=>map.addControl(new AMap.Scale({position:'RB',offset:new AMap.Pixel(22,20)})));
 return{
   clearSearchLocation(){if(searchMarker){map.remove(searchMarker);searchMarker=null;}},
   drawSearchLocation(place){if(searchMarker)map.remove(searchMarker);const content=document.createElement('div');content.className='address-pin';content.title=place.name;searchMarker=new AMap.Marker({position:position([place.lat,place.lng]),content,offset:new AMap.Pixel(-10,-10),zIndex:200});const label=document.createElement('span');label.className='address-pin-label';label.textContent=place.name;searchMarker.setLabel({content:label.outerHTML,direction:'top',offset:new AMap.Pixel(0,-12)});map.add(searchMarker);},
   provider:'amap',prepare,getZoom:()=>map.getZoom(),getSize:()=>({x:element.clientWidth,y:element.clientHeight}),
   latLngToContainerPoint(p){const pos=position(p);if(!pos)return{x:-10000,y:-10000};const pixel=map.lngLatToContainer(pos);return{x:pixel.x,y:pixel.y};},
   flyTo(p,z){const pos=position(p);if(pos)map.setZoomAndCenter(z,pos,true);},setZoom:z=>map.setZoom(z,true),invalidateSize:()=>map.resize(),remove:()=>map.destroy(),
   drawOrigin(point){map.remove(originObjects);originObjects.length=0;const pos=position(point);if(!pos)return;const content=document.createElement('div');content.className='origin-dot';content.innerHTML='<span></span>';const marker=new AMap.Marker({position:pos,content,offset:new AMap.Pixel(-12,-12),zIndex:80});const circle=new AMap.Circle({center:pos,radius:180,strokeColor:'#709368',strokeOpacity:.7,strokeWeight:1,strokeStyle:'dashed',fillColor:'#72946a',fillOpacity:.06,bubble:true});originObjects.push(circle,marker);map.add(originObjects);},
   drawMarkers(rows,selected,collapsed,toggle){map.remove(markerObjects);markerObjects.length=0;for(const r of rows){const pos=position([r.lat,r.lng]);if(!pos)continue;const content=document.createElement('div');content.className='amap-food-dot'+(r.id===selected?' selected':'');content.title=r.name;const click=()=>toggle(r.id);accessibleMarker(content,r.name,!collapsed.has(r.id),click);const marker=new AMap.Marker({position:pos,content,offset:new AMap.Pixel(-7,-7),zIndex:100,bubble:false});marker.on('click',click);markerObjects.push(marker);}map.add(markerObjects);},
 };
}
