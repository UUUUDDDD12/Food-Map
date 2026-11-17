import {build as bundle} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,cpSync,readdirSync} from 'node:fs';
import {resolve,dirname,basename,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const outputIndex=process.argv.indexOf('--output');
const output=outputIndex>=0?resolve(process.argv[outputIndex+1]):resolve(project,'release');
const version=JSON.parse(readFileSync(resolve(project,'package.json'),'utf8')).version;
const nodeVersion='24.22.3';
if(process.platform!=='win32'||process.arch!=='x64')throw Error('Build this Windows x64 release on Windows x64.');
mkdirSync(output,{recursive:true});
const folder=resolve(output,`Tasty-${version}-windows-x64`);
if(existsSync(folder))throw Error('Release folder already exists. Choose a new empty --output directory.');
const system=resolve(folder,'系统文件'),app=resolve(system,'app'),runtime=resolve(system,'runtime');
mkdirSync(resolve(app,'server'),{recursive:true});mkdirSync(runtime,{recursive:true});
const vite=resolve(project,'node_modules/vite/bin/vite.js');
execFileSync(process.execPath,[vite,'build'],{cwd:project,stdio:'inherit',env:{...process.env,TASTY_COLLECTION_WORKER:'0'}});
const organized=basename(project)==='源码'&&basename(dirname(project))==='开发文件';
const dist=organized?resolve(project,'../../系统文件/app/dist'):resolve(project,'dist');
cpSync(dist,resolve(app,'dist'),{recursive:true});
if(!existsSync(resolve(project,'starter-data/restaurants.json'))&&!existsSync(resolve(project,'starter-data/manifest.json')))throw Error('Public starter data is missing.');
cpSync(resolve(project,'starter-data'),resolve(app,'starter-data'),{recursive:true});
// All server imports are bundled; sqlite is supplied by the bundled Node runtime.
await bundle({entryPoints:[resolve(project,'desktop/server-entry.js')],outfile:resolve(app,'server/main.cjs'),bundle:true,platform:'node',target:'node24',format:'cjs',define:{'import.meta.url':'__TASTY_MODULE_URL'},banner:{js:"var __TASTY_MODULE_URL = require('node:url').pathToFileURL(__filename).href;process.env.TASTY_APP_DIR ||= require('node:path').resolve(__dirname,'..');process.env.TASTY_ROOT ||= require('node:path').resolve(__dirname,'../..');process.env.TASTY_WORKSPACE ||= require('node:path').resolve(__dirname,'../../..');"},logLevel:'warning'});
writeFileSync(resolve(app,'package.json'),JSON.stringify({name:'tasty-desktop',version,private:true}));
const zipName=`node-v${nodeVersion}-win-x64.zip`,cache=resolve(process.env.TASTY_NODE_CACHE||resolve(output,'.build-cache'));mkdirSync(cache,{recursive:true});
const sums=await fetch(`https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`,{signal:AbortSignal.timeout(30000)}).then(r=>{if(!r.ok)throw Error('Cannot download Node checksums');return r.text();});
const expected=sums.split('\n').find(line=>line.trim().endsWith(' '+zipName))?.split(/\s+/)[0];if(!expected)throw Error('Official Node checksum is missing');
const zip=resolve(cache,zipName);
if(!existsSync(zip)){console.log('Downloading official Node '+nodeVersion);const response=await fetch(`https://nodejs.org/dist/v${nodeVersion}/${zipName}`,{signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error('Node download failed');writeFileSync(zip,Buffer.from(await response.arrayBuffer()));}
if(createHash('sha256').update(readFileSync(zip)).digest('hex')!==expected)throw Error('Node runtime checksum mismatch');
const extracted=resolve(cache,`node-v${nodeVersion}-win-x64`);
if(!existsSync(resolve(extracted,'node.exe')))execFileSync('powershell.exe',['-NoProfile','-Command','Expand-Archive -LiteralPath $env:TASTY_ZIP -DestinationPath $env:TASTY_CACHE -Force'],{env:{...process.env,TASTY_ZIP:zip,TASTY_CACHE:cache},stdio:'inherit'});
cpSync(resolve(extracted,'node.exe'),resolve(runtime,'node.exe'));cpSync(resolve(extracted,'LICENSE'),resolve(runtime,'NODE-LICENSE.txt'));
cpSync(resolve(project,'LICENSE'),resolve(folder,'LICENSE'));
cpSync(resolve(project,'DATA_NOTICE.md'),resolve(folder,'DATA_NOTICE.md'));
const notes=[];
const modules=resolve(project,'node_modules');
const packages=readdirSync(modules,{withFileTypes:true}).flatMap(entry=>entry.name.startsWith('@')?readdirSync(resolve(modules,entry.name)).map(name=>join(entry.name,name)):[entry.name]);
for(const name of packages){const root=resolve(modules,name);try{const info=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));const license=readdirSync(root).find(f=>/^(licen[sc]e|copying)(\.(txt|md))?$/i.test(f));if(license)notes.push(`\n===== ${info.name}@${info.version} =====\n${readFileSync(resolve(root,license),'utf8')}`);}catch{}}
writeFileSync(resolve(folder,'THIRD-PARTY-NOTICES.txt'),notes.join('\n'));
cpSync(resolve(project,'release-assets/用户说明.md'),resolve(folder,'使用说明.md'));
const compiler=resolve(process.env.WINDIR||'C:/Windows','Microsoft.NET/Framework64/v4.0.30319/csc.exe');
const numericVersion=version.split('-')[0];if(!/^\d+\.\d+\.\d+$/.test(numericVersion))throw Error('Package version must follow semver');
const assemblyInfo=resolve(cache,'AssemblyInfo.cs');writeFileSync(assemblyInfo,`using System.Reflection;\n[assembly:AssemblyTitle("食遇")]\n[assembly:AssemblyProduct("食遇 Tasty")]\n[assembly:AssemblyVersion("${numericVersion}.0")]\n[assembly:AssemblyFileVersion("${numericVersion}.0")]\n[assembly:AssemblyInformationalVersion("${version}")]\n`);
execFileSync(compiler,['/nologo','/codepage:65001','/target:winexe','/platform:x64','/optimize+','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Web.Extensions.dll','/win32icon:'+resolve(project,'desktop/tasty.ico'),'/out:'+resolve(folder,'食遇.exe'),resolve(project,'desktop/Launcher.cs'),assemblyInfo],{stdio:'inherit'});
// Smoke-test a disposable copy so the release never contains generated user state.
const checkRoot=resolve(cache,'smoke-'+Date.now());cpSync(folder,checkRoot,{recursive:true});
execFileSync(resolve(checkRoot,'食遇.exe'),['--smoke-test'],{timeout:30000});
const unsafe=[];
function scan(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const path=resolve(directory,entry.name);if(entry.isDirectory())scan(path);else if(/\.sqlite(?:-wal|-shm)?$|^\.env$|^(?:map-settings|ai-settings)\.json$|\.lnk$/.test(entry.name))unsafe.push(path);}}
scan(folder);if(unsafe.length)throw Error('Private data was unexpectedly included in release');
const releaseZip=folder+'.zip';
execFileSync('powershell.exe',['-NoProfile','-Command','Compress-Archive -LiteralPath $env:TASTY_RELEASE -DestinationPath $env:TASTY_OUTPUT -CompressionLevel Optimal'],{env:{...process.env,TASTY_RELEASE:folder,TASTY_OUTPUT:releaseZip},stdio:'inherit'});
const checksum=createHash('sha256').update(readFileSync(releaseZip)).digest('hex');
writeFileSync(releaseZip+'.sha256',checksum+'  '+basename(releaseZip)+'\n');
console.log(JSON.stringify({folder,zip:releaseZip,sha256:checksum,node:nodeVersion,privateData:false,smokeTest:'passed'},null,2));
