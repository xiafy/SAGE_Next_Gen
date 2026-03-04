# Spec: MealPlan & Order System

> 版本: 1.0 | 日期: 2026-03-02
> 覆盖决策: DEC-052v2, DEC-054, DEC-055, DEC-057, DEC-058, DEC-059

---

## 1. 目标与背景

让 AI 以结构化方案卡片（MealPlanCard）呈现用餐方案，用户可逐道替换、整套加入订单。同时支持 AI 在对话中直接操作 Order（增/删/改）。

**核心原则**：
- MealPlanCard = AI 的"提案"，Order = 用户的"决定"（DEC-055B）
- 课程结构由 AI 动态生成，不硬编码西餐逻辑（DEC-059）
- Order 是 Waiter Mode 唯一数据源（DEC-057）

---

## 2. 数据结构

### 2.1 MealPlan（AI 输出的方案）

```typescript
/** AI 生成的用餐方案，嵌入在流式回复末尾的 JSON 代码块中 */
export interface MealPlanItem {
  dishId: string;           // 对应 MenuItem.id
  name: string;             // 翻译后菜名（用户语言）
  nameOriginal: string;     // 原文菜名
  price: number | null;
  reason: string;           // 推荐理由（一句话）
  quantity: number;          // 默认 1
}

export interface MealPlanCourse {
  name: string;             // 课程名，AI 动态生成（如"凉菜"/"Starter"/"刺身"）
  items: MealPlanItem[];
}

export interface MealPlan {
  version: number;          // 递增版本号，用于并发防抖
  totalEstimate: number;    // 预估总价
  currency: string;         // 货币代码
  rationale: string;        // 整体搭配逻辑（一段话）
  courses: MealPlanCourse[]; // 有序数组，顺序由 AI 根据餐饮文化决定
  diners: number;           // 建议用餐人数
}
```

### 2.2 OrderAction（AI 操作 Order 的指令，DEC-058）

```typescript
export type OrderActionType = 'add' | 'remove' | 'replace';

export interface OrderAction {
  orderAction: OrderActionType;
  remove?: { dishId: string };
  add?: { dishId: string; qty: number };  // 前端从 menuData 补全 name/nameOriginal/price
}
```

> **qty 语义**：add.qty 为**目标数量**（不是增量）。例如用户说"要3份 Pad Thai"，则 qty=3，前端直接设置 Order 中该 dishId 的数量为 3。

> **replace 边界**：replace 操作要求 add.dishId ≠ remove.dishId，相同时前端忽略该指令。

### 2.3 OrderItem（现有，无需修改）

```typescript
// 已存在于 AppContext reducer
export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}
```

---

## 3. MealPlanCard 组件规格

### 3.1 Props & Events

```typescript
interface MealPlanCardProps {
  mealPlan: MealPlan;
  isZh: boolean;
  currency: string;
  isActive: boolean;             // false = 已被替换（灰化）
  isReplacing: boolean;          // 某道菜正在请求替换中
  replacingDishId: string | null;
  onReplaceDish: (dishId: string, dishName: string) => void;
  onAddAllToOrder: () => void;
}
```

### 3.2 渲染规格

- 顶部：搭配逻辑说明（`rationale`），小字灰色
- 按 `courses` 数组顺序渲染，每个 course 一个分组标题
- 每道菜一行：菜名（翻译+原文）、价格、推荐理由（小字）、「🔄 换一道」按钮
- 底部：预估总价 + 用餐人数 + 「🍽 整套加入订单」按钮（主色调，醒目）
- 非活跃态（`isActive=false`）：整卡灰化 opacity-50，按钮全部 disabled，顶部标注"已更新"
- 替换中的菜品行：该行按钮变 loading spinner，其他所有「🔄」按钮同时 disabled

### 3.3 生命周期（DEC-055A / DEC-061 追加模式）

```
[创建] ──→ [活跃] ──→ [被替换(灰化，保留历史)]
              │              ↑
              └── AI 回复新 MealPlan ──┘

规则：
1. AI 流式回复末尾 JSON 解析成功 → 创建新 MealPlanCard（活跃）
2. 新 MealPlanCard 作为新消息追加到对话流末尾（不替换旧卡片位置）
3. 旧 MealPlanCard 标记 isActive=false（灰化，不可操作，保留历史可回看）
4. 对话流中同一时刻只有一个活跃 MealPlanCard
5. 「整套加入订单」后卡片仍保持活跃（可继续替换操作）
```

