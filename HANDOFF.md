# AquaGuide 交接文档

> 最后更新：2026-07-16（Asia/Shanghai）。

## 当前目标

严格以 `origin/main` 为基线持续审计和优化；每项改动执行 Issue → Spec PR → Implementation PR。

## 正在做什么

- Issue #2 已记录 PostHog 同步集成造成的首屏体积回归。
- Spec PR #3 已打开；当前分支 `codex/issue-2-posthog-implementation` 从规格分支派生。
- 实现采用内部异步 analytics boundary，代码与专项验证已完成并提交为 `0fdda87`，尚未推送 Implementation PR。

## 已完成与证据

- `origin/main@86ffe24`：lint 与 build 通过。
- 同环境构建对比：`7d952a8` 入口 293.35/93.64 kB（raw/gzip），当前 main 为 733.63/223.21 kB。
- GitHub Issue：`https://github.com/chusday97/aquaguide_frontend/issues/2`。
- Spec PR：`https://github.com/chusday97/aquaguide_frontend/pull/3`。
- 实现验证：lint；analytics 5 场景；12 事件边界；6 组相邻业务回归；配置/无配置 build 与 bundle audit。
- 配置构建入口 294.87/94.44 kB（raw/gzip），PostHog 独立 lazy chunk 230.52 kB；无配置构建不产生 PostHog chunk。

## 当前卡点

- Implementation commit `0fdda87` 尚未推送。
- 依赖审计安装阶段报告 15 项告警；在线明细尚未成功获取，不能据此宣称具体风险。

## 下一步

1. 提交并推送 implementation 分支。
2. 打开以 Spec 分支为 base 的 stacked Implementation PR。
3. 检查 PR 差异与状态。
4. 继续从最新 `origin/main` 审计下一项可证实优化。

## 关键决策与禁忌

- 不直接提交到 `main`。
- 不触碰原工作树 `codex/aquaguide-ux-refactor` 的未提交改动。
- 不通过提高 chunk warning threshold 掩盖体积问题。
- SDK 失败不得阻断任何产品操作。

## 工作区状态

- 隔离工作树：`/Users/chuchu/Documents/New project/aquaguide-main-audit`
- 规格基线：`origin/main@86ffe24`
- 当前未提交内容应仅为 Issue #2 的实现、专项测试及对应文档更新。
