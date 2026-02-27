# TASK: Prompt 修正 + UI 修正 + 测试用例补全

> 优先级: P0
> 影响范围: Worker Prompt + App UI + 测试用例

请严格按照以下要求修改代码。修改完成后必须通过编译验证。

---

## Part 1: Prompt 修正（Worker）

### 文件: `05_implementation/worker/prompts/agentChat.ts`

修改 `buildAgentChatSystem` 函数返回的 System Prompt。以下是中文版和英文版都需要同步修改的内容：

#### 1.1 新增：角色边界（放在 Prompt 最前面，角色定义之后）

中文版：
```
## 角色边界（绝对禁止违反）
- 你是"点餐决策助手"，帮用户决定吃什么，但**不能下单、不能通知厨房、不能确认订单**。
- 用户确认想要某道菜时，说"已加入点餐单，可以展示给服务员～"，并通过 recommendations 输出对应 itemId。
- 禁止说"已为您下单""订单已确认""开始准备""请稍等准备"等暗示你有执行下单能力的话。
```

英文版：
```
## Role Boundaries (NEVER violate)
- You are a "dining decision assistant". You help users decide what to order, but you **cannot place orders, notify the kitchen, or confirm orders**.
- When the user confirms a dish, say "Added to your order card — show it to your waiter when ready!" and output the itemId via recommendations.
- NEVER say "order placed", "order confirmed", "preparing now", or anything implying you can execute orders.
```

#### 1.2 修改：时间感知（弱绑定，替换原来的时间相关描述）

中文版，在"当前场景"部分：
```
当前场景：
- 时间：${time}（${mealType}时段）— 可用于辅助预判用户意图，但不限制用户选择。如果用户意图与时段不符，尊重用户。禁止说出与事实矛盾的时间描述（如深夜说"适合下午茶"）。
```

英文版：
```
Current context:
- Time: ${time} (${mealType}) — Use as a hint for user intent, but never restrict user choices. If the user's intent contradicts the time, respect it. NEVER use time descriptions that contradict reality (e.g. saying "perfect for afternoon tea" at midnight).
```

#### 1.3 修改：quickReplies 规则

中文版追加：
```
- quickReplies 必须是用户视角（用户可能想说的话），不是 AI 视角
- **禁止**生成暗示 SAGE 有下单/通知厨房能力的选项（如"现在可以开始准备了吗？""帮我下单"）
- 当用户已选 ≥3 道菜时，包含一个引导查看点餐单的选项（如"看看点餐单"）
```

英文版追加：
```
- quickReplies must be from the user's perspective (what the user might say), not the AI's
- **NEVER** generate options implying SAGE can place orders or notify the kitchen (e.g. "Start preparing?", "Place my order")
- When user has selected ≥3 dishes, include an option to view the order card (e.g. "View my order")
```

#### 1.4 新增：点餐单引导规则

中文版：
```
## 点餐单规则
- 用户确认选择 → message 说"已加入点餐单，可以展示给服务员～"
- 用户问"我点了什么" → 引导"点右上角📋查看点餐单"，不要用文字重复完整菜品列表
```

英文版：
```
## Order Card Rules
- When user confirms a dish → message says "Added to your order card — show it to your waiter when ready!"
- When user asks "what did I order" → guide them: "Tap the 📋 icon to view your order card", don't repeat the full list in text
```

#### 1.5 修改：回复长度

将"每次回复不超过 3 句话"改为"每次回复**严格不超过 2 句话**"（中英文都改）。

---

## Part 2: UI 修正（App）

### 2.1 去掉右上角📷补充菜单入口

**文件**: `05_implementation/app/src/pages/AgentChatView.tsx`（或相关 Header 组件）

- 删除 AgentChat 页面 Header 右上角的相机图标按钮
- 只保留📋点餐单图标
- 左下角输入框旁的📷保留（这是 Path C 补充菜单的唯一入口）

### 2.2 点菜反馈 + 数量控制

**涉及文件**:
- `05_implementation/app/src/types/index.ts` 或 `05_implementation/shared/types.ts` — OrderItem 类型增加 `quantity: number` 字段（默认 1）
- `05_implementation/app/src/pages/AgentChatView.tsx` — AI 推荐菜品的 recommendations 渲染为可点击的「+ 加入」按钮；已加入的变为 ✓已加入（灰色禁用态）
- `05_implementation/app/src/pages/OrderCardView.tsx`（或对应组件） — 增强：
  - 每道菜显示数量，支持 +/- 按钮调整
  - 支持点击 ✕ 删除单道菜
  - 底部显示总数量和预估总价（如果有价格信息）
  - 空状态：友好提示"还没有加入菜品，去和 AI 聊聊吧～"

### 2.3 AppContext / Reducer 更新

确保 reducer 支持：
- `ADD_TO_ORDER` — 加入菜品（如已存在则 quantity +1）
- `REMOVE_FROM_ORDER` — 删除菜品
- `UPDATE_ORDER_QUANTITY` — 修改数量（quantity ≤ 0 时自动删除）

---

## Part 3: 测试用例审核与补全

审核 `06_testing/TEST_CASES.md`，确保覆盖以下场景，缺失的要补全：

### Prompt 相关
- TC: AI 不说"已为您下单"等越界用语（角色边界）
- TC: 深夜时段 AI 不说"下午茶时光"等矛盾描述（时间事实一致性）
- TC: 深夜用户想点正餐，AI 正常推荐不拒绝（时间弱绑定）
- TC: quickReplies 不包含"开始准备""帮我下单"等越界选项
- TC: 用户选 ≥3 道菜时，quickReplies 包含"看看点餐单"
- TC: 用户问"我点了什么"，AI 引导看📋而非文字复述
- TC: AI 回复不超过 2 句话

### UI 相关
- TC: AgentChat Header 右上角无📷图标，只有📋
- TC: 左下角输入框旁📷可用，可进入 Scanner（Path C）
- TC: AI 推荐菜品显示「+ 加入」按钮
- TC: 点击「+ 加入」后按钮变为 ✓已加入（灰色）
- TC: Order Card 每道菜显示数量和 +/- 按钮
- TC: Order Card 点 + 数量增加，点 - 数量减少
- TC: Order Card 数量减至 0 或点 ✕ 时菜品被删除
- TC: Order Card 底部显示总数量和预估总价
- TC: Order Card 空状态显示引导文案
- TC: 重复加入同一道菜，quantity +1 而非新增行

---

## 编译验证（必须全部通过）

```bash
# Worker
cd 05_implementation/worker && npx tsc --noEmit

# App
cd 05_implementation/app && npx tsc --noEmit && npx vite build
```

## Git Commit

完成后 commit，message: `fix: prompt role boundary + time weak-binding + order card UX`

---

## 参考文件

- 当前 Prompt: `05_implementation/worker/prompts/agentChat.ts`
- PRD: `02_product/PRD.md`（F08 点餐单、F09 Waiter Mode）
- UX 原则: `03_design/UX_PRINCIPLES.md`
- 共享类型: `05_implementation/shared/types.ts`
- 修正方案详情: 见项目根目录下引用的 PROMPT_FIX_PLAN.md
