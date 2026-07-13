# AquaGuide 项目结构

## 核心入口

- `src/App.tsx`：设备级应用壳、导航与路由。
- `src/components/layout/LayoutModeProvider.tsx`：真实设备布局判定。
- `src/pages/Aquarium.tsx`：我的鱼缸。
- `src/pages/Encyclopedia.tsx`：图鉴与完整混养计算。
- `src/pages/CareEncyclopedia.tsx`：养护百科与共享养护详情。
- `src/pages/Wishlist.tsx`：独立种草图鉴。
- `src/pages/CareFavorites.tsx`：独立养护收藏。

## 共享业务

- `src/services/favorites/`：物种与养护收藏的唯一读写入口。
- `src/services/analytics/`：只驻留当前会话的隐私安全事件白名单。
- `src/services/aquarium/`：鱼缸生物写入与复核。
- `src/services/compatibility/`：Mini 与完整混养的会话级选择传递。
- `src/services/diagnosis/`：巡检记录的同日更新策略。
- `src/modules/diagnosis/`：每日检查问题、确定性规则与数据类型。
- `src/lib/tankCompatibilityEngine.ts`：统一混养规则引擎。
- `src/lib/speciesVisual.ts`：二维与 3D 物种素材解析。
- `src/components/SpeciesDetailDialog.tsx`：共享物种详情。
- `src/components/ThreeAquarium.tsx`：3D 鱼缸。

## 文档与验证

- `docs/LAYOUT_FEATURE_PARITY.md`：手机/桌面功能对照。
- `scripts/`：规则、契约、素材与回归断言。
- `scripts/verify-core-experience.mjs`：设备布局、独立收藏、详情返回、Mini 与每日检查浏览器验收。
- `CONTRACT.md`：每日检查与受控 AI 接口契约。
- `PROGRESS.md`：项目内进度、决策与阻塞记录。
