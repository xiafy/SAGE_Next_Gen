# SAGE App Phase 3 — API 集成任务

在 `05_implementation/app/` 目录，将现有骨架与 Cloudflare Worker 接通，实现 Path A 完整链路。

## 上下文（必读）

### Worker 已提供的端点（本地 wrangler dev 跑在 8787）
- `GET  http://localhost:8787/api/health`
- `POST http://localhost:8787/api/analyze` — 菜单图片识别，返回完整 JSON
- `POST http://localhost:8787/api/chat`    — AI 对话，SSE 流式响应（`text/event-stream`）

### /api/chat SSE 数据格式
每个 SSE 事件：`data: {"choices":[{"delta":{"content":"..."}}]}`
结束事件：`data: [DONE]`
错误事件：`data: {"ok":false,"error":{"code":"...","message":"..."}}`

### /api/chat 请求体
```json
{
  "mode": "pre_chat",
  "messages": [{"role":"user","content":"..."}],
  "menuData": null,
  "preferences": {"restrictions":[],"flavors":[],"history":[]},
  "context": {"language":"zh","timestamp":1234567890000}
}
```
主 Chat 时 `mode: "chat"`，`menuData` 为菜单识别结果。

### AppContext 现有状态机
- `chatPhase`: `"pre_chat" | "handing_off" | "chatting" | "failed"`
- Actions: `NAV_TO` / `SET_MENU_DATA` / `SET_CHAT_PHASE` / `ADD_MESSAGE` / `ADD_TO_ORDER` 等

---

## 任务清单

### T1 — API 客户端层

创建 `src/api/` 目录，实现：

**`src/api/config.ts`**
```typescript
// Worker base URL，从环境变量读取
export const WORKER_BASE = import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8787';
```

**`src/api/analyze.ts`**
- `analyzeMenu(images: File[], language: 'zh'|'en'): Promise<MenuData>`
- 每张图片读为 base64，mimeType 从 File.type 取（image/jpeg 等）
- HEIC 文件 → 转为 image/jpeg（使用 `browser-image-compression` 库）
- 调用 `POST /api/analyze`，等待完整 JSON 响应

**`src/api/chat.ts`**
- `streamChat(params: ChatParams, onChunk: (text: string) => void, onDone: () => void, onError: (err: Error) => void): AbortController`
- 用 `fetch` + `ReadableStream` 读取 SSE
- 解析每个 `data:` 行，提取 `choices[0].delta.content`
- 遇到 `[DONE]` 调用 onDone
- 遇到错误数据或 HTTP 非 200 调用 onError
- 返回 AbortController（供组件 unmount 时取消）

安装依赖：`npm install browser-image-compression`

创建 `.env.local`（不提交）：
```
VITE_WORKER_URL=http://localhost:8787
```

创建 `.env.example`（提交）：
```
VITE_WORKER_URL=http://localhost:8787
```

---

### T2 — ScannerView 接通 /api/analyze

改造 `src/views/ScannerView.tsx`：

**图片选择**
- 用 `<input type="file" accept="image/*" multiple capture="environment">` 替代占位符
- 选中后显示缩略图预览（最多 5 张），支持删除单张
- "识别菜单"按钮仅在有图片时显示

**识别逻辑**
```
点击"识别菜单"
→ 显示 Loading 态（"AI 正在识别菜单…"）
→ 调用 analyzeMenu()
→ 成功：dispatch SET_MENU_DATA(result)，dispatch NAV_TO('chat')
→ 失败：显示错误提示 + "重新拍摄"按钮（DEC-019：不做文字输入兜底）
```

**状态管理**
- 本地 state: `files: File[]`, `status: 'idle'|'loading'|'error'`, `errorMsg: string`

---

### T3 — AgentChatView 接通 /api/chat（完整 Pre-Chat → Handoff → 主 Chat 链路）

改造 `src/views/AgentChatView.tsx`（这是最核心的部分）：

#### Pre-Chat 阶段（chatPhase === 'pre_chat'）

