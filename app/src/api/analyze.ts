import { WORKER_BASE } from './config';
import type {
  AnalyzeProgressEvent,
  ApiErrorResponse,
  ApiSuccessResponse,
  GeoLocation,
  Language,
  MenuData,
} from '../types';
import { TIMEOUTS } from '../types';
import { dlog } from '../utils/debugLog';

interface AnalyzeMenuOptions {
  signal?: AbortSignal;
  onProgress?: (event: AnalyzeProgressEvent) => void;
}

/**
 * Load image File into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    dlog('img', 'loadImage objectURL created, type=', file.type, 'size=', file.size);
    const img = new Image();
    img.onload = () => {
      dlog('img', 'onload OK', img.naturalWidth, 'x', img.naturalHeight);
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      dlog('img', 'onload FAIL', e);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Compress image using Canvas API (no external library, iOS Safari compatible)
 */
async function compressImage(
  file: File,
  maxDimension = 1280,
  maxSizeBytes = 500 * 1024,
): Promise<Blob> {
  dlog('compress', 'start, input size=', file.size, 'type=', file.type);

  const img = await loadImage(file);

  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > maxDimension || h > maxDimension) {
    const scale = maxDimension / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  // iOS Safari canvas size limit check (~16MP)
  if (w * h > 16_000_000) {
    const scale = Math.sqrt(16_000_000 / (w * h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);

  const webpSupported = await new Promise<boolean>((resolve) => {
    canvas.toBlob((b) => resolve(!!b && b.size > 0), 'image/webp', 0.5);
  });
  const outputType = webpSupported ? 'image/webp' : 'image/jpeg';

  for (const quality of [0.75, 0.6, 0.45, 0.3]) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        outputType,
        quality,
      );
    });

    if (blob.size <= maxSizeBytes) return blob;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      outputType,
      0.15,
    );
  });
}

async function normalizeImage(file: File): Promise<Blob> {
  try {
    return await compressImage(file);
  } catch {
    throw new Error('Image compression failed. Please try a clearer photo.');
  }
}

async function normalizeImagesWithConcurrency(files: File[], concurrency = 2): Promise<Blob[]> {
  const results = new Array<Blob>(files.length);
  let index = 0;

  async function workerTask(): Promise<void> {
    while (index < files.length) {
      const current = index;
      index += 1;
      results[current] = await normalizeImage(files[current]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => workerTask());
  await Promise.all(workers);
  return results;
}

function toMimeType(blob: Blob): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' {
  const type = blob.type;
  if (type === 'image/png' || type === 'image/webp' || type === 'image/heic') return type;
  return 'image/jpeg';
}

function parseSSEEventBlock(block: string): { event: string; data: string } | null {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let event = 'message';
  const dataParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).trim());
    }
  }

  return { event, data: dataParts.join('\n') };
}

export async function analyzeMenu(
  images: File[],
  language: Language = 'zh',
  location?: GeoLocation | null,
  signal?: AbortSignal,
  onProgress?: AnalyzeMenuOptions['onProgress'],
): Promise<MenuData> {
  dlog('analyze', 'start analyzeMenu, images=', images.length);

  onProgress?.({
    stage: 'uploading',
    progress: 5,
    message: language === 'zh' ? '正在压缩图片…' : 'Compressing images…',
  });

  const normalizedBlobs = await normalizeImagesWithConcurrency(images, 2);

  const formData = new FormData();
  normalizedBlobs.forEach((blob, idx) => {
    const mimeType = toMimeType(blob);
    const ext = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg';
    formData.append('images', blob, `menu_${idx + 1}.${ext}`);
    formData.append('mimeTypes', mimeType);
  });
  formData.append('context_language', language);
  formData.append('context_timestamp', String(Date.now()));
  if (location) {
    formData.append('context_location', JSON.stringify(location));
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUTS.ANALYZE_CLIENT);
  const merged = new AbortController();
  const onAbort = () => merged.abort();

  if (signal) {
    signal.addEventListener('abort', onAbort, { once: true });
  }
  timeoutController.signal.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(`${WORKER_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
      },
      body: formData,
      signal: merged.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Menu analysis failed (${response.status}): ${text}`);
    }

    if (!response.body) {
      throw new Error('Analyze stream unavailable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalData: MenuData | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const evt = parseSSEEventBlock(part);
        if (!evt) continue;

        if (evt.event === 'progress') {
          try {
            const progress = JSON.parse(evt.data) as AnalyzeProgressEvent;
            onProgress?.(progress);
          } catch {
            // Ignore malformed progress event
          }
          continue;
        }

        if (evt.event === 'result') {
          const parsed = JSON.parse(evt.data) as ApiSuccessResponse<MenuData>;
          if (!parsed.ok) throw new Error('Analyze stream returned non-ok result');
          finalData = parsed.data;
          continue;
        }

        if (evt.event === 'error') {
          const parsed = JSON.parse(evt.data) as ApiErrorResponse;
          const message = parsed.error?.message ?? 'Analyze failed';
          throw new Error(message);
        }
      }
    }

    if (!finalData) {
      throw new Error('Analyze stream ended without result');
    }

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: language === 'zh' ? '识别完成' : 'Done',
    });

    return finalData;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
    timeoutController.signal.removeEventListener('abort', onAbort);
  }
}
