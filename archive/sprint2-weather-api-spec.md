# Sprint 2 Backfill Spec — Weather Context Injection

## 背景
SAGE 4+1 感知要求环境维度（天气）进入决策。

## 目标
在主 Chat Prompt 中注入简要天气信息；失败时不阻断主流程。

## 验收标准（AC）
- AC1: 有 location 时调用 Open-Meteo，超时上限 500ms
- AC2: 天气成功返回时注入 `agentChat` prompt 的当前场景区块
- AC3: 天气失败/超时时返回 `null`，主链路继续
- AC4: 经纬度非法（NaN/越界）直接返回 `null`

## 代码落点
- `worker/utils/weather.ts`
- `worker/handlers/chat.ts`
- `worker/prompts/agentChat.ts`
