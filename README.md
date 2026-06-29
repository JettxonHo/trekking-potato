# 徒步薯 (trekking-potato)

垂直于徒步领域的 AI 建议工具（微信小程序）。

用户输入路线/日期/天数/徒步水平，Agent 输出结构化建议（路书格式）。

## 文档
- [Spec](docs/Spec.md) — 产品需求与技术规范
- [Plan](docs/Plan.md) — 技术实现计划
- [Tasks](docs/Tasks.md) — 任务清单（goal 模式输入）

## 技术栈
- 前端：Taro 4 + React 18（编译为微信小程序）
- 后端：微信云开发（云函数 Node.js）
- LLM：智谱 GLM-4.7（含 response_format）
- 天气：Open-Meteo（含 elevation）
- 地理编码：高德 POI 搜索 + 内置路线表
- 天文：suncalc（纯 JS 离线计算）

## 测试
- 单元测试：`node scripts/unit-test.js`（27/27，无网络依赖）
- 本地 e2e：`node scripts/e2e-local.js`（47/47，真实 Open-Meteo，验证 geo→weather→sun→gear 全链路）
- 已知局限（均诚实标注，非隐藏）：逆温层温度偏差（elevationCaveat）、地形遮挡日出延迟（terrainCaveat）、5天后置信度递减

## 本地启动
1. cd taro-app && npm install && npm run build:weapp
2. 微信开发者工具打开 `taro-app/` 目录（加载 dist/）
2. 配置 AppID + 云开发环境
3. 云函数环境变量配置：`LLM_KEY`、`AMAP_KEY`（不在代码中硬编码）
4. 云函数部署：右键 cloudfunctions/getAdvice → 上传并部署

## 分支策略
- `main` 线上可用版本
- `dev` 日常开发
- `feat/*` `fix/*` 功能/修复分支

## 凭据安全
所有 API key 只存云函数环境变量，代码零硬编码。
提交前自检：`git diff --cached | grep -i "key\|token\|secret"` 无命中。
