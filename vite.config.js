import { defineConfig } from 'vite';
import {resolve,basename,dirname} from 'node:path';
const organized=basename(process.cwd())==='源码'&&basename(dirname(process.cwd()))==='开发文件';
const input=process.env.TASTY_COLLECTION_WORKER==='1'?{main:resolve('index.html'),collection:resolve('collection-worker.html')}:{main:resolve('index.html')};
export default defineConfig({server:{host:'127.0.0.1'},build:{outDir:organized?resolve('../../系统文件/app/dist'):'dist',emptyOutDir:true,rollupOptions:{input}}});
