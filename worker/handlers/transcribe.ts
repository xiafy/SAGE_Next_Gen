/**
 * POST /api/transcribe — 音频转文字 (DashScope SenseVoice)
 *
 * 请求体: { audio: string (base64), mimeType: string, language: "zh"|"en" }
 * 响应:   { ok: true, text: string } | { ok: false, error: { code, message } }
 */

import { type Env, getCorsHeaders } from '../middleware/cors.js';
import { checkRateLimit } from '../utils/rateLimit.js';
import { errorResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const DASHSCOPE_ASR_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions';
const MAX_AUDIO_BYTES = 200 * 1024; // 200KB
const ASR_TIMEOUT_MS = 15_000;
const ASR_MODEL = 'sensevoice-v1';

interface TranscribeRequest {
  audio: string;       // base64 encoded audio
  mimeType: string;    // audio/webm or audio/mp4
  language?: string;   // zh or en
}

function mimeToExt(mime: string): string {
  if (mime.includes('mp4') || mime.includes('m4a')) return 'audio.mp4';
  if (mime.includes('webm')) return 'audio.webm';
  if (mime.includes('ogg')) return 'audio.ogg';
  return 'audio.bin';
}

export async function handleTranscribe(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const origin = request.headers.get('Origin');
  const cors = getCorsHeaders(origin, env);

  // Rate limit: 10 requests per 60s
  if (!checkRateLimit('transcribe', 10, 60_000)) {
    return errorResponse('RATE_LIMITED', request, env, requestId);
  }

  // Parse body
  let body: TranscribeRequest;
  try {
    body = await request.json() as TranscribeRequest;
  } catch {
    return errorResponse('INVALID_REQUEST', request, env, requestId, 'Invalid JSON body');
  }

  if (!body.audio || typeof body.audio !== 'string') {
    return errorResponse('INVALID_REQUEST', request, env, requestId, 'Missing audio field');
  }

  // Decode base64
  let audioBytes: Uint8Array;
  try {
    const raw = atob(body.audio);
    audioBytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) audioBytes[i] = raw.charCodeAt(i);
  } catch {
    return errorResponse('INVALID_REQUEST', request, env, requestId, 'Invalid base64 audio');
  }

  if (audioBytes.length > MAX_AUDIO_BYTES) {
    return errorResponse('INVALID_REQUEST', request, env, requestId, `Audio too large: ${audioBytes.length} bytes (max ${MAX_AUDIO_BYTES})`);
  }

  logger.info('transcribe: start', {
    requestId,
    audioSize: audioBytes.length,
    mimeType: body.mimeType,
    language: body.language,
  });

  // Build FormData for DashScope ASR
  const filename = mimeToExt(body.mimeType || 'audio/mp4');
  const blob = new Blob([audioBytes], { type: body.mimeType || 'audio/mp4' });
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('model', ASR_MODEL);

  try {
    const res = await fetch(DASHSCOPE_ASR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.BAILIAN_API_KEY}`,
      },
      body: formData,
      signal: AbortSignal.timeout(ASR_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      logger.error('transcribe: DashScope ASR error', { requestId, status: res.status, body: errBody.slice(0, 300) });
      return new Response(
        JSON.stringify({ ok: false, error: { code: 'ASR_FAILED', message: `ASR service returned ${res.status}` } }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...cors } },
      );
    }

    const result = await res.json() as { text?: string };
    const text = (result.text ?? '').trim();

    logger.info('transcribe: done', { requestId, textLength: text.length });

    return new Response(
      JSON.stringify({ ok: true, text }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...cors } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes('timeout') || msg.includes('AbortError');
    logger.error('transcribe: failed', { requestId, error: msg });

    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: isTimeout ? 'ASR_TIMEOUT' : 'ASR_FAILED',
          message: isTimeout ? 'Transcription timed out' : 'Transcription failed',
        },
      }),
      { status: isTimeout ? 504 : 502, headers: { 'Content-Type': 'application/json', ...cors } },
    );
  }
}
