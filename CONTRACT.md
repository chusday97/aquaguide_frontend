# AquaGuide Data Contract

## 应用内养护计划

本轮继续使用现有 `aqua_care_reminders` 存储键，不新增数据库、Supabase 表或 localStorage 集合。提醒只在应用内展示，不申请浏览器系统通知权限。

```ts
interface CareReminderRecord {
  id: string;
  sourceTopicId: string;
  title: string;
  type: string;
  createdAt: string;
  scheduledFor: string;
  aquariumId?: string;
  label?: string;
  completedAt?: string;
}
```

约束：

- 同一 `sourceTopicId + aquariumId` 只保留一条未完成计划；再次设置时更新日期。
- `scheduledFor` 使用 ISO 时间字符串，界面按用户本地自然日派生“今日 / 即将到期 / 已逾期”。
- 旧记录根据 `label` 中的小时或天数推算日期；无法识别时使用 `createdAt` 次日。
- 完成、改期和删除均由养护活动服务写入，删除前必须二次确认。
- 不实现系统推送、后台执行、重复周期或独立提醒中心。

## 我的水族册与派生成就

本轮不新增数据库、Supabase 表、API 或 localStorage 集合。水族册继续读取现有数据源：

- 种草图鉴：`wishlistFishIds` / `LocalAppState.wishlist`
- 养护收藏：`aqua_care_favorites`
- 生命纪念：`deceasedRecords` / `LocalAppState.deceasedRecords`
- 成就勋章：根据鱼缸、巡检、换水、收藏和生命纪念记录即时派生

```ts
type CollectionModule = "wishlist" | "care" | "memorial" | "achievements";
type CollectionTab = CollectionModule;

type AchievementId =
  | "first_aquarium"
  | "first_daily_check"
  | "seven_day_guardian"
  | "water_change_routine"
  | "wishlist_collector"
  | "care_learner"
  | "compatible_community"
  | "life_reflection";

interface AchievementProgress {
  id: AchievementId;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
  nextAction?: { label: string; route: string };
}
```

约束：

- 旧用户按现有数据自动追溯，不保存第二份解锁状态。
- “和谐共生”必须由统一混养引擎得到 `compatible`；`caution / not_recommended / insufficient_data` 均不解锁。
- “认真复盘”只认可填写了原因的生命纪念记录，不按死亡数量奖励。
- 应用状态保存后派发 `aquaguide:app-state-changed`，供水族册实时刷新；事件不持久化用户内容。

正式路由：

- `/collection` 只展示四个模块入口，不展示模块内部条目。
- `/collection/wishlist`、`/collection/care`、`/collection/memorial`、`/collection/achievements` 分别承载独立模块。
- 旧 `/collection?tab=...`、`/wishlist` 与 `/care-favorites` 只做兼容重定向，不成为新的状态源。

## 今日行动与界面故障

以下类型都是根据现有业务数据派生的界面契约，不新增存储字段：

```ts
type DailyActionType =
  | "urgent_recovery"
  | "compatibility_review"
  | "care_plan"
  | "water_change"
  | "daily_check"
  | "routine";

type UiFailureKind = "chunk" | "render" | "image" | "data";
```

约束：

- 今日行动的类型、状态、原因和唯一主操作必须由同一个选择结果生成；AI 只能按需解释本地结果。
- 页面故障诊断只保留当前浏览器会话，内容只包含页面、构建版本、失败类型、资源地址和时间。
- 故障诊断不得包含鱼缸内容、用户自由描述或技术堆栈；动态模块自动恢复和整页自动刷新各最多一次。
- 单张图片失败在图片组件内重试一次，再使用本地占位图，不能升级为页面级失败。

## 每日鱼缸检查

本功能不新增数据库、Supabase 表或 localStorage 集合。检查结果继续写入现有 `diagnosisRecords`，并使用：

- `problemType: "巡检"`
- `answers / structuredAnswers`：结构化问答
- `resultSummary / conclusion / suggestedActions / avoidActions / observeItems`：经过本地规则约束的结果
- 同一 `aquariumId` 在同一自然日只保留一条巡检记录；再次保存时更新原记录
- 不保存 AI 原始回复和用户自由描述原文

## AI Task

```ts
type AiTaskName =
  | "risk_explanation"
  | "risk_audit"
  | "recommendation_assist"
  | "build_tank_copilot"
  | "tank_daily_check_interpretation";
```

请求：

```ts
interface TankDailyCheckContext {
  aquariumSnapshot: AquariumDiagnosisSnapshot;
  answers: DiagnosisAnswerMap;
  userDescription?: string;
  deterministicResult: DiagnosisOutput;
  candidateArticles: Array<{ id: string; title: string; summary: string }>;
}
```

返回：

```ts
interface TankDailyCheckInterpretation {
  summary: string;
  priority: "routine" | "watch" | "urgent";
  reasoning: string[];
  recommendedArticleIds: string[];
  clarifyingQuestions: string[];
  disclaimer: string;
}
```

所有前端 AI 结果统一附加 `source / failureReason / task / generatedAt`。前端必须再次执行以下约束：

- AI `priority` 不得低于本地规则映射的风险等级。
- `recommendedArticleIds` 只保留本地 `candidateArticles` 中存在的 ID。
- AI 失败、超时、非法 JSON 或任务不匹配时使用本地规则结果。
- AI 不能新增用药建议，不能覆盖本地立即动作和禁止动作。
