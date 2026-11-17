import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cardCandidates,placeCards,clampCard,leaderPath,rowHeight,CARD_HEADER} from '../src/map-cards.js';
test('同点多个收藏独立展开，普通店保留在滚动卡片中，关闭单店互不影响',()=>{
 const members=Array.from({length:7},(_,i)=>({id:i+1,favorite:i<2,checkins:[]})),group={key:'1',x:500,y:400,members},points=members.map(r=>({r,p:{x:500+r.id,y:400}}));
 const initial=cardCandidates([group],points);assert.deepEqual(initial.map(c=>c.members.map(r=>r.id)),[[1],[2]]);assert.equal(initial[0].point.x,501);
 const open=cardCandidates([group],points,{clusterIds:[1,2,3,4,5,6,7]});assert.deepEqual(open.map(c=>c.members.map(r=>r.id)),[[1],[2],[3,4,5,6,7]]);
 assert.equal(new Set(open.flatMap(c=>c.members.map(r=>r.id))).size,7);
 const closed=cardCandidates([group],points,{collapsedCards:new Set([1])});assert.deepEqual(closed.map(c=>c.id),['shop:2']);
});
test('双店视窗、不同高度卡片避让，边界拖动约束与引线端点更新',()=>{
 const members=Array.from({length:5},(_,i)=>({id:i+1,favorite:i<3,checkins:[]})),g={key:'1',x:500,y:400,members};
 const candidates=cardCandidates([g],members.map(r=>({r,p:{x:500,y:400}})),{clusterIds:members.map(r=>r.id)});
 const size={x:1120,y:900},cards=placeCards(candidates,size);assert.equal(cards.length,4);const stack=cards.find(c=>c.id.startsWith('stack:'));assert.equal(stack.card.h,CARD_HEADER+2*rowHeight(members[3]));
 for(const {card:c}of cards){assert.ok(c.x>=12&&c.y>=12&&c.x+c.w<=size.x-12&&c.y+c.h<=size.y-64);for(const {card:o}of cards)if(o!==c)assert.equal(c.x<o.x+o.w&&c.x+c.w>o.x&&c.y<o.y+o.h&&c.y+c.h>o.y,false);}
 const moved=clampCard({...cards[0].card,x:-1000,y:9999},size);assert.equal(moved.x,12);assert.equal(moved.y,size.y-moved.h-64);assert.notEqual(leaderPath(cards[0]),leaderPath({...cards[0],card:moved}));
});
test('手机默认卡片不遮住聚合入口，多卡可装下时分列排开',()=>{
 const members=Array.from({length:7},(_,i)=>({id:i+1,favorite:i<2,checkins:[]})),g={key:'1',x:195,y:422,members},points=members.map(r=>({r,p:{x:195,y:422}})),size={x:390,y:844};
 for(const {card:c}of placeCards(cardCandidates([g],points),size))assert.equal(g.x>=c.x&&g.x<=c.x+c.w&&g.y>=c.y&&g.y<=c.y+c.h,false);
 const cards=placeCards(cardCandidates([g],points,{clusterIds:members.map(r=>r.id)}),size);assert.equal(cards.length,3);for(const a of cards)for(const b of cards)if(a!==b)assert.equal(a.card.x<b.card.x+b.card.w&&a.card.x+a.card.w>b.card.x&&a.card.y<b.card.y+b.card.h&&a.card.y+a.card.h>b.card.y,false);
});
