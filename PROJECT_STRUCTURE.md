# AquaGuide 项目结构

## 核心入口

- `src/App.tsx`：设备级应用壳、导航与路由。
- `src/components/layout/LayoutModeProvider.tsx`：真实设备布局判定。
- `src/pages/Aquarium.tsx`：我的鱼缸。
- `src/pages/Encyclopedia.tsx`：图鉴与完整混养计算。
- `src/pages/CareEncyclopedia.tsx`：养护百科与共享养护详情。
- `src/pages/Collection.tsx`：我的水族册，统一承载种草、养护收藏、生命纪念与成就勋章。

## 共享业务

- `src/services/favorites/`：物种与养护收藏的唯一读写入口。
- `src/services/analytics/`：只驻留当前会话的隐私安全事件白名单。
- `src/services/collection/`：水族册聚合读取与 8 枚派生成就计算。
- `src/services/collection/memorial.service.ts`：生命纪念校验、兼容存储写入与统一变更通知。
- `src/modules/collection/`：水族册页签、纪念条目与成就进度类型。
- `src/services/aquarium/`：鱼缸生物写入与复核。
- `src/services/aquarium/aquarium-state.service.ts`：鱼缸集合兼容存储、当前鱼缸校验与统一变更通知。
- `src/services/care/care-activity.service.ts`：提醒、完成操作与护理清单的旧键兼容写入。
- `src/services/compatibility/`：Mini 与完整混养的会话级选择传递。
- `src/services/diagnosis/`：巡检记录的同日更新策略。
- `src/modules/diagnosis/`：每日检查问题、确定性规则与数据类型。
- `src/lib/tankCompatibilityEngine.ts`：统一混养规则引擎。
- `src/lib/speciesVisual.ts`：二维与 3D 物种素材解析。
- `src/components/SpeciesDetailDialog.tsx`：共享物种详情。
- `src/components/common/AdaptiveDetailContent.tsx`：桌面中央详情弹窗与手机底部详情面板。
- `src/components/common/AdaptiveTaskContent.tsx`：桌面与手机的沉浸式任务流程表面。
- `src/components/ThreeAquarium.tsx`：3D 鱼缸。

## 文档与验证

- `docs/README.md`：当前产品文档总入口与事实来源说明。
- `docs/01-definition/`：PRD、用户故事、竞品分析与当前产品状态。
- `docs/02-design/`：信息架构、交互说明、设计系统、数据模型与 AI/API 边界。
- `docs/02-design/demos/`：养护详情 A/B/C 三套高保真方案与可复现原型。
- `docs/03-development/`：技术架构、模块结构、本地运行、QA 与日志入口。
- `docs/04-planning/PRODUCT_GAPS_AND_ROADMAP.md`：证据化卡点、优先级与迭代顺序。
- `docs/LAYOUT_FEATURE_PARITY.md`：手机/桌面功能对照。
- `scripts/`：规则、契约、素材与回归断言。
- `scripts/verify-core-experience.mjs`：设备布局、水族册、自适应详情、Mini、每日检查与 AI 建缸助手浏览器验收。
- `scripts/test-collection-achievements.ts`：水族册聚合与 8 枚勋章追溯断言。
- `scripts/test-memorial-service.ts`：日期/原因校验、旧键兼容和跨页面变更事件断言。
- `scripts/test-business-state-services.ts`：鱼缸、巡检与养护业务写入服务断言。
- `scripts/audit-product-actions.ts`：路由页面空操作、日志操作、原生 alert 与重复伪 CTA 审计。
- `CONTRACT.md`：每日检查与受控 AI 接口契约。
- `docs/01-definition/UX_REFACTOR_PRD.md`：本轮交互重构定义。
- `docs/02-design/UX_REFACTOR_CONCEPTS.md`：三套设计方向与默认自然水族册方案。
- `docs/02-design/UX_REFACTOR_INTERACTION.md`：分层表面与 CTA 契约。
- `docs/03-development/UX_REFACTOR_TECH.md`：实现架构与数据流。
- `PROGRESS.md`：项目内进度、决策与阻塞记录。

## 内部实验

- `src/pages/ThreeDemo.tsx` 与 `/3d-demo`：3D 独立验证入口，不进入正式导航和核心发布验收。
