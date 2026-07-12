# AquaGuide AI 对外入口审计

## 允许的产品入口

1. **AI 建缸规划**：鱼缸页唯一 AI 主入口，用于理解目标、补充信息和组织本地规则方案。
2. **让 AI 帮我解读**：只允许出现在规则依据或详情折叠区，解释既有规则结果。

## 已收敛入口

- 独立 `AIAssistant` 页面没有应用路由，仅保留兼容代码。
- 旧“智能混养推荐”弹窗及页面级 `recommendation_assist` 调用已移除。
- 缸内生物推荐只展示本地规则候选，不再提供单独的 AI 排序说明按钮。
- 今日建议与鱼种详情的 AI 解读保持低频，不作为主 CTA。

## 兼容接口

- `risk_audit`
- `risk_explanation`
- `recommendation_assist`

兼容接口仍保留在 client/server，但页面层不得直接调用 `risk_audit` 或 `recommendation_assist`。`risk_explanation` 只允许由低频解释入口调用。

## 安全边界

- AI 不生成候选池。
- AI 不改变 `compatible / caution / not_recommended / insufficient_data`。
- AI 不直接写入鱼缸。
- AI 不可用时，本地规则和业务动作继续可用。
