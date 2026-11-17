import React,{useMemo} from 'react';
import {layoutMarkerNames,markerName,zoomPresentation} from './map-markers.js';
export default function MapMarkers({groups,zoom,size,selected,placements,openGroup,toggleCard}){
 const mode=zoomPresentation(zoom),labels=useMemo(()=>layoutMarkerNames(groups,{zoom,size,selected}),[groups,zoom,size.x,size.y,selected]);
 return groups.map(group=>{
  const single=group.members.length===1,r=group.members[0],favorite=group.members.some(x=>x.favorite),active=group.members.some(x=>x.id===selected),label=labels.get(group.key),expanded=placements.some(p=>p.members.some(x=>group.members.some(y=>x.id===y.id)));
  return <button key={group.key} className={'map-marker '+(single?'map-point':'map-cluster')+(favorite?' marker-favorite':'')+(active?' marker-selected':'')+(mode.showNames?' marker-with-name':'')} style={{left:group.x,top:group.y,'--marker-size':`${mode.clusterSize}px`}} data-marker-id={group.key} title={markerName(group)} aria-label={single?`${expanded?'收起':'展开'} ${r.name} 地图卡片`:`查看附近 ${group.members.length} 家美食`} aria-expanded={expanded} onClick={()=>single?toggleCard(r.id):openGroup(group)}>{!single&&<span className="marker-count">{group.members.length}</span>}{label&&<span className={'marker-name'+(label.visible?' name-visible':'')} style={{width:label.width,marginLeft:label.shift}}>{label.text}</span>}</button>;
 });
}
