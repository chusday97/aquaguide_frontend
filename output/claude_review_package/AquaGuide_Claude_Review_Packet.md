# AquaGuide Claude Review Packet

生成时间：2026-05-25
项目路径：`/Users/chuchu/Documents/New project/aquaguide_frontend`
当前分支：`main`
当前最新提交：`e1052d9 Redesign local heater reminder card`

## 1. 给 Claude 的审阅目标

请从产品经理、前端架构师、AI 产品设计师三个角度审阅这个项目，重点判断：

- 当前功能是否符合“水族百科 + 我的鱼缸 + AI 养鱼助手”的 MVP 目标。
- 页面是否适合手机端和后续微信小程序迁移。
- 分类、推荐、风险提醒、AI 助手是否清晰、可信、可扩展。
- 代码模块边界是否足够清楚，是否有过度耦合或后续难维护的地方。
- 数据模型是否能支持上线后的用户、鱼缸、物种、种草清单、死亡记录、AI 对话记录。
- 哪些地方必须上线前修，哪些可以二期优化。

请优先输出：

1. Top 10 必改问题
2. Top 10 产品体验问题
3. 小程序上线前风险清单
4. 建议的 V1 数据库表结构
5. 建议的代码重构顺序
6. 可直接交给开发执行的任务拆分

## 2. 产品概述

AquaGuide 是一个面向观赏鱼/水族玩家的应用，当前定位是：

- 用户可以浏览生物图鉴，查看物种图片、基础养护信息、饮食、温度、pH、混养建议。
- 用户可以在“我的鱼缸”里添加已有生物，设置鱼缸尺寸、水温、水草、底砂、硬景和设备。
- 系统根据鱼缸容量、物种兼容性、水温、pH、性格、体型，给出风险提醒和混养推荐。
- AI 助手用于回答养鱼问题、推荐物种、解释风险。
- 未来目标是上线国内微信小程序，并支持用户数据持久化、AI 调用、图片识别辨鱼等能力。

## 3. 目标用户

- 新手水族玩家：不知道什么鱼适合混养、怎么喂、多久换水。
- 进阶玩家：想快速筛选目标物种，规划鱼缸搭配。
- 草缸/海缸/龟缸用户：希望记录缸内生物、设备、造景和养护提醒。

主要痛点：

- 网上信息分散，图鉴数据不统一。
- 新手容易买错鱼、混养冲突、缸太小、换水不规律。
- 很多 App 只做记录，不会根据鱼缸现状给出风险判断。
- AI 回答容易太长、缺结构，用户找不到重点。

## 4. 当前功能范围

### 已实现

- 图鉴页：物种浏览、搜索、分类筛选、二级标签半屏展示。
- 今日推荐：每天推荐 10 款，支持跳过/感兴趣加入种草清单。
- 鱼缸页：多个鱼缸、新建鱼缸、鱼缸设置、添加生物、删除生物二次确认。
- 鱼缸设置：尺寸、水体类型、目标温度、底砂、硬景、水草、过滤、加热棒、氧气、灯光。
- 3D 鱼缸预览：显示缸内物种、水草、底砂、设备效果。
- 风险提醒：小缸高密度、混养冲突、需要单养等。
- 换水提醒：下次换水倒计时、换水日历、记录换水、囤水小贴士。
- 本地温控提醒：基于 IP 天气和当前缸内生物，显示当地、当地温度、加热棒是否建议需要。
- AI 助手：前端对话 UI，后端代理 DeepSeek/OpenAI 兼容接口。
- 物种图片：多数物种使用本地透明 PNG 或白底展示图，乌龟图片已本地化。
- 分享配置：已有微信小程序分享相关配置文档和前端分享组件。

### 未完全实现或需审阅

- 真实用户登录体系。
- 生产数据库。
- AI 对话长期记忆和用户上下文。
- 国内云部署方案。
- 微信小程序原生迁移。
- 图片识别辨鱼。
- 物种数据来源可信度、版权和审核流程。
- 物种图片质量自动审核闭环。

## 5. 技术栈

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- shadcn/ui 风格基础组件
- Three.js + React Three Fiber + drei
- Express 本地 API server
- Cloudflare Pages Functions 目录
- Zod schema 校验
- localStorage 当前作为本地数据存储

核心命令：

```bash
npm run dev
npm run lint
npm run build
npm run audit:images
npm run audit:taxonomy
npm run refresh:species-assets
```

