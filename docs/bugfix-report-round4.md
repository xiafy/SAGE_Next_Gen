# Bugfix Report — Round 4

Sprint 3 验收 Round 4 修复报告

## 质量门禁

| Check | Result |
|-------|--------|
| `tsc --noEmit` | PASS |
| `npm run build` | PASS (290KB / 90KB gzipped) |
| `vitest run` | 116 tests, 12 files, all PASS |

---

## P0-1: BUG-H — AI JSON 响应未解析，聊天气泡显示原始 JSON

**根因**: `processAIResponse()` 中，当 AI 返回 `{"message":"...","quickReplies":[...]}` 包裹在 ` ```json ``` ` 代码块中时，`extractJsonBlock` 能提取 JSON，但 `parseJsonBlock` 只识别 `mealPlan`/`orderAction` 类型，对普通 chat JSON 返回 `null`。之后 L3 fallback 仅用 regex 剥离代码块，未尝试解析 `message` 字段。

**修复**:
- `app/src/views/AgentChatView.tsx`: 提取 `tryParseChatJson()` 内部函数，在 `parseJsonBlock` 返回 null 时优先尝试解析 `message/quickReplies/recommendations` 字段
- 修复 fallback regex 使其更宽容匹配

**测试**: `app/src/utils/__tests__/processAIResponse.test.ts` — 7 个用例覆盖各种 JSON 包装格式

---

## P0-2: BUG-F — Enrich 步骤未执行，菜品缺少 brief/allergens/dietaryFlags

**根因**: `worker/handlers/analyze.ts` 中 Enrich catch block 仅 `logger.warn`，未通知前端。`__allergenCodes` 临时字段在失败时也未清理。

**修复**:
- `worker/handlers/analyze.ts`: catch 块中添加 `__allergenCodes` 清理 + `onProgress` 推送 `enrich_error` 事件
- `shared/types.ts`: `AnalyzeProgressStage` 类型增加 `'enrich_error'`
- `app/src/views/AgentChatView.tsx`: progress 回调中检测 `enrich_error` 并 `showToast`

---

## P1-1: BUG-D/E/I — 货币符号跨视图不一致

**根因**: `ExploreView.tsx` 中非 "all" 标签页的 `DishCard` 缺少 `currency` prop，导致 fallback 为 CNY。

**修复**: `app/src/views/ExploreView.tsx` — 添加 `currency={state.menuData?.currency}` prop

---

## P1-2: BUG-G — iOS Safari 输入框自动缩放

**根因**: `<input>` 的 `font-size` 为 `text-sm`（14px），iOS Safari 在 focus 时对 < 16px 字体触发自动缩放。

**修复**:
- `app/src/views/AgentChatView.tsx`: 聊天输入框 `text-sm` → `text-base`
- `app/src/views/SettingsView.tsx`: 偏好输入框 `text-sm` → `text-base`

---

## P1-3: OPEN-001 — Badge 应显示总数量而非品种数

**根因**: `ExploreView.tsx` 中 badge 使用 `state.orderItems.length`（品种数），应使用 `reduce((sum, oi) => sum + oi.quantity, 0)`（总数量）。

**修复**: `app/src/views/ExploreView.tsx` — badge 改用 reduce 计算总数量

**测试**: `app/src/context/__tests__/appReducer.test.ts` — 3 个新用例验证总数量计算

---

## P1-4: ISSUE-008 — Explore 卡片语言顺序

**根因**: `DishCard.tsx` 中 `nameTranslated` 和 `nameOriginal` 字号/字重无明显层级区分。

**修复**: `app/src/components/DishCard.tsx` — `nameTranslated` 从 `text-sm font-bold` → `text-base font-semibold`，`nameOriginal` 从 `text-xs` → `text-sm`

---

## P2: VERIFY-001 — 时间/天气数据上下文检查

**结论**:
- **天气**: 正常。使用 Open-Meteo 免费 API，500ms 超时，失败时 graceful fallback (`null`)
- **时间**: 存在时区问题。`getMealType()` 在 `worker/prompts/agentChat.ts` 中使用 `new Date(timestamp).getHours()`，Cloudflare Workers 环境默认 UTC，导致用餐时段判断可能偏移。前端传递的 `timestamp: Date.now()` 是 UTC 毫秒时间戳，Worker 端应使用用户时区偏移进行本地化。**建议后续 Sprint 修复**。

---

## 文件变更清单

| File | Change |
|------|--------|
| `app/src/views/AgentChatView.tsx` | BUG-H (processAIResponse), BUG-F (enrich_error toast), BUG-G (input font-size) |
| `app/src/views/ExploreView.tsx` | BUG-D/E/I (currency prop), OPEN-001 (badge qty) |
| `app/src/views/SettingsView.tsx` | BUG-G (input font-size) |
| `app/src/components/DishCard.tsx` | ISSUE-008 (name hierarchy) |
| `worker/handlers/analyze.ts` | BUG-F (enrich error handling) |
| `shared/types.ts` | BUG-F (AnalyzeProgressStage + enrich_error) |
| `app/src/utils/__tests__/processAIResponse.test.ts` | NEW — BUG-H tests (7 cases) |
| `app/src/context/__tests__/appReducer.test.ts` | OPEN-001 tests (3 cases) |
