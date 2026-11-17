import React,{useState,useRef,useEffect} from 'react';
import {Heart,Minus,ArrowUpRight,ChevronDown} from 'lucide-react';
import {diningModes} from '../shared/food.js';
export default function MapStack({members,choose,favorite,onCollapse,Photo}){
 const[index,setIndex]=useState(0);
 const scrollRef=useRef(null),favoritesKey=members.filter(r=>r.favorite).map(r=>r.id).sort((a,b)=>a-b).join(',');
 useEffect(()=>{setIndex(0);if(scrollRef.current)scrollRef.current.scrollTop=0;},[favoritesKey]);
 const ordered=[...members].sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite));
 return <div className="map-stack"><div className="stack-heading"><span>{ordered.length>1?`${Math.min(index+1,ordered.length)} / ${ordered.length} 家 · 上下滑动`:ordered[0].favorite?'已收藏':'店铺信息'}</span><button aria-label="收起此点位卡片" title="收起" onClick={onCollapse}><Minus size={14}/></button></div><div ref={scrollRef} className="stack-scroll" onWheel={e=>e.stopPropagation()} onScroll={e=>setIndex(Math.round(e.currentTarget.scrollTop/e.currentTarget.clientHeight))}>{ordered.map(r=><div className="stack-shop" key={r.id}><button className="stack-main" onClick={()=>choose(r)}><div className="stack-photo"><Photo src={r.image} alt={r.name}/></div><div className="stack-info"><strong>{r.name}</strong><span>{r.category}{r.service_mode&&r.service_mode!==''?` · ${diningModes[r.service_mode]}`:''}</span><p>{r.price===null?'人均待补充':`¥${r.price} / 人`}</p></div><ArrowUpRight size={14}/></button><button className={'stack-favorite '+(r.favorite?'is-saved':'')} aria-label={`${r.favorite?'取消收藏':'收藏'} ${r.name}`} onClick={()=>favorite(r)}><Heart size={16} fill={r.favorite?'currentColor':'none'}/></button></div>)}</div>{ordered.length>1&&<ChevronDown className="stack-scroll-hint" size={12}/>}</div>;
}
