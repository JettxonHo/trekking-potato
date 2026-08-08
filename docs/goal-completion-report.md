# TP-BETA-001 Goal 完成报告

- Goal: `TP-BETA-001`
- Review scope: I01–I25、替代任务 #77、相关父子 Issues、合并 PR、最终 `main` 门禁与长期文档
- Review baseline: `main@1bba5f9`
- Report status: `APPROVED`；两位独立 exact-head Review 均无 P0–P3，PR #111 merge 生效
- Verdict: `APPROVED_FOR_CODE_READY_CLOSED_BETA`，在本报告 PR 通过 latest-head quality、最终 Review 并合并后生效
- Boundary: 代码闭测就绪；不代表已部署、已连接生产 CloudBase、已完成真机验证或真实用户闭测

## 1. 最终结论

徒步薯已经实现本 Goal 定义的“徒步行前可行性检查工具”核心 Beta。五条经审阅社区轨迹与官方管理信息组成
可信路线目录；服务端使用多采样点小时天气与确定性规则输出 `go`、`caution`、`no_go` 或
`verdict=null`，AI 只在服务端可信 `queryId` 上异步解释，不能修改路线、天气、最低装备或最终结论。
私人历史、显式状态、竞态隔离和有界恢复流程均已纳入跨层验收。

最终产品、架构、数据、隐私、稳定性与 GitHub 审查未发现 Goal 内未披露的 P0/P1 缺陷。所有要求的本地
门禁通过；五试点跨层离线合同与 I24 证据包可复现。因此建议在本报告 PR 合并后关闭 #34 与 M7，并将
`TP-BETA-001` 标记为代码闭测就绪。部署、真实 API、真机与 5–10 名用户闭测必须作为新的、人工授权的
阶段执行。

## 2. 已完成的里程碑与功能

| 里程碑 | 结论 | 主要交付 |
|---|---|---|
| M1 工程门禁 | Complete | Node/npm 固定、锁文件、统一命令、CI、PR 保护 |
| M2 正确性 | Complete | 判别式响应、模糊确认、确定性安全合并 |
| M3 路线领域 | Complete | Place/Route/RouteVariant、五条 full 试点、五台禁行记录、永久 ID resolver |
| M4 天气与结论 | Complete | 多采样点小时窗口、TP-VERDICT-1、攀登支持/日落/数据不足语义 |
| M5 信任与隐私 | Complete | 服务端 queryId、TripContext、私人历史、公共 UGC 停用 |
| M6 核心交互 | Complete | 十状态流程、结构化结果、来源/装备/天气、竞态与恢复 |
| M7 验收 | Complete on report merge | structured adapter、五试点 Beta 验收、证据包、Goal 统一 Review |

最终用户流程为：搜索或确认可信路线 → 选择变体 → 输入日期、出发时间、能力与必要的攀登支持 →
立即查看确定性结论、逐日天气、最低装备和可信来源 → 异步查看 AI 补充 → 保存当前用户私人历史。
地点级查询和天气不足会诚实返回 `verdict=null`；官方禁行与独立新手技术攀登等硬条件可返回
`no_go`；AI 失败不移除确定性结果。

## 3. Issues 与 Pull Requests

- I01–I24、其父子 Issues 与替代任务 #77 已关闭；#51 被 #77 明确取代，不作为遗漏任务。
- I25/#34 是本报告的最后一个 Goal Issue，在报告 PR 合并前保持打开。
- TP-BETA-001 链路在本报告前已有 60 个合并 PR，且没有其他打开的 Goal PR。
- 关键合并链路：规划/治理 #9、工程与正确性 #35–#47、路线/天气/判定 #48–#59 与 #79–#89、
  可信上下文/隐私/状态 #62–#71、核心输入与结果 #90–#98、恢复 #101–#103、验收 #104、#108–#110。
- PR #38 起 GitHub `quality` 是合并门禁；#9、#35–#37 早于该工作流，不能追溯声称通过同一 CI。
- `main` 要求 PR 与严格 quality check，禁止 force push 和分支删除。项目使用 Sol 的独立实际 diff Review；
  GitHub 上没有把实现者自己的批准当作合并证据。
- 已关闭 Issue 正文保留当时的任务合同和状态检查点；最终状态、关闭时间与合并记录以 GitHub live metadata
  为准，不能把历史正文中的 `ACTIVE` 字样当成当前状态。

