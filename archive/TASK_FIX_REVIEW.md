# SAGE Review 修复任务（Phase 3.1）

根据 Codex Review 报告，修复 5 个严重问题 + 3 个中等问题。

## 重要背景

Worker 位于 `../worker/`，它的 Zod schema 是权威数据结构定义。
前端类型必须与 Worker 对齐，不能自己发明结构。

---

## 🔴 修复 1：统一 `/api/analyze` 请求体

**问题**：前端发 `{images:[{base64, mimeType}], language}`，Worker 要求 `{images:[{data, mimeType}], context:{language, timestamp}}`

**修改 `src/api/analyze.ts`**：
- 字段名从 `base64` 改为 `data`
- 请求体加 `context: { language, timestamp: Date.now() }`

```typescript
// 正确的请求体结构
const body = {
  images: normalized.map(n => ({ data: n.base64, mimeType: n.mimeType })),
  context: { language, timestamp: Date.now() },
};
```

---

## 🔴 修复 2：统一 `/api/analyze` 响应体 + 前端类型

**问题**：Worker 返回 `{ok, data:{menuType, items:[{id,nameOriginal,nameTranslated,...}], ...}, requestId}`，前端 `MenuData` 类型是 `{restaurantName, items:[{name,nameEn,...}]}`，完全不同。

**方案**：让前端 `MenuData` 完全对齐 Worker 的结构（Worker schema 为权威）。

**修改 `src/types/index.ts`**：删除旧的 `MenuData` / `MenuItem`，改为：

```typescript
export type MenuItemTag =
  | 'spicy' | 'vegetarian' | 'vegan' | 'gluten_free'
  | 'contains_nuts' | 'contains_seafood' | 'contains_pork'
  | 'contains_alcohol' | 'popular' | 'signature';

export interface MenuItem {
  id: string;
  nameOriginal: string;
  nameTranslated: string;
  descriptionTranslated?: string;
  price?: number;
  priceText?: string;
  tags: MenuItemTag[];
}

export interface MenuCategory {
  id: string;
  nameOriginal: string;
  nameTranslated: string;
  itemIds: string[];
}

export interface MenuData {
  menuType: 'restaurant' | 'bar' | 'dessert' | 'fastfood' | 'cafe' | 'other';
  detectedLanguage: string;
  priceLevel: 1 | 2 | 3;
  currency?: string;
  categories: MenuCategory[];
  items: MenuItem[];
  processingMs: number;
  imageCount: number;
}
```

**修改 `src/api/analyze.ts`**：
- 返回类型从自定义 `MenuData` 改为正确解包：
```typescript
// Worker 响应结构：{ ok: true, data: MenuData, requestId: string }
const json = await res.json() as { ok: boolean; data: MenuData; requestId: string };
if (!json.ok) throw new Error('analyze failed');
return json.data;  // data 即 MenuData，直接返回
```

---

## 🔴 修复 3：SSE 错误事件不能吞掉

**问题**：`app/src/api/chat.ts` 里 Worker 下发 `{ok:false,error:{...}}` 时被 `continue` 跳过，流结束后误触 `onDone`。

**修改 `src/api/chat.ts`** 中 SSE 解析循环：

```typescript
// 解析到 ok:false 时立即 throw，触发 onError
const chunk = JSON.parse(data) as {
  ok?: boolean;
  error?: { code: string; message: string };
  choices?: Array<{ delta: { content?: string } }>;
};

if (chunk.ok === false) {
  throw new Error(chunk.error?.message ?? 'AI error');
}

const content = chunk.choices?.[0]?.delta?.content;
if (content) {
  buffer += content;
  onChunk(content);
}
```

---

## 🔴 修复 4：Handoff 失败态必须触发 SET_CHAT_PHASE('failed')

**问题**：`AgentChatView.tsx` 的 `sendToAI` 里，`onError` 只 toast，不更新 `chatPhase`。

**修改 `src/views/AgentChatView.tsx`**：

```typescript
// onError 回调里：
(err) => {
  // 移除流式 loading 气泡
  removeStreamingMessage();
  // 根据当前阶段决定错误处理
  if (state.chatPhase === 'handing_off') {
    dispatch({ type: 'SET_CHAT_PHASE', phase: 'failed' });
    showToast('菜单分析失败，请重新扫描');
  } else {
    showToast(`出错了：${err.message}`);
  }
}
```

