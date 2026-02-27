import { type Env, getCorsHeaders } from '../middleware/cors.js';
import { checkRateLimit } from '../utils/rateLimit.js';
import { streamPassthroughWithFallback } from '../utils/bailian.js';
import { errorResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { getWeather } from '../utils/weather.js';
import { ChatRequestSchema } from '../schemas/chatSchema.js';
import { getPreChatSystem } from '../prompts/preChat.js';
import { buildAgentChatSystem } from '../prompts/agentChat.js';
import { MenuAnalyzeResultSchema } from '../schemas/menuSchema.js';

export async function handleChat(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const ip     = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const origin = request.headers.get('Origin');

  // 速率限制：100次/小时
  if (!checkRateLimit(`chat:${ip}`, 100, 60 * 60 * 1000)) {
    return errorResponse('RATE_LIMIT_EXCEEDED', request, env, requestId);
  }

  // 解析请求体
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_REQUEST', request, env, requestId, 'Request body must be JSON');
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn('chat: invalid request', { requestId, issues: parsed.error.issues });
    return errorResponse('INVALID_REQUEST', request, env, requestId, parsed.error.issues[0]?.message);
  }

  const { mode, messages, menuData, preferences, context } = parsed.data;

  // 构造 system prompt
  let systemPrompt: string;

  if (mode === 'pre_chat') {
    // Pre-Chat：qwen3.5-flash，菜单还未就绪
    systemPrompt = getPreChatSystem(context.language);
  } else {
    // 主 Chat：qwen3.5-plus，菜单已就绪
    if (!menuData) {
      return errorResponse('INVALID_REQUEST', request, env, requestId, 'menuData is required for mode=chat');
    }

    const menuValidated = MenuAnalyzeResultSchema.safeParse(menuData);
    if (!menuValidated.success) {
      logger.warn('chat: invalid menuData', { requestId, issues: menuValidated.error.issues });
      return errorResponse('INVALID_REQUEST', request, env, requestId, 'menuData schema invalid');
    }

    // 获取天气信息（500ms 超时，失败不影响主流程）
    const weather = context.location
      ? await getWeather(context.location.lat, context.location.lng, context.language)
      : null;

    systemPrompt = buildAgentChatSystem({
      menu:        menuValidated.data,
      preferences,
      context,
      weather,
    });
  }

  // pre_chat 用 flash，主 chat 用 plus（失败自动降级 flash）
  const model = mode === 'pre_chat' ? 'qwen3.5-flash' : 'qwen3.5-plus';
  const fallback = mode === 'pre_chat' ? undefined : 'qwen3.5-flash';

  const bailianMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages,
  ];

  logger.info('chat: streaming', { requestId, mode, model, msgCount: messages.length });

  const stream = streamPassthroughWithFallback({
    model,
    messages: bailianMessages,
    apiKey:   env.BAILIAN_API_KEY,
    requestId,
    fallbackModel: fallback,
  });

  const corsHeaders = getCorsHeaders(origin, env);

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type':      'text/event-stream; charset=utf-8',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Request-Id':      requestId,
    },
  });
}
