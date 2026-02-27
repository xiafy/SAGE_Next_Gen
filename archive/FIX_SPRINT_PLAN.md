# SAGE PRD 审计修复 Sprint 计划

**审计完成时间**: 2026-02-26 16:42
**修复目标**: 15 项🔴严重问题全部修复，PRD AC 覆盖率从 43% → 100%
**预计工时**: 9.5 小时

---

## P0 修复（核心链路，必须完成）

### T1: F06 Pre-Chat 状态机修复（DEC-027）
**问题**: Path A 下实际不会进入 pre_chat，首条是 handoff 文案
**修复内容**:
- 重构 ScannerView: 确认后立刻 `NAV_TO chat` + 后台 analyze
- AgentChatView: 恢复 pre_chat → handing_off → chatting 状态机
- 修复 failed 状态 UI（隐藏输入区/推荐区）
**文件**: `views/ScannerView.tsx`, `views/AgentChatView.tsx`, `context/AppContext.tsx`
**预计**: 2h

### T2: F09/F10 localStorage 持久化 + i18n
**问题**: 偏好/语言仅内存态，不跨 session；无系统语言检测
**修复内容**:
- AppContext 启动时读取 localStorage 初始化
- preferences reducer 增加持久化逻辑
- 建立 i18n 字典层 (`src/i18n/`)
- 替换所有硬编码文案
**文件**: `context/AppContext.tsx`, `types/index.ts`, `i18n/zh.ts`, `i18n/en.ts`, 所有 views
**预计**: 2h

### T3: F02 Scanner 流程重构
**问题**: 主流程错误，确认即跳 Chat + 后台识别
**修复内容**:
- ScannerView 确认后直接 dispatch `NAV_TO chat` + `START_ANALYZE`
- analyze 调用移至 AgentChatView useEffect
- Path C 返回逻辑修复（回 Chat 而非 Home）
- 图片压缩目标改为<2MB
- 增加权限 denied 引导文案
**文件**: `views/ScannerView.tsx`, `views/AgentChatView.tsx`, `api/analyze.ts`
**预计**: 1.5h

---

## P1 修复（重要功能）

### T4: F04 GPS 静默请求 + 注入 context
**文件**: `hooks/useAppState.ts`, `api/chat.ts`
**预计**: 1h

### T5: F03 错误文案映射层
**文件**: `views/ScannerView.tsx`, `views/AgentChatView.tsx`
**预计**: 0.5h

### T6: F08 wakeLock + 字号 + 货币适配
**文件**: `views/WaiterModeView.tsx`, `types/index.ts`
**预计**: 1h

---

## P2 修复（体验优化）

### T7: F01 动态问候语 + 移除"继续上次"
**文件**: `views/HomeView.tsx`
**预计**: 0.5h

### T8: F02 图片压缩<2MB + 权限引导
**文件**: `views/ScannerView.tsx`
**预计**: 1h

---

## 执行顺序

```
T1 (F06 Pre-Chat) → T3 (F02 Scanner) → T2 (F09/F10 持久化+i18n)
    ↓
T4 (GPS) → T5 (错误文案) → T6 (wakeLock)
    ↓
T7 (问候语) → T8 (压缩)
    ↓
Codex 审计 → 真机验收
```

---

## 验收标准

- [ ] `npm run build` 零错误
- [ ] `tsc --noEmit` 零错误
- [ ] 15 项🔴问题全部修复
- [ ] Codex 审计评分 ≥ 8/10
- [ ] 真机验收通过（iPhone Safari + Android Chrome）

---

## 状态追踪

| 任务 | 状态 | 完成时间 |
|------|------|---------|
| T1: F06 Pre-Chat | ⏳ 待开始 | — |
| T2: F09/F10 | ⏳ 待开始 | — |
| T3: F02 Scanner | ⏳ 待开始 | — |
| T4: F04 GPS | ⏳ 待开始 | — |
| T5: F03 错误文案 | ⏳ 待开始 | — |
| T6: F08 wakeLock | ⏳ 待开始 | — |
| T7: F01 问候语 | ⏳ 待开始 | — |
| T8: F02 压缩 | ⏳ 待开始 | — |
