# TASK: Memory Step 3 — Worker /api/memory/summarize 端点

## 必读文件
- `specs/sprint-4b-memory.md` — Spec v2.1（API 定义 + 偏好进化规则）
- `shared/types.ts` — SessionSummary / PreferenceEvolution / SAGE_Memory 类型
- `worker/index.ts` — 路由注册
- `worker/handlers/chat.ts` — 参考现有 handler 结构
- `worker/utils/bailian.ts` — 百炼 API 调用
- `worker/prompts/agentChat.ts` — 参考 prompt 构建方式

## 任务

### 3.1 新建 worker/handlers/summarize.ts

```typescript
export async function handleSummarize(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response>
```

**请求格式**：
```typescript
POST /api/memory/summarize
{
  messages: { role: string; content: string }[],  // 会话消息
  preferences: UserPreferences,                    // 当前偏好基准
  menuData?: { restaurantType?: string }           // 可选：餐厅类型上下文
}
```

**响应格式**：
```typescript
{
  summary: SessionSummary,
  evolutions: PreferenceEvolution[]
}
```

### 3.2 新建 worker/prompts/memorySummarize.ts

Prompt 要求 AI 从对话记录中提取：
1. **SessionSummary**: 点了什么菜、跳过什么、餐厅类型、关键决策（2-3 句）、发现的偏好信号
2. **PreferenceEvolution[]**: 偏好更新建议
   - add: 新发现的偏好（explicit=用户说的 confidence=1.0, inferred=行为推断 confidence=0.3）
   - strengthen: 重复确认的偏好
   - modify: 与基准矛盾的信号
   - weaken: （这个由前端根据历史判断，不由 AI 输出）

**输出要求**：严格 JSON，用 Zod 校验。

**模型**：qwen3.5-flash（stream=false，JSON 输出更稳定，参考 DEC-044）

### 3.3 新建 worker/schemas/memorySchema.ts

Zod schema 校验请求和响应：
```typescript
export const SummarizeRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).min(1),
  preferences: z.object({ ... }),
  menuData: z.object({ restaurantType: z.string().optional() }).optional(),
});

export const SummarizeResponseSchema = z.object({
  summary: z.object({
    dishesOrdered: z.array(z.string()),
    dishesSkipped: z.array(z.string()),
    restaurantType: z.string().optional(),
    preferencesLearned: z.array(z.string()),
    keyMoments: z.array(z.string()).max(3),
  }),
  evolutions: z.array(z.object({
    action: z.enum(['add', 'strengthen', 'modify']),
    key: z.string(),
    entry: z.object({ ... }).optional(),
    newConfidence: z.number().optional(),
    oldValue: z.string().optional(),
    newValue: z.string().optional(),
  })),
});
```

### 3.4 路由注册

在 `worker/index.ts` 添加：
```typescript
if (request.method === 'POST' && url.pathname === '/api/memory/summarize') {
  return handleSummarize(request, env, requestId);
}
```

### 3.5 测试

创建 `worker/__tests__/summarize.test.ts`：
- 请求校验：缺少 messages → 400
- 请求校验：messages 为空 → 400  
- 响应 Zod 校验：模拟 AI 返回的 JSON 通过 schema
- Prompt 包含对话内容和当前偏好
- stream=false 配置正确

## 约束
- 不修改前端代码
- Worker 不存储任何用户数据（无状态）
- AI 调用用百炼 qwen3.5-flash，stream=false（DEC-044）
- enable_thinking: false（DEC-028）
- 参考现有 handler 的错误处理和 CORS 模式
- `cd worker && npx tsc --noEmit` 零错误

## 验收
- [ ] tsc --noEmit 零错误（app + worker）
- [ ] Worker 测试通过
- [ ] Prompt 包含偏好进化规则说明
- [ ] 响应经过 Zod 运行时校验
