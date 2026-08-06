# 徒步薯 Taro 前端

`taro-app/` 是徒步薯当前微信小程序前端。产品范围、Goal 和架构以仓库根文档为准：

- [项目入口](../README.md)
- [当前 Goal](../GOAL.md)
- [产品需求](../docs/product-requirements.md)
- [架构契约](../docs/architecture.md)

本文件只记录当前子目录的可运行事实，不单独定义产品能力。

## 技术栈

- Taro 4.0.9
- React 18
- NutUI React Taro 3
- Webpack 5
- JavaScript / JSX Class Component（Goal M6 将按行为拆分状态和服务层）

## 当前命令

仓库尚未完成 M1 工程门禁和锁文件。在此之前：

```bash
npm install
npm run dev:weapp
npm run build:weapp
```

微信开发者工具应打开本目录；`project.config.json` 的 `miniprogramRoot` 指向 `dist/`。

## 配置

- `LLM_KEY`：`getAdvice` 云函数环境变量。
- `AMAP_KEY`：`getAdvice` 云函数环境变量。
- 云开发环境 ID 当前位于 `src/app.js`；不要提交真实生产凭据。外置配置需要独立 Issue。

## 目录

```text
taro-app/
├── config/                   # Taro 构建配置
├── src/
│   ├── app.js                # 云开发初始化
│   ├── pages/index/          # 当前单页流程
│   ├── styles/               # 主题与 NutUI 覆盖
│   └── assets/
├── babel.config.js
└── project.config.json
```

## 当前与目标契约

当前实现仍使用 `base/advice` 两阶段并由客户端回传 `baseData`。`TP-BETA-001` 将迁移到：

```text
prepare → confirmation | route_type_required | base | error
confirm → route_type_required | base | error
advice(queryId) → advice | error
```

在相关 Issues 合并前，不得把目标契约描述为已上线。

## 数据与隐私

Goal 的目标是只保留 openid 隔离的私人历史，并停用静默公共 UGC。当前旧云函数行为仍待 I19 修改；不要把它当作推荐使用方式，也不要在规划阶段执行数据删除或迁移。
