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
- LLM：DeepSeek V4-flash含 response_format）
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

## P8.2 建议质量验证记录（2026-06-29）

真机测试通过，以下为 review 结果：

### 武功山（1918m, 夏季低海拔南方）
- 天气：7天降水100%，13-18°C，标注 elevationCaveat（逆温层）+ precipNote（GFS验证度低）
- 装备：防雨冲锋衣（针对降水100%）、避免金属装备（雷暴）、备用袜子（雨天湿脚）— 针对性好
- 风险：雷暴（致命，含具体避险方法）、失温（高）、滑坠（中）、迷路（中）— 分级合理
- 遗漏型错误：无

### 四姑娘山二峰（5276m, 夏季高海拔）
- 装备：冰爪、结组绳、头盔、安全带、乙酰唑胺、急救毯、保暖中层 — 技术装备齐全
- 风险：高反（致命，建议下撤）、滑坠（致命，技术装备）、失温（致命）、雷暴（致命）、落石（高）— 覆盖全面
- 海拔修正：温度 2.7°C~-7.3°C，明显低于网格点 — 海拔修正生效
- 遗漏型错误：无（致命装备齐全）

### 数据局限诚实标注清单
- elevationCaveat（逆温层温度偏差）✓ 前端渲染
- terrainCaveat（地形遮挡日出延迟）✓ 前端渲染
- confidence（5天后标"参考"）✓ 前端渲染
- dateOutOfRange（超出16天预报）✓ 前端渲染
- precipNote（GFS中国区域验证度低）✓ 数据含字段
