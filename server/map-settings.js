import {existsSync,readFileSync,mkdirSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';

export class MapSettings {
 constructor({file,env=process.env}={}){
  this.file=file;
  this.current={provider:env.MAP_PROVIDER==='amap'?'amap':'osm',key:env.AMAP_JS_KEY||'',securityCode:env.AMAP_SECURITY_CODE||''};
  this.configured=!!(env.MAP_PROVIDER&&((env.AMAP_JS_KEY&&env.AMAP_SECURITY_CODE)||env.MAP_PROVIDER==='osm'));
  if(file&&existsSync(file)){
   let saved;try{saved=JSON.parse(readFileSync(file,'utf8'));}catch{throw Error('地图配置文件无法读取，请恢复 map-settings.json 后重试');}
   if(!['osm','amap'].includes(saved.provider)||typeof saved.key!=='string'||typeof saved.securityCode!=='string')throw Error('地图配置文件损坏，请从本机备份恢复 map-settings.json');
   this.current=saved;this.configured=true;
  }
 }
 credentials(){return {...this.current};}
 publicSettings(){return {provider:this.current.provider,key:this.current.key,hasSecurityCode:!!this.current.securityCode,configured:this.configured};}
 save(input){
  if(!input||!['osm','amap'].includes(input.provider))throw Error('请选择地图服务');
  const key=input.key===undefined?this.current.key:typeof input.key==='string'?input.key.trim():null;
  const securityCode=input.securityCode===undefined||input.securityCode===''?this.current.securityCode:typeof input.securityCode==='string'?input.securityCode.trim():null;
  if(key===null||securityCode===null||key.length>128||securityCode.length>128)throw Error('地图配置格式不正确');
  if(input.provider==='amap'){
   if(!/^[a-f0-9]{32}$/i.test(key))throw Error('请输入32位高德 Web端(JS API) Key');
   if(!/^[a-f0-9]{32}$/i.test(securityCode))throw Error('请输入32位安全密钥');
   if(key!==this.current.key&&this.current.securityCode&&!input.securityCode)throw Error('更换 Key 时，请同时填写对应的安全密钥');
  }
  const next={provider:input.provider,key,securityCode};
  if(this.file){
   mkdirSync(dirname(this.file),{recursive:true});const temporary=this.file+'.'+randomUUID()+'.tmp';
   try{writeFileSync(temporary,JSON.stringify(next,null,2),{mode:0o600,flag:'wx'});renameSync(temporary,this.file);}catch{try{unlinkSync(temporary);}catch{}throw Error('配置未能保存，请将程序解压到有写入权限的文件夹后重试');}
  }
  this.current=next;this.configured=true;return this.publicSettings();
 }
}

export function localSettingsAccess(req,res,next){
 const ip=req.socket.remoteAddress;
 const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
 let hostname='';try{hostname=new URL('http://'+req.get('host')).hostname;}catch{}
 let sameOrigin=true;try{if(req.get('origin'))sameOrigin=new URL(req.get('origin')).host===req.get('host');}catch{sameOrigin=false;}
 if(!local||!['localhost','127.0.0.1','[::1]'].includes(hostname)||!sameOrigin||req.get('sec-fetch-site')==='cross-site')return res.status(403).json({error:'地图设置仅允许本机访问'});
 next();
}
