# TASK: Memory Step 2 — 会话消息持久化 + sessionId + 边界检测

## 必读文件
- `specs/sprint-4b-memory.md` — Spec v2.1（会话边界 + 懒摘要）
- `app/src/utils/memory.ts` — Step 1 已创建的记忆工具
- `app/src/context/AppContext.tsx` — 状态管理 + reducer
- `app/src/types/index.ts` — Message / AppState / AppAction
- `app/src/views/HomeView.tsx` — Home 页新建/继续会话

## 任务清单

### 2.1 AppState 新增 sessionId

在 `app/src/types/index.ts` 的 AppState 中新增：
```typescript
sessionId: string | null;  // 当前会话 ID，null = 无活跃会话
```

在 AppContext initialState 中：`sessionId: null`

### 2.2 会话边界检测

新会话的触发条件（生成新 sessionId）：
1. **新扫描**：Scanner 页提交图片时（`START_ANALYZE` action）
2. **Home "新的"**：`RESET_SESSION` action

不触发新会话：
- 继续按钮（保持 sessionId）
- 页面刷新（从 localStorage 恢复 sessionId）

生成 sessionId：`crypto.randomUUID()` 或 `Date.now().toString(36) + Math.random().toString(36).slice(2, 7)`

### 2.3 消息持久化

在 AppContext 的 useEffect 中：
- 每次 messages 变化时，将 `{ sessionId, messages, startTime }` 存入 localStorage
- key: `sage_current_session`
- App 启动时恢复（如果有未摘要的旧会话数据）

```typescript
// localStorage 结构
interface CurrentSession {
  sessionId: string;
  messages: Message[];
  startTime: number;         // 会话开始时间戳
  menuData?: MenuData;       // 识别结果（用于摘要上下文）
}
```

### 2.4 RESET_SESSION 改造

现有 RESET_SESSION：
- 清空 messages、menuData、orderItems 等
- 但不保存旧会话数据

改造后：
1. RESET_SESSION 触发时，先将当前 `{ sessionId, messages, startTime }` 保存到 `sage_pending_summary` localStorage
2. 然后清空状态 + 生成新 sessionId
3. `sage_pending_summary` 会在下次启动时被懒摘要流程消费（Step 4 实现）

### 2.5 START_ANALYZE 改造

如果当前 sessionId 为 null，生成新 sessionId。
如果已有 sessionId（补充扫描），保持不变。

### 2.6 测试

在 `app/src/utils/__tests__/memory.test.ts` 中追加：
- 测试 RESET_SESSION 保存 pending summary
- 测试 START_ANALYZE 生成 sessionId
- 测试继续会话保持 sessionId
- 测试消息持久化 + 恢复

在 `app/src/context/__tests__/appReducer.test.ts` 中追加：
- RESET_SESSION 新行为：pending summary 保存
- START_ANALYZE 新行为：sessionId 生成

## 约束
- 不修改 Worker 代码
- 不破坏现有 194 单测
- `sage_pending_summary` 只写不读（读在 Step 4）
- `cd app && npx tsc --noEmit` 零错误

## 验收
- [ ] tsc --noEmit 零错误
- [ ] npx vitest run 全通过
- [ ] 新扫描 → 生成 sessionId
- [ ] Home "新的" → 旧会话保存到 pending + 新 sessionId
- [ ] 页面刷新 → messages + sessionId 恢复
