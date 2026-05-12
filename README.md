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

3. 启动前端和后端：

```bash
npm run dev
```

打开 `http://localhost:3000` 即可使用。后端健康检查地址是 `http://localhost:8787/api/health`。
