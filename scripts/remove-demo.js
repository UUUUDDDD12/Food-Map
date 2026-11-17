import {openDb} from '../server/db.js';
import {dataDirectory} from '../server/paths.js';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const db=openDb(),count=db.prepare('SELECT COUNT(*) n FROM restaurants WHERE demo=1').get().n;
if(count){const directory=resolve(dataDirectory,'backups');mkdirSync(directory,{recursive:true});const backup=resolve(directory,'before-demo-removal-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');db.prepare('VACUUM INTO ?').run(backup);db.exec('BEGIN');try{db.exec('DELETE FROM reviews WHERE restaurant_id IN (SELECT id FROM restaurants WHERE demo=1);DELETE FROM favorites WHERE restaurant_id IN (SELECT id FROM restaurants WHERE demo=1);DELETE FROM restaurants WHERE demo=1;');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}console.log(JSON.stringify({removed:count,remaining:db.prepare('SELECT COUNT(*) n FROM restaurants').get().n,backup}));}else console.log('没有演示记录');db.close();
