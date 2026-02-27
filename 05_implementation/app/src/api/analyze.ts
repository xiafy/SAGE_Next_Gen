import { WORKER_BASE } from './config';
import type {
  GeoLocation,
  MenuData,
  AnalyzeRequest,
  ApiSuccessResponse,
  Language,
} from '../types';
import { TIMEOUTS } from '../types';
import { dlog } from '../utils/debugLog';

/**
 * Convert File to base64 string (without data URL prefix)
 */
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const b64 = result.split(',')[1] ?? '';
      dlog('b64', 'FileReader done, length=', b64.length);
      resolve(b64);
    };
    reader.onerror = () => {
      dlog('b64', 'FileReader ERROR');
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
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
  maxDimension = 960,
  maxSizeBytes = 350 * 1024,
): Promise<Blob> {
  dlog('compress', 'start, input size=', file.size, 'type=', file.type);

  const img = await loadImage(file);
  dlog('compress', 'image loaded', img.naturalWidth, 'x', img.naturalHeight);

  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > maxDimension || h > maxDimension) {
    const scale = maxDimension / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  dlog('compress', 'target canvas', w, 'x', h, 'pixels=', w * h);

  // iOS Safari canvas size limit check (~16.7MP)
  if (w * h > 16_000_000) {
    dlog('compress', '⚠️ CANVAS TOO LARGE, scaling down further');
    const scale = Math.sqrt(16_000_000 / (w * h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    dlog('compress', 'rescaled to', w, 'x', h);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    dlog('compress', '❌ getContext(2d) returned null!');
    throw new Error('Canvas not supported');
  }
  ctx.drawImage(img, 0, 0, w, h);
  dlog('compress', 'drawImage done');

  for (const quality of [0.6, 0.45, 0.3, 0.2]) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            dlog('compress', '❌ toBlob returned null at q=', quality);
            reject(new Error('toBlob failed'));
          }
        },
        'image/jpeg',
        quality,
      );
    });
    dlog('compress', 'q=', quality, 'size=', blob.size);
    if (blob.size <= maxSizeBytes) {
      return blob;
    }
  }

  const finalBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.1,
    );
  });
  dlog('compress', 'final q=0.1 size=', finalBlob.size);
  return finalBlob;
}

/**
 * Normalize image: compress + convert to base64
 */
async function normalizeImage(file: File): Promise<{ base64: string; mimeType: string }> {
  dlog('normalize', file.name, 'type=', file.type, 'size=', file.size);

  let blob: Blob;
  try {
    blob = await compressImage(file);
  } catch (err) {
    dlog('normalize', '❌ compressImage threw:', err);
    throw new Error('Image compression failed. Please try a smaller photo.');
  }

  dlog('normalize', 'compressed to', blob.size, 'bytes, converting to base64...');
  const base64 = await fileToBase64(blob);
  dlog('normalize', '✅ base64 ready, length=', base64.length);

  return { base64, mimeType: 'image/jpeg' };
}

export async function analyzeMenu(
  images: File[],
  language: Language = 'zh',
  location?: GeoLocation | null,
  signal?: AbortSignal,
): Promise<MenuData> {
  dlog('analyze', '🚀 called with', images.length, 'images');

  const imagePayloads = await Promise.all(
    images.map(async (file, idx) => {
      dlog('analyze', `processing image ${idx + 1}/${images.length}`);
      const { base64, mimeType } = await normalizeImage(file);
      return { data: base64, mimeType: mimeType as AnalyzeRequest['images'][number]['mimeType'] };
    }),
  );

  const body: AnalyzeRequest = {
    images: imagePayloads,
    context: {
      language,
      timestamp: Date.now(),
      ...(location ? { location } : {}),
    },
  };

  const bodySize = JSON.stringify(body).length;
  dlog('analyze', '📤 POST /api/analyze, images:', imagePayloads.length, 'bodySize=', bodySize);
  dlog('analyze', 'WORKER_BASE=', WORKER_BASE);

  const timeoutSignal = AbortSignal.timeout(TIMEOUTS.ANALYZE_CLIENT);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(`${WORKER_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
    dlog('analyze', '📥 response status:', response.status);
  } catch (err) {
    dlog('analyze', '❌ fetch threw:', err);
    throw err;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    dlog('analyze', '❌ HTTP error:', response.status, text.slice(0, 200));
    throw new Error(`Menu analysis failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as ApiSuccessResponse<MenuData>;
  if (!json.ok) {
    dlog('analyze', '❌ json.ok is false');
    throw new Error('analyze failed');
  }

  dlog('analyze', '✅ success! items:', json.data.items?.length);
  return json.data;
}