仓库另有 Goal 外维护任务 #83 与冲突中的 PR #84，用于删除历史原生小程序入口。它们没有 M7 里程碑，
不属于 TP-BETA-001，且不得把当前 `DIRTY` PR 机械并入最终报告。后续应重新基于最新 `main` 更新、独立
Review 后合并，或由人工明确关闭；当前代码与 README 仍将 `taro-app/` 作为唯一生产界面。

## 4. 最终测试、构建与证据

在 I25 基线与报告分支执行的要求如下；最终 PR 的 GitHub `quality` 是 latest-head CI 事实源。

| 验证 | 结果 |
|---|---|
| `node docs/evidence/i24/repeated-prepare-probe.js` | PASS；两次 prepare 生成不同 queryId 且可信路线身份稳定 |
| `npm run test:beta-acceptance` | PASS；五条试点及 place/blocked/insufficient/advice/history/recovery 矩阵 |
| `npm test` | PASS；route `91/0`、weather `86/0`、unit `55/0` 及全部根级合同 |
| `npm run test:integration` | PASS `55/0` |
| `npm run lint` | PASS；0 errors，9 个既有 warnings |
| `npm run typecheck` | PASS |
| `npm run build:weapp` | PASS；Taro 4.0.9 fixture-free 微信构建 |
| `git diff --check` | PASS |

I24 的清单、报告与自动化证据分别位于 `docs/beta-acceptance-checklist.md`、
`docs/beta-acceptance-report.md` 与 `docs/evidence/i24/`。I22 曾获得四张真实本地 DevTools 结果态截图，但
它们早于 I23，且使用说明性/已替代的 fixture 路线标签，只能证明当时的结构化结果页面状态，不能作为
当前五试点、恢复或历史交互的运行时证据。I24 R1–R3 因本地 Computer Use 报告 Mac 锁定而保持
`UNVERIFIED_RUNTIME_TOOL`；没有伪造截图，也没有把 CLI build 冒充 GUI、CloudBase 或真机证据。

旧 `test:integration` 仍是三路线的早期离线基线，不是最终五试点纵向证明；当前五条 RouteVariant 的
公共 `prepare/confirm → queryId → advice` 验收由 `test:beta-acceptance` 承担。

## 5. 关键产品与技术决策

- TP-D001/TP-D002：Goal 终点是代码闭测就绪；确定性规则决定结论，AI 只能解释。
- TP-D006/TP-D039：官方/运营方材料决定管理与禁行事实，经 Sol 审阅的社区 GPX/KML 提供实际轨迹几何。
- TP-D009：`queryId` 与 openid 绑定的服务端 TripContext 是 advice 的唯一可信上下文。
- TP-D028/TP-D029：天气按活动小时窗口聚合；硬阻断优先，数据完整性、攀登支持和日落独立表达。
- TP-D044/TP-D045：永久 ID resolver 先冻结，再原子切换公共输入、可信快照和过渡展示。
- TP-D046：边界明确实现只路由准确自定义 Agent `luna-worker`，Terra 回退失效。
- TP-D047/TP-D048：结构化结果与可信来源分层；历史幂等先于前端有界恢复。
- TP-D049：M7 拆为 structured adapter、五试点自动化验收和诚实的 DevTools 证据包。
- TP-D050：代码就绪与部署就绪分离；真实依赖、运行时和维护债务公开进入部署前门禁。

最终架构使用 Taro 页面 → 云函数公共契约 → 领域/规则纯模块 → 可信外部 API 的单向依赖。BaseData v2
包含结构化路线、天气、结论、装备、安全和来源；advice adapter 只投影有界解释上下文。TripContext v2
持久化与公开快照一致，私人历史按 openid 隔离并使用 saveAttemptId 提供顺序重试幂等。

## 6. 已解决的问题

