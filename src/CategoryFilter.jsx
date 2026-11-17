import React,{useEffect,useId,useRef,useState} from 'react';
import {Check,ChevronDown} from 'lucide-react';
export default function CategoryFilter({options,value,onChange}){
 const [open,setOpen]=useState(false),[cursor,setCursor]=useState(0),root=useRef(null),trigger=useRef(null),id=useId();
 function close(focus=false){setOpen(false);if(focus)trigger.current?.focus();}
 function show(){setCursor(Math.max(0,options.indexOf(value)));setOpen(true);}
 useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))close();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 useEffect(()=>{if(open)root.current?.querySelectorAll('[role="option"]')[cursor]?.focus();},[open,cursor]);
 function keyDown(e){if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close(true);return;}
  const moves={ArrowDown:2,ArrowUp:-2,ArrowRight:1,ArrowLeft:-1};
  if(e.key in moves){e.preventDefault();if(!open)show();else setCursor(i=>(i+moves[e.key]+options.length)%options.length);}
  else if(open&&(e.key==='Home'||e.key==='End')){e.preventDefault();setCursor(e.key==='Home'?0:options.length-1);}
 }
 return <div className="category-filter" ref={root} onKeyDown={keyDown} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close();}}>
  <button ref={trigger} className={'category-filter-trigger'+(open?' is-open':'')} aria-label="美食分类" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={()=>open?close():show()}><span className="category-filter-label">美食分类</span><strong>{value==='全部'?'全部美食':value}</strong><ChevronDown size={16}/></button>
  {open&&<div id={id} role="listbox" aria-label="选择美食分类" className="category-filter-menu">{options.map((option,i)=><button key={option} role="option" tabIndex={cursor===i?0:-1} aria-selected={value===option} className={value===option?'is-selected':''} onClick={()=>{onChange(option);close(true);}}><span>{option==='全部'?'全部美食':option}</span>{value===option&&<Check size={14}/>}</button>)}</div>}
 </div>;
}
