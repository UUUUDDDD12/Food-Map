import { createApp } from './app.js';
import { openDb } from './db.js';
import express from 'express';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { projectRoot } from './paths.js';
import {initializeStarterData} from './starter-data.js';
const envFile=resolve(projectRoot,'.env');
if(existsSync(envFile))loadEnvFile(envFile);
const db=openDb();initializeStarterData(db);const app=createApp(db);
if(process.argv.includes('--production')){app.use(express.static(resolve('dist')));app.get('/{*path}',(_,res)=>res.sendFile(resolve('dist/index.html')));}else{const{createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
const port=Number(process.env.PORT)||3000;app.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Tasty is ready: http://localhost:${port}`));
