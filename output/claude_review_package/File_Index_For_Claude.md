# AquaGuide File Index For Claude

这份索引用于帮助 Claude 快速定位项目关键文件。

## 核心入口

| 文件 | 用途 |
|---|---|
| `src/App.tsx` | 路由入口 |
| `src/main.tsx` | React 挂载入口 |
| `src/index.css` | 全局样式 |
| `src/types.ts` | 核心类型：Fish、Aquarium、DeceasedRecord |

## 页面

| 文件 | 用途 |
|---|---|
| `src/pages/Aquarium.tsx` | 我的鱼缸主页面，当前最复杂 |
| `src/pages/Encyclopedia.tsx` | 生物百科页 |
| `src/pages/AIAssistant.tsx` | AI 养鱼助手 |
| `src/pages/Home.tsx` | 旧首页/部分旧逻辑 |
| `src/pages/ProjectStructurePreview.tsx` | 项目结构预览页 |

## 组件

| 文件 | 用途 |
|---|---|
| `src/components/ThreeAquarium.tsx` | 3D 鱼缸视觉层 |
| `src/components/ShareActions.tsx` | 分享相关按钮/逻辑 |
| `components/ui/*` | UI 基础组件 |

## 数据与分类

| 文件 | 用途 |
|---|---|
| `src/data/fishData.ts` | 466 条物种/造景数据 |
| `src/lib/speciesClassification.ts` | 水草/硬景识别 |
| `src/modules/species/species.service.ts` | 图鉴大类/二级分类/温度带等规则 |
| `src/modules/species/species.schema.ts` | 物种 schema |

## 鱼缸与推荐

| 文件 | 用途 |
|---|---|
| `src/modules/aquarium/aquarium.schema.ts` | 鱼缸 schema |
| `src/modules/aquarium/aquarium.service.ts` | 鱼缸服务 |
| `src/modules/recommendation/recommendation.service.ts` | 混养推荐/每日推荐 |
| `src/modules/wishlist/wishlist.service.ts` | 种草清单服务 |

## AI 与服务

| 文件 | 用途 |
|---|---|
| `src/lib/aiClient.ts` | 前端 AI 请求 |
| `src/services/ai/ai.service.ts` | AI service |
| `src/modules/assistant/assistant.service.ts` | AI 助手业务逻辑 |
| `server/index.mjs` | 本地 Express API server |
| `functions/api/ai/chat.js` | Cloudflare Pages AI function |
| `functions/api/health.js` | 健康检查 |

## 天气和本地温控

| 文件 | 用途 |
|---|---|
| `src/services/weather/weather.service.ts` | IP 定位 + Open-Meteo 天气 |
| `src/services/weather/weather.schema.ts` | 天气 schema |
| `src/pages/Aquarium.tsx` | 本地加热棒提醒卡片 UI |

## 图片和数据处理脚本

| 文件 | 用途 |
|---|---|
| `scripts/prepare_species_assets_and_data.py` | 物种图片准备/数据同步 |
| `scripts/audit_species_images.py` | 图片质量审核 |
| `scripts/add_housing_profiles.py` | 混养/单养信息补充 |
| `scripts/add_feeding_profiles_to_fish_data.py` | 饮食信息补充 |
| `scripts/generate_taxonomy_review.ts` | 分类审核表生成 |

## 静态资源

| 目录 | 用途 |
|---|---|
| `public/species-transparent/` | 透明底物种图 |
| `public/species-display/` | 白底展示图 |
| `public/species-local/turtles/` | 本地补充乌龟图 |

## 部署/说明

| 文件 | 用途 |
|---|---|
| `README.md` | 项目说明 |
| `DEPLOY_CLOUDFLARE.md` | Cloudflare Pages 部署说明 |
| `WECHAT_MINIPROGRAM_SHARE.md` | 微信小程序分享配置说明 |
| `.env.example` | 环境变量示例，不含真实 Key |

