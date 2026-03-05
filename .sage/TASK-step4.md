# TASK: Step 4 — E2E 自动化 (DEC-075)

## 必读文件
- `CLAUDE.md` — Agent 工作手册
- `app/playwright.config.ts` — Playwright 配置（已更新 screenshot: 'on'）
- `app/tests/e2e/smoke.spec.ts` — 现有 E2E 测试
- `shared/types.ts` — 共享类型（MenuAnalysisResult 等）
- `tests/fixtures/expected/menu-thai-02.json` — mock fixture 参考格式
- `app/src/views/` — 所有视图组件
- `app/src/components/` — 所有 UI 组件
- `app/src/context/AppContext.tsx` — 状态管理

## 任务清单

### 4b: 补 data-testid（~10 个核心组件）

规范：`data-testid="sage-{component}-{element}"`

需要添加 data-testid 的位置（优先级从高到低）：

1. **HomeView**: sage-home-scan-btn, sage-home-continue-btn, sage-home-greeting
2. **ScannerView**: sage-scanner-upload-btn, sage-scanner-back-btn, sage-scanner-preview
3. **AgentChatView**: sage-chat-input, sage-chat-send-btn, sage-chat-messages, sage-chat-bubble
4. **ExploreView**: sage-explore-dish-card, sage-explore-back-btn
5. **OrderCardView**: sage-order-list, sage-order-total, sage-order-dish-item
6. **WaiterModeView**: sage-waiter-panel, sage-waiter-comm-btn
7. **SettingsView**: sage-settings-lang-zh, sage-settings-lang-en
8. **DishCard**: sage-dish-card, sage-dish-name, sage-dish-price, sage-dish-brief
9. **MealPlanCard**: sage-mealplan-card, sage-mealplan-add-btn
10. **TopBar**: sage-topbar, sage-topbar-back-btn

不要删除现有的 aria labels（E2E 测试可以两者并用）。

### 4c: API Mock 层

创建 `app/tests/e2e/mocks/api-mock.ts`：

```typescript
import { Page } from '@playwright/test';

// 标准 mock fixture: thai-dense-01 识别结果
export async function mockAnalyzeAPI(page: Page) {
  // 拦截 POST /api/analyze
  await page.route('**/api/analyze', async (route) => {
    // 读取 fixture 并返回 SSE 流式响应
    // 第一段: progress events
    // 最后: result event with MenuAnalysisResult JSON
    // 参考 tests/fixtures/expected/menu-thai-02.json 格式
  });
}

export async function mockChatAPI(page: Page) {
  // 拦截 POST /api/chat
  // 返回固定的 streaming text response
  await page.route('**/api/chat', async (route) => {
    // SSE: data: {"choices":[{"delta":{"content":"这是一道经典泰式..."}}]}
  });
}
```

关键：
- analyze API 返回 SSE 格式（`text/event-stream`）
- 看 `worker/handlers/analyze.ts` 了解真实 SSE 格式
- chat API 也是 SSE 流式
- fixture 数据用 `tests/fixtures/expected/menu-thai-02.json`

### 4d: main-flow.spec.ts（完整主路径 ≤30s）

创建 `app/tests/e2e/main-flow.spec.ts`：

```
Home → 点击 Scan → Scanner 页 → 模拟上传图片 → (API mock) → 
Chat 页（显示识别结果）→ 点击菜品 → Explore → 
返回 Chat → 发送消息 → AI 回复 → 
点击 Order → 查看订单 → 
Waiter Mode → 结束
```

每个关键步骤截图（用 `await page.screenshot({ path: 'screenshots/step-name.png' })`）

### 4e: regression.spec.ts

创建 `app/tests/e2e/regression.spec.ts`：
- BUG-K: processAIResponse 中 MealPlan JSON 正确 dispatch
- BUG-J: MealPlanCard 在 Chat 中渲染

### 4f: 多图补充扫描 E2E

在 main-flow 或单独文件中测试：
- 先扫描 1 张图 → 结果显示
- 再补充扫描 1 张图 → 结果合并
- 用 english-03~07 fixture（如果有 mock）

## 约束
- 不修改 Worker 代码
- 不修改 shared/types.ts（除非 data-testid 需要）
- 所有新测试必须能在无网络（mock）环境下通过
- 用 `npx playwright test` 在 app/ 目录下运行验证
- 组件修改不能破坏现有 106 个单测（`cd app && npx vitest run`）

## 验收标准
- [ ] ≥10 个组件有 data-testid
- [ ] API mock 层可拦截 analyze + chat
- [ ] main-flow.spec.ts 全程 ≤30s，有截图
- [ ] regression.spec.ts 覆盖 BUG-K/J
- [ ] 现有 106 单测不受影响
