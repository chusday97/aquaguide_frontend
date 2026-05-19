# AquaGuide Module Architecture

第一阶段目标：只新增模块边界和公共服务，不改变现有页面行为。

## Rules

- 每个功能必须通过 `modules/*/*.module.ts` 暴露公开入口。
- 每个 module 必须有 `*.schema.ts` 定义 input/output schema。
- module 不允许直接修改其他 module 的内部逻辑。
- 公共能力统一放在 `services/*`。
- 所有写入必须先经过 schema 校验。
- 所有 service 必须做空值判断、错误处理和日志记录。

## Public Services

- `aiService`: AI 调用统一入口。
- `databaseService`: 数据读写统一入口，当前适配 localStorage。
- `authService`: 用户鉴权统一入口，当前返回本地用户。
- `googleSheetsService`: Google Sheets 写入统一入口，当前为未连接占位。
- `loggerService`: 日志统一入口。
- `localStorageService`: 浏览器本地存储适配器。

## Migration Strategy

现有页面暂时不迁移业务逻辑。`*.ui.tsx` 只包裹旧页面，后续逐步把页面内逻辑迁移到 module/service。

