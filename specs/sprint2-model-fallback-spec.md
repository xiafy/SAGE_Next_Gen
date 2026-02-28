# Sprint 2 Backfill Spec — Chat Model Fallback

## 背景
主 Chat 使用 `qwen3.5-plus`，在 403/5xx 等场景需要自动降级，避免用户无响应。

## 目标
当主模型失败时自动 fallback 到 `qwen3.5-flash`，保持 SSE 流不中断。

## 验收标准（AC）
- AC1: `mode=chat` 时主模型优先使用 `qwen3.5-plus`
- AC2: 遇到 403/5xx 触发 fallback 到 `qwen3.5-flash`
- AC3: `mode=pre_chat` 不触发 fallback（固定 flash）
- AC4: fallback 过程对前端透明，SSE 可继续消费

## 代码落点
- `worker/handlers/chat.ts`
- `worker/utils/bailian.ts#streamPassthroughWithFallback`