- 模糊、前缀和重复别名不再静默确认；客户端只能用服务端 candidate ID。
- 客户端坐标、天气和旧 `baseData` 不再决定完整路线结论或 AI grounding。
- 多日路线按逐日路段、采样点和小时窗口请求天气，单位固定为 m/s 与 Asia/Shanghai。
- `verdict=null` 与天气危险分离；硬 no-go 可与数据不足并存，UI 不把二者互相覆盖。
- AI 无效、运输失败或恶意覆盖字段不能改变确定性事实；主结果先展示且可降级。
- 公共 UGC 路径停用，历史仅当前 openid 可见、可清空，并具备有界保存重试。
- 迟到响应、缓存恢复、天气重查、AI 重试和历史列表请求均有 token/authority 边界。
- 兼容 aliases 已从 BaseData/advice 清理，前端结果和历史由结构化字段派生。

## 7. 已知限制、风险与技术债务

### 代码就绪限制

- I24 DevTools R1–R3 未执行；当前五试点的取消后编辑、恢复、历史与 checklist 仍需正常构建的本地运行时验证。
- 未连接真实 CloudBase、Open-Meteo/高程/地图/LLM，未验证 openid 权限、环境配置、真实费用、限流或设备行为。
- 多数 full RouteVariant 的 `operationalStatus` 为 `unknown`；行前使用前仍需刷新官方开放/限制信息。
- 未部署、未发布、未迁移生产数据，也未邀请 5–10 名闭测用户。

### 依赖与安全债务

使用官方 npm registry 执行 `npm audit --omit=dev`：根依赖树为 0；`taro-app` 报 46 项（4 critical、
24 high）；`getAdvice` 与 `history` 各报 6 项（5 high、1 moderate）。已识别路径主要位于
Taro/NutUI 的 Swiper、CodeSandbox/axios，以及 `wx-server-sdk → @cloudbase/node-sdk` 的
axios/lodash 辅助包。项目没有直接导入这些底层包，最终审查也没有证明当前应用可利用的攻击路径，
因此不把所有传递告警机械升级为 Goal P0/P1；但部署前必须建立独立的可达性/升级 Issue，并在人工批准
Taro/SDK 变更后复测，而不能在 I25 运行 `npm audit fix`。

### 可维护性债务

- lint 仍有 9 个既有 warning；前端 `index.jsx` 体积较大，后续可在行为冻结后按模块拆分。
- `redteam-audit.js`、`deep-audit.js` 与 `test-glm-json.js` 仍依赖退役的漏洞/Prompt/GLM 预期，当前不是
  权威门禁，应单独归档、删除或重写。
- npm 10 固定与 NutUI 可选依赖安装行为需要持续记录；不要无计划升级 Taro 大版本。
- 历史 saveAttemptId 只保证当前顺序重试幂等，不是数据库级并发唯一约束。
- CloudBase 环境 ID 仍需在部署阶段外部化；TripContext v1→v2 上线需约 30 分钟 drain/cutover，并复核
  context/history 的索引、留存与清理策略。
- #83/#84 的历史原生入口清理与部分父子 Issue 原生关联缺失属于 Goal 外可维护性/可追踪性债务。

## 8. 部署前必须完成的后续工作

1. 新建依赖可达性与升级 Issue，评估 Taro/NutUI/wx-server-sdk 的安全升级路径并跑完整回归。
2. 在正常、无 fixture 的微信开发者工具中补完 R1–R3：当前五试点、取消后编辑、天气/AI/历史恢复、
   checklist 与来源/状态展示；记录少量代表证据。
3. 建立单独授权的 staging CloudBase，配置 AppID、环境变量和 secrets，验证 openid/权限、真实 API、
   LLM 费用/失败和 query context 行为。
4. 上线前刷新五条路线的官方管理与开放状态，执行 v1 context drain、索引/留存检查和回滚演练。
5. 完成至少一轮微信真机 smoke test，再启动 5–10 名目标用户的真实闭测与反馈收集。
6. 重新基于最新 main 处理 #83/#84，并清理失效审计脚本、lint warnings 与前端模块债务。

## 9. 最终验收建议

`APPROVED_FOR_CODE_READY_CLOSED_BETA`：本报告 PR 合并后，TP-BETA-001 满足其全部代码层完成标准，可
关闭 #34 与 M7，并进入一个新的、由人工单独批准的部署验证阶段。

`NOT_APPROVED_FOR_DEPLOYMENT_OR_REAL_BETA`：在第 8 节门禁完成前，不建议配置生产环境、发布小程序、
迁移数据或招募真实闭测用户。该限制不是 Goal 失败，而是本 Goal 从一开始就明确的交付边界。
