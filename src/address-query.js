import gcoord from 'gcoord';
function request(start){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('地址搜索超时，请重试')),12000);start((status,result)=>{clearTimeout(timer);if(status==='no_data')return resolve(null);if(status!=='complete')return reject(Error('高德地址搜索失败，请检查地图配置或搜索额度后重试'));resolve(result);});});}
function place(p,index){const lat=Number(p.location?.lat),lng=Number(p.location?.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;const [wLng,wLat]=gcoord.transform([lng,lat],gcoord.GCJ02,gcoord.WGS84);return{id:p.id||`address-${index}`,name:p.name||p.formattedAddress,address:[p.pname,p.cityname,p.adname,typeof p.address==='string'?p.address:p.formattedAddress].filter(Boolean).join(''),lat:wLat,lng:wLng,gcj_lat:lat,gcj_lng:lng};}
export async function queryAddresses(AMap,keyword){
 const text=keyword.trim();if(text.length<2)return[];
 const search=new AMap.PlaceSearch({city:'全国',citylimit:false,pageSize:10,pageIndex:1,extensions:'base'});
 const result=await request(done=>search.search(text,done));
 const places=(result?.poiList?.pois||[]).map(place).filter(Boolean);if(places.length)return places;
 const geocoder=new AMap.Geocoder();const geocoded=await request(done=>geocoder.getLocation(text,done));
 return(geocoded?.geocodes||[]).map((p,i)=>place({...p,name:p.formattedAddress||text},i)).filter(Boolean);
}
