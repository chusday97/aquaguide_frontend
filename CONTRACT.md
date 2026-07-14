# AquaGuide Data Contract

## 我的水族册与派生成就

本轮不新增数据库、Supabase 表、API 或 localStorage 集合。水族册继续读取现有数据源：

- 种草图鉴：`wishlistFishIds` / `LocalAppState.wishlist`
- 养护收藏：`aqua_care_favorites`
- 生命纪念：`deceasedRecords` / `LocalAppState.deceasedRecords`
- 成就勋章：根据鱼缸、巡检、换水、收藏和生命纪念记录即时派生

```ts
type CollectionTab = "wishlist" | "care" | "memorial" | "achievements";

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