### 3.4 并发防抖（DEC-055C）

```
前端状态：
  activeMealPlanVersion: number  // 初始 0，每次替换请求 +1
  replacingDishId: string | null // 当前正在替换的菜品

流程：
1. 用户点「🔄」→ activeMealPlanVersion++ → replacingDishId = dishId
2. 所有「🔄」按钮 disabled，当前行显示 spinner
3. 发消息给 AI
4. AI 回复新 MealPlan → 前端比较响应到达时的 activeMealPlanVersion 与发送请求时记录的版本
   ├── 匹配 → 渲染新卡片，replacingDishId = null
   └── 不匹配 → 静默丢弃
5. 超时 15s → 恢复按钮，toast 提示
```

---

## 4. OrderStore 状态机（DEC-057 六条规则）

| # | 规则 | 触发 |
|---|------|------|
| 1 | Waiter 唯一数据源 = Order | 所有 → Waiter 路径 |
| 2 | Explore「展示给服务员」= 写入 Order + 跳 Waiter | ExploreView 按钮 |
| 3 | Explore「咨询 AI」= 写入 Order + 注入 Chat | ExploreView 按钮 |
| 4 | Waiter「继续点菜」→ Order | WaiterView 按钮 |
| 5 | Waiter「结束用餐」→ 二次确认 → 清空 → Home | WaiterView 按钮 |
| 6 | 过敏原检查在 Order→Waiter 时触发 | 任何路径进 Waiter 前 |

**新增 Reducer Actions**：

```typescript
| { type: 'BATCH_ADD_TO_ORDER'; items: { menuItem: MenuItem; quantity: number }[] }
| { type: 'EXECUTE_ORDER_ACTION'; action: OrderAction; menuData: MenuData }
```

**BATCH_ADD_TO_ORDER**（整套加入）：
- 遍历 items，同 dishId 的累加数量，新 dishId 追加
- toast："已加入 N 道菜到点菜单"

**EXECUTE_ORDER_ACTION**（AI 操作 Order）：
- `add`：在 menuData.items 中查找 dishId，找到则加入 Order（qty 份）
- `remove`：按 dishId 从 Order 移除
- `replace`：原子执行 remove + add
- dishId 在 menuData 中不存在 → 忽略该指令，不报错

---

## 5. 流式 JSON 代码块解析器

### 5.1 流式阶段（检测）

```
每个 chunk 追加到 textBuffer：
  if (textBuffer.includes('```json') && !hasJsonBlock) {
    hasJsonBlock = true;
    → 在消息流中显示 "🍽 正在生成方案…" 占位
  }
```

### 5.2 完成阶段（提取 + 解析）

```
onStreamComplete(fullText):
  1. 正则提取：/```json\s*([\s\S]*?)```/g → 取最后一个 match[1]
  2. 分离叙事文字：移除所有 ```json...``` 块后的纯文本作为 displayText

  3. 解析分级 fallback：
     L1: JSON.parse(raw) 成功
         → Zod MealPlanSchema.safeParse() 或检测 orderAction 字段
         → 成功 → 渲染 MealPlanCard / 执行 OrderAction ✅

     L2: JSON.parse 失败 → jsonrepair(raw) → 再 parse
         → 部分字段可用 → 渲染简化卡片（缺失字段用默认值）

     L3: 完全无法解析
         → 纯文字展示 + 「🔄 重新生成方案」按钮（点击发预设消息给 AI）
```

### 5.3 分类逻辑

```typescript
function classifyJsonBlock(parsed: unknown): 'mealplan' | 'orderaction' | 'chatresponse' | 'unknown' {
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.courses)) return 'mealplan';
  if (typeof obj.orderAction === 'string') return 'orderaction';
  if (typeof obj.message === 'string') return 'chatresponse'; // 兼容现有格式
  return 'unknown';
}
```

---

## 6. Chat 操作 Order 完整流程

### 6.1 MealPlan 流程（方案型，DEC-052v2）

```
用户："帮我配一套4人晚餐，预算800泰铢"
  ↓
