# Sprint 2 Backfill Spec — Error Suggestion Copy

## 背景
仅有 error code/message 对用户不够友好，需要下一步建议。

## 目标
所有标准错误返回统一包含建议文案（中英文）。

## 验收标准（AC）
- AC1: 错误响应包含 `suggestion` / `suggestionZh`
- AC2: 9 个标准错误码均配置建议文案
- AC3: 前端可按语言映射到用户可执行建议

## 代码落点
- `worker/utils/errors.ts`
- `shared/types.ts`
- `app/src/utils/errorMessage.ts`