当前本地开发服务通常运行在：

```text
http://localhost:3002/
```

## 6. 项目目录结构摘要

```text
aquaguide_frontend/
  src/
    App.tsx
    main.tsx
    index.css
    types.ts
    data/
      fishData.ts
      archive/
    pages/
      Aquarium.tsx
      Encyclopedia.tsx
      AIAssistant.tsx
      Home.tsx
      ProjectStructurePreview.tsx
    components/
      ThreeAquarium.tsx
      ShareActions.tsx
    lib/
      aiClient.ts
      shareConfig.ts
      speciesClassification.ts
    modules/
      aquarium/
      assistant/
      encyclopedia/
      recommendation/
      species/
      wishlist/
      ARCHITECTURE.md
    services/
      ai/
      auth/
      database/
      logger/
      sheets/
      storage/
      weather/
    shared/
      schemas/
      types/
  public/
    species-transparent/
    species-display/
    species-local/
  server/
    index.mjs
  functions/
    api/
  scripts/
  output/
```

## 7. 数据规模概览

当前 `fishData.ts` 中共有 `466` 条物种/造景数据。

按图鉴类型统计：

| 类型 | 数量 | 说明 |
|---|---:|---|
| freshwaterFish | 278 | 淡水鱼 |
| saltwaterFish | 25 | 海水鱼 |
| invertebrate | 48 | 虾螺蟹 |
| reptile | 10 | 龟/两栖 |
| coral | 40 | 珊瑚/海葵/水母/海水无脊椎 |
| plant | 54 | 水草，不应进入图鉴，放鱼缸设置 |
| hardscape | 11 | 底砂/沉木/石头等，不应进入图鉴，放鱼缸设置 |

资源体积：

| 目录 | 大小 | 用途 |
|---|---:|---|
| `src` | 1.2M | 源码 |
| `public/species-transparent` | 70M | 透明底物种图 |
| `public/species-display` | 6.3M | 白底展示图 |
| `public/species-local` | 3.3M | 本地补充图片，例如乌龟 |
| `scripts` | 120K | 数据处理与图片审核脚本 |

## 8. 核心数据模型

### Fish

```ts
interface Fish {
  id: string;
  name: string;
  scientificName: string;
  category: string;
  image: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  waterTemperature: string;
  phLevel: string;
  waterChangeCycle: number;
  description: string;
  diet: string;
  feedingProfile?: {
    dietType?: string;
    feedingType: string;
    recommendedFoods: string;
    feedingFrequency: string;
    portionRule: string;
    feedingLayer?: string;
    avoidFoods: string;
    specialNotes?: string;
    confidence?: string;
    sourceName?: string;
  };
  tankSize: string;
  temperament: 'Peaceful' | 'Aggressive' | 'Territorial';
  size: 'Small' | 'Medium' | 'Large';
  housingMode?: '适合混养' | '谨慎混养' | '建议单养';
  housingReason?: string;
  isCustom?: boolean;
}
```

### Aquarium

```ts
interface Aquarium {
  id: string;
  name: string;
  fishes: AquariumFish[];
  lastWaterChangeDate?: string;
  waterChangeHistory?: string[];
  dimensions?: { length: string; width: string; height: string };
  waterType?: 'Freshwater' | 'Saltwater';
  targetTemperature?: string;
  substrate?: string;
  plants?: string[];
  hardscape?: string[];
  equipment?: {
    filter?: '无' | '瀑布过滤' | '桶滤' | '上滤' | '海绵过滤';
    heater?: boolean;
    oxygen?: boolean;
    light?: '无' | '普通灯' | '水草灯' | '海水灯';
  };
}
```

## 9. 模块与服务边界

### Modules

| Module | 作用 | 关键文件 |
|---|---|---|
| aquarium | 鱼缸数据 schema、服务、UI 模块外壳 | `src/modules/aquarium/*` |
| species | 物种列表、分类、二级标签、图鉴类型 | `src/modules/species/*` |
| encyclopedia | 图鉴搜索/筛选模块 | `src/modules/encyclopedia/*` |
| recommendation | 混养推荐、每日推荐规则 | `src/modules/recommendation/*` |
| assistant | AI 助手输入输出与服务 | `src/modules/assistant/*` |
| wishlist | 种草清单 | `src/modules/wishlist/*` |

### Services

