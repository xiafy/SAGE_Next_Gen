# P1/P2 修复任务

## 任务概述

修复 Codex 审计报告中剩余的🟡中等问题，提升 PRD AC 覆盖率。

## 修复清单

### 1. F02 相机权限检测逻辑（🟡中等 → 🔴严重）
**文件**: `05_implementation/app/src/views/ScannerView.tsx`
**问题**: `cameraError` 状态已定义但从未设置，权限拒绝分支不可达，F02 AC5 不成立
**修复要求**:
- 组件 mount 时检测相机权限（`navigator.mediaDevices.getUserMedia({ video: true })`）
- 权限被拒时调用 `setCameraError('denied')`
- 显示友好的引导文案（中英双语）
- 相册入口始终可用

### 2. F03 错误文案映射层（🟡中等）
**文件**: `05_implementation/app/src/views/AgentChatView.tsx`, `05_implementation/app/src/views/ScannerView.tsx`
**问题**: 用户可见错误存在技术细节泄漏（如 `Menu analysis failed (502): ...`）
**修复要求**:
- 建立错误码→用户文案映射表（参考 Worker 端 `ERROR_MESSAGES`）
- 映射关系：
  - 400/413 → "请求格式错误，请重试"
  - 429 → "请求过于频繁，请稍后再试"
  - 502/503/504 → "AI 服务暂时不可用，请重试"
  - timeout → "识别超时，请重新拍摄"
  - 其他 → "识别失败，请重试"
- 错误提示不显示 HTTP 状态码和技术细节

### 3. F08 展示模式优化（🟡中等）
**文件**: `05_implementation/app/src/views/WaiterModeView.tsx`
**问题**: 
- 字号 `text-2xl`≈24px，低于 PRD 要求的 28px
- 未接入 `navigator.wakeLock` 屏幕常亮
- 货币符号硬编码 `¥`
**修复要求**:
- 字号改为 `text-[28px]` 或更大
- 接入 Wake Lock API（不可用时降级提示）
- 使用 `menuData.currency` 或 `Intl.NumberFormat` 自动适配币种

### 4. F04 GPS 静默请求（🟡中等）
**文件**: `05_implementation/app/src/hooks/useAppState.ts` 或 `AppContext.tsx`
**问题**: GPS 完全未实现
**修复要求**:
- App 启动时静默请求 GPS（`navigator.geolocation.getCurrentPosition`）
- 权限被拒时不显示任何提示（DEC-021）
- 权限通过时获取大致位置（城市级），存储到 state 供后续注入 AI context
- 所有失败场景不影响主流程

### 5. 前后端契约对齐（🟡中等）
**文件**: `05_implementation/app/src/api/chat.ts`
**问题**: `buildChatParams` 中 `flavors` 固定空数组，`other` 完全丢失
**修复要求**:
- 透传 `preferences.dietary/flavors/other` 到 API 请求
- 与 Worker 端 `ChatRequestSchema` 字段对齐

## 验收标准

- [ ] `pnpm build` 零错误
- [ ] `tsc --noEmit` 零错误
- [ ] 所有🟡中等问题标记为✅
- [ ] PROGRESS.md 更新

## 输出

修复完成后将结果写入 `CODEX_FIX_P1_REPORT.md`，包含：
- 每个任务的修复状态
- 关键代码变更摘要
- 构建验证结果

完成后输出：CODEX_FIX_DONE
