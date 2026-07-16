# PostHog 按需加载规格

> 状态：Proposed  
> 关联 Issue：[#2](https://github.com/chusday97/aquaguide_frontend/issues/2)  
> 基线：`origin/main@86ffe24`

## 1. 优化原因与证据

`d153e2a` 将 `posthog-js` 与 Supabase 会话读取同步引入应用入口。使用同一台机器、同一份依赖安装和同一 Vite 版本构建，结果如下：

| 基线 | 首屏 `index-*.js` | gzip |
|---|---:|---:|
| PostHog 前 `7d952a8` | 293.35 kB | 93.64 kB |
| 当前 `origin/main@86ffe24` | 733.63 kB | 223.21 kB |
| 回归 | +440.28 kB（+150%） | +129.57 kB（+138%） |

这部分成本由所有访客承担，包括未配置 PostHog、未登录且不会触发业务埋点的访客。当前实现还让页面、组件和服务直接依赖第三方 SDK，SDK 初始化或加载故障可能扩散到产品操作。

## 2. 目标与非目标

### 目标

- PostHog 只在配置完整时异步加载，不属于首屏同步依赖图。
- 页面、组件和业务服务只依赖内部 analytics boundary。
- 保留现有事件名、属性、异常上报和用户识别语义。
- SDK 加载或初始化失败时，渲染、登录、收藏、养护和鱼缸操作继续正常完成。
- 用自动检查阻止未来重新出现页面直引 SDK 和入口体积回归。

### 非目标

- 不调整事件分类或事件名。
- 不新增同意弹窗或修改隐私政策。
- 不移除 PostHog。
- 不处理既有物种数据和 3D 按需块。
- 不提高 Vite 体积警告阈值来隐藏问题。

## 3. 方案比较

### 方案 A：内部异步边界（采用）

新增唯一 analytics boundary，通过 `import('posthog-js')` 延迟加载。业务方调用同步、无抛错的 `capture`、`captureException` 与 `identify` 接口；边界负责初始化、队列、失败降级和测试替身。

- 优点：调用点改动机械且小；第三方依赖集中；可测试失败路径；完整保留现有能力。
- 缺点：需要定义加载前事件队列及容量；PostHog 首次加载后仍有网络成本。

### 方案 B：切换 PostHog 精简构建

继续同步导入，但改用 PostHog 的精简入口。

- 优点：实现较少。
- 缺点：仍阻塞首屏依赖图；可能丢失异常捕获等能力；未解决页面直接耦合 SDK。

### 方案 C：外部脚本注入

在 HTML 中异步注入脚本，通过全局对象调用。

- 优点：完全离开 Vite 主包。
- 缺点：全局状态与类型安全较弱；测试困难；CSP、加载顺序和部署配置更复杂。

选择方案 A，因为它在不改变产品分析语义的前提下，同时解决体积、故障隔离和可维护性问题。

## 4. 设计

### 4.1 模块边界

新增 `src/services/analytics/product-analytics.service.ts`，它是生产源码中唯一允许导入 `posthog-js` 的文件，公开：

- `initializeProductAnalytics(config)`：配置完整时启动一次异步加载；重复调用复用同一 Promise。
- `captureProductEvent(name, properties?)`：排队或发送事件，永不向调用方抛错。
- `captureProductException(error, context?)`：排队或发送异常，永不影响错误边界渲染。
- `identifyProductUser(userId)`：确保 identification 先于随后排队的用户事件发送。
- 测试专用 reset/loader 注入入口只在测试环境导出或通过独立测试适配器提供。

页面、组件、服务和 `AppErrorBoundary` 不再导入第三方 SDK。

### 4.2 初始化时序

1. React 渲染不等待分析 SDK。
2. 仅当 key 与 host 均存在时调用初始化。
3. 动态导入成功后执行 `init`，再按原顺序刷新队列。
4. Supabase 返回会话后调用内部 `identifyProductUser`；分析层未就绪时进入同一有序队列。
5. 配置缺失时不加载 SDK、不建立队列，所有调用为安全 no-op。

### 4.3 队列与失败策略

- 队列上限 100 条，防止第三方长期不可用造成内存无界增长。
- 超出上限时丢弃最旧的普通事件；异常和最近一次 identify 优先保留。
- 动态导入或 `init` 失败后标记为 disabled，清空队列，不重试，不产生未处理 Promise rejection。
- SDK 调用异常在边界内捕获；业务调用方不使用 `await`，避免分析影响主流程。
- 不把用户自由文本、问卷答案或本地存储原文加入新增属性。

### 4.4 会话识别

Supabase 会话读取同样不能阻塞 React 渲染。身份读取放到渲染后的异步启动流程中，必须显式处理 rejected promise。登录成功仍先 identify，再记录 `user_signed_in`。

## 5. 实施计划

1. 建立 analytics boundary 和单元级失败测试。
2. 将全部 `posthog.capture`、`captureException`、`identify` 调用机械迁移到内部接口，不改事件名和属性。
3. 把入口初始化与会话识别改为渲染后异步流程，并处理 Supabase/SDK 失败。
4. 新增静态边界检查：除指定服务外禁止 `posthog-js` import。
5. 新增构建产物检查：首屏 raw/gzip 均不得超过 PostHog 前基线 110%，并确认存在独立 PostHog lazy chunk。
6. 运行相关产品测试、类型检查、生产构建和差异检查。

## 6. 验收标准

- `npm run lint`、`npm run build` 通过。
- 现有事件名和属性不变。
- 生产源码只有 analytics boundary 可导入 `posthog-js`。
- 无配置时浏览器不请求 PostHog chunk。
- 加载失败时无未处理 rejection，产品操作不失败。
- 首屏入口包不超过 322.69 kB raw、103.00 kB gzip。
- 构建产物包含独立 PostHog lazy chunk。
- 返回会话与登录用户仍在事件发送前完成 identify。

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| SDK 就绪前事件丢失 | 有界有序队列，加载成功后刷新 |
| identify 与事件乱序 | 所有操作进入同一队列；登录顺序固定 |
| SDK 故障影响业务 | boundary 内部捕获并永久降级为 no-op |
| 后续直接 import 导致回归 | 静态边界测试 |
| 体积预算受其他并行变更影响 | 报告 raw/gzip 实际值；超预算需单独解释并重新定基线 |

## 8. 回滚

若异步边界导致事件明显缺失，回滚 Implementation PR 即可恢复 `origin/main@86ffe24` 的同步集成。回滚不得通过关闭类型检查、删除事件或调高体积阈值完成。
