# SAGE MVP Code Review 报告

## 🔴 严重问题（必须修复）
[1] `/api/analyze` 请求体契约不一致，菜单识别请求会被 Worker 拒绝
  位置: app/src/api/analyze.ts:54, worker/schemas/chatSchema.ts:61
  影响: 前端发送 `{ images:[{base64,mimeType}], language }`，而 Worker 要求 `{ images:[{data,mimeType}], context:{language,timestamp,location?} }`，会触发 `INVALID_REQUEST`，识别流程无法进入 Handoff。
  修复建议: 统一请求契约；前端改为发送 `data` 字段并补齐 `context`，或调整 Worker schema 与前端一致（推荐以前端改动为主，保持 schema 严谨）。

[2] `/api/analyze` 响应体与前端 `MenuData` 类型严重不一致，导致后续 chat/handoff 逻辑失效
  位置: worker/handlers/analyze.ts:164, app/src/api/analyze.ts:63, app/src/types/index.ts:13
  影响: Worker 返回 `{ ok, data, requestId }` 且 `data.items` 为 `nameOriginal/nameTranslated` 结构；前端直接 `as MenuData` 存入 state，运行期结构错误。随后主聊阶段传给 `/api/chat` 的 `menuData` 无法通过 `MenuAnalyzeResultSchema` 校验。
  修复建议: 在前端解包 `response.data` 并做显式 DTO 映射（Worker schema -> App view model），禁止裸 `as` 强转。

[3] Handoff 阶段缺少失败态转换，违背 `chatPhase` 状态机要求
  位置: app/src/views/AgentChatView.tsx:56, app/src/views/AgentChatView.tsx:127, app/src/types/index.ts:1
  影响: 设计要求 `pre_chat -> handing_off -> chatting/failed`，但当前失败仅 toast，不会 `SET_CHAT_PHASE('failed')`。识别/主聊失败后 UI 可能长期停留在 `handing_off`。
  修复建议: 在 `sendToAI` 的 onError 中按当前阶段显式切换 `failed`，并提供可恢复动作（重试 handoff 或返回 scanner 重拍）。

[4] SSE 错误事件被前端吞掉，可能产生“空回复成功”并错误推进阶段
  位置: app/src/api/chat.ts:97, app/src/api/chat.ts:109
  影响: Worker 会通过 SSE 下发 `{ok:false,error...}`，但前端在 `catch` 中对绝大多数 Error 执行 `continue`，导致真正错误不触发 `onError`。流结束后会走 `onDone`，可能追加空 assistant 消息，甚至把 `handing_off` 推进到 `chatting`。
  修复建议: 区分 JSON parse error 与业务 error；对 `ok:false` 直接 `throw` 到外层并触发 `onError`，不得吞掉。

[5] 主 Chat recommendations 契约前后端不一致，点单能力不可用
  位置: worker/prompts/agentChat.ts:109, app/src/views/AgentChatView.tsx:10, app/src/views/AgentChatView.tsx:216
  影响: Worker prompt要求 `recommendations:[{itemId,reason}]`，前端却按 `{id,name,nameEn,reason}` 渲染和加购；运行期 `id/name` 为空，展示与 `ADD_TO_ORDER` 映射错误。
  修复建议: 统一 recommendations DTO（建议使用 `itemId` 作为唯一字段，名称通过 `menuData.items` 查表）。

## 🟡 中等问题（应该修复）
[1] DEC-020 只在菜单识别结果做字段禁用，未对 chat 响应做硬校验
  位置: worker/schemas/menuSchema.ts:36, worker/handlers/chat.ts:74
  修复建议: 为 pre-chat/chat 响应增加 schema 校验（或后处理过滤），确保 `agentRole/agentGreeting` 在任何 AI 响应中都不会出现。

[2] 偏好提炼结果未落状态，削弱“主 Chat 不重复问已回答问题”保障
  位置: app/src/views/AgentChatView.tsx:151, app/src/api/chat.ts:32
  修复建议: 消费 `preferenceUpdates` 并更新 `state.preferences`（至少 restrictions/flavors），handoff 时将结构化偏好传入 Worker。

[3] CORS 对非白名单来源缺少显式拒绝（仅返回空 Allow-Origin）
  位置: worker/middleware/cors.ts:21
  修复建议: 对非白名单来源在业务端点直接返回 `ORIGIN_NOT_ALLOWED`，减少被非浏览器客户端绕过的风险。

[4] 速率限制为 isolate 内存级，跨实例不可控
  位置: worker/utils/rateLimit.ts:1
  修复建议: 迁移到 Cloudflare KV/Durable Objects/Rate Limiting 规则，至少为生产环境提供全局限流。

[5] GPS 相关策略未落地（DEC-021 覆盖不足）
  位置: app/src/（未发现 geolocation 调用）
  修复建议: 若产品已决定采集 GPS，应实现“请求定位 + 拒绝时静默跳过且无 UI 提示”；若不再采集，请在决策文档同步标注“已移除定位能力”。

## 🟢 轻微问题（建议优化）
[1] 多处类型断言掩盖契约风险
  修复建议: 减少 `as MenuData`、`as Record<string, unknown>` 这类宽断言，改为 runtime schema 校验 + 显式映射。

[2] `useEffect` 依赖被禁用，存在闭包陈旧值风险
  修复建议: 去掉 `eslint-disable`，用 `useCallback`/状态机事件驱动重构副作用。

[3] `sendToAI` 未在发起新请求前主动取消旧流
  修复建议: 调用 `abortRef.current?.abort()` 后再创建新 `AbortController`，避免极端情况下并发流冲突。

## ✅ 做得好的地方
- Worker 层明确实现了 DEC-028：所有 Bailian 调用都包含 `enable_thinking: false`。
- 菜单识别链路有分级降级（`qwen3-vl-plus -> qwen3-vl-flash`）与超时处理，健壮性方向正确。
- `DEC-019` 在 UI 上基本符合：识别失败后提供“重新拍摄”路径，没有文字输入兜底入口。
- 大菜单有采样策略（优先 `popular/signature`），对 token/性能友好。
- API Key 放在 Worker secret，不暴露到前端，隔离边界正确。

## 📊 总体评分
- 业务逻辑正确性: 4/10
- API契约一致性: 2/10
- 错误处理完整性: 4/10
- 代码质量: 6/10
- 综合: 4/10

## 优先修复顺序
1. 统一 `/api/analyze` 请求/响应契约，并修复前端 DTO 映射。
2. 修复 SSE 错误吞掉问题，确保 `ok:false` 必须触发 `onError`。
3. 打通 `chatPhase` 失败态：在 handoff/chat 错误时进入 `failed` 并可恢复。
4. 统一 recommendations 字段（`itemId`）与前端渲染/加购逻辑。
5. 增加 chat 响应 schema 校验，严格防止 `agentRole/agentGreeting` 泄露。
6. 补齐偏好状态更新与（若保留）GPS 静默跳过策略。
