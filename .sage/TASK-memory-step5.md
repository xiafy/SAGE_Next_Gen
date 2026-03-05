# TASK: Memory Step 5 — Prompt 注入 + 偏好自我进化

## 必读文件
- `specs/sprint-4b-memory.md` — Spec v2.1（Prompt 注入三层模板 + 偏好进化规则）
- `worker/handlers/chat.ts` — chat handler（看 preferences 如何传递给 prompt）
- `worker/prompts/agentChat.ts` — buildAgentChatSystem（当前 prompt 模板）
- `worker/schemas/chatSchema.ts` — ChatRequestSchema（当前 preferences schema）
- `app/src/utils/memory.ts` — loadMemory/applyEvolutions
- `app/src/context/AppContext.tsx` — 看前端如何发送 chat 请求
- `shared/types.ts` — SAGE_Memory/PreferenceEntry/SessionSummary

## 背景

当前 chat prompt 只注入简单的 restrictions + flavors 字符串。需要升级为三层注入：
1. **基准画像（永远注入）**: allergies（⚠️）+ restrictions + flavors + spicyLevel + learned(confidence≥0.7)
2. **相关历史（按餐厅类型匹配，最多 3 条）**: 最近 sessions 中与当前餐厅类型相同的
3. **近期变化（如有）**: 最近一次 session 中学到的新偏好

## 任务

### 5.1 前端：chat 请求携带 memory 数据

修改前端发送 chat 请求的地方（在 AgentChatView 或 chat API 调用处），从 localStorage 加载 SAGE_Memory，将相关数据附加到请求中：

```typescript
// 在发送 chat 请求时
const memory = loadMemory();
const chatRequest = {
  mode,
  messages,
  menuData,
  preferences: {
    ...currentPreferences,
    allergies: memory.preferences.allergies,
    learned: memory.preferences.learned,
    spicyLevel: memory.preferences.spicyLevel,
  },
  context,
  memory: {  // 新增字段
    sessions: memory.sessions,  // Worker 端筛选相关的
    lastUpdated: memory.lastUpdated,
  },
};
```

### 5.2 Worker：ChatRequestSchema 扩展

在 `worker/schemas/chatSchema.ts` 扩展 preferences 和新增 memory 字段：

```typescript
preferences: z.object({
  restrictions: z.array(z.unknown()).default([]),
  allergies: z.array(z.string()).default([]),      // 新增
  flavors: z.array(z.unknown()).default([]),
  spicyLevel: z.enum(['none', 'mild', 'medium', 'hot']).default('medium'),  // 新增
  learned: z.array(z.object({                      // 新增
    value: z.string(),
    confidence: z.number(),
  })).default([]),
  history: z.array(z.unknown()).default([]),
}).default({}),
memory: z.object({                                  // 新增
  sessions: z.array(z.object({
    restaurantType: z.string().optional(),
    dishesOrdered: z.array(z.string()).default([]),
    dishesSkipped: z.array(z.string()).default([]),
    keyMoments: z.array(z.string()).default([]),
    date: z.string().optional(),
  })).default([]),
}).optional(),
```

### 5.3 Worker：agentChat prompt 三层注入

修改 `worker/prompts/agentChat.ts` 的 `buildAgentChatSystem`：

接收新参数 `memory?: { sessions: SessionSummary[] }`，构建三层 prompt：

```
## 用户画像
⚠️ 过敏原（绝对禁止推荐）: ${allergies.join(', ') || '无'}
饮食限制: ${restrictions}
口味偏好: 辣度${spicyLevel}, ${flavors}
AI 学习到的偏好: ${learned.filter(l => l.confidence >= 0.7).map(l => l.value).join(', ') || '无'}

## 相关用餐历史
${matchedSessions.map(s => `- ${s.date} ${s.restaurantType}: 点了${s.dishesOrdered.join('/')}, 跳过${s.dishesSkipped.join('/')}。${s.keyMoments.join(' ')}`).join('\n') || '首次用餐'}

## 近期偏好变化
${recentChanges || '无'}
```

**匹配逻辑**：
- 从 memory.sessions 中找与当前 menuData.restaurantType 相同类型的，最多 3 条，最新优先
- 如果没有匹配，取最近 2 条（任何类型）

### 5.4 Worker：chat handler 传递 memory

修改 `worker/handlers/chat.ts`，将 parsed memory 传给 buildAgentChatSystem。

### 5.5 测试

在现有测试或新建测试中覆盖：
- Prompt 包含过敏原警告
- Prompt 包含 learned 偏好（只含 confidence≥0.7）
- 餐厅类型匹配：日料历史在日料场景注入
- 无 memory 时 prompt 正常（向后兼容）
- allergies 在 prompt 中标注 ⚠️

## 约束
- 向后兼容：无 memory 字段时 prompt 和之前一样
- allergies 在 prompt 中必须标注 ⚠️（安全优先级最高）
- learned 只注入 confidence ≥ 0.7 的
- sessions 匹配最多 3 条
- `cd app && npx tsc --noEmit` 零错误
- `cd worker && npx tsc --noEmit` 零错误
- localStorage mock 用 Object.defineProperty（Anti-Pattern 6）

## 验收
- [ ] tsc --noEmit 零错误（app + worker）
- [ ] 全部测试通过
- [ ] 无 memory 时向后兼容
- [ ] Prompt 三层结构可辨认
