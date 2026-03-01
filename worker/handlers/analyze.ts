import { type Env } from '../middleware/cors.js';
import { getCorsHeaders } from '../middleware/cors.js';
import { checkRateLimit } from '../utils/rateLimit.js';
import { streamAggregate } from '../utils/bailian.js';
import { errorResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { AnalyzeRequestSchema } from '../schemas/chatSchema.js';
import type { AnalyzeRequest } from '../schemas/chatSchema.js';
import { MenuAnalyzeResultSchema } from '../schemas/menuSchema.js';
import { MENU_ANALYSIS_SYSTEM, buildMenuAnalysisUserMessage } from '../prompts/menuAnalysis.js';

type AnalyzeErrorCode =
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE'
  | 'INTERNAL_ERROR';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB per image
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB total

interface AnalyzeErrorPayload {
  ok: false;
  error: {
    code: AnalyzeErrorCode;
    message: string;
    messageZh: string;
    messageEn: string;
    retryable: boolean;
  };
  requestId: string;
}

const STREAM_ERROR_MESSAGES: Record<AnalyzeErrorCode, { en: string; zh: string; retryable: boolean }> = {
  INVALID_REQUEST: { en: 'Invalid request', zh: '请求格式错误', retryable: false },
  PAYLOAD_TOO_LARGE: { en: 'Payload too large', zh: '请求体过大', retryable: false },
  AI_TIMEOUT: { en: 'AI response timed out', zh: 'AI 响应超时，请重试', retryable: true },
  AI_UNAVAILABLE: { en: 'AI service unavailable', zh: 'AI 服务暂时不可用', retryable: true },
  AI_INVALID_RESPONSE: { en: 'AI returned invalid data', zh: 'AI 返回数据格式异常', retryable: true },
  INTERNAL_ERROR: { en: 'Internal server error', zh: '服务器内部错误', retryable: true },
};

/** 从 base64 字符串估算字节数 */
function estimateBase64Bytes(b64: string): number {
  return Math.floor((b64.replace(/=+$/, '').length * 3) / 4);
}

/** 尝试从字符串中提取 JSON 对象 */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match?.[1]) return match[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

function toAnalyzeErrorPayload(code: AnalyzeErrorCode, requestId: string, detail?: string): AnalyzeErrorPayload {
  const meta = STREAM_ERROR_MESSAGES[code];
  return {
    ok: false,
    error: {
      code,
      message: detail ?? meta.en,
      messageZh: meta.zh,
      messageEn: meta.en,
      retryable: meta.retryable,
    },
    requestId,
  };
}

function toSSE(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function parseAnalyzeRequest(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const rawImages = form.getAll('images') as unknown[];
    const imageFiles = rawImages.filter(
      (item): item is Blob => typeof item === 'object' && item !== null && 'arrayBuffer' in item,
    );

    if (imageFiles.length === 0) {
      return { images: [], context: {} };
    }

    const images = await Promise.all(
      imageFiles.map(async (file: Blob) => {
        const base64 = arrayBufferToBase64(await file.arrayBuffer());
        const mimeType = file.type || 'image/jpeg';
        return {
          data: base64,
          mimeType,
        };
      }),
    );

    const rawLocation = form.get('context_location');
    let location: { lat: number; lng: number; accuracy?: number } | undefined;
    if (typeof rawLocation === 'string' && rawLocation.trim().length > 0) {
      try {
        location = JSON.parse(rawLocation) as { lat: number; lng: number; accuracy?: number };
      } catch {
        // Let Zod handle invalid location shape
      }
    }

    return {
      images,
      context: {
        language: form.get('context_language'),
        timestamp: Number(form.get('context_timestamp') ?? Date.now()),
        ...(location ? { location } : {}),
      },
    };
  }

  return request.json();
}

async function runAnalyzePipeline(
  normalizedRequest: AnalyzeRequest,
  env: Env,
  requestId: string,
  onProgress?: (event: { stage: string; progress: number; message: string }) => void,
) {
  const { images, context } = normalizedRequest;

  let totalBytes = 0;
  for (const img of images) {
    const bytes = estimateBase64Bytes(img.data);
    if (bytes > MAX_IMAGE_BYTES) {
      throw Object.assign(new Error('Image exceeds 4 MB'), { code: 'PAYLOAD_TOO_LARGE' as const });
    }
    totalBytes += bytes;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw Object.assign(new Error('Total images exceed 10 MB'), { code: 'PAYLOAD_TOO_LARGE' as const });
  }

  onProgress?.({
    stage: 'preparing',
    progress: 20,
    message: context.language === 'zh' ? '图片上传完成，准备识别…' : 'Upload complete. Preparing vision analysis…',
  });

  const imageContents = images.map((img) => ({
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
  let rawText: string;
  let modelUsed: 'qwen3-vl-flash' | 'qwen3-vl-plus' = 'qwen3-vl-flash';

  onProgress?.({
    stage: 'vision_flash',
    progress: 45,
    message: context.language === 'zh' ? '正在识别菜单（快速模型）…' : 'Scanning menu with fast model…',
  });

  try {
    rawText = await streamAggregate({
      model: 'qwen3-vl-flash',
      messages: [{ role: 'system', content: MENU_ANALYSIS_SYSTEM }, userMessage],
      apiKey: env.BAILIAN_API_KEY,
      timeoutMs: 30_000,
      requestId,
    });
  } catch (err) {
    logger.warn('analyze: flash failed, trying plus', { requestId, err: String(err).slice(0, 120) });

    onProgress?.({
      stage: 'vision_plus_fallback',
      progress: 65,
      message: context.language === 'zh' ? '快速模型失败，切换增强模型…' : 'Fast model failed, switching to fallback model…',
    });

    try {
      rawText = await streamAggregate({
        model: 'qwen3-vl-plus',
        messages: [{ role: 'system', content: MENU_ANALYSIS_SYSTEM }, userMessage],
        apiKey: env.BAILIAN_API_KEY,
        timeoutMs: 25_000,
        requestId,
      });
      modelUsed = 'qwen3-vl-plus';
    } catch (fallbackErr) {
      const errText = String(fallbackErr);
      const timeout = errText.includes('timeout') || errText.includes('AbortError');
      throw Object.assign(new Error('upstream failed'), {
        code: timeout ? ('AI_TIMEOUT' as const) : ('AI_UNAVAILABLE' as const),
      });
    }
  }

  onProgress?.({
    stage: 'validating',
    progress: 85,
    message: context.language === 'zh' ? '解析识别结果…' : 'Validating result…',
  });

  async function parseAndValidate(text: string) {
    const jsonStr = extractJson(text);
    const aiResult = JSON.parse(jsonStr);
    const validated = MenuAnalyzeResultSchema.safeParse(aiResult);
    if (!validated.success) {
      throw new Error('zod_invalid');
    }
    const result = { ...validated.data, processingMs: Date.now() - startMs };
    if (result.items.length === 0) {
      throw new Error('zero_items');
    }
    return result;
  }

  try {
    const result = await parseAndValidate(rawText);

    logger.info('analyze: success', {
      requestId,
      modelUsed,
      processingMs: result.processingMs,
      itemCount: result.items.length,
      lang: result.detectedLanguage,
    });

    return result;
  } catch (parseError) {
    logger.error('analyze: parse failed', { requestId, modelUsed, err: String(parseError) });
    throw Object.assign(new Error('invalid response'), { code: 'AI_INVALID_RESPONSE' as const });
  }
}

export async function handleAnalyze(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const origin = request.headers.get('Origin');
  const accept = request.headers.get('accept')?.toLowerCase() ?? '';
  const wantsStream = accept.includes('text/event-stream');

  if (!checkRateLimit(`analyze:${ip}`, 20, 60 * 60 * 1000)) {
    return errorResponse('RATE_LIMIT_EXCEEDED', request, env, requestId);
  }

  let body: unknown;
  try {
    body = await parseAnalyzeRequest(request);
  } catch {
    return errorResponse('INVALID_REQUEST', request, env, requestId, 'Request body parse failed');
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn('analyze: invalid request', { requestId, issues: parsed.error.issues });
    return errorResponse('INVALID_REQUEST', request, env, requestId, parsed.error.issues[0]?.message);
  }

  if (!wantsStream) {
    try {
      const result = await runAnalyzePipeline(parsed.data, env, requestId);
      return Response.json(
        { ok: true, data: result, requestId },
        { headers: getCorsHeaders(origin, env) },
      );
    } catch (err) {
      const code = (err as { code?: AnalyzeErrorCode }).code ?? 'INTERNAL_ERROR';
      return errorResponse(code, request, env, requestId, err instanceof Error ? err.message : undefined);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(toSSE(event, payload)));
      };

      emit('progress', {
        stage: 'uploading',
        progress: 10,
        message: parsed.data.context.language === 'zh' ? '收到图片，开始上传处理…' : 'Images received. Processing upload…',
      });

      try {
        const result = await runAnalyzePipeline(parsed.data, env, requestId, (progress) => {
          emit('progress', progress);
        });

        emit('result', { ok: true, data: result, requestId });
        emit('progress', {
          stage: 'completed',
          progress: 100,
          message: parsed.data.context.language === 'zh' ? '识别完成' : 'Completed',
        });
        emit('done', '[DONE]');
      } catch (err) {
        const code = (err as { code?: AnalyzeErrorCode }).code ?? 'INTERNAL_ERROR';
        const detail = err instanceof Error ? err.message : undefined;
        emit('error', toAnalyzeErrorPayload(code, requestId, detail));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...getCorsHeaders(origin, env),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Request-Id': requestId,
    },
  });
}
