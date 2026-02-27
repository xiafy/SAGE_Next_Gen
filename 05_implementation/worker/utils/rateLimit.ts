/** 内存速率限制（MVP，单 Worker isolate 生命周期内有效） */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/**
 * @param key      限速 key（通常是 IP + 端点）
 * @param limit    窗口内最大请求数
 * @param windowMs 窗口时长（毫秒）
 * @returns true = 允许通过，false = 已超限
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;

  existing.count += 1;
  return true;
}

/** 清理过期条目（可在定时任务中调用，MVP 阶段忽略也无妨） */
export function purgeExpired(): void {
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    if (win.resetAt < now) store.delete(key);
  }
}