| Service | 作用 | 关键文件 |
|---|---|---|
| ai | 统一 AI 调用 | `src/services/ai/*` |
| weather | IP 定位 + Open-Meteo 天气 | `src/services/weather/*` |
| database | 数据读写抽象，目前包装 localStorage | `src/services/database/*` |
| storage | localStorage 适配 | `src/services/storage/*` |
| auth | 本地用户模拟 | `src/services/auth/*` |
| logger | 日志记录 | `src/services/logger/*` |
| sheets | Google Sheets 写入占位 | `src/services/sheets/*` |

架构原则：公共能力放在 `services`，业务能力放在 `modules`，页面层负责组合 UI 和调用服务。

## 10. 当前页面结构

### `/aquarium`

主要文件：`src/pages/Aquarium.tsx`

职责：

- 鱼缸列表和当前鱼缸状态。
- 鱼缸名称编辑。
- 种草清单入口。
- 鱼缸设置弹窗。
- 智能混养推荐。
- 换水倒计时和换水记录。
- 本地加热棒提醒卡片。
- 3D 鱼缸画面。
- 缸内生物图鉴。
- 种草清单。
- 添加生物弹窗。
- 鱼缸设置弹窗。

审阅重点：

- 该页面文件较大，页面状态、业务逻辑、UI 渲染耦合较多。
- 建议拆成 `AquariumDashboard`, `HeaterReminderCard`, `TankPreview`, `TankSettingsDialog`, `TankSpeciesList`, `RecommendationPanel` 等组件。

### `/encyclopedia`

主要文件：`src/pages/Encyclopedia.tsx`

职责：

- 今日想养哪一种卡片。
- 图鉴分类筛选。
- 二级标签半屏面板。
- 生物卡片列表。
- 生物详情弹窗。
- 加入种草清单、添加到鱼缸、记录死亡。

审阅重点：

- 分类逻辑与页面展示仍有耦合。
- 水草/硬景不应进入图鉴，已通过分类服务过滤，但仍需更系统的测试。
- 移动端卡片文字完整性和图片完整展示是历史痛点。

### `/assistant`

主要文件：`src/pages/AIAssistant.tsx`

职责：

- AI 对话。
- 快捷问题。
- 种草清单联动。
- 本地保存最近对话。

审阅重点：

- AI 回答需要更结构化、短句、可操作。
- 需要用户上下文记忆：已有鱼缸、缸内生物、水温、pH、风险。
- 需要后端持久化对话历史。

## 11. 分类规则现状

主要文件：`src/modules/species/species.service.ts`

图鉴展示类型：

- `freshwaterFish`
- `saltwaterFish`
- `invertebrate`
- `reptile`
- `coral`

不应进入图鉴、应进入鱼缸设置：

- `plant`
- `hardscape`

近期修复：

- “五彩青蛙”是海水鱼，不能因名字含“蛙”被归入两栖。现在优先识别海水鱼，再判断真正两栖。
- 乌龟新增图片已本地化到 `public/species-local/turtles/`。

## 12. AI 与后端现状

### 本地 Express API

文件：`server/index.mjs`

用途：

- 本地开发时提供 `/api/ai/chat`。
- 读取环境变量中的 AI Key。
- 代理到 DeepSeek/OpenAI 兼容接口。

### Cloudflare Pages Functions

文件：

- `functions/api/ai/chat.js`
- `functions/api/health.js`

用途：

- Cloudflare Pages 部署时提供函数 API。

### 环境变量

不要把 `.env.local` 发给 Claude。

应让 Claude 只审阅：

- `.env.example`
- API 使用方式
- 是否存在 Key 泄露风险
- 是否需要后端隐藏 AI Key

## 13. 图片资产流程

当前图片类型：

- `public/species-transparent/`：透明底物种图，主要用于图鉴和鱼缸展示。
- `public/species-display/`：白底展示图。
- `public/species-local/turtles/`：后续补充的本地乌龟图。

相关脚本：

- `scripts/prepare_species_assets_and_data.py`
- `scripts/audit_species_images.py`
- `scripts/generate_taxonomy_review.ts`

历史问题：

- 部分物种图被裁切。
- 有些图和现实物种不一致。
- 新增物种不能直接用外链，应下载/归档成本地资产。
- 水草、底砂、硬景不应混入图鉴生物列表。

## 14. 部署现状

已尝试过：

- GitHub 仓库：`chusday97/aquaguide_frontend`
- Cloudflare Pages

相关文档：

