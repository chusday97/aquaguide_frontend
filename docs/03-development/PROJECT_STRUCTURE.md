# AquaGuide 项目结构

> 本文解释模块职责；完整文件树以仓库根目录 [PROJECT_STRUCTURE.md](../../PROJECT_STRUCTURE.md) 为维护入口。

```text
aquaguide_frontend/
├── docs/
│   ├── 01-definition/     产品定位、用户故事、竞品与现状
│   ├── 02-design/         信息架构、交互、设计、数据与 AI
│   ├── 03-development/    架构、结构、运行、QA 与日志入口
│   └── 04-planning/       产品卡点和路线图
├── server/                Express AI BFF
├── scripts/               契约、规则、审计与核心路径脚本
├── src/
│   ├── components/        导航、详情表面、任务流程与 3D
│   ├── data/              物种和养护静态数据
│   ├── lib/               AI、Supabase 等基础能力
│   ├── pages/             路由页面
│   ├── services/          本地状态与领域规则
│   ├── types/             领域类型
│   ├── App.tsx            路由和应用壳
│   └── index.css          全局设计令牌与样式
├── CONTRACT.md            代码契约来源
├── PROGRESS.md            当前进度和决策
└── package.json           命令与依赖
```

## 1. 页面与路由

| 模块 | 路由 | 页面职责 |
|---|---|---|
| 我的鱼缸 | `/aquarium` | 鱼缸、维护、巡检与缸内生物 |
| 图鉴 | `/encyclopedia` | 物种发现、种草与 Mini 混养 |
| 养护百科 | `/care` | 问题搜索、建议和文章 |
| 我的水族册首页 | `/collection` | 四个模块入口与数量摘要 |
| 种草图鉴 | `/collection/wishlist` | 收藏物种列表与详情 |
| 养护收藏 | `/collection/care` | 收藏文章列表与详情 |
| 生命纪念 | `/collection/memorial` | 离缸记录与复盘 |
| 成就勋章 | `/collection/achievements` | 自动追溯进度与下一步 |
| 3D 实验 | `/3d-demo` | 内部 3D 验证，不进入正式导航 |

## 2. 领域模块

| 领域 | 主要职责 | 事实来源 |
|---|---|---|
| 鱼缸状态 | 当前鱼缸、参数、生物与记录 | `appStateService` 与相关类型 |
| 物种 | 检索、展示图、饲养资料 | `species.service` 与静态数据 |
| 混养 | 物种组合与鱼缸环境判断 | 统一混养规则引擎 |
| 诊断 | 每日巡检、本地定级与记录 | diagnosis 服务与类型 |
| 收藏 | 种草和养护收藏 | favorites 服务与兼容键 |
| 水族册 | 聚合收藏、纪念与成就 | collection / achievement 服务 |
| AI | 任务契约、客户端与 BFF | `src/lib`、`server/`、`CONTRACT.md` |
| 3D | 场景、交互与纹理 | `ThreeAquarium` 及素材解析服务 |

## 3. 依赖方向

推荐方向为：页面/组件 → 共享业务动作 → 服务层 → 存储或规则引擎。组件不应直接新增 localStorage 写入。AI 输出必须回到契约过滤层，不能绕过本地规则直接写入业务结论。

## 4. 文档维护

- 路由、模块或目录变化时，同步更新本文件和根目录 `PROJECT_STRUCTURE.md`。
- 数据类型与 AI 契约变化时，先更新 `CONTRACT.md` 与类型定义，再更新设计文档。
- 产品状态变化时更新 `docs/01-definition/CURRENT_PRODUCT_STATUS.md` 和 `PROGRESS.md`。
- 功能完成后在 `40-DOCS/CHANGELOG.md` 的 `[Unreleased]` 下登记。
