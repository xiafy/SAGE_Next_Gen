import { type Env, getCorsHeaders } from '../middleware/cors.js';
import { checkRateLimit } from '../utils/rateLimit.js';
import { fetchComplete } from '../utils/bailian.js';
import { errorResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { SummarizeRequestSchema, SummarizeResponseSchema } from '../schemas/memorySchema.js';
import { buildMemorySummarizePrompt } from '../prompts/memorySummarize.js';

export async function handleSummarize(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const ip     = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const origin = request.headers.get('Origin');

  if (!checkRateLimit(`summarize:${ip}`, 30, 60 * 60 * 1000)) {
    return errorResponse('RATE_LIMIT_EXCEEDED', request, env, requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_REQUEST', request, env, requestId, 'Request body must be JSON');
  }

  const parsed = SummarizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn('summarize: invalid request', { requestId, issues: parsed.error.issues });
    return errorResponse('INVALID_REQUEST', request, env, requestId, parsed.error.issues[0]?.message);
  }

  const systemPrompt = buildMemorySummarizePrompt(parsed.data);

  logger.info('summarize: calling AI', { requestId, msgCount: parsed.data.messages.length });

  let rawContent: string;
  try {
    rawContent = await fetchComplete({
      model: 'qwen3.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请根据以上对话记录生成摘要和偏好进化建议。' },
      ],
      apiKey: env.BAILIAN_API_KEY,
      requestId,
      timeoutMs: 30_000,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('summarize: AI call failed', { requestId, error: errMsg });
    const isTimeout = errMsg.includes('timeout') || errMsg.includes('AbortError');
    return errorResponse(isTimeout ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE', request, env, requestId);
  }

  // Extract JSON from AI response (may be wrapped in ```json ... ```)
  let jsonStr = rawContent.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1]!.trim();
  }

  let jsonData: unknown;
  try {
    jsonData = JSON.parse(jsonStr);
  } catch {
    logger.error('summarize: AI returned invalid JSON', { requestId, raw: rawContent.slice(0, 500) });
    return errorResponse('AI_INVALID_RESPONSE', request, env, requestId, 'AI returned non-JSON response');
  }

  const validated = SummarizeResponseSchema.safeParse(jsonData);
  if (!validated.success) {
    logger.error('summarize: AI response failed schema validation', {
      requestId,
      issues: validated.error.issues,
      raw: rawContent.slice(0, 500),
    });
    return errorResponse('AI_INVALID_RESPONSE', request, env, requestId, 'AI response schema mismatch');
  }

  const corsHeaders = getCorsHeaders(origin, env);

  return Response.json(
    { ok: true, data: validated.data, requestId },
    { headers: corsHeaders },
  );
}
