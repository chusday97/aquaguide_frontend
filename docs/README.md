# AquaGuide 产品文档索引

> 最后核对：2026-07-14。当前代码、真实浏览器行为和自动测试优先于旧报告或历史对话。

## 产品定位

> 面向水族新手的鱼缸管理、物种选择、混养决策与养护补救助手。

AquaGuide 以“先用确定性规则给出安全边界，再由 AI 解释”为核心原则，帮助用户把查资料、判断能否混养、记录日常异常和执行补救步骤串成一条短路径。

## 阅读入口

| 读者 | 建议顺序 |
| --- | --- |
| 产品与设计 | [PRD](./01-definition/PRD.md) → [当前状态](./01-definition/CURRENT_PRODUCT_STATUS.md) → [信息架构](./02-design/INFORMATION_ARCHITECTURE.md) → [交互规范](./02-design/INTERACTION_SPEC.md) → [路线图](./04-planning/PRODUCT_GAPS_AND_ROADMAP.md) |
| 开发 | [技术架构](./03-development/TECH_ARCHITECTURE.md) → [项目结构](./03-development/PROJECT_STRUCTURE.md) → [数据模型](./02-design/DATA_MODEL.md) → [AI 与 API](./02-design/AI_AND_API_SPEC.md) |
| 测试与验收 | [用户故事](./01-definition/USER_STORIES.md) → [QA 验收](./03-development/QA_ACCEPTANCE.md) → [交付检查](./delivery-checklist.md) |
| 新成员 | [项目 README](../README.md) → 本页 → [本地配置](./03-development/SETUP.md) |

## 文档地图

### 01 产品定义

- [PRD](./01-definition/PRD.md)：用户、问题、目标、功能优先级和成功指标。
- [用户故事](./01-definition/USER_STORIES.md)：核心场景及验收口径。
- [竞品分析](./01-definition/COMPETITIVE_ANALYSIS.md)：当前市场能力对比与差异化机会。
- [当前产品状态](./01-definition/CURRENT_PRODUCT_STATUS.md)：已完成、部分完成、实验中和延后项。
- [交互重构 PRD（专项）](./01-definition/UX_REFACTOR_PRD.md)：水族册和分层表面的历史专项定义。

### 02 设计

- [信息架构](./02-design/INFORMATION_ARCHITECTURE.md)
- [交互规范](./02-design/INTERACTION_SPEC.md)
- [正式用户路径登记](./02-design/USER_PATH_REGISTRY.md)
- [设计系统](./02-design/DESIGN_SYSTEM.md)
- [数据模型](./02-design/DATA_MODEL.md)
- [AI 与 API](./02-design/AI_AND_API_SPEC.md)

### 03 开发与验收

- [技术架构](./03-development/TECH_ARCHITECTURE.md)
- [项目结构](./03-development/PROJECT_STRUCTURE.md)
- [本地配置](./03-development/SETUP.md)
- [QA 验收](./03-development/QA_ACCEPTANCE.md)
- [变更记录入口](./03-development/CHANGELOG.md)

### 04 计划

- [产品卡点与路线图](./04-planning/PRODUCT_GAPS_AND_ROADMAP.md)
- [3D、物种数据与图片性能基线](./04-planning/THREE_AND_ASSET_PERFORMANCE_BASELINE.md)
- [云同步方案评估](./04-planning/CLOUD_SYNC_EVALUATION.md)（只评估，不实施）

## 单一事实来源

| 内容 | 事实来源 | 维护规则 |
| --- | --- | --- |
| 产品目标与范围 | `docs/01-definition/PRD.md` | 方向或优先级变化时更新 |
| 交互行为 | `docs/02-design/INTERACTION_SPEC.md` + 工作区 `interaction-rules.md` | 新交互或踩坑时同步 |
| 数据和 AI 契约 | [`CONTRACT.md`](../CONTRACT.md) + 类型文件 | 先改契约，再改实现和说明 |
| 当前进度 | [`PROGRESS.md`](../PROGRESS.md) | 每个独立步骤完成后更新 |
| 项目结构 | [`PROJECT_STRUCTURE.md`](../PROJECT_STRUCTURE.md) | 新增、删除或移动模块时更新 |
| 变更记录 | [`40-DOCS/CHANGELOG.md`](../40-DOCS/CHANGELOG.md) | 功能、修复和移除实时追加 |

## 历史审计说明

`aquaguide_functional_analysis.md`、`interaction_review.md`、`UX_NAVIGATION_AUDIT.md` 等文件保留作为阶段性证据。前两份报告包含天气联动、旧弹窗和旧架构判断，不再代表当前产品能力；当前事实以本索引链接的正式分册为准。
