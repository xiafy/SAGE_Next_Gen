# Spec: Explore → Chat 注入流程

> 版本: 1.0 | 日期: 2026-03-02
> 覆盖决策: DEC-053v2

---

## 1. 目标与背景

用户在 Explore 选完菜品后点「咨询 AI」，已选菜品写入 Order，同时在 Chat 中注入 SelectedDishesCard（系统消息样式）+ 结构化 system message，让 AI 感知已选菜品并给出事实摘要 + 开放引导（DEC-053v2 方案 F）。

**核心原则**：
- AI 首条回复 = 事实摘要（数量/分类/总价），不主动分析搭配
- 区分"新选"和"已有"（增量 vs 全量意图）
- 空选择时不注入卡片，直接回 Chat 正常对话

---

## 2. 数据结构

### 2.1 SelectedDishesPayload（注入 system message 的结构化数据）

```typescript
export interface SelectedDishInfo {
  dishId: string;
  name: string;           // 用户语言菜名
  nameOriginal: string;
  price: number | null;
  category: string;       // 分类名（用户语言）
}

export interface SelectedDishesPayload {
  newlySelected: SelectedDishInfo[];   // 本次从 Explore 新选的
  existingOrder: SelectedDishInfo[];   // 进入 Explore 前 Order 中已有的
}
```

### 2.2 SelectedDishesCard Message（对话流中的消息格式）

```typescript
// 扩展 Message 类型，增加可选的 cardType 字段
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  cardType?: 'selected-dishes';  // 新增：标识系统消息卡片类型
  cardData?: SelectedDishesPayload;  // 新增：卡片数据
}
```

---

## 3. SelectedDishesCard 组件规格

### 3.1 Props

```typescript
interface SelectedDishesCardProps {
  payload: SelectedDishesPayload;
  isZh: boolean;
  currency: string;
}
```

### 3.2 视觉规格

- **样式**：系统消息样式（非用户气泡/非 AI 气泡）
  - 居中或左对齐，无头像
  - 背景色：浅灰/浅蓝底色（区别于 AI/用户气泡的白色/主色调）
  - 圆角卡片，内边距适中
- **标题**：📋 图标 + "你从菜单中选了以下菜品" / "Selected dishes from menu"
- **内容**：
  - 菜品列表（菜名 + 价格），按分类分组
  - 底部小字：预估总价
  - 如有 existingOrder，分两组展示："新选" + "已在点菜单中"

### 3.3 交互

- 纯展示，无按钮
- 不可折叠/删除
- 在对话流中固定位置（紧跟在注入时刻的最新消息之后）

---

## 4. Explore → Chat 注入流程

### 4.1 正常流（有选菜）

```
[Explore]
  用户选了 N 道菜（通过 DishCard 的 ➕ 按钮，已实时写入 Order）
  ↓ 点「咨询 AI」

[前端逻辑]
  1. 获取本次新增菜品：
     newlySelected = Explore 本地维护的 newlySelected[] 列表（每次点 ➕ 同步追加到此列表）
     existingOrder = 进入 Explore 前 Order 中已有的菜品（来自 orderSnapshotOnExploreEnter）
     （不重新对比 Order 差异，直接使用 newlySelected 列表，避免竞态）

  2. 构造 SelectedDishesPayload

  3. 注入对话流：
     dispatch ADD_MESSAGE({
       id: `sys_selected_${Date.now()}`,
       role: 'system',
       content: buildSelectedDishesText(payload),  // 给 AI 的结构化文本
       cardType: 'selected-dishes',
       cardData: payload,
     })

  4. 导航到 Chat：
     dispatch NAV_TO('chat')

  5. 自动触发 AI 回复：
     sendToAI('chat')  // AI 收到 system message 后给出首条回复
```

### 4.2 空选择边界

```
[Explore]
  用户未选任何菜品
  ↓ 点「咨询 AI」

[前端逻辑]
  不注入 SelectedDishesCard
  不发送 system message
  直接 dispatch NAV_TO('chat')
  （Chat 继续正常对话，不自动触发 AI）
```

### 4.3 system message 结构化文本

