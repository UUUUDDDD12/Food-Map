import {openDb} from '../server/db.js';
import {projectRoot,dataDirectory,importsDirectory,archiveDirectory} from '../server/paths.js';
import {geoDistance} from '../server/poi-import.js';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const db=openDb(),checkpoint=JSON.parse(readFileSync(resolve(importsDirectory,'collection-checkpoint.json'),'utf8'));
const budget=db.prepare('SELECT * FROM collection_budget WHERE id=1').get();
const rows=db.prepare('SELECT name,category,lat,lng,gcj_lat,gcj_lng,image,demo FROM restaurants').all();
const real=rows.filter(r=>!r.demo),withPhotos=real.filter(r=>r.image).length;
const galleries=db.prepare('SELECT COUNT(*) n,COUNT(DISTINCT restaurant_id) shops FROM restaurant_photos').get();
const webReports=['web-photo-report.json','web-photo-retry-report.json'].map(name=>resolve(importsDirectory,name)).filter(existsSync).map(path=>JSON.parse(readFileSync(path,'utf8')));
const webPhotos=webReports.reduce((sum,r)=>sum+r.photos,0);
const malls=(checkpoint.landmarks||[]).filter(l=>l.name!=='北京朝阳合生汇');
const stats=malls.map(l=>{const nearby=real.filter(r=>Number.isFinite(r.gcj_lat)&&geoDistance([l.lat,l.lng],[r.gcj_lat,r.gcj_lng])<=2200);return `| ${l.name} | ${l.address} | ${nearby.length} |`;}).join('\n');
const categories=[...new Set(real.map(r=>r.category))].map(category=>`| ${category} | ${real.filter(r=>r.category===category).length} |`).join('\n');
const summary={at:new Date().toISOString(),total:real.length,added:real.length-7966,with_photos:withPhotos,gallery_photos:galleries.n,gallery_shops:galleries.shops,web_photos_added:webPhotos,requests:budget.consumed,estimated_remaining:budget.monthly_limit-budget.start_used-budget.consumed,state:budget.state,landmarks:malls};
writeFileSync(resolve(importsDirectory,'collection-summary.json'),JSON.stringify(summary,null,2));
const text=`# 华电周边商圈与向外扩展的真实门店数据

统计时间：${summary.at}。本轮状态：${budget.state}。

数据库共有 **${real.length.toLocaleString('en-US')} 家**非演示门店，本轮相对原有 7,966 家增加 **${summary.added.toLocaleString('en-US')} 家**。演示数据 ${rows.filter(r=>r.demo).length} 条。

有主图的门店 ${withPhotos.toLocaleString('en-US')} 家；另存可切换照片 ${galleries.n.toLocaleString('en-US')} 张，涉及 ${galleries.shops} 家店。公开餐厅网页补入 ${webPhotos} 张照片，匹配同时检查名称与位置，未把其他分店的图直接套用。高德结果用于其余补充；配图不标注未经证实的门头、店面类别，也不显示“未核验”角标。照片网址来自外部来源，可能失效。

已定位柳州肥姨妈大骨螺蛳粉回龙观店（琥珀天地一层85号1层102B）及霍营店（回龙观东大街5号楼1层103-2）。

## 本轮检索范围

优先大学周边商圈，再分圈向外扩展。重点自助餐、火锅、烤肉、海鲜、烤鸭、牛排及中西餐，补查东北菜、江浙菜等。数据库与地图不再强制限定20km，地图默认“不限距离”，可自行调整滑块。

以下为已定位检索中心，数量统计其2.2km内数据库已有门店，各区域有重叠，不能相加，也不等于该商场内门店数。

| 商圈／检索中心 | 定位地址 | 周边记录 |
| --- | --- | ---: |
${stats}

公开检索无法保证“所有营业门店”无遗漏。结果有时包含连锁品牌图或旧信息，营业情况与价格以商家实际为准。没有编造平台用户评价；未知口味和就餐方式仍留空。

## 额度保护

用户提供本月已用539次；按个人认证基础搜索月额度5000次计算。本轮代理累计转发 **${budget.consumed} 次**，上限 ${budget.max_requests} 次；估计剩余 **${summary.estimated_remaining} 次**。这是依据用户给定基线与本机请求计数估算，未读取控制台实时余额，其他应用使用同一账号会另外消耗额度。

计数持久化在 collection_budget 表，失败请求也计入；达到上限不再转发。任务结束后关闭批量周边入口，保留用户新增店铺时的主动关键词匹配。参考：[高德当前基础服务计费说明](https://lbs.amap.com/pages/base_service_price)。

## 分类统计

| 分类 | 门店数 |
| --- | ---: |
${categories}

## 来源与记录

- [高德地点搜索](https://lbs.amap.com/api/javascript-api-v2/guide/services/search)：保留地点ID、原始GCJ02坐标，并离线转换WGS84用于距离计算；按地点ID去重，不覆盖人工修改的名称、口味与就餐方式。
- [Trip.com公开餐厅目录](https://www.trip.com/restaurant/beijing-1/?nearbyDistrictIds=38786298)：照片原网页与网址保存在 restaurant_photos，详细结果在 建设资料/采集记录/web-photo-report.json 及 web-photo-retry-report.json。
- [昌平超极合生汇官方介绍](https://www.crehopson.cn/mobile/business.aspx?id=350&type=11)：用于排查同名商圈定位，另有朝阳合生汇的外扩结果，不冒充昌平商圈。
- 先前从[大众点评公开照片页](https://www.dianping.com/shop/H4NNPSBblYjGncZT/photos?pg=2)、[回龙观社区网](https://guide.hlgnet.com/list/meishi/)取得的线索继续保留。美团、淘宝闪购、点评部分页面受超时或身份验证限制，没有绕过限制或宣称已完整抓取。
- 建设资料/采集记录/collection-checkpoint.json 保存检索队列、已见地点及过程统计，可检查遗漏与中断位置。数据库管理页直接读取本次更新后的 系统文件/data/tasty.sqlite。
`;
writeFileSync(resolve(archiveDirectory,'文档','真实门店数据记录.md'),text);console.log(JSON.stringify(summary));db.close();
