import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { seeds } from './seed.js';
import { dataDirectory } from './paths.js';
export function openDb(path=process.env.DB_PATH || resolve(dataDirectory,'tasty.sqlite'),{seedDemo=false}={}) {
 if(path!==':memory:') mkdirSync(resolve(path,'..'),{recursive:true});
 const db=new DatabaseSync(path); db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS restaurants(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,specialties TEXT NOT NULL DEFAULT '',taste TEXT NOT NULL DEFAULT '未知',price REAL,lat REAL NOT NULL,lng REAL NOT NULL,address TEXT NOT NULL,description TEXT NOT NULL,image TEXT NOT NULL DEFAULT '',source TEXT NOT NULL,demo INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY,restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),session_id TEXT NOT NULL,author TEXT NOT NULL,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),body TEXT NOT NULL,image TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS favorites(session_id TEXT NOT NULL,restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),PRIMARY KEY(session_id,restaurant_id));
 CREATE INDEX IF NOT EXISTS reviews_restaurant ON reviews(restaurant_id);
 CREATE TABLE IF NOT EXISTS checkins(id INTEGER PRIMARY KEY,restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),session_id TEXT NOT NULL,visited_on TEXT NOT NULL,rating INTEGER CHECK(rating IS NULL OR rating BETWEEN 1 AND 3),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE INDEX IF NOT EXISTS checkins_owner_restaurant ON checkins(session_id,restaurant_id,id DESC);
 CREATE TABLE IF NOT EXISTS restaurant_photos(restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),url TEXT NOT NULL,source_url TEXT NOT NULL,fetched_at TEXT NOT NULL,PRIMARY KEY(restaurant_id,url));
 CREATE TABLE IF NOT EXISTS discoveries(source_url TEXT PRIMARY KEY,name TEXT NOT NULL,address TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT '待定位',matched_id INTEGER REFERENCES restaurants(id),collected_at TEXT NOT NULL);`);
 const fields=new Set(db.prepare('PRAGMA table_info(restaurants)').all().map(c=>c.name));
 for(const[name,type]of Object.entries({service_mode:"TEXT NOT NULL DEFAULT ''",service_evidence:"TEXT NOT NULL DEFAULT ''",provider_id:'TEXT',gcj_lat:'REAL',gcj_lng:'REAL',provider_type:"TEXT NOT NULL DEFAULT ''",phone:"TEXT NOT NULL DEFAULT ''",source_updated_at:"TEXT NOT NULL DEFAULT ''"})){if(!fields.has(name))db.exec(`ALTER TABLE restaurants ADD COLUMN ${name} ${type}`);}
 db.exec('CREATE UNIQUE INDEX IF NOT EXISTS restaurant_provider_id ON restaurants(provider_id)');
 if(seedDemo&&!db.prepare('SELECT count(*) AS n FROM restaurants').get().n){const insert=db.prepare('INSERT INTO restaurants(name,category,specialties,taste,price,lat,lng,address,image,description,source,demo) VALUES(?,?,?,?,?,?,?,?,?,?,?,1)'); for(const row of seeds)insert.run(...row,'演示数据 · 非真实门店');}
 return db;
}
