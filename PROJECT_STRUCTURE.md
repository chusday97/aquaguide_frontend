# AquaGuide 项目结构

## 核心入口

- `apps/api/`：Express TypeScript 业务 API 入口、统一错误、Supabase 客户端、鉴权和版本化路由。
- `apps/api/src/routes/admin.ts`：受管理员权限保护的物种、养护文章、发布状态与版本化图片处理接口。
- `apps/web/`：Web workspace 边界；现有 React 源码在云端 Repository 接入完成前继续保留根目录。
- `packages/contracts/`：API 请求、响应、分页、错误码和公开内容 DTO。
- `packages/contracts/src/content-admin.ts`：内容编辑、状态切换和素材上传的服务端校验契约。
- `packages/contracts/src/localization.ts`：中英文语言、偏好、回退元数据、审核与覆盖率契约。
- `packages/contracts/src/species-diagnosis.ts`：视觉候选、匿名未命中、受控观察、动态追问与原因排序契约。
- `packages/domain-rules/`：跨前后端共享的确定性规则类型与安全不变量。
- `supabase/migrations/`：PostgreSQL 表、索引、RLS、触发器和 Storage 策略。
- `supabase/migrations/202607160002_localization.sql`：四张翻译表、审核字段、索引与公开/管理员 RLS。
- `supabase/migrations/202607180001_species_recognition.sql`：只允许后端聚合写入的匿名识别未命中表。

- `src/App.tsx`：设备级应用壳、导航与路由。
- `src/i18n/`：i18next 初始化、浏览器语言检测和本地偏好保存。
- `src/components/settings/`：共享设置状态与桌面/手机语言选择面板。
- `src/components/visual-results/`：混养、物种适配、巡检与养护自查共用的视觉结果卡、展示模型和规则适配器。
- `src/components/layout/LayoutModeProvider.tsx`：真实设备布局判定。
- `src/pages/Aquarium.tsx`：我的鱼缸。
- `src/pages/Encyclopedia.tsx`：图鉴与完整混养计算。
- `src/pages/CareEncyclopedia.tsx`：养护百科与共享养护详情。
- `src/pages/CollectionHub.tsx`：水族册模块首页，只展示四张大模块卡与数量。
- `src/pages/Collection.tsx`：四个独立水族册模块的列表、详情与空状态。
- `src/pages/AdminContent.tsx`：受管理员权限保护的独立内容后台页面，不进入普通用户导航。
- `src/components/common/RouteErrorBoundary.tsx`：核心路由隔离、友好重试、会话诊断复制与坏数据恢复提示。
- `src/components/common/ResilientImage.tsx`：图片骨架、单次重试与本地占位兜底。
- `src/services/diagnostics/`：`chunk / render / image / data` 会话级失败分类与脱敏诊断。
- `public/responsive/`：物种 256/768px 与养护 480/960px WebP 衍生资源；原图继续保留。

## 共享业务

- `src/services/favorites/`：物种与养护收藏的唯一读写入口。
- `src/services/api/`：携带 Supabase JWT、幂等键和结构化错误的版本化 API 客户端。
- `src/services/admin/content-admin.service.ts`：内容后台唯一 API 访问层，封装 CRUD、发布状态与原始图片上传。
- `src/services/repository/`：游客本地与登录云端两种 Repository 实现；页面后续只依赖统一接口。
- `src/services/analytics/`：只驻留当前会话的隐私安全事件白名单。
- `src/services/collection/`：水族册聚合读取与 8 枚派生成就计算。
- `src/services/collection/memorial.service.ts`：生命纪念校验、兼容存储写入与统一变更通知。
- `src/modules/collection/`：水族册模块、纪念条目与成就进度类型。
- `src/services/aquarium/`：鱼缸生物写入与复核。
- `src/services/aquarium/aquarium-state.service.ts`：鱼缸集合兼容存储、当前鱼缸校验与统一变更通知。
- `src/services/care/care-activity.service.ts`：应用内养护计划、完成操作与护理清单的旧键兼容写入。
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

