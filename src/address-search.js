import {loadAMap} from './map-adapter.js';
import {queryAddresses} from './address-query.js';
export async function searchAddresses(keyword){
 const response=await fetch('/api/config');if(!response.ok)throw Error('地图配置读取失败，请重试');const config=await response.json();
 if(config.map?.provider!=='amap')throw Error('请先在地图设置中配置高德 Key 和安全密钥');
 const AMap=await loadAMap(config.map);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('地址搜索加载超时，请重试')),12000);AMap.plugin(['AMap.PlaceSearch','AMap.Geocoder'],()=>{clearTimeout(timer);resolve();});});
 return queryAddresses(AMap,keyword);
}
