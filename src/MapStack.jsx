import React,{useRef,useEffect,useState} from 'react';
import {Heart,Minus,ArrowUpRight,GripHorizontal} from 'lucide-react';
import {diningModes} from '../shared/food.js';
import {rowHeight} from './map-cards.js';
import Checkins from './Checkins.jsx';
export default function MapStack({members,choose,favorite,onCollapse,Photo,height,dragHandle,checkin,rateCheckin,deleteCheckin}){
 const scrollRef=useRef(null),[range,setRange]=useState([1,Math.min(2,members.length)]);
 const membersKey=members.map(r=>r.id).join(','),visitsKey=members.map(r=>r.checkins?.length||0).join(',');
 function updateRange(){const node=scrollRef.current;if(!node)return;const visible=[...node.children].map((child,i)=>({child,i})).filter(({child})=>child.offsetTop+child.offsetHeight>node.scrollTop+1&&child.offsetTop<node.scrollTop+node.clientHeight-1);if(visible.length)setRange([visible[0].i+1,visible.at(-1).i+1]);}
 useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;updateRange();},[membersKey]);
 useEffect(()=>{updateRange();const observer=new ResizeObserver(updateRange);if(scrollRef.current)observer.observe(scrollRef.current);return()=>observer.disconnect();},[height,membersKey,visitsKey]);
 const title=members.length>1?`${range[0]===range[1]?range[0]:range.join('–')} / ${members.length} 家 · 上下滑动`:members[0].favorite?'已收藏':'店铺信息';
 return <div className="map-stack"><div className="stack-heading"><div className="stack-drag-handle" role="button" tabIndex={0} aria-label={`移动${members[0].name}${members.length>1?'等店铺':''}卡片`} title="拖动移动；方向键微调，Shift＋方向键快速移动" {...dragHandle}><GripHorizontal size={13}/><span>{title}</span></div><button aria-label={`收起${members[0].name}卡片`} title="收起" onClick={onCollapse}><Minus size={14}/></button></div><div ref={scrollRef} className="stack-scroll" style={{height}} onWheel={e=>e.stopPropagation()} onScroll={updateRange}>{members.map(r=><div className="stack-shop" style={{height:rowHeight(r)}} key={r.id}><div className="stack-shop-summary"><button className="stack-main" onClick={()=>choose(r)}><div className="stack-photo"><Photo src={r.image} alt={r.name}/></div><div className="stack-info"><strong>{r.name}</strong><span>{r.category}{r.service_mode?` · ${diningModes[r.service_mode]}`:''}</span><p>{r.price===null?'人均待补充':`¥${r.price} / 人`}</p></div><ArrowUpRight size={14}/></button><button className={'stack-favorite '+(r.favorite?'is-saved':'')} aria-label={`${r.favorite?'取消收藏':'收藏'} ${r.name}`} onClick={()=>favorite(r)}><Heart size={16} fill={r.favorite?'currentColor':'none'}/></button></div><Checkins restaurant={r} checkin={checkin} rateCheckin={rateCheckin} deleteCheckin={deleteCheckin}/></div>)}</div></div>;
}
