import { WORKER_BASE } from './config';
import type {
  AnalyzeProgressEvent,
  ApiErrorResponse,
  ApiSuccessResponse,
  GeoLocation,
  Language,
  MenuData,
} from '../types';

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
  forceJpeg = false,
): Promise<Blob> {
  dlog('compress', 'start, input size=', file.size, 'type=', file.type);

  let source: CanvasImageSource;
  let sourceWidth: number;
  let sourceHeight: number;
  let bitmap: ImageBitmap | null = null;

  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file);
      source = bitmap;
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      dlog('compress', 'createImageBitmap OK', sourceWidth, 'x', sourceHeight);
    } else {
      throw new Error('createImageBitmap unavailable');
    }
  } catch (bitmapErr) {
    dlog('compress', 'createImageBitmap fallback', String(bitmapErr));
    const img = await loadImage(file);
    source = img;
    sourceWidth = img.naturalWidth;
    sourceHeight = img.naturalHeight;
  }

  try {
    let w = sourceWidth;
    let h = sourceHeight;
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
    ctx.drawImage(source, 0, 0, w, h);

    const webpSupported = await new Promise<boolean>((resolve) => {
      canvas.toBlob((b) => resolve(!!b && b.size > 0), 'image/webp', 0.5);
    });
    const outputType = forceJpeg ? 'image/jpeg' : (webpSupported ? 'image/webp' : 'image/jpeg');

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
  } finally {
    bitmap?.close();
  }
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && ua.includes('safari') && !ua.includes('crios');
}

async function normalizeImage(file: File): Promise<Blob> {
  try {
    const iosSafari = isIOSSafari();

    if (iosSafari) {
      const maxSize = 350 * 1024;
      const dims = [1024, 920, 800, 700];
      let best: Blob | null = null;

      for (const dim of dims) {
        const blob = await compressImage(file, dim, maxSize, true);
        best = blob;
        if (blob.size <= maxSize) {
          dlog('compress', 'done(iOS hard-cap hit)', 'dim=', dim, 'size=', blob.size, 'type=', blob.type);
          return blob;
        }
      }

      dlog('compress', 'done(iOS fallback smallest)', 'size=', best?.size, 'type=', best?.type);
      return best!;
    }

    const blob = await compressImage(file, 1280, 500 * 1024, false);
    dlog('compress', 'done', 'size=', blob.size, 'type=', blob.type, 'iosSafari=', iosSafari);
    return blob;
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
  const t0 = performance.now();
  const originalBytes = images.reduce((sum, f) => sum + f.size, 0);
  dlog('analyze', 'start analyzeMenu, images=', images.length, 'originalBytes=', originalBytes);

  onProgress?.({
    stage: 'uploading',
    progress: 5,
    message: language === 'zh' ? '正在压缩图片…' : 'Compressing images…',
  });

  const tCompressStart = performance.now();
  const normalizedBlobs = await normalizeImagesWithConcurrency(images, 2);
  const tCompressEnd = performance.now();
  const compressedBytes = normalizedBlobs.reduce((sum, b) => sum + b.size, 0);
  dlog('analyze.metrics', {
    stage: 'compress',
    imageCount: images.length,
    originalBytes,
    compressedBytes,
    compressionRatio: Number((compressedBytes / Math.max(1, originalBytes)).toFixed(3)),
    compressMs: Math.round(tCompressEnd - tCompressStart),
  });

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

  // iPhone Safari 弱网下，前端硬超时会导致“Fetch is aborted”假失败。
  // 这里不再用客户端定时器主动中断，请求由：用户手动取消 / 服务端错误 来结束。
  const merged = new AbortController();
  const onAbort = () => merged.abort();

  if (signal) {
    signal.addEventListener('abort', onAbort, { once: true });
  }

  let firstChunkAt: number | null = null;
  let resultEventAt: number | null = null;

  try {
    const tFetchStart = performance.now();
    const response = await fetch(`${WORKER_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
      },
      body: formData,
      signal: merged.signal,
    });
    const tHeadersAt = performance.now();
    dlog('analyze.metrics', {
      stage: 'network',
      ttfbMs: Math.round(tHeadersAt - tFetchStart),
      status: response.status,
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

    const handleEventBlock = (part: string) => {
      const evt = parseSSEEventBlock(part);
      if (!evt) return;

      if (evt.event === 'progress') {
        try {
          const progress = JSON.parse(evt.data) as AnalyzeProgressEvent;
          onProgress?.(progress);
        } catch {
          // Ignore malformed progress event
        }
        return;
      }

      if (evt.event === 'result') {
        const parsed = JSON.parse(evt.data) as ApiSuccessResponse<MenuData>;
        if (!parsed.ok) throw new Error('Analyze stream returned non-ok result');
        finalData = parsed.data;
        resultEventAt = performance.now();
        return;
      }

      if (evt.event === 'error') {
        const parsed = JSON.parse(evt.data) as ApiErrorResponse;
        const message = parsed.error?.message ?? 'Analyze failed';
        throw new Error(message);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstChunkAt === null) firstChunkAt = performance.now();

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        handleEventBlock(part);
      }
    }

    // 处理流结束时残留在 buffer 里的最后一个事件块（某些网络路径下可能没有以 \n\n 结尾）
    if (buffer.trim().length > 0) {
      handleEventBlock(buffer);
    }

    if (!finalData) {
      throw new Error('Analyze stream ended without result');
    }
    const resultData: MenuData = finalData;

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: language === 'zh' ? '识别完成' : 'Done',
    });

    const tDone = performance.now();
    const resultBytes = new TextEncoder().encode(JSON.stringify(resultData)).length;
    dlog('analyze.metrics', {
      stage: 'summary',
      imageCount: images.length,
      originalBytes,
      compressedBytes,
      resultBytes,
      firstChunkMs: firstChunkAt ? Math.round(firstChunkAt - t0) : null,
      resultEventMs: resultEventAt ? Math.round(resultEventAt - t0) : null,
      totalMs: Math.round(tDone - t0),
      itemCount: resultData.items?.length ?? 0,
    });

    return resultData;
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
  }
}
