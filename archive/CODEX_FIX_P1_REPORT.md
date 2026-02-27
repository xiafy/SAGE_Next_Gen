# CODEX_FIX_P1_REPORT

## 修复状态

- ✅ F02 相机权限检测逻辑（`05_implementation/app/src/views/ScannerView.tsx`）
  - 组件 mount 时调用 `navigator.mediaDevices.getUserMedia({ video: true })` 探测权限。
  - 权限拒绝时设置 `cameraError = 'denied'`。
  - 增加中英双语引导文案。
  - 拆分相机/相册双入口（`cameraInputRef` + `albumInputRef`），相册入口始终可用。

- ✅ F03 错误文案映射层（`05_implementation/app/src/views/AgentChatView.tsx`, `05_implementation/app/src/utils/errorMessage.ts`）
  - 新增统一映射函数 `toUserFacingError`。
  - 覆盖映射：
    - `400/413` → 请求格式错误，请重试
    - `429` → 请求过于频繁，请稍后再试
    - `502/503/504` → AI 服务暂时不可用，请重试
    - `timeout` → 识别超时，请重新拍摄
    - 其他 → 识别失败/请求失败，请重试
  - `AgentChatView` 的分析/聊天错误 toast 全部改为用户文案，不再展示 HTTP 状态码或技术细节。

- ✅ F08 展示模式优化（`05_implementation/app/src/views/WaiterModeView.tsx`）
  - 菜名字号提升到 `text-[30px]`，金额字号 `text-[28px]`。
  - 接入 Wake Lock API（`navigator.wakeLock.request('screen')`），并在不可用时显示降级提示。
  - 价格显示改为 `Intl.NumberFormat`，币种优先使用 `menuData.currency`（无效时回退）。

- ✅ F04 GPS 静默请求（`05_implementation/app/src/context/AppContext.tsx`, `05_implementation/app/src/types/index.ts`）
  - App 启动静默调用 `navigator.geolocation.getCurrentPosition`。
  - 权限拒绝/失败全部静默处理，不影响主流程。
  - 成功时存储粗粒度位置（城市级近似，lat/lng 保留 2 位小数）到全局 state。
  - 位置已注入后续 AI 请求 context（analyze/chat）。

- ✅ 前后端契约对齐（`05_implementation/app/src/api/chat.ts`）
  - `buildChatParams` 改为透传：
    - `restrictions <- preferences.dietary`
    - `flavors <- preferences.flavors`
    - `history <- preferences.other`
  - 与 Worker `ChatRequestSchema` 字段对齐。

## 关键代码变更摘要

- 新增：`05_implementation/app/src/utils/errorMessage.ts`
- 修改：
  - `05_implementation/app/src/views/ScannerView.tsx`
  - `05_implementation/app/src/views/AgentChatView.tsx`
  - `05_implementation/app/src/views/WaiterModeView.tsx`
  - `05_implementation/app/src/context/AppContext.tsx`
  - `05_implementation/app/src/types/index.ts`
  - `05_implementation/app/src/api/chat.ts`
  - `05_implementation/app/src/api/analyze.ts`
  - `PROGRESS.md`

## 构建验证结果

- ✅ `pnpm build`（目录：`05_implementation/app`）通过
  - 产物：`dist/assets/index-BLarMTLQ.js` 286.26 kB（gzip 92.80 kB）
- ✅ `pnpm -s tsc --noEmit`（目录：`05_implementation/app`）通过（零错误）

## 验收结论

- ✅ 所有本次清单中的🟡中等问题已完成修复并验证。
