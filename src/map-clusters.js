// Nearby screen pixels share a marker; actual coordinates stay untouched.
export function clusterPoints(points,cellSize=48){
 const cells=new Map(),groups=[];
 const key=(x,y)=>`${Math.floor(x/cellSize)},${Math.floor(y/cellSize)}`;
 for(const{r,p}of points){let closest=null,nearest=cellSize;
   const cx=Math.floor(p.x/cellSize),cy=Math.floor(p.y/cellSize);
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const g of cells.get(`${cx+dx},${cy+dy}`)||[]){const d=Math.hypot(g.x-p.x,g.y-p.y);if(d<nearest){closest=g;nearest=d;}}
   if(!closest){closest={key:String(r.id),members:[],x:p.x,y:p.y};groups.push(closest);}
   const oldKey=closest.cellKey,n=closest.members.length;closest.x=(closest.x*n+p.x)/(n+1);closest.y=(closest.y*n+p.y)/(n+1);closest.members.push(r);
   const newKey=key(closest.x,closest.y);if(newKey!==oldKey){if(oldKey)cells.get(oldKey)?.delete(closest);if(!cells.has(newKey))cells.set(newKey,new Set());cells.get(newKey).add(closest);closest.cellKey=newKey;}
 }
 return groups;
}
