/** 标准化错误响应 */

import { getCorsHeaders, type Env } from '../middleware/cors.js';

const ERROR_MESSAGES: Record<string, { en: string; zh: string; status: number; retryable: boolean }> = {
  INVALID_REQUEST:      { en: 'Invalid request',           zh: '请求格式错误',       status: 400, retryable: false },
  TOO_MANY_IMAGES:      { en: 'Too many images (max 5)',   zh: '图片过多，最多5张',  status: 400, retryable: false },
  PAYLOAD_TOO_LARGE:    { en: 'Payload too large',         zh: '请求体过大',         status: 413, retryable: false },
  RATE_LIMIT_EXCEEDED:  { en: 'Rate limit exceeded',       zh: '请求过于频繁，请稍后再试', status: 429, retryable: true },
  AI_TIMEOUT:           { en: 'AI response timed out',     zh: 'AI 响应超时，请重试', status: 504, retryable: true },
  AI_UNAVAILABLE:       { en: 'AI service unavailable',    zh: 'AI 服务暂时不可用',  status: 503, retryable: true },
  AI_INVALID_RESPONSE:  { en: 'AI returned invalid data',  zh: 'AI 返回数据格式异常', status: 502, retryable: true },
  ORIGIN_NOT_ALLOWED:   { en: 'Origin not allowed',        zh: '来源域名不在白名单', status: 403, retryable: false },
  INTERNAL_ERROR:       { en: 'Internal server error',     zh: '服务器内部错误',     status: 500, retryable: true },
};

export function errorResponse(
  code: keyof typeof ERROR_MESSAGES,
  request: Request,
  env: Env,
  requestId: string,
  detail?: string,
): Response {
  const meta = ERROR_MESSAGES[code] ?? ERROR_MESSAGES['INTERNAL_ERROR']!;
  const origin = request.headers.get('Origin');

  return Response.json(
    {
      ok: false,
      error: {
        code,
        message:    detail ?? meta.en,
        messageZh:  meta.zh,
        messageEn:  meta.en,
        retryable:  meta.retryable,
      },
      requestId,
    },
    {
      status:  meta.status,
      headers: getCorsHeaders(origin, env),
    },
  );
}
