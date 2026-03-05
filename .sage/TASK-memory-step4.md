# TASK: Memory Step 4 — App 启动懒摘要流程

## 必读文件
- `specs/sprint-4b-memory.md` — Spec v2.1（懒摘要方案 D）
- `app/src/context/AppContext.tsx` — AppProvider + useEffect hooks
- `app/src/utils/memory.ts` — loadMemory/saveMemory/addSession/applyEvolutions
- `app/src/api/config.ts` — WORKER_BASE
- `shared/types.ts` — SAGE_Memory/SessionSummary/PreferenceEvolution

## 背景

方案 D（懒摘要）：
- 用户关闭 App 时，当前会话消息已经通过 Step 2 持久化到 `sage_current_session`
- 用户新建会话（RESET_SESSION）时，旧会话保存到 `sage_pending_summary`
- **App 下次启动时**，检查 `sage_pending_summary`，如有未摘要的会话 → 调 Worker API 生成摘要 → 合并到 SAGE_Memory

## 任务

### 4.1 新建 app/src/api/memory.ts — API 调用层

```typescript
import { WORKER_BASE } from './config';

export async function summarizeSession(
  messages: { role: string; content: string }[],
  preferences: UserPreferences,
  menuData?: { restaurantType?: string },
): Promise<{ summary: SessionSummary; evolutions: PreferenceEvolution[] }> {
  const res = await fetch(`${WORKER_BASE}/api/memory/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, preferences, menuData }),
  });
  if (!res.ok) throw new Error(`Summarize failed: ${res.status}`);
  return res.json();
}
```

### 4.2 新建 app/src/hooks/useLazySummarize.ts — 核心 hook

```typescript
export function useLazySummarize(dispatch: React.Dispatch<AppAction>) {
  useEffect(() => {
    const pendingRaw = localStorage.getItem(PENDING_SUMMARY_KEY);
    if (!pendingRaw) return;

    const pending = JSON.parse(pendingRaw);
    if (!pending.messages?.length) {
      localStorage.removeItem(PENDING_SUMMARY_KEY);
      return;
    }

    // 后台调用，不阻塞 UI
    (async () => {
      try {
        const memory = loadMemory();
        const { summary, evolutions } = await summarizeSession(
          pending.messages,
          memory.preferences,
          pending.menuData ? { restaurantType: pending.menuData.restaurantType } : undefined,
        );

        // 补全 summary 的 id 和 date
        summary.id = pending.sessionId;
        summary.date = new Date(pending.startTime).toISOString().slice(0, 10);

        // 合并到 memory
        let updated = addSession(memory, summary);
        if (evolutions.length > 0) {
          updated = applyEvolutions(updated, evolutions);
        }
        updated.lastUpdated = Date.now();
        saveMemory(updated);

        // 清除 pending
        localStorage.removeItem(PENDING_SUMMARY_KEY);
      } catch (err) {
        console.error('[SAGE] Lazy summarize failed:', err);
        // 不删 pending，下次启动重试
      }
    })();
  }, []); // 只在挂载时执行一次
}
```

### 4.3 在 AppProvider 中挂载 hook

在 `AppProvider` 中调用 `useLazySummarize(dispatch)`。

### 4.4 测试

创建 `app/src/hooks/__tests__/useLazySummarize.test.ts`:
- pending 存在 + API 成功 → memory 更新 + pending 清除
- pending 存在 + API 失败 → pending 保留（下次重试）
- pending 不存在 → 不调 API
- pending 消息为空 → 直接清除 pending
- summary 正确写入 sessions[] + evolutions 正确应用

## 约束
- 懒摘要在后台执行，不阻塞 UI 渲染
- API 失败静默，不弹错误提示（下次启动重试）
- 不修改 Worker 代码
- localStorage mock 用 Object.defineProperty 无条件覆盖（Anti-Pattern 6）
- `cd app && npx tsc --noEmit` 零错误

## 验收
- [ ] tsc --noEmit 零错误
- [ ] npx vitest run 全通过
- [ ] 懒摘要 hook 只在 App 挂载时执行一次
- [ ] API 失败不影响 App 使用