同时，在 `failed` 态下 UI 显示：
```tsx
{state.chatPhase === 'failed' && (
  <div className="flex flex-col items-center gap-3 py-8">
    <p className="text-text-secondary">分析失败，请重新扫描菜单</p>
    <button
      onClick={() => dispatch({ type: 'NAV_TO', view: 'scanner' })}
      className="px-4 py-2 bg-brand text-white rounded-button"
    >
      重新扫描
    </button>
  </div>
)}
```

---

## 🔴 修复 5：Recommendations 字段统一为 Worker 规范

**问题**：Worker prompt 产出 `{itemId, reason}`，前端按 `{id, name, nameEn, reason}` 渲染。

**修改 `src/views/AgentChatView.tsx`**：

删除旧的 `Recommendation` 接口（`{id,name,nameEn,reason}`），改为：
```typescript
interface Recommendation {
  itemId: string;
  reason: string;
}
```

渲染推荐卡片时，从 `state.menuData.items` 通过 `itemId` 查找菜品：
```typescript
function handleAddToOrder(rec: Recommendation) {
  const menuItem = state.menuData?.items.find(item => item.id === rec.itemId);
  if (menuItem) {
    dispatch({ type: 'ADD_TO_ORDER', item: menuItem });
  }
}

// 渲染时
{recs.map(rec => {
  const item = state.menuData?.items.find(i => i.id === rec.itemId);
  if (!item) return null;
  return (
    <div key={rec.itemId} className="...">
      <p className="font-medium">{item.nameOriginal}</p>
      <p className="text-text-secondary text-sm">{item.nameTranslated}</p>
      <p className="text-text-muted text-xs">{rec.reason}</p>
      <button onClick={() => handleAddToOrder(rec)}>加入点单</button>
    </div>
  );
})}
```

---

## 🟡 修复 6：偏好更新落到 AppContext

**问题**：`preferenceUpdates` 从 AI 解析出来后没有 dispatch 到 state。

**修改 `src/context/AppContext.tsx`**：添加 `UPDATE_PREFERENCES` action：
```typescript
case 'UPDATE_PREFERENCES': {
  const updated = { ...state.preferences };
  for (const p of action.updates) {
    if (p.action === 'add' && p.type === 'restriction') {
      if (!updated.dietary.includes(p.value)) {
        updated.dietary = [...updated.dietary, p.value];
      }
    }
    // 可按需扩展 flavor 等
  }
  return { ...state, preferences: updated };
}
```

**修改 `src/types/index.ts`**：AppAction 新增：
```typescript
| { type: 'UPDATE_PREFERENCES'; updates: PreferenceUpdate[] }
```

**修改 `AgentChatView.tsx`** 的 `processAIResponse`：
```typescript
if (parsed.preferenceUpdates?.length) {
  dispatch({ type: 'UPDATE_PREFERENCES', updates: parsed.preferenceUpdates });
}
```

---

## 🟡 修复 7：防重复提交（ScannerView）

**问题**：识别中可以多次点击"识别菜单"。

**修改 `src/views/ScannerView.tsx`**：
```tsx
<button
  onClick={handleAnalyze}
  disabled={status === 'loading' || files.length === 0}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  {status === 'loading' ? 'AI 正在识别…' : '识别菜单'}
</button>
```

---

## 🟡 修复 8：WaiterMode 显示原文菜名（DEC-015）

**检查 `src/views/WaiterModeView.tsx`**：
确认展示 `oi.menuItem.nameOriginal`（不是 `nameTranslated`）。
如果当前用了 `name`（旧字段）需改为 `nameOriginal`。

---

## 完成清单

- [ ] T1 analyze.ts 请求体修复（`data` 字段 + `context`）
- [ ] T2 types/index.ts MenuItem/MenuData 对齐 Worker schema
- [ ] T2 analyze.ts 响应解包修复
- [ ] T3 chat.ts SSE ok:false 触发 onError
- [ ] T4 AgentChatView Handoff 失败 → SET_CHAT_PHASE('failed') + 恢复 UI
- [ ] T5 AgentChatView Recommendation 字段 itemId + 查表渲染
- [ ] T6 AppContext UPDATE_PREFERENCES + AgentChatView dispatch
- [ ] T7 ScannerView 识别中 disabled 防重复
- [ ] T8 WaiterModeView 确认显示 nameOriginal
- [ ] tsc --noEmit 零错误
- [ ] npm run build 成功
- [ ] 更新 PROGRESS.md：Sprint 1 Phase 3.1 修复完成
- [ ] 更新 EXECUTION_STATE.md：Phase 3.1 ✅，Phase 4 待开始
- [ ] git commit（在 05_implementation/app 目录）

完成后输出：FIX_DONE
