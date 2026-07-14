# AquaGuide 交互重构技术说明

## 架构

- `/collection` 使用 URL query 保存四个页签状态。
- 集合服务只聚合现有收藏和生命纪念数据。
- 成就服务是纯函数，复用统一混养引擎，不写入规则结论或新存储。
- 旧收藏路由使用重定向保持兼容。
- 共享详情组件通过自适应 surface class 在桌面和手机呈现不同布局。

## 数据流

```text
现有本地数据 -> collection service -> Collection page
现有本地数据 -> achievement evaluator -> Achievement cards
收藏/鱼缸写入 -> app-state/favorites event -> 页面刷新
```

## 验证

- 类型、构建、收藏、混养和布局测试。
- 成就规则与水族册路由专项断言。
- 核心路径和详情返回浏览器验收。
