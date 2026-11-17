# 食遇 v1.1.0

Windows 10 / 11 x64免安装版，完整解压后双击“食遇.exe”。首次启动可设置自己的高德Web端(JS API) Key和安全密钥，也可使用备用地图。

## 本版内容

- 内置Node.js 24.22.3，用户无需安装Node或依赖。
- 新增侧栏“地图设置”和首次配置引导；安全密钥仅保存在本机，保存后立即应用。
- 附带13,807家脱敏门店基础资料；不包含作者密钥、收藏、评价、上传照片及访客标识。
- 保留地图聚合、卡片滚动、收藏默认展开、分类/就餐方式/距离/预算筛选、图片和本机评价。
- 提供本机SQLite表格管理，支持查看和编辑门店。
- 系统托盘支持打开地图、进入设置和退出后台服务。

## 下载与说明

下载 `Tasty-1.1.0-windows-x64.zip`，不要使用GitHub自动生成的Source code压缩包作为免安装版。

- [图文使用指南](https://github.com/JiaJie-cpu/Food-Map/blob/main/docs/使用指南.md)
- [高德账号申请](https://lbs.amap.com/api/javascript-api-v2/prerequisites)
- [数据及图片来源说明](https://github.com/JiaJie-cpu/Food-Map/blob/main/DATA_NOTICE.md)

下载文件旁有SHA256校验文件。该版本未做商业代码签名，Windows可能显示发行者提示。

这是本机应用，不同电脑的数据独立保存，不提供云同步和公共评价。升级前先从托盘退出，并备份系统文件/data目录；不要用新包覆盖这份个人数据。
