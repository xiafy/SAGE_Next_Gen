# P0 修复审计任务

## 变更内容

2026-02-26 P0 修复完成，涉及以下文件：

1. **AppContext.tsx** — localStorage 持久化 + 系统语言自动检测 + START_ANALYZE/SET_SUPPLEMENTING actions
2. **types/index.ts** — Preferences 扩展（flavors/other）+ START_ANALYZE/SET_SUPPLEMENTING actions + AppState.analyzingFiles/isSupplementing
3. **ScannerView.tsx** — 重构为"确认即跳 Chat+ 后台分析"，图片压缩<2MB，Path C 返回逻辑
4. **AgentChatView.tsx** — Pre-Chat 状态机恢复，analyze 异步触发，isSupplementing 管理
5. **HomeView.tsx** — 动态问候语（基于时段），移除"继续上次"（DEC-018）
6. **App.tsx** — ScannerView isSupplementing prop 传递

## 审计要求

1. **代码逻辑是否与 PRD 一致**
   - F01: 动态问候语 ✓，无历史记录 ✓
   - F02: 确认即跳 Chat ✓，压缩<2MB ✓，Path C 返回 ✓
   - F06: Pre-Chat 状态机 ✓，Handoff 自动触发 ✓
   - F09: localStorage 持久化 ✓
   - F10: 系统语言检测 ✓，持久化 ✓

2. **前后端契约是否对齐**
   - PreferenceUpdate 类型与 Worker schema 对齐（restriction/flavor/other）
   - analyze 请求/响应契约

3. **错误处理是否完整**
   - Scanner 权限 denied 引导
   - analyze 失败降级
   - 网络异常 Toast

4. **状态机转换是否完整**
   - pre_chat → handing_off → chatting ✓
   - failed 状态恢复 ✓
   - isSupplementing 生命周期 ✓

5. **文档是否同步**
   - PROGRESS.md 已更新

## 输出

将审计报告写入 AUDIT_P0_REPORT.md，格式：
- 🔴 严重 / 🟡 中等 / 🟢 轻微 / ✅ 优秀
- 每项含：位置 + 影响 + 修复建议

完成后输出：AUDIT_DONE