- `.project-journal/`：按工作区证据规则维护可追溯事件、证据索引、事实卡和证据缺口；职业材料仅使用 verified 结论。
- `docs/README.md`：当前产品文档总入口与事实来源说明。
- `docs/01-definition/`：PRD、用户故事、竞品分析与当前产品状态。
- `docs/02-design/`：信息架构、交互说明、设计系统、数据模型与 AI/API 边界。
- `docs/02-design/USER_PATH_REGISTRY.md`：正式入口、三步上限、返回上下文与空状态登记。
- `docs/02-design/demos/`：养护详情 A/B/C 三套桌面与手机高保真方案及可复现原型。
- `docs/03-development/`：技术架构、模块结构、本地运行、QA 与日志入口。
- `docs/04-planning/PRODUCT_GAPS_AND_ROADMAP.md`：证据化卡点、优先级与迭代顺序。
- `docs/LAYOUT_FEATURE_PARITY.md`：手机/桌面功能对照。
- `scripts/`：规则、契约、素材与回归断言。
- `scripts/content-import/import-catalog.ts`：本地目录内容与图片的预检、去重、版本化 Storage 上传和数据库导入工具。
- `scripts/test-visual-results.ts`：视觉结果适配、关注对象、折叠依据和规则只读性的专项断言。
- `scripts/verify-core-experience.mjs`：设备布局、水族册、自适应详情、Mini、每日检查与 AI 建缸助手浏览器验收。
- `scripts/verify-mobile-care-experience.mjs`：320–430px 图鉴分页、手动养护推荐、水族册入口、缸内物种、3D 全屏列表与养护计划浏览器验收。
- `scripts/verify-wishlist-shortcut.mjs`：普通物种与具体变种快捷收藏、触控尺寸、跨页同步和水族册直达验收。
- `scripts/test-three-step-paths.ts` / `scripts/verify-three-step-experience.mjs`：正式路径上限与每日检查、养护自查、添加生物两屏流程验收。
- `scripts/test-collection-achievements.ts`：水族册聚合与 8 枚勋章追溯断言。
- `scripts/test-memorial-service.ts`：日期/原因校验、旧键兼容和跨页面变更事件断言。
- `scripts/test-business-state-services.ts`：鱼缸、巡检与养护业务写入服务断言。
- `scripts/audit-product-actions.ts`：路由页面空操作、日志操作、原生 alert 与重复伪 CTA 审计。
- `CONTRACT.md`：三层架构、数据库、RLS、API、Repository、迁移与 AI 边界的权威契约。
- `src/types/database.ts`：camelCase 数据库与关联实体共享类型。
- `scripts/test-three-tier-contract.ts` / `scripts/test-api-boundary.ts`：三层契约与本地 API 边界回归。
- `scripts/test-business-api-contract.ts` / `scripts/test-repository-boundary.ts`：业务路由、校验、稳定 ID、安全规则与本地/云端访问边界回归。
- `scripts/verify-admin-content.mjs`：内容后台列表、编辑、保存反馈、权限错误与 390/1280px 布局验收。
- `scripts/verify-localization-ui.mjs`：浏览器首选、桌面/手机设置、即时切换、持久化、触控尺寸与横向溢出验收。
- `docs/01-definition/UX_REFACTOR_PRD.md`：本轮交互重构定义。
- `docs/02-design/UX_REFACTOR_CONCEPTS.md`：三套设计方向与默认自然水族册方案。
- `docs/02-design/UX_REFACTOR_INTERACTION.md`：分层表面与 CTA 契约。
- `docs/03-development/UX_REFACTOR_TECH.md`：实现架构与数据流。
- `docs/04-planning/EXTERNAL_VALIDATION_PROTOCOL.md`：真人新手任务、混养跨入口人工验收和低端真机 3D 证据表。
- `output/image_quality/manual_rework_review_2026-07-15.md`：18 张中优先级素材的逐项人工复核与两张重做门槛。
- `PROGRESS.md`：项目内进度、决策与阻塞记录。

## 内部实验

- `src/pages/ThreeDemo.tsx` 与 `/3d-demo`：3D 独立验证入口，不进入正式导航和核心发布验收。
