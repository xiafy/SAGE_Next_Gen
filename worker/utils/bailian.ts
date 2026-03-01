/**
 * 阿里云百炼 (DashScope) OpenAI 兼容模式客户端
 *
 * 关键约束（DEC-028）：
 *   - 所有调用必须包含 stream: true, enable_thinking: false
 *   - 不设 enable_thinking:false → TTFT 从 <500ms 变为 7-26s
 */

import { logger } from './logger.js';

const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
// 默认用于对话链路；vision 链路在调用处显式传超时
const DEFAULT_TIMEOUT_MS = 30_000;

export interface BailianMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | BailianContentItem[];
}

export interface BailianContentItem {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface BailianCallOptions {
  model: string;
  messages: BailianMessage[];
  apiKey: string;
  timeoutMs?: number;
  requestId?: string;
}

/** SSE chunk delta */
interface StreamDelta {
  content?: string;
  reasoning_content?: string; // thinking 阶段（enable_thinking=true 时才有）
}

/** 解析单条 SSE data 行 */
function parseSSELine(line: string): StreamDelta | null {
  if (!line.startsWith('data: ')) return null;
  const data = line.slice(6).trim();
  if (data === '[DONE]') return null;
  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{ delta?: StreamDelta }>;
    };
    return parsed.choices?.[0]?.delta ?? null;
  } catch {
    return null;
  }
}

/**
 * 流式调用 → 聚合全部 content 为字符串
 * 用于 /api/analyze：需要完整 JSON 后做 Zod 校验
 */
export async function streamAggregate(opts: BailianCallOptions): Promise<string> {
  const { model, messages, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS, requestId } = opts;

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      enable_thinking: false,  // DEC-028 必填
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('Bailian API error', { requestId, status: res.status, body: body.slice(0, 200) });
    throw Object.assign(new Error(`Bailian ${res.status}`), { status: res.status });
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      const delta = parseSSELine(line);
      if (delta?.content) fullText += delta.content;
    }
  }

  return fullText;
}

/**
 * 流式调用 → 透传 SSE 到前端 Response
 * 用于 /api/chat：前端实时看到打字效果
 */
export function streamPassthrough(
  opts: BailianCallOptions,
): ReadableStream<Uint8Array> {
  const { model, messages, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS, requestId } = opts;
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            enable_thinking: false,  // DEC-028 必填
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!res.ok) {
          const errData = JSON.stringify({
            ok: false,
            error: { code: 'AI_UNAVAILABLE', message: `Upstream ${res.status}` },
          });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
          controller.close();
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            // 过滤掉 reasoning_content（thinking 内容，前端不需要）
            try {
              const chunk = JSON.parse(raw) as {
                choices?: Array<{ delta?: StreamDelta }>;
              };
              const delta = chunk.choices?.[0]?.delta;
              if (delta?.content !== undefined) {
                // 只透传 content，去掉 reasoning_content
                const clean = {
                  choices: [{ delta: { content: delta.content } }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(clean)}\n\n`));
              }
            } catch {
              // 非 JSON 行忽略
            }
          }
        }
      } catch (err) {
        logger.error('streamPassthrough error', { requestId, err: String(err) });
        const errData = JSON.stringify({
          ok: false,
          error: { code: 'AI_TIMEOUT', message: 'Request timed out' },
        });
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}

export interface BailianCallWithFallbackOptions extends BailianCallOptions {
  fallbackModel?: string;
}

/**
 * 带 fallback 的流式透传
 * 首选模型返回 403/5xx 时自动降级到 fallbackModel
 */
export function streamPassthroughWithFallback(
  opts: BailianCallWithFallbackOptions,
): ReadableStream<Uint8Array> {
  const { model, messages, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS, requestId, fallbackModel } = opts;
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const doStream = async (currentModel: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: currentModel,
            messages,
            stream: true,
            enable_thinking: false,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!res.ok) {
          // 如果有 fallback 且是可降级的错误（403 权限/5xx 服务端），自动重试
          if (fallbackModel && currentModel !== fallbackModel && (res.status === 403 || res.status >= 500)) {
            logger.warn('bailian: model failed, falling back', { requestId, model: currentModel, fallback: fallbackModel, status: res.status });
            await res.body?.cancel();
            return doStream(fallbackModel);
          }
          const errData = JSON.stringify({
            ok: false,
            error: { code: 'AI_UNAVAILABLE', message: `Upstream ${res.status}` },
          });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            try {
              const chunk = JSON.parse(raw) as {
                choices?: Array<{ delta?: StreamDelta }>;
              };
              const delta = chunk.choices?.[0]?.delta;
              if (delta?.content !== undefined) {
                const clean = {
                  choices: [{ delta: { content: delta.content } }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(clean)}\n\n`));
              }
            } catch {
              // 非 JSON 行忽略
            }
          }
        }
      };

      try {
        await doStream(model);
      } catch (err) {
        logger.error('streamPassthroughWithFallback error', { requestId, err: String(err) });
        const errData = JSON.stringify({
          ok: false,
          error: { code: 'AI_TIMEOUT', message: 'Request timed out' },
        });
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}
