# AquaGuide 交接文档

> 最后更新：2026-07-16（Asia/Shanghai）。

## 当前目标

严格以 `origin/main` 为基线持续审计和优化；每项改动执行 Issue → Spec PR → Implementation PR。

## 正在做什么

- Issue #2 已记录 PostHog 同步集成造成的首屏体积回归。
- 当前分支 `codex/issue-2-posthog-spec` 只编写规格，不包含实现代码。
- 规格采用内部异步 analytics boundary；Implementation PR 必须从该规格派生并独立验证。

## 已完成与证据

- `origin/main@86ffe24`：lint 与 build 通过。
- 同环境构建对比：`7d952a8` 入口 293.35/93.64 kB（raw/gzip），当前 main 为 733.63/223.21 kB。
- GitHub Issue：`https://github.com/chusday97/aquaguide_frontend/issues/2`。

## 当前卡点

- Spec PR 尚未提交和打开。
- 依赖审计安装阶段报告 15 项告警；在线明细尚未成功获取，不能据此宣称具体风险。

## 下一步

1. 提交并打开 Spec PR。
2. 从规格分支建立 implementation 分支，实现 analytics boundary。
3. 验证事件契约、失败降级和入口 bundle budget，再打开 Implementation PR。
4. 继续从 `origin/main` 审计下一项可证实优化。

## 关键决策与禁忌

- 不直接提交到 `main`。
- 不触碰原工作树 `codex/aquaguide-ux-refactor` 的未提交改动。
- 不通过提高 chunk warning threshold 掩盖体积问题。
- SDK 失败不得阻断任何产品操作。

## 工作区状态

- 隔离工作树：`/Users/chuchu/Documents/New project/aquaguide-main-audit`
- 规格基线：`origin/main@86ffe24`
- 当前未提交内容应仅为规格和交接文档更新。
