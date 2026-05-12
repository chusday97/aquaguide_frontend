# AquaGuide Cloudflare Pages 部署说明

## 推荐配置

- 平台：Cloudflare Pages
- Build command：`npm run build`
- Build output directory：`dist`
- Node.js version：`22`

## 环境变量

在 Cloudflare Pages 项目的 Settings -> Environment variables 里添加：

- `DEEPSEEK_API_KEY`：你的 DeepSeek API Key
- `DEEPSEEK_BASE_URL`：`https://api.deepseek.com`
- `DEEPSEEK_MODEL`：`deepseek-v4-flash`

## 部署后检查

打开以下地址：

- `https://你的项目.pages.dev/`
- `https://你的项目.pages.dev/aquarium`
- `https://你的项目.pages.dev/encyclopedia`
- `https://你的项目.pages.dev/api/health`

如果 `/api/health` 返回 `configured: true`，说明 AI 后端 Key 已配置成功。

