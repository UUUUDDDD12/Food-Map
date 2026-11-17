import { fileURLToPath } from 'node:url';
import { resolve, dirname,basename } from 'node:path';
// A clean GitHub checkout, the organized workspace and the portable app share this resolver.
export const appDirectory = process.env.TASTY_APP_DIR || resolve(dirname(fileURLToPath(import.meta.url)), '..');
const organized=(basename(appDirectory)==='源码'&&basename(dirname(appDirectory))==='开发文件')||(basename(appDirectory)==='app'&&basename(dirname(appDirectory))==='系统文件');
export const workspaceRoot = process.env.TASTY_WORKSPACE || (organized?resolve(appDirectory,'../..'):appDirectory);
export const projectRoot = process.env.TASTY_ROOT || (organized?resolve(workspaceRoot,'系统文件'):appDirectory);
export const dataDirectory = resolve(projectRoot, 'data');
export const archiveDirectory = resolve(workspaceRoot, '建设资料');
export const importsDirectory = resolve(archiveDirectory, '采集记录');
