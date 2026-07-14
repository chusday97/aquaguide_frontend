# AquaGuide 本地运行与验证

## 1. 前置条件

- Node.js 18 或更高版本。
- npm。
- 仅在验证 AI 功能时需要模型服务密钥。
- 仅在验证登录时需要 Supabase 环境变量。

## 2. 安装与启动

```bash
npm install
npm run dev
```

`npm run dev` 同时启动 Web 与本地 AI API。只启动 Web：

```bash
npm run dev:web
```

只启动 API：

```bash
npm run dev:api
```

默认 Web 预览地址为 `http://localhost:3000`。API 端口默认由服务配置决定，常用本地值为 `8787`。

## 3. 环境变量

| 变量 | 用途 | 必需性 |
|---|---|---|
| `AI_API_KEY` 或 `DEEPSEEK_API_KEY` | 服务端模型密钥 | 仅 AI 调用必需 |
| `AI_BASE_URL` | 模型兼容接口地址 | 可选 |
| `AI_MODEL` | 模型名称 | 可选 |
| `AI_TIMEOUT_MS` | 模型超时毫秒数 | 可选，默认 20000 |
| `API_PORT` | Express 端口 | 可选 |
| `VITE_SUPABASE_URL` | Supabase 项目地址 | 仅登录能力需要 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公钥 | 仅登录能力需要 |

模型密钥不得以 `VITE_` 前缀暴露给浏览器，也不得提交到仓库。

## 4. 构建

```bash
npm run lint
npm run build
npm run preview
```

`lint` 当前执行 TypeScript 无输出检查。构建成功不代表核心交互通过，还需执行领域测试和浏览器验收。

## 5. 领域测试

```bash
npm run test:compatibility
npm run test:mini-compatibility
npm run test:favorites
npm run test:collection
npm run test:daily-check
npm run test:copilot-contract
npm run test:copilot-evaluation
npm run test:3d-assets
npm run test:layout-mode
npm run test:session-events
npm run test:product-actions
npm run test:core-ui
```

其他数据审计与物种知识命令见 `package.json`。更新物种素材的命令会改写数据与资源，不能作为普通只读验收随意运行。

## 6. 常见问题

- AI 未配置：页面应继续提供本地规则结论；检查 `/api/health` 和服务端环境变量。
- 端口占用：停止旧开发进程后重新启动，不同时运行多套相同端口服务。
- 本地数据异常：先导出或保留浏览器数据；不要把清空 localStorage 当作默认修复方式。
- 3D 素材未更新：核对普通卡片与 3D 解析后的 URL 及版本参数，并检查纹理是否在 URL 变化后重建。

