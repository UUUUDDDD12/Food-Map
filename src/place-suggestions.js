import {loadAMap} from './map-adapter.js';
export async function suggestPlaces(keyword){
 const response=await fetch('/api/config'),config=await response.json();
 if(config.map?.provider!=='amap')throw Error('暂未配置高德地图，无法匹配门店');
 const AMap=await loadAMap(config.map);await new Promise(resolve=>AMap.plugin('AMap.PlaceSearch',resolve));
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('门店匹配超时，请重试')),12000);const search=new AMap.PlaceSearch({city:'北京',citylimit:true,type:'050000',pageSize:10,pageIndex:1,extensions:'all'});search.search(keyword,(status,result)=>{clearTimeout(timer);if(status==='no_data')return resolve([]);if(status!=='complete')return reject(Error('高德暂时无法匹配门店，请稍后再试'));resolve((result.poiList?.pois||[]).filter(p=>Number.isFinite(p.location?.lat)&&Number.isFinite(p.location?.lng)).map(p=>({id:p.id,name:p.name,address:p.address||'',type:p.type||'',lat:p.location.lat,lng:p.location.lng})));});});
}
