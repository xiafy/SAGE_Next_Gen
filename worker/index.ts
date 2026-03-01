/**
 * SAGE Worker — 入口路由
 *
 * 端点:
 *   GET  /api/health   — 健康检查
 *   POST /api/analyze  — 菜单图片识别（聚合 SSE，返回完整 JSON）
 *   POST /api/chat     — AI 对话（透传 SSE 给前端）
 */

import { type Env, handleOptions } from './middleware/cors.js';
import { errorResponse } from './utils/errors.js';
import { handleHealth } from './handlers/health.js';
import { handleAnalyze } from './handlers/analyze.js';
import { handleChat } from './handlers/chat.js';
import { handleTranscribe } from './handlers/transcribe.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();

    // CORS preflight
    const preflightRes = handleOptions(request, env);
    if (preflightRes) return preflightRes;

    const url = new URL(request.url);

    try {
      // GET /api/health
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return handleHealth(request, env);
      }

      // POST /api/analyze
      if (request.method === 'POST' && url.pathname === '/api/analyze') {
        return await handleAnalyze(request, env, requestId);
      }

      // POST /api/chat
      if (request.method === 'POST' && url.pathname === '/api/chat') {
        return await handleChat(request, env, requestId);
      }

      // POST /api/transcribe — 音频转文字
      if (request.method === 'POST' && url.pathname === '/api/transcribe') {
        return await handleTranscribe(request, env, requestId);
      }

      // 404
      return errorResponse('INVALID_REQUEST', request, env, requestId, 'Route not found');

    } catch (err) {
      // 兜底异常处理
      const errMsg = err instanceof Error ? err.message : String(err);
      const isTimeout = errMsg.includes('timeout') || errMsg.includes('AbortError');

      return errorResponse(
        isTimeout ? 'AI_TIMEOUT' : 'INTERNAL_ERROR',
        request, env, requestId,
      );
    }
  },
} satisfies ExportedHandler<Env>;
