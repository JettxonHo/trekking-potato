# 徒步薯 (Trekking Potato)

徒步行前建议工具（微信小程序）。输入路线名 + 出发日期 + 徒步天数 + 能力等级，AI 生成结构化建议：天气窗口、装备清单、风险提示、晨昏光影时刻。

> 大自然没给你带说明书，薯仔带了。

## 文档
- [Spec](docs/Spec.md) — 产品需求与技术规范
- [Plan](docs/Plan.md) — 技术实现计划
- [Tasks](docs/Tasks.md) — 任务清单

## 技术栈
- **前端**：Taro 4 + React 18 + NutUI（编译为微信小程序）
- **后端**：微信云开发（云函数 Node.js）
- **LLM**：DeepSeek（OpenAI 兼容格式，response_format: json_object）
- **天气**：Open-Meteo Forecast API（免费，含海拔修正）
- **地理编码**：175 条内置路线 + UGC 共创库 + 高德 POI 搜索 + 手动坐标兜底
- **天文**：suncalc（纯 JS 离线计算，手动 UTC+8）
- **数据库**：微信云数据库（MongoDB，openId 自动隔离）

## 核心架构

### 两阶段加载（规避微信云函数 20s 硬超时）
```
阶段1 base（3-5s）: resolveLocation → Promise.all[weather, sun] → 前端立即渲染天气
阶段2 advice（5-10s）: baseData → DeepSeek LLM → Schema 校验 → 增量更新装备/风险
```

### 三级降级链
- LLM 正常 → 使用 AI 生成结果
- LLM 超时 → 规则引擎兜底（gear-rules.js，季节×海拔×天数×纬度四维矩阵）
- 规则引擎缺失 → 空降级标红（`degraded: true` + 风险栏标注"AI 不可用"）

### LEVEL 动态注入（防 LLM 幻觉）
JS 层根据能力等级拼接唯一约束段，不在 prompt 里堆 if-else 条件分支。

### UGC 路线共创（地理围栏去重）
用户手动输入坐标后自动落库。Haversine 距离 <1km 判定同一目的地（追加 alias），>5km 同名异地自动追加地区后缀。

## 云函数
| 函数 | 功能 |
|------|------|
| `getAdvice` | 核心建议引擎（两阶段加载 + 三级降级 + LLM 生成） |
| `history` | 历史记录持久化（openId 隔离）+ UGC 路线共创（地理围栏去重） |

### 环境变量（云函数控制台配置，不硬编码）
| 变量 | 说明 |
|------|------|
| `LLM_KEY` | DeepSeek API Key |
| `AMAP_KEY` | 高德地图 API Key |

### 数据库集合（微信控制台手动创建）
| 集合 | 权限 | 说明 |
|------|------|------|
| `history` | 仅创建者可读写 | 查询历史记录 |
| `routes` | 所有用户可读，仅创建者可写 | UGC 共创路线库 |

## 本地启动
```bash
cd taro-app && npm install && npm run build:weapp
```
1. 微信开发者工具打开 `taro-app/`（加载 `dist/`）
2. 配置 AppID + 云开发环境
3. 云函数环境变量：`LLM_KEY`、`AMAP_KEY`
4. 部署云函数：右键 `cloudfunctions/getAdvice` 和 `cloudfunctions/history` → 上传并部署
5. 基础库建议设为 **3.10.3**（非灰度版本）

## 测试
- 单元测试：`node scripts/unit-test.js`（27/27，无网络依赖）
- 路线匹配、装备规则、坐标转换、边界海拔等

## 防御性设计
- GCJ-02 → WGS84 坐标转换（高德 POI 偏移 100-600m，不转换会导致海拔查到隔壁山谷）
- 温度 `floor(min)` / `ceil(max)`（规避 round 导致的零温差 Bug）
- 海拔 0 falsy 防御（`elev != null` 替代 `elev ?`）
- iOS Date 安全构造（`split('-')` + `new Date(y, m-1, d)`）
- 编辑距离匹配仅对 ≥4 字查询启用（防"雪宝顶"匹配"船底顶"）

## 凭据安全
所有 API key 只存云函数环境变量，代码零硬编码。

## 版本
当前：**v0.10.0**（175 条内置路线 + UGC 共创 + 历史持久化 + 天气精简 + LEVEL 动态注入）

Tags：`v0.1-spec` → `v0.10.0`（Conventional Commits + 语义化 Tag）