```typescript
function buildSelectedDishesSystemMessage(payload: SelectedDishesPayload): string {
  const parts: string[] = [];
  
  if (payload.newlySelected.length > 0) {
    parts.push(`用户刚从菜单中新选了以下菜品：`);
    for (const d of payload.newlySelected) {
      parts.push(`- ${d.name}（${d.nameOriginal}）${d.price ? ` ¥${d.price}` : ''} [${d.category}]`);
    }
  }
  
  if (payload.existingOrder.length > 0) {
    parts.push(`用户点菜单中已有以下菜品：`);
    for (const d of payload.existingOrder) {
      parts.push(`- ${d.name}（${d.nameOriginal}）${d.price ? ` ¥${d.price}` : ''} [${d.category}]`);
    }
  }
  
  parts.push(`请用事实摘要回复（数量、分类分布、预估总价），然后用开放式问题引导用户。不要主动分析搭配。`);
  
  return parts.join('\n');
}
```

---

## 5. AI 首条回复格式（DEC-053v2 方案 F）

### 5.1 纯新选

```
收到你选的 3 道菜——2 道主菜、1 道饮品，预估 ฿180。有什么想调整的吗？
```

### 5.2 新选 + 已有

```
收到你新选的 3 道菜（2 道主菜、1 道饮品），加上点菜单里已有的 5 道，一共 8 道，预估 ฿420。想聊这几道新的，还是看看整桌搭配？
```

### 5.3 约束

- 事实摘要包含：数量、分类分布、预估总价
- 区分"新选"和"已有"
- 不主动分析搭配（等用户明确方向后再深入）
- 使用用户语言
- 末尾附带 QuickReplies 快捷按钮：「看看搭配建议」「聊聊某道菜」

---

## 6. Explore 空状态

当 menuData 存在但 items.length === 0 时：

```
显示引导页：
  - MascotImage（confused 表情）
  - 文字："暂未识别到菜品，试试重新拍一张？" / "No dishes found. Try taking another photo?"
  - 按钮：「📷 重新拍摄」→ NAV_TO('scanner')
```

当前 ExploreView 已有 menuData === null 的空状态。需新增 menuData.items.length === 0 的情况。

---

## 7. 集成点

| 文件 | 修改内容 |
|------|---------|
| `shared/types.ts` | 新增 SelectedDishInfo、SelectedDishesPayload 类型 |
| `app/src/types/index.ts` | Message 类型扩展 cardType + cardData 字段 |
| `app/src/components/SelectedDishesCard.tsx` | **新建**：系统消息样式卡片 |
| `app/src/views/ExploreView.tsx` | 「咨询 AI」按钮逻辑：构造 payload → 注入 → 导航；items.length===0 空状态；进入时记录 Order 快照 |
| `app/src/views/AgentChatView.tsx` | ChatBubble 渲染时检查 cardType='selected-dishes' → 渲染 SelectedDishesCard；注入后自动 sendToAI |
| `app/src/components/ChatBubble.tsx` | 支持 cardType='selected-dishes' 的特殊渲染 |
| `worker/prompts/agentChat.ts` | 处理含 selected dishes 的 system message，输出事实摘要格式 |
| `app/src/context/AppContext.tsx` | 新增 orderSnapshotOnExploreEnter 状态（进入 Explore 时快照）|

---

## 8. 边界与错误恢复

| 场景 | 处理 |
|------|------|
| 用户未选菜品点「咨询 AI」 | 不注入卡片，直接回 Chat |
| existingOrder 为空 | 只展示 newlySelected 部分 |
| 菜品无价格 | 总价计算跳过无价格项，显示"部分菜品价格未知" |
| 进入 Explore 后又回 Chat 再回 Explore | 每次进入 Explore 重新记录 Order 快照 |
| 退出 Explore | orderSnapshotOnExploreEnter 在退出 Explore 时清除（无论走哪个出口：咨询 AI / 展示给服务员 / 返回） |
| AI 回复不符合事实摘要格式 | 正常展示（prompt 约束为 best-effort）|
| menuData.items 为空 | 展示空状态引导页 |
