import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {CollectionBudget} from '../server/collection-budget.js';
test('按已用539严格计数，最多3300次并保留至少1000，不能重置绕过',()=>{
 const db=new DatabaseSync(':memory:'),budget=new CollectionBudget(db);assert.equal(budget.take(),false);
 assert.equal(budget.start({used:539}).max_requests,3300);
 for(let i=0;i<3300;i++)assert.equal(budget.take(),true);assert.equal(budget.take(),false);
 assert.equal(budget.status().consumed,3300);assert.equal(5000-539-budget.status().consumed,1161);
 budget.finish('budget_limit');assert.throws(()=>budget.start({used:539}));assert.throws(()=>budget.start({used:4900}));db.close();
});
