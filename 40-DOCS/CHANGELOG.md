# Changelog

## [Unreleased]

### Added

- 真实设备级 `MobileAppShell` / `DesktopAppShell` 与设备策略断言。
- 独立种草图鉴 `/wishlist` 和养护收藏 `/care-favorites` 页面。
- 3D 与普通物种卡素材一致性断言。
- AI 建缸 Copilot 自动评估集。
- 图鉴 Mini 混养判断与 `species_only` 规则范围。

### Changed

- 桌面浏览器缩窄后保持桌面工作台，平板默认使用桌面布局。
- 收藏入口直接进入独立路由，继续共用既有收藏数据。
- 3D 鱼、水草、硬景统一通过版本化物种素材解析器加载。
- 完整混养继续使用 `tank` 范围，图鉴 Mini 使用同一引擎的 `species_only` 范围。

### Fixed

- 修复 3D 鱼缸继续显示旧版生物素材的问题。
- 修复详情关闭后滚动、焦点与来源高亮未稳定恢复的问题。
