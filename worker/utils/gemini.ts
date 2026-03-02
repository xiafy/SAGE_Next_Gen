/**
 * Google Gemini API 客户端（generateContent，非流式）
 *
 * 用于 /api/analyze 的 VL 识别阶段（DEC-045）：
 *   - Gemini 2.0 Flash 实测 ~8s（vs qwen3-vl-flash ~13s direct / ~23s via Worker）
 *   - 无跨境路由问题（Google 全球 CDN，CF 东京节点可就近访问）
 *   - 输出 JSON 场景一律用非流式（DEC-044 原则）
 */

import { logger } from './logger.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = 30_000;

export interface GeminiImagePart {
  mimeType: string;
  data: string; // base64
}

export interface GeminiCallOptions {
  model: string;
  systemPrompt: string;
  userText: string;
  images?: GeminiImagePart[];
  apiKey: string;
  timeoutMs?: number;
  requestId?: string;
  maxOutputTokens?: number;
}

/**
 * 非流式调用 Gemini → 返回完整文本内容
 */
export async function fetchGeminiComplete(opts: GeminiCallOptions): Promise<string> {
  const {
    model,
    systemPrompt,
    userText,
    images = [],
    apiKey,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    requestId,
    maxOutputTokens = 2048,
  } = opts;

  const parts: unknown[] = [
    ...images.map((img) => ({
      inline_data: { mime_type: img.mimeType, data: img.data },
    })),
    { text: userText },
  ];

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      maxOutputTokens,
      temperature: 0,
    },
  };

  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    logger.error('Gemini API error', { requestId, status: res.status, body: errBody.slice(0, 300) });
    // FAILED_PRECONDITION: "User location is not supported for the API use."
    // 从中国大陆 CF 边缘节点调用时触发，需切换到国内可用模型
    const geoBlocked = res.status === 400 && errBody.includes('FAILED_PRECONDITION');
    throw Object.assign(new Error(`Gemini ${res.status}`), { status: res.status, geoBlocked });
  }

  const data = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message?: string };
  };

  if (data.error) {
    logger.error('Gemini API error response', { requestId, error: data.error.message });
    throw new Error(`Gemini error: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    logger.warn('Gemini empty response', { requestId, finishReason: data.candidates?.[0]?.finishReason });
  }
  return text;
}
