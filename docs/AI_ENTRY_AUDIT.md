# AquaGuide AI 对外入口审计

## 允许的产品入口

1. **AI 建缸助手**：鱼缸页唯一 AI 主入口，用于理解目标、补充信息和组织本地规则方案。
2. **异常巡检受控解读**：仅当每日检查发现异常或用户填写自由描述时调用，用于理解描述、整理关联和补充问题。

## 已收敛入口

- 独立 `AIAssistant` 页面没有应用路由，仅保留兼容代码。
- 旧“智能混养推荐”弹窗及页面级 `recommendation_assist` 调用已移除。
- 缸内生物推荐只展示本地规则候选，不再提供单独的 AI 排序说明按钮。
- 今日行动、鱼缸风险弹窗和单物种详情的 AI 解读入口已移除。
- 正常结构化巡检不得调用 AI；AI 失败时完整保留本地分诊与养护文章入口。

## 兼容接口

- `risk_audit`
- `risk_explanation`
- `recommendation_assist`

兼容接口仍保留在 client/server，但正式页面不得直接调用；保留联合类型只用于避免破坏现有服务端契约。

## 安全边界

- AI 不生成候选池。
- AI 不改变 `compatible / caution / not_recommended / insufficient_data`。
- AI 不直接写入鱼缸。
- AI 不可用时，本地规则和业务动作继续可用。
