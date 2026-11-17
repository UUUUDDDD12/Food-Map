# 食遇 Tasty · v1.1.0

[![版本 v1.1.0](https://img.shields.io/badge/version-v1.1.0-315c46)](https://github.com/JiaJie-cpu/Food-Map/releases/tag/v1.1.0) ![Windows x64](https://img.shields.io/badge/Windows-10%20%2F%2011%20x64-607c57) [![MIT](https://img.shields.io/badge/license-MIT-bd8048)](LICENSE)

以华北电力大学北京校区为起点的美食地图。侧栏筛选、地图聚合卡片、收藏和食记，都围绕“附近吃什么”展开。

## 下载使用

Windows 10 / 11 x64：在本仓库的 [Releases](https://github.com/JiaJie-cpu/Food-Map/releases/latest) 下载 `Tasty-1.1.0-windows-x64.zip`，完整解压后双击 **食遇.exe**。无需安装Node.js。不要把GitHub自动生成的“Source code”压缩包当作免安装版。

首次启动选择高德地图或备用地图。高德使用下载者自己的Web端（JS API）Key和安全密钥，可从侧栏齿轮进入“地图设置”修改。Key与安全密钥分别来自[高德开放平台](https://lbs.amap.com/api/javascript-api-v2/prerequisites)，密钥仅保存在本机，保存后返回地图即可应用。地图需要联网。

附带13,807家脱敏门店基础资料，首次启动写入自己的本地数据库。没有作者的密钥、收藏、评价或实拍上传文件。公开图片采用来源链接，不代表商家实时营业；数据与图片来源、使用说明见 [DATA_NOTICE.md](DATA_NOTICE.md)。

[下载 v1.1.0](https://github.com/JiaJie-cpu/Food-Map/releases/tag/v1.1.0) · [图文使用指南](docs/使用指南.md) · [版本更新记录](CHANGELOG.md)

![食遇美食地图](docs/images/map-overview.jpg)

## 功能

- 高德地图及备用底图；店名匹配自动填写地址和位置。
- 自助餐、火锅、烤肉等分类；距离、预算、口味及堂食/外卖筛选。
- 相近店铺聚合，卡片内滚动；收藏店默认展开。
- 店铺详情、多张图片、个人收藏和本机访客评价。
- SQLite可视化表格管理，可搜索、预览图片和编辑门店。

这是本机应用：不同下载者的数据各自独立，不提供公共账号、云同步或共享评价。只监听127.0.0.1，不需要开放公网端口。GitHub Pages不能直接运行这个Node后端。

## 从源码运行

需要Node.js 24或更新版本。

```sh
npm ci
npm test
npm run build
npm start
```

浏览器打开 http://localhost:3000，地图设置为 http://localhost:3000/settings。开发调试使用 `npm run dev`。

附带门店快照以starter-data/下的压缩分片保存，首次导入前校验SHA256。开发者可通过显式导出脚本重新生成公开快照；个人数据与公开快照分开。

实际数据库：`data/tasty.sqlite`；上传图片：`data/uploads/`；地图配置：`data/map-settings.json`。这些文件已经加入.gitignore，不要公开上传。也兼容根目录.env中的旧配置，但在设置页保存后的配置优先生效。

## 构建Windows免安装包

在Windows x64机器上执行：

```sh
npm ci
npm test
npm run package:windows
```

输出在 `release/`：完整运行目录、ZIP和SHA256文件。构建脚本下载固定版本的官方Node运行时并核验官方SHA256，编译带图标的启动器，内置Node和后端依赖；不使用机器上的个人数据库或地图凭据。构建后会对一次性副本执行真实启动检查。

启动后通过系统托盘菜单打开地图、进入设置或退出后台服务。备份数据前请先选择“退出食遇”。此便携版未签名，Windows可能显示发行者提示；请核对Release校验文件。

## 发布到GitHub

将本源码目录推送到新仓库。GitHub Actions中的“Windows release”支持手动运行，产物可从Actions下载。

首次将源码（包括package.json与工作流）推送到main，以及之后在main更新版本号，会自动构建并创建对应Release。也可以推送与package.json一致的版本标签：

```sh
git tag v1.1.0
git push origin v1.1.0
```

更新版本时先调整package.json和package-lock.json。GitHub无需配置作者的高德密钥，下载者在自己的设置页填写。

代码采用 [MIT](LICENSE)；第三方依赖、门店资料和图片各自保留原来源与许可。地图Logo、审图信息及来源署名保留。
