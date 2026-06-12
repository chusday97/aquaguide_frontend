# AquaGuide

本项目包含一个 Vite React 前端和一个本地 Express 后端。AI 功能通过后端读取 DeepSeek API Key，前端不会直接暴露 Key。

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
