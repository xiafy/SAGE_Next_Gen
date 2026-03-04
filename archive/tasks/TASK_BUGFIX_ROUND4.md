# TASK: Sprint 3 Round 4 Bug Fix

## 必读文件（按顺序）

1. `CLAUDE.md` — Agent 工作手册
2. `docs/product/prd.md` — PRD（AC 验收标准）
3. `shared/types.ts` — 前后端共享类型
4. `app/src/views/ExploreView.tsx`
5. `app/src/views/AgentChatView.tsx`
6. `app/src/context/AppContext.tsx`
7. `worker/handlers/analyze.ts`
8. `worker/handlers/agentChat.ts`

---

## 修复清单

### P0-1: BUG-H — AI JSON 响应未解析，裸 JSON 出现在 Chat 气泡
**现象**：Chat 气泡直接显示 ```json {...} ``` 原文，MealPlanCard 没有渲染
**修复**：
- 检查 AgentChatView processAIResponse() 的 JSON 提取正则，确保覆盖 ```json\n...\n``` 和 ```json...``` 两种格式
- JSON.parse 失败时 catch 并 fallback 到纯文本渲染（不让 raw JSON 泄露到气泡）
- 单元测试：processAIResponse 对各种 JSON 包裹格式的健壮性

### P0-2: BUG-F — 线上 Enrich 未执行，菜品介绍/过敏源缺失
**现象**：线上真机测试无 brief/allergens/dietaryFlags
**修复**：
- 检查 worker/handlers/analyze.ts Enrich 阶段是否有错误被静默吞掉
- Enrich 失败时在 SSE 流中推送 enrich_error 事件
- 前端收到 enrich_error 时菜品卡显示"详情加载失败"轻提示
- 单元测试：Enrich 失败的 fallback 行为
- 完成报告注明是否需要检查 Worker Secret 配置

### P1-1: BUG-D/E/I — 货币符号全视图不一致
**现象**：分类切换 B->Y，Chat 卡 Y15 vs 底部 E48
**修复**：
- 确保 app/src/utils/formatPrice.ts 有统一 formatPrice(price, currency) 函数
- 全局搜索硬编码货币符号(Y E $ B THB)，全部替换为 formatPrice() 调用
- currency 从 state.menuData.currency 传入
- 单元测试：formatPrice 对 THB/EUR/USD/JPY/CNY

### P1-2: BUG-G — iOS Safari 输入框 focus 页面放大
**修复**：Chat 及所有输入框 font-size >= 16px（Tailwind text-base）
- 注释说明：iOS Safari font-size < 16px triggers auto-zoom on focus

### P1-3: OPEN-001 — Badge 改为总份数
**修复**：
- ExploreView.tsx: state.orderItems.length -> state.orderItems.reduce((sum, i) => sum + i.quantity, 0)
- 底部操作栏"已选 X 道菜"同步改为总份数
- Chat 右上角 badge 同步修改
- 单元测试：badge count reducer

### P1-4: ISSUE-008 — Explore 菜品卡语言顺序
**修复**（PRD AC10）：
- 用户语言菜名（nameTranslated）：大字 font-weight:600
- 菜单原文（nameOriginal）：小字 text-sm 次要颜色

### P2: VERIFY-001 — 核查时间/天气数据
- 检查 Pre-Chat 注入给 AI 的时间上下文是否使用正确时区
- 检查天气数据来源（真实 API vs 模拟）
- 完成报告里说明当前实现

---

## 测试要求（DEC-064）

| Bug | 测试文件 | 内容 |
|-----|----------|------|
| BUG-H | app/src/tests/ 或 worker/tests/ | JSON 解析健壮性 |
| BUG-F | worker/tests/analyze.test.ts | Enrich 失败 fallback |
| BUG-D/E/I | app/src/utils/formatPrice.test.ts | 多货币格式化 |
| OPEN-001 | AppContext.test.ts | badge count 计算 |

---

## 质量门控

```bash
cd app && npx tsc --noEmit
cd app && npm run build
cd app && npx vitest run
```

---

## 完成后

1. git add -A && git commit -m "fix: Sprint 3 Round 4 — BUG-D/E/F/G/H/I + OPEN-001 + ISSUE-008"
2. 完成报告写入 docs/bugfix-report-round4.md（每个 bug 根因 + 修复方式 + VERIFY-001 说明）
3. 运行通知命令：
   openclaw system event --text "Done: Round 4 bug fix complete. See docs/bugfix-report-round4.md" --mode now
