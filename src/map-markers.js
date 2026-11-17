export function zoomPresentation(zoom){
 return {clusterRadius:zoom<14?64:zoom<16?52:zoom<17?40:zoom<18?24:zoom<19?14:8,showNames:zoom>=19,clusterSize:zoom<17?36:zoom<19?26:22};
}
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function markerName(group){return group.members.length===1?group.members[0].name:`${group.members[0].name}等${group.members.length}家`;}
export function layoutMarkerNames(groups,{zoom,size,selected=null}){
 const mode=zoomPresentation(zoom),result=new Map();if(!mode.showNames)return result;
 const occupied=[];
 const points=groups.map(g=>({id:g.key,x:g.x-9,y:g.y-9,w:18,h:18}));
 const ordered=[...groups].sort((a,b)=>Number(b.members.some(r=>r.id===selected))-Number(a.members.some(r=>r.id===selected))||Number(b.members.some(r=>r.favorite))-Number(a.members.some(r=>r.favorite))||String(a.key).localeCompare(String(b.key),undefined,{numeric:true}));
 for(const group of ordered){
  const text=markerName(group),textWidth=[...text].reduce((sum,c)=>sum+(/[^\x00-\xff]/.test(c)?13:7),0),width=Math.min(156,Math.max(44,textWidth+4));
  const x=Math.max(6,Math.min(group.x-width/2,size.x-width-6)),y=group.y+(group.members.length>1?mode.clusterSize/2:6)+6,h=textWidth>width?34:18;
  const rect={x:x-4,y:y-2,w:width+8,h:h+4},visible=y+h<=size.y-8&&!occupied.some(box=>intersects(rect,box))&&!points.some(box=>box.id!==group.key&&intersects(rect,box));
  result.set(group.key,{text,width,shift:x-(group.x-width/2),visible});if(visible)occupied.push(rect);
 }
 return result;
}
