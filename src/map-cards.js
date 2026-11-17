export const CARD_HEADER=32;
export const rowHeight=r=>138+Math.min(r.checkins?.length||0,2)*24;
export function cardCandidates(groups,points,{collapsedCards=new Set(),expandedCards=new Set(),collapsedGroups=new Set(),clusterIds=[],preferredCard=null,selected=null}={}){
 const positions=new Map(points.map(({r,p})=>[r.id,p])),active=new Set(clusterIds),result=[];
 for(const group of groups){
  const singles=group.members.filter(r=>!collapsedCards.has(r.id)&&(r.favorite||expandedCards.has(r.id)||r.id===preferredCard||r.id===selected));
  const separated=new Set(singles.map(r=>r.id));
  for(const r of singles)result.push({id:`shop:${r.id}`,members:[r],point:positions.get(r.id)||{x:group.x,y:group.y},group});
  const remaining=group.members.filter(r=>!r.favorite&&!separated.has(r.id));
  if(group.members.length>1&&remaining.length&&!collapsedGroups.has(group.key)&&group.members.some(r=>active.has(r.id)))result.push({id:`stack:${group.key}`,members:remaining,point:{x:group.x,y:group.y},group});
 }
 return result.sort((a,b)=>Number(b.members.some(r=>r.id===preferredCard))-Number(a.members.some(r=>r.id===preferredCard))||Number(b.members.some(r=>r.favorite))-Number(a.members.some(r=>r.favorite)));
}
export function clampCard(card,size){return {...card,x:Math.max(12,Math.min(card.x,size.x-card.w-12)),y:Math.max(12,Math.min(card.y,size.y-card.h-64))};}
const overlaps=(a,b)=>a.x<b.x+b.w+12&&a.x+a.w+12>b.x&&a.y<b.y+b.h+12&&a.y+a.h+12>b.y;
export function placeCards(candidates,size){
 if(size.x<48||size.y<100)return[];
 const occupied=[];
 const placements=candidates.map((candidate,index)=>{
  const {point:p,members}=candidate,w=Math.min(size.x<500?274:288,size.x-24);
  const h=Math.min(CARD_HEADER+members.slice(0,2).reduce((sum,r)=>sum+rowHeight(r),0),Math.max(80,Math.min(size.y-88,size.y*.62)));
  const choices=[];
  for(const gap of [28,60,100])choices.push({x:p.x+gap,y:p.y-h*.5},{x:p.x-w-gap,y:p.y-h*.5},{x:p.x-w*.5,y:p.y-h-gap},{x:p.x-w*.5,y:p.y+gap});
  for(let y=14;y+h<=size.y-64;y+=h+14)for(let x=14;x+w<=size.x-12;x+=w+14)choices.push({x,y});
  const bounded=choices.map(c=>clampCard({...c,w,h},size)).filter(c=>!(p.x>=c.x-12&&p.x<=c.x+c.w+12&&p.y>=c.y-12&&p.y<=c.y+c.h+12)).sort((a,b)=>Math.hypot(a.x+w/2-p.x,a.y+h/2-p.y)-Math.hypot(b.x+w/2-p.x,b.y+h/2-p.y));
  const card=bounded.find(box=>!occupied.some(old=>overlaps(box,old)))||clampCard({x:p.x+28+(index%3)*24,y:14+(index*34)%Math.max(34,size.y-h-80),w,h},size);
  occupied.push(card);return {...candidate,card};
 });
 if(!placements.some((a,i)=>placements.slice(i+1).some(b=>overlaps(a.card,b.card))))return placements;
 // On narrow maps, pack the cards into columns when the nearby positions cannot all fit.
 const width=placements[0]?.card.w||0,columns=Math.max(1,Math.floor((size.x-24+14)/(width+14))),bottoms=Array(columns).fill(14),packed=[];
 for(const item of placements){const column=bottoms.indexOf(Math.min(...bottoms)),card={...item.card,x:12+column*(width+14),y:bottoms[column]};if(card.y+card.h>size.y-64)return placements;packed.push({...item,card});bottoms[column]+=card.h+12;}
 return packed;
}
export function leaderPath({point:p,card:c}){
 const x=Math.max(c.x,Math.min(p.x,c.x+c.w)),y=Math.max(c.y,Math.min(p.y,c.y+c.h));
 return `M ${p.x} ${p.y} L ${(p.x+x)/2} ${(p.y+y)/2} L ${x} ${y}`;
}
