/**
 * POST /api/transcribe — 音频转文字
 *
 * 使用 DashScope qwen2.5-omni-7b 的 input_audio 能力做语音转写
 *
 * 请求体: { audio: string (base64), mimeType: string, language: "zh"|"en" }
 * 响应:   { ok: true, text: string } | { ok: false, error: { code, message } }
 */

import { type Env, getCorsHeaders } from '../middleware/cors.js';
import { checkRateLimit } from '../utils/rateLimit.js';
import { errorResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MAX_AUDIO_BYTES = 500 * 1024; // 500KB
const ASR_TIMEOUT_MS = 20_000;
const ASR_MODEL = 'qwen-omni-turbo';

interface TranscribeRequest {
  audio: string;       // base64 encoded audio
  mimeType: string;    // audio/webm, audio/mp4, audio/wav, etc.
  language?: string;   // zh or en
}

/** Map MIME type to audio format string for the API */
function mimeToFormat(mime: string): string {
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3';
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('flac')) return 'flac';
  return 'wav'; // fallback
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

  // Estimate base64 decoded size
  const estimatedBytes = Math.floor((body.audio.replace(/=+$/, '').length * 3) / 4);
  if (estimatedBytes > MAX_AUDIO_BYTES) {
    return errorResponse('INVALID_REQUEST', request, env, requestId, `Audio too large: ~${estimatedBytes} bytes (max ${MAX_AUDIO_BYTES})`);
  }

  const format = mimeToFormat(body.mimeType || 'audio/wav');
  const mimeBase = body.mimeType?.split(';')[0] || 'audio/wav';
  const dataUri = `data:${mimeBase};base64,${body.audio}`;

  const isZh = body.language === 'zh';
  const systemPrompt = isZh
    ? '你是一个语音转写助手。请将音频内容逐字转写为文字，只输出转写结果，不要添加任何标点符号以外的额外内容。如果音频中没有语音，输出空字符串。'
    : 'You are a speech transcription assistant. Transcribe the audio content verbatim. Output only the transcription text. If there is no speech, output an empty string.';

  logger.info('transcribe: start', {
    requestId,
    audioSize: estimatedBytes,
    format,
    language: body.language,
  });

  try {
    const res = await fetch(DASHSCOPE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.BAILIAN_API_KEY}`,
      },
      body: JSON.stringify({
        model: ASR_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'input_audio', input_audio: { data: dataUri, format } },
              { type: 'text', text: isZh ? '请转写这段音频。' : 'Please transcribe this audio.' },
            ],
          },
        ],
        stream: false,
        enable_thinking: false,
      }),
      signal: AbortSignal.timeout(ASR_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      logger.error('transcribe: DashScope error', { requestId, status: res.status, body: errBody.slice(0, 300) });
      return new Response(
        JSON.stringify({ ok: false, error: { code: 'ASR_FAILED', message: `ASR service returned ${res.status}` } }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...cors } },
      );
    }

    const result = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = (result.choices?.[0]?.message?.content ?? '').trim();

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
