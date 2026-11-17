import React,{useRef,useState} from 'react';
import MapStack from './MapStack.jsx';
import {CARD_HEADER} from './map-cards.js';
export default function DraggableMapCard({placement,onMove,onActivate,active,...props}){
 const drag=useRef(null),[dragging,setDragging]=useState(false),{card:c,members,id}=placement;
 function end(e,cancel=false){const current=drag.current;if(!current||e.pointerId!==current.pointerId)return;e.stopPropagation();if(cancel)onMove(current.x,current.y);drag.current=null;setDragging(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
 const dragHandle={
  onPointerDown:e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();onActivate();e.currentTarget.focus({preventScroll:true});drag.current={pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY,x:c.x,y:c.y};e.currentTarget.setPointerCapture(e.pointerId);setDragging(true);},
  onPointerMove:e=>{const current=drag.current;if(!current||current.pointerId!==e.pointerId)return;e.preventDefault();e.stopPropagation();onMove(current.x+e.clientX-current.clientX,current.y+e.clientY-current.clientY);},
  onPointerUp:e=>end(e),onPointerCancel:e=>end(e,true),
  onKeyDown:e=>{const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();e.stopPropagation();onActivate();const step=e.shiftKey?20:4;onMove(c.x+delta[0]*step,c.y+delta[1]*step);}else if(e.key==='Escape'&&drag.current){e.preventDefault();e.stopPropagation();const current=drag.current;onMove(current.x,current.y);drag.current=null;setDragging(false);if(e.currentTarget.hasPointerCapture(current.pointerId))e.currentTarget.releasePointerCapture(current.pointerId);}},
 };
 return <div className={'map-shop-container'+(dragging?' is-dragging':'')} data-card-id={id} style={{left:c.x,top:c.y,width:c.w,height:c.h,zIndex:active?8:2}} onPointerDown={e=>{e.stopPropagation();onActivate();}}><MapStack members={members} height={c.h-CARD_HEADER} dragHandle={dragHandle} {...props}/></div>;
}