AI 流式输出叙事文字（逐字显示）
  ↓ 检测到 ```json
前端插入 "🍽 正在生成方案…" 占位
  ↓ 流式结束
提取 JSON → 分级 fallback → L1 成功 → MealPlanCard 替换占位
  ↓ 用户点「🍽 整套加入订单」
dispatch BATCH_ADD_TO_ORDER → toast "已加入 N 道菜到点菜单"
  ↓
显示 QuickReplies 快捷按钮："去看点菜单" / "继续聊" / "展示给服务员"
```

### 6.2 替换流程（DEC-054）

```
用户点 MealPlanCard 中某道菜的「🔄 换一道」
  ↓
自动发送消息给 AI："帮我把 {菜名} 换成别的，保持整体搭配"
  ↓ （按钮 disabled，spinner）
AI 流式回复：新的搭配说明 + 末尾新 MealPlan JSON
  ↓
新 MealPlanCard 追加到对话流末尾，旧卡片灰化（isActive=false）
```

### 6.3 OrderAction 流程（DEC-058）

```
用户："把冬阴功去掉，加一份 Pad Thai"
  ↓
AI 流式输出确认文字 + 末尾 JSON
  ↓ 流式结束
检测到 orderAction 字段 → dispatch EXECUTE_ORDER_ACTION
  ↓
AI 文字正常展示（"好的，已帮你去掉冬阴功，加了 Pad Thai x1 🍜"）
```

---

## 7. Prompt 工程要点

### 7.1 方案型输出

System message 指示 AI：
- 当用户请求用餐方案时，先自然语言描述搭配逻辑，最后输出 ```json 代码块
- courses 结构根据 detectedLanguage / menuType 动态决定
- 菜品 < 5 道时不输出 JSON，用自然语言推荐
- dishId 必须来自菜单数据中实际 id
- 每次替换后输出完整的新方案（非增量 diff）

### 7.2 Order 操作指令

System message 指示 AI：
- 当用户要修改点菜单时，在回复末尾附加 ```json 代码块
- 格式：`{"orderAction": "add|remove|replace", "remove": {...}, "add": {...}}`
- dishId 必须来自菜单实际 id
- **禁止同时输出 MealPlan 和 OrderAction**（Prompt 层强约束，前端做防御性处理：若同时出现，优先 MealPlan）

---

## 8. 集成点

| 文件 | 修改内容 |
|------|---------|
| `shared/types.ts` | 新增 MealPlan / MealPlanItem / MealPlanCourse / OrderAction 类型 |
| `app/src/types/index.ts` | 新增 AppAction 类型：BATCH_ADD_TO_ORDER / EXECUTE_ORDER_ACTION；新增 UI 状态字段 |
| `app/src/context/AppContext.tsx` | 新增两个 reducer case + activeMealPlanVersion 状态 |
| `app/src/views/AgentChatView.tsx` | 流式 JSON 检测 + MealPlanCard 渲染 + OrderAction 执行 + processAIResponse 重构 |
| `app/src/components/MealPlanCard.tsx` | **新建** |
| `app/src/utils/streamJsonParser.ts` | **新建**：提取 + 分级 fallback + 分类 |
| `worker/prompts/agentChat.ts` | 方案型 + OrderAction prompt 模板 |

---

## 9. 边界与错误恢复

| 场景 | 处理 |
|------|------|
| dishId 不在 menuData 中 | 过滤无效项，仍渲染有效部分；全无效则 L3 |
| courses 为空数组 | L3（纯文字 + 重试按钮）|
| 快速连点「🔄」| 并发防抖：首次点击后所有按钮 disabled |
| 替换请求网络失败 | 恢复按钮 + toast |
| 「整套加入」有重复菜品 | 数量合并 + toast "已合并重复菜品" |
| AI 同时返回 MealPlan + OrderAction | 优先 MealPlan（courses 优先级 > orderAction）|
| jsonrepair 后仍缺必要字段 | L3 |
| 流式中断（网络断开）| 保留已有文字 + 不渲染卡片 + toast |
