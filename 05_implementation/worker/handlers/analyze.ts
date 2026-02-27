import { type Env } from '../middleware/cors.js';
import { getCorsHeaders } from '../middleware/cors.js';
import { checkRateLimit } from '../utils/rateLimit.js';
import { streamAggregate } from '../utils/bailian.js';
import { errorResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { AnalyzeRequestSchema } from '../schemas/chatSchema.js';
import { MenuAnalyzeResultSchema } from '../schemas/menuSchema.js';
import { MENU_ANALYSIS_SYSTEM, buildMenuAnalysisUserMessage } from '../prompts/menuAnalysis.js';

const MAX_IMAGE_BYTES  = 4 * 1024 * 1024;   // 4 MB per image
const MAX_TOTAL_BYTES  = 10 * 1024 * 1024;  // 10 MB total

/** 从 base64 字符串估算字节数 */
function estimateBase64Bytes(b64: string): number {
  return Math.floor((b64.replace(/=+$/, '').length * 3) / 4);
}

/** 尝试从字符串中提取 JSON 对象 */
function extractJson(raw: string): string {
  // 先尝试直接解析
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;

  // 从 ```json ... ``` 中提取
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match?.[1]) return match[1].trim();

  // 找第一个 { 和最后一个 }
  const start = trimmed.indexOf('{');
  const end   = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

export async function handleAnalyze(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const ip     = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const origin = request.headers.get('Origin');

  // 速率限制：20次/小时
  if (!checkRateLimit(`analyze:${ip}`, 20, 60 * 60 * 1000)) {
    return errorResponse('RATE_LIMIT_EXCEEDED', request, env, requestId);
  }

  // 解析请求体
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_REQUEST', request, env, requestId, 'Request body must be JSON');
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn('analyze: invalid request', { requestId, issues: parsed.error.issues });
    return errorResponse('INVALID_REQUEST', request, env, requestId, parsed.error.issues[0]?.message);
  }

  const { images, context } = parsed.data;

  // 校验图片大小
  let totalBytes = 0;
  for (const img of images) {
    const bytes = estimateBase64Bytes(img.data);
    if (bytes > MAX_IMAGE_BYTES) {
      return errorResponse('PAYLOAD_TOO_LARGE', request, env, requestId, `Image exceeds 4 MB`);
    }
    totalBytes += bytes;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return errorResponse('PAYLOAD_TOO_LARGE', request, env, requestId, 'Total images exceed 10 MB');
  }

  // 构造 Bailian 消息（content array，多图并发在同一 context）
  const imageContents = images.map(img => ({
    type: 'image_url' as const,
    image_url: { url: `data:${img.mimeType};base64,${img.data}` },
  }));

  const userMessage = {
    role: 'user' as const,
    content: [
      ...imageContents,
      { type: 'text' as const, text: buildMenuAnalysisUserMessage(context.language, images.length) },
    ],
  };

  const startMs = Date.now();

  // 主模型：qwen3-vl-flash（速度优先，5x faster than plus）
  // 降级：qwen3-vl-plus（质量更高但慢）
  let rawText: string;
  try {
    rawText = await streamAggregate({
      model:     'qwen3-vl-flash',
      messages:  [{ role: 'system', content: MENU_ANALYSIS_SYSTEM }, userMessage],
      apiKey:    env.BAILIAN_API_KEY,
      timeoutMs: 30_000,
      requestId,
    });
  } catch (err) {
    const errStr = String(err);
    if (errStr.includes('429') || errStr.includes('rate')) {
      logger.warn('analyze: qwen3-vl-flash rate limited, trying fallback', { requestId });
    } else {
      logger.error('analyze: qwen3-vl-flash failed', { requestId, err: errStr });
    }

    // 降级：qwen3-vl-plus
    try {
      rawText = await streamAggregate({
        model:     'qwen3-vl-plus',
        messages:  [{ role: 'system', content: MENU_ANALYSIS_SYSTEM }, userMessage],
        apiKey:    env.BAILIAN_API_KEY,
        timeoutMs: 60_000,
        requestId,
      });
    } catch (fallbackErr) {
      const isTimeout = String(fallbackErr).includes('timeout') || String(fallbackErr).includes('AbortError');
      return errorResponse(
        isTimeout ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE',
        request, env, requestId,
      );
    }
  }

  // Zod 校验
  let jsonStr: string;
  try {
    jsonStr = extractJson(rawText);
  } catch {
    logger.error('analyze: failed to extract JSON', { requestId, raw: rawText.slice(0, 200) });
    return errorResponse('AI_INVALID_RESPONSE', request, env, requestId);
  }

  let aiResult: unknown;
  try {
    aiResult = JSON.parse(jsonStr);
  } catch {
    logger.error('analyze: JSON parse failed', { requestId, raw: jsonStr.slice(0, 200) });
    return errorResponse('AI_INVALID_RESPONSE', request, env, requestId);
  }

  const validated = MenuAnalyzeResultSchema.safeParse(aiResult);
  if (!validated.success) {
    logger.error('analyze: Zod validation failed', { requestId, issues: validated.error.issues, raw: jsonStr.slice(0, 300) });
    return errorResponse('AI_INVALID_RESPONSE', request, env, requestId);
  }

  const result = { ...validated.data, processingMs: Date.now() - startMs };

  logger.info('analyze: success', {
    requestId,
    processingMs: result.processingMs,
    itemCount:    result.items.length,
    lang:         result.detectedLanguage,
  });

  return Response.json(
    { ok: true, data: result, requestId },
    { headers: getCorsHeaders(origin, env) },
  );
}
