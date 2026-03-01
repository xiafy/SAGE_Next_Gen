/**
 * 音频转写 API — 发送录音到 Worker，返回文字
 */

import { WORKER_BASE } from './config';

const TRANSCRIBE_TIMEOUT_MS = 20_000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip "data:audio/...;base64," prefix
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudio(
  audioBlob: Blob,
  language: string,
  signal?: AbortSignal,
): Promise<string> {
  const base64 = await blobToBase64(audioBlob);

  const res = await fetch(`${WORKER_BASE}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio: base64,
      mimeType: audioBlob.type,
      language,
    }),
    signal: signal ?? AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } })) as {
      error?: { message?: string };
    };
    throw new Error(data.error?.message ?? `Transcription failed (${res.status})`);
  }

  const data = await res.json() as { ok: boolean; text: string };
  if (!data.ok || !data.text) {
    throw new Error('Empty transcription result');
  }

  return data.text;
}