- `DEPLOY_CLOUDFLARE.md`
- `WECHAT_MINIPROGRAM_SHARE.md`

当前建议：

- Web 版可继续用 Cloudflare Pages 或 Vercel。
- 国内微信小程序应单独评估：
  - 是否需要 ICP 备案。
  - 是否需要国内云函数。
  - 是否要迁移 React Web 到 Taro/uni-app/原生小程序。
  - AI API 需走国内可访问后端，不能让前端直接暴露 Key。

## 15. 最近重要提交

```text
e1052d9 Redesign local heater reminder card
bd28609 Keep frogfish in marine fish taxonomy
556a78b Localize restored turtle images
c704910 Restore archived turtle species
6578ae9 Show secondary tags as half-screen panel
833dc9c Restructure encyclopedia fish classification
c2aa170 Refine aquarium mobile typography
88d1a84 Improve tank floor and substrate coverage
```

## 16. 已知风险

### 产品风险

- 功能范围已经接近 V1.5，需要收敛 MVP，否则上线周期会被拖长。
- 图鉴分类如果不稳定，会直接影响用户信任。
- AI 助手如果回答太长或泛泛，会降低留存。
- 图片质量是核心体验，裁切/错图会非常明显。

### 技术风险

- `Aquarium.tsx` 和 `Encyclopedia.tsx` 页面较大，状态和业务逻辑耦合。
- 当前主要数据还在前端静态文件和 localStorage。
- 用户体系、数据库、日志、AI 成本控制未生产化。
- 图片资源体积较大，移动端加载性能需优化。
- 天气服务依赖 `ipapi.co` 和 `open-meteo`，国内访问稳定性未知。

### 数据风险

- 物种知识库需要标注来源和可信度。
- AI 生成/整理的内容需要人工抽检。
- 图片版权和来源需要二次确认。
- 物种“混养/单养”建议需要保守处理，避免误导用户。

## 17. 建议 Claude 重点审阅文件

优先级 P0：

- `src/pages/Aquarium.tsx`
- `src/pages/Encyclopedia.tsx`
- `src/pages/AIAssistant.tsx`
- `src/modules/species/species.service.ts`
- `src/modules/recommendation/recommendation.service.ts`
- `src/types.ts`
- `src/data/fishData.ts`

优先级 P1：

- `src/components/ThreeAquarium.tsx`
- `src/services/ai/ai.service.ts`
- `src/services/weather/weather.service.ts`
- `server/index.mjs`
- `functions/api/ai/chat.js`
- `scripts/audit_species_images.py`
- `scripts/generate_taxonomy_review.ts`

优先级 P2：

- `DEPLOY_CLOUDFLARE.md`
- `WECHAT_MINIPROGRAM_SHARE.md`
- `src/modules/ARCHITECTURE.md`
- `.env.example`

## 18. 上线前建议拆解

### Must-have

- 固定图鉴分类规则，水草/硬景彻底移出图鉴。
- 修复图片裁切与错图高频问题。
- AI 助手回答格式模板化，短句、分点、有下一步。
- 后端代理 AI Key，前端不暴露 Key。
- 鱼缸数据持久化方案明确。
- 手机端布局不横向溢出。

### Should-have

- 用户账号系统。
- 数据库：用户、鱼缸、鱼缸生物、种草清单、死亡记录、AI 对话。
- 图片 CDN/压缩/WebP。
- 风险评分可解释化。
- AI 推荐可追踪原因。

### Could-have

- 拍照识别鱼。
- 社区分享鱼缸。
- 养护打卡。
- 设备购买推荐。

### Not now

- 复杂 3D 鱼类动画。
- 完整社交社区。
- 付费订阅。
- 高级水质硬件接入。

## 19. 希望 Claude 输出的格式

请按这个格式输出审阅结果：

```text
一、结论
- 是否建议继续按当前方向上线？
- 最大风险是什么？
- 最值得保留的功能是什么？

二、P0 必修问题
| 问题 | 影响 | 建议改法 | 涉及文件 |

三、P1 优化建议
| 问题 | 影响 | 建议改法 | 涉及文件 |

四、模块拆分建议
| 当前文件 | 建议拆分 | 原因 |

五、数据库设计建议
| 表 | 字段 | 用途 |

六、微信小程序迁移建议
| 方案 | 成本 | 风险 | 推荐度 |

七、下一周执行计划
按 5 个工作日拆任务。
```