**组件挂载时**：
1. 派发本地 Icebreaker 消息（AI 消息，不调 API）：
   - 中文："菜单识别中，先聊两句～今天几位用餐？"
   - 英文："Scanning your menu! How many dining today?"
2. 显示顶部进度条（"菜单识别中…"动画）

**用户发送消息时（chatPhase === 'pre_chat'）**：
1. 立即显示用户消息气泡
2. 显示 AI loading 气泡（三点动画）
3. 调用 `streamChat({ mode: 'pre_chat', messages: [...history, userMsg], menuData: null, ... })`
4. SSE chunk 实时追加到 AI 气泡文字（打字效果）
5. Done 后：解析最后完整文本，提取 `preferenceUpdates` 和 `quickReplies`
   - 注意：AI 返回的是 JSON 字符串，需要解析：`JSON.parse(fullText)`
   - `preferenceUpdates` → dispatch 到 AppContext（可先 console.error 记录，UI 暂不展示）
   - `quickReplies` → 更新快捷回复按钮
   - `message` → 显示为最终 AI 消息

#### Handoff 阶段（chatPhase === 'handing_off'）

当 `menuData` 从 null 变为有值时（SET_MENU_DATA 触发），自动进入 Handoff：
1. dispatch `SET_CHAT_PHASE('handing_off')`
2. 显示系统消息："菜单识别完成！正在为你分析…"
3. 立即调用主 Chat API（`mode: 'chat'`），携带：
   - `messages`: 全部 Pre-Chat 历史（含用户和 AI 消息）
   - `menuData`: 识别结果
   - `preferences`: 从 AppContext 取
4. SSE 流式接收，打字效果展示 AI 第一条推荐
5. Done 后：dispatch `SET_CHAT_PHASE('chatting')`

#### 主 Chat 阶段（chatPhase === 'chatting'）

用户继续发送消息：
1. 调用 `streamChat({ mode: 'chat', messages: [...allHistory], menuData, ... })`
2. 同样流式展示

#### 推荐卡片

AI 回复解析出 `recommendations` 时，在消息气泡下方显示菜品卡片：
- 卡片内容：菜名（原文）+ 翻译 + 理由
- "加入点单"按钮 → dispatch `ADD_TO_ORDER(menuItem)`

#### 补充菜单入口

顶部右侧相机图标 → NAV_TO('scanner')（不重置 chatPhase）

---

### T4 — OrderCardView 完善

- 从 AppContext 的 `orderItems` 渲染真实数据（骨架已有，确认无 mock）
- 数量为 0 时自动移除该菜品
- 合计金额实时计算

---

### T5 — 错误处理 & 边界情况

- 网络断开：显示"网络异常，请重试"Toast（简单 fixed bottom 提示，3s 消失）
- 识别超时（>30s）：显示"识别超时，请重新拍摄"
- Pre-Chat JSON 解析失败：降级为纯文本显示，不崩溃
- 组件 unmount：取消 fetch（调用 AbortController.abort()）

---

### T6 — 验证 & 构建

1. `npx tsc --noEmit` — 零错误
2. `npm run build` — 构建成功
3. 手动冒烟测试（需要先启动 worker dev）：
   - 上传一张图片 → 识别 → Pre-Chat 对话 → 主 Chat 推荐 → 加入点单 → 展示给服务员

---

### T7 — 文档同步（完成清单，缺一不可）

完成以上 T1-T6 后，必须执行：

1. 更新 `PROGRESS.md`：
   - Sprint 1 Phase 3 章节下，逐一标注 T1-T6 为 ✅
   - 工作日志追加今日 Phase 3 完成记录

2. 更新 `EXECUTION_STATE.md`：
   - Phase 3 任务队列 T1-T8 全部标 ✅
   - 更新"当前执行批次"为 Phase 4（完善+部署）

3. 如有新决策 → 追加 `DECISIONS.md`

文件路径：`/Users/xiafybot/Documents/claw-outputs/projects/SAGE_Next_Gen/`

---

## 完成信号

所有任务（T1-T7）全部完成后，输出：

```
PHASE3_DONE
```
