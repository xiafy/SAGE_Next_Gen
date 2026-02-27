/** 标准化错误响应 */

import { getCorsHeaders, type Env } from '../middleware/cors.js';

const ERROR_MESSAGES: Record<string, { en: string; zh: string; status: number; retryable: boolean; suggestion: string; suggestionZh: string }> = {
  INVALID_REQUEST:      { en: 'Invalid request',           zh: '请求格式错误',       status: 400, retryable: false,  suggestion: 'Check your input and try again',             suggestionZh: '请检查输入后重试' },
  TOO_MANY_IMAGES:      { en: 'Too many images (max 5)',   zh: '图片过多，最多5张',  status: 400, retryable: false,  suggestion: 'Reduce to 5 images or fewer',                suggestionZh: '请减少到5张以内' },
  PAYLOAD_TOO_LARGE:    { en: 'Payload too large',         zh: '请求体过大',         status: 413, retryable: false,  suggestion: 'Reduce image count or compress images',      suggestionZh: '请减少图片数量或压缩图片' },
  RATE_LIMIT_EXCEEDED:  { en: 'Rate limit exceeded',       zh: '请求过于频繁，请稍后再试', status: 429, retryable: true,   suggestion: 'Please wait 1 minute',                       suggestionZh: '请等待1分钟后再试' },
  AI_TIMEOUT:           { en: 'AI response timed out',     zh: 'AI 响应超时，请重试', status: 504, retryable: true,   suggestion: 'Check your connection and retry',            suggestionZh: '检查网络后重试' },
  AI_UNAVAILABLE:       { en: 'AI service unavailable',    zh: 'AI 服务暂时不可用',  status: 503, retryable: true,   suggestion: 'Service maintenance, try again later',       suggestionZh: '服务维护中，请稍后再试' },
  AI_INVALID_RESPONSE:  { en: 'AI returned invalid data',  zh: 'AI 返回数据格式异常', status: 502, retryable: true,   suggestion: 'Please retake the menu photo',               suggestionZh: '请重新拍摄菜单' },
  ORIGIN_NOT_ALLOWED:   { en: 'Origin not allowed',        zh: '来源域名不在白名单', status: 403, retryable: false,  suggestion: 'Open the app from the correct URL',          suggestionZh: '请从正确的链接打开应用' },
  INTERNAL_ERROR:       { en: 'Internal server error',     zh: '服务器内部错误',     status: 500, retryable: true,   suggestion: 'Try again later or contact support',         suggestionZh: '请稍后重试或联系客服' },
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
        suggestion:   meta.suggestion,
        suggestionZh: meta.suggestionZh,
      },
      requestId,
    },
    {
      status:  meta.status,
      headers: getCorsHeaders(origin, env),
    },
  );
}
