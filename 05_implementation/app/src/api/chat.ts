import { WORKER_BASE } from './config';
import { dlog } from '../utils/debugLog';
import type {
  ChatRequest,
  ChatPreferences,
  GeoLocation,
  MenuData,
  Restriction,
  FlavorPreference,
} from '../types';
import type { Preferences } from '../types';

/**
 * 将 App 本地 Preferences 格式转换为 API ChatPreferences 格式
 *
 * ⚠️ App 存储的是简化格式（string[]），API 需要结构化格式。
 * 此函数是两种格式之间的唯一转换点。
 */
function toApiPreferences(prefs: Preferences): ChatPreferences {
  return {
    restrictions: prefs.dietary.map((value): Restriction => ({
      type: 'dislike',     // 默认类型，后续可细分
      value,
    })),
    flavors: (prefs.flavors ?? []).map((value): FlavorPreference => ({
      type: 'like',
      value,
      strength: 2,         // 默认强度
    })),
    history: [],           // 历史记录暂未在 App 端持久化
  };
}

export function buildChatParams(
  mode: 'pre_chat' | 'chat',
  messages: Array<{ role: string; content: string }>,
  menuData: MenuData | null,
  preferences: Preferences,
  location?: GeoLocation | null,
): ChatRequest {
  return {
    mode,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    menuData,
    preferences: toApiPreferences(preferences),
    context: {
      language: preferences.language,
      timestamp: Date.now(),
      ...(location ? { location } : {}),
    },
  };
}

export function streamChat(
  params: ChatRequest,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      dlog('streamChat', '📤 POST /api/chat mode=', params.mode, 'msgs=', params.messages.length, 'menuItems=', params.menuData?.items?.length ?? 'null');
      const response = await fetch(`${WORKER_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      dlog('streamChat', '📥 response status=', response.status);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        dlog('streamChat', '❌ HTTP error:', response.status, text.slice(0, 300));
        throw new Error(`Chat request failed (${response.status}): ${text}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        dlog('streamChat', '❌ No response body');
        throw new Error('No response body');
      }
      dlog('streamChat', '📖 reading SSE stream...');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const payload = trimmed.slice(6);

          if (payload === '[DONE]') {
            onDone();
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }

          const obj = parsed as Record<string, unknown>;

          if (obj['ok'] === false) {
            const errObj = obj['error'] as Record<string, string> | undefined;
            throw new Error(errObj?.['message'] ?? 'AI error');
          }

          const choices = obj['choices'] as Array<Record<string, unknown>> | undefined;
          const delta = choices?.[0]?.['delta'] as Record<string, string> | undefined;
          const content = delta?.['content'];
          if (content) {
            onChunk(content);
          }
        }
      }

      onDone();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      dlog('streamChat', '❌ caught:', err);
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return controller;
}
