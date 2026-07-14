# AquaGuide

面向水族新手的鱼缸管理、物种选择、混养决策与养护补救助手。

产品包含“我的鱼缸、图鉴、养护百科、我的水族册”四个正式模块。Web 使用 Vite + React，本地 Express 服务承接 AI 请求；AI 只补充解释，混养与风险结论由本地规则守底。

完整产品定义、交互说明、技术交接和迭代计划从 [产品文档索引](./docs/README.md) 开始阅读。代码契约以 [CONTRACT.md](./CONTRACT.md) 为准，当前进度以 [PROGRESS.md](./PROGRESS.md) 为准。

## 本地运行

1. 安装依赖：

```bash
npm install
```

2. 在项目根目录创建 `.env.local`，填写 DeepSeek Key：

```bash
DEEPSEEK_API_KEY="你的 DeepSeek API Key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-flash"
API_PORT="8787"
```

如果需要使用邮箱密码登录，请同时配置 Supabase Auth：

```bash
VITE_SUPABASE_URL="你的 Supabase Project URL"
VITE_SUPABASE_ANON_KEY="你的 Supabase anon public key"
```

不要把 `SUPABASE_SERVICE_ROLE_KEY` 放进前端环境变量或源码。

3. 启动前端和后端：

```bash
npm run dev
```

打开 `http://localhost:3000` 即可使用。后端健康检查地址是 `http://localhost:8787/api/health`。

## 交付检查

每次完成页面、弹窗、组件或交互改动后，需要按 [AquaGuide 交付检查清单](./docs/delivery-checklist.md) 逐条检查：

- 异步操作有 loading 态
- 操作结果有反馈提示
- 表单有错误处理
- 破坏性操作有二次确认
- 空状态有提示

更完整的设备、核心路径和 AI 安全验收见 [QA 与验收](./docs/03-development/QA_ACCEPTANCE.md)。
