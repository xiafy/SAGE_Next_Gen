# P0 修复审计报告

日期：2026-02-26  
范围：`AppContext.tsx` / `types/index.ts` / `ScannerView.tsx` / `AgentChatView.tsx` / `HomeView.tsx` / `App.tsx`，以及前后端契约联动（`app/src/api/*` + `worker/schemas/*` + `worker/handlers/*`）

## 🔴 严重

- 位置：`05_implementation/app/src/views/AgentChatView.tsx:129-131` + `05_implementation/app/src/context/AppContext.tsx:180-185`
- 影响：`performAnalyze` 的 `finally` 调用 `START_ANALYZE(files: [])`，而 reducer 会无条件把 `chatPhase` 设为 `pre_chat`。这会覆盖刚设置的 `failed`，导致失败态闪退/丢失，并可能停留在“识别中”UI，状态机不闭合。
- 修复建议：新增独立 action（如 `CLEAR_ANALYZING_FILES`）仅清空 `analyzingFiles`，不要改 `chatPhase`；或让 `START_ANALYZE` 只在 `files.length > 0` 时切 `pre_chat`。

- 位置：`05_implementation/app/src/views/AgentChatView.tsx:430-433` + `05_implementation/app/src/views/ScannerView.tsx:75-83`
- 影响：输入栏相机按钮只 `NAV_TO('scanner')`，未 `SET_SUPPLEMENTING(true)`。从该入口进入 Scanner 后，返回逻辑会走 Path A 回 Home，而不是 Path C 回 Chat，违背 F02 AC7。
- 修复建议：输入栏相机按钮与 TopBar 相机保持一致，先 `dispatch({ type: 'SET_SUPPLEMENTING', value: true })` 再跳转 Scanner。

## 🟡 中等

- 位置：`05_implementation/app/src/views/ScannerView.tsx:13,115-143`（仅定义/渲染 `cameraError`）
- 影响：未实现任何会触发 `setCameraError(...)` 的权限检测逻辑，`camera denied` 引导分支不可达，F02 AC5 不成立。
- 修复建议：进入页面时用 `navigator.mediaDevices.getUserMedia` 或 `navigator.permissions` 检测并设置 `cameraError`；被拒时展示引导并保留相册入口。

- 位置：`05_implementation/app/src/api/chat.ts:32-36` + `05_implementation/app/src/types/index.ts:45-57`
- 影响：已扩展的 `preferences.flavors/other` 没有被带到 chat 请求（`flavors` 固定空数组，`other` 完全丢失），会造成偏好学习结果无法在后续对话生效，前后端语义契约不完整。
- 修复建议：`buildChatParams` 透传 `dietary/flavors/other`，并与 Worker 侧 `ChatRequestSchema`/prompt 统一字段语义。

- 位置：`05_implementation/app/src/views/AgentChatView.tsx:327` + `05_implementation/worker/handlers/chat.ts:48-50`
- 影响：失败态“继续对话”直接设为 `chatting`。当失败来源是 analyze（`menuData=null`）时，后续发送会以 `mode='chat'` 请求，被 Worker 400 拒绝（`menuData is required for mode=chat`），用户进入不可用状态。
- 修复建议：仅当 `menuData` 存在时允许“继续对话”进入 `chatting`；否则回 `pre_chat` 或引导重扫。

## 🟢 轻微

- 位置：`05_implementation/app/src/views/AgentChatView.tsx:124-125`
- 影响：`SET_MENU_DATA` 已将 phase 设为 `handing_off`，随后又重复 `SET_CHAT_PHASE('handing_off')`，冗余 dispatch 增加状态噪声。
- 修复建议：删除重复 dispatch，保留单一状态写入点。

- 位置：`05_implementation/app/src/views/HomeView.tsx:8-10,14-16`
- 影响：中英午后区间映射重复（11-14 与 14-17 都是同一英文问候），不影响功能但可读性一般。
- 修复建议：合并区间或明确文案差异（如 afternoon/late afternoon）。

## ✅ 优秀

- 位置：`05_implementation/app/src/views/HomeView.tsx:49-64`
- 影响：F01 动态问候语与“无历史记录”要求已落地，且主入口保持单一视觉焦点。
- 修复建议：无。

- 位置：`05_implementation/app/src/views/ScannerView.tsx:51-73`
- 影响：F02“确认即跳 Chat + 后台分析”与压缩 `<2MB` 已实现。
- 修复建议：无。

- 位置：`05_implementation/app/src/views/AgentChatView.tsx:72-95,213-215`
- 影响：F06 `pre_chat -> handing_off -> chatting` 主链路存在，handoff 自动触发逻辑已接通。
- 修复建议：无。

- 位置：`05_implementation/app/src/context/AppContext.tsx:12-27,206-213`
- 影响：F09 localStorage 启动读取 + 变更持久化已实现。
- 修复建议：无。

- 位置：`05_implementation/app/src/context/AppContext.tsx:33-39` + `05_implementation/app/src/views/SettingsView.tsx:64-79`（语言切换入口）
- 影响：F10 系统语言自动检测与手动切换并存，且可持久化。
- 修复建议：无。

- 位置：`05_implementation/app/src/types/index.ts:52-57` + `05_implementation/worker/schemas/chatSchema.ts:4-9`
- 影响：`PreferenceUpdate` 的 `restriction/flavor/other` 枚举已与 Worker schema 对齐。
- 修复建议：无。

- 位置：`05_implementation/app/src/api/analyze.ts:51-70` + `05_implementation/worker/schemas/chatSchema.ts:61-70` + `05_implementation/worker/handlers/analyze.ts:104-136`
- 影响：analyze 请求/响应契约（`images[].data+mimeType`、`context.language+timestamp`、`{ok,data,requestId}`）整体对齐，且 Worker 含主模型失败降级。
- 修复建议：无。

- 位置：`PROGRESS.md`（Sprint 1 Phase 5 段落）
- 影响：文档已同步记录本轮 P0 修复内容。
- 修复建议：无。

## 结论

P0 修复主方向正确，但当前仍有 2 个会导致用户路径错误/状态机异常的严重问题（`START_ANALYZE` 覆盖 phase、Path C 次入口未设 `isSupplementing`），建议先修复这两项再验收；其余为中低优先级一致性与健壮性补强。
