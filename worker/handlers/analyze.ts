import { type Env } from '../middleware/cors.js';
import { getCorsHeaders } from '../middleware/cors.js';
import { checkRateLimit } from '../utils/rateLimit.js';
import { fetchGeminiComplete } from '../utils/gemini.js';
import { fetchComplete as fetchBailianComplete } from '../utils/bailian.js';
import { errorResponse } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { AnalyzeRequestSchema } from '../schemas/chatSchema.js';
import type { AnalyzeRequest } from '../schemas/chatSchema.js';
import { MenuAnalyzeResultSchema } from '../schemas/menuSchema.js';
import { MENU_ANALYSIS_SYSTEM, MENU_ENRICH_SYSTEM, buildMenuAnalysisUserMessage, buildEnrichUserMessage } from '../prompts/menuAnalysis.js';

type AnalyzeErrorCode =
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE'
  | 'INTERNAL_ERROR';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB per image
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB total

interface AnalyzeErrorPayload {
  ok: false;
  error: {
    code: AnalyzeErrorCode;
    message: string;
    messageZh: string;
    messageEn: string;
    retryable: boolean;
  };
  requestId: string;
}

const STREAM_ERROR_MESSAGES: Record<AnalyzeErrorCode, { en: string; zh: string; retryable: boolean }> = {
  INVALID_REQUEST: { en: 'Invalid request payload', zh: '请求格式不正确', retryable: false },
  PAYLOAD_TOO_LARGE: { en: 'Images are too large', zh: '图片体积过大', retryable: false },
  AI_TIMEOUT: { en: 'Menu recognition timed out. Please retake a clearer photo and try again.', zh: '菜单识别超时，请重拍更清晰的照片后重试。', retryable: true },
  AI_UNAVAILABLE: { en: 'Menu recognition is temporarily unavailable. Please try again in a moment.', zh: '菜单识别服务暂时不可用，请稍后重试。', retryable: true },
  AI_INVALID_RESPONSE: { en: 'Could not read menu content from this image. Please retake and try again.', zh: '未能从图片中读出有效菜单内容，请重拍后再试。', retryable: true },
  INTERNAL_ERROR: { en: 'Unexpected error while analyzing menu', zh: '菜单识别过程中出现异常', retryable: true },
};

/** 从 base64 字符串估算字节数 */
function estimateBase64Bytes(b64: string): number {
  return Math.floor((b64.replace(/=+$/, '').length * 3) / 4);
}

/** 尝试从字符串中提取 JSON 对象 */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match?.[1]) return match[1].trim();

  // Try object first
  const objStart = trimmed.indexOf('{');
  const objEnd = trimmed.lastIndexOf('}');
  // Try array
  const arrStart = trimmed.indexOf('[');
  const arrEnd = trimmed.lastIndexOf(']');

  // Pick whichever comes first
  if (arrStart !== -1 && arrEnd > arrStart && (objStart === -1 || arrStart < objStart)) {
    return trimmed.slice(arrStart, arrEnd + 1);
  }
  if (objStart !== -1 && objEnd > objStart) {
    return trimmed.slice(objStart, objEnd + 1);
  }

  return trimmed;
}

function toAnalyzeErrorPayload(code: AnalyzeErrorCode, requestId: string, detail?: string): AnalyzeErrorPayload {
  const meta = STREAM_ERROR_MESSAGES[code];
  return {
    ok: false,
    error: {
      code,
      message: detail ?? meta.en,
      messageZh: meta.zh,
      messageEn: meta.en,
      retryable: meta.retryable,
    },
    requestId,
  };
}

function toSSE(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function randId(index: number): string {
  // 使用 index 作为前缀确保唯一性（Date.now() 在同一批次中相同，不能用作主差异化因子）
  const idxPart = index.toString(36).padStart(3, '0');
  const randPart = Math.random().toString(36).slice(2, 7);
  return `${idxPart}${randPart}`.slice(0, 8).padEnd(8, '0');
}

function parsePrice(priceText?: string): number | undefined {
  if (!priceText) return undefined;
  const cleaned = priceText.replace(/,/g, '');
  const rangeMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*[-~～—–]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch?.[1]) {
    const low = Number(rangeMatch[1]);
    return Number.isFinite(low) ? low : undefined;
  }
  const m = cleaned.match(/\d+(?:\.\d+)?/);
  if (!m) return undefined;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeLooseResult(aiResult: any, language: 'zh' | 'en', imageCount: number) {
  const rawItems = Array.isArray(aiResult?.items) ? aiResult.items : [];
  const normalizedItems = rawItems
    .map((item: any, idx: number) => {
      const nameOriginal = String(item?.nameOriginal ?? item?.name ?? '').trim();
      const nameTranslated = String(item?.nameTranslated ?? item?.nameZh ?? nameOriginal).trim();
      if (!nameOriginal) return null;
      const priceText = String(item?.priceText ?? item?.price ?? '').trim();
      const id = String(item?.id ?? randId(idx)).slice(0, 8).padEnd(8, '0');
      // 提取 VL 阶段识别出的过敏原编号（如欧盟标注 "(1,6)" → [1,6]）
      const rawCodes = Array.isArray(item?.allergenCodes) ? item.allergenCodes : [];
      const allergenCodes = rawCodes.filter((c: unknown) => Number.isInteger(c) && (c as number) > 0) as number[];

      return {
        id,
        nameOriginal,
        nameTranslated: nameTranslated || nameOriginal,
        price: parsePrice(priceText),
        priceText: priceText || undefined,
        tags: [],
        brief: language === 'zh' ? '菜单识别结果（待补充详情）' : 'Menu item recognized (details pending)',
        allergens: [],
        dietaryFlags: [],
        spiceLevel: 0,
        calories: null,
        __category: String(item?.category ?? item?.categoryName ?? '其他').trim() || '其他',
        __allergenCodes: allergenCodes, // 临时字段：传递给 Enrich，不发往前端
      };
    })
    .filter(Boolean) as Array<any>;

  const itemIdsByCategory = new Map<string, string[]>();
  for (const item of normalizedItems) {
    const key = item.__category;
    if (!itemIdsByCategory.has(key)) itemIdsByCategory.set(key, []);
    itemIdsByCategory.get(key)!.push(item.id);
    delete item.__category;
  }

  const rawCategories = Array.isArray(aiResult?.categories) ? aiResult.categories : [];
  // Map: nameOriginal → nameTranslated (preserve AI-generated translations)
  const categoryTranslations = new Map<string, string>();
  for (const c of rawCategories) {
    if (typeof c === 'string') {
      const name = c.trim();
      if (name && !categoryTranslations.has(name)) categoryTranslations.set(name, name);
    } else if (c && typeof c === 'object') {
      const name = String(c.nameOriginal ?? c.name ?? '').trim();
      const translated = String(c.nameTranslated ?? c.nameZh ?? '').trim();
      if (name && !categoryTranslations.has(name)) categoryTranslations.set(name, translated || name);
    }
  }
  for (const key of itemIdsByCategory.keys()) {
    if (!categoryTranslations.has(key)) categoryTranslations.set(key, key);
  }

  const categories = Array.from(categoryTranslations.entries())
    .filter(([name]) => Boolean(name))
    .map(([name, translated], idx) => ({
      id: `cat${String(idx + 1).padStart(2, '0')}`,
      nameOriginal: name,
      nameTranslated: translated,
      itemIds: itemIdsByCategory.get(name) ?? [],
    }))
    .filter((c) => c.itemIds.length > 0);

  const rawMenuType = String(aiResult?.menuType ?? '').toLowerCase();
  const menuType =
    rawMenuType === 'restaurant' ||
    rawMenuType === 'bar' ||
    rawMenuType === 'dessert' ||
    rawMenuType === 'fastfood' ||
    rawMenuType === 'cafe' ||
    rawMenuType === 'other'
      ? rawMenuType
      : 'restaurant';
  const rawPriceLevel = Number(aiResult?.priceLevel);
  const priceLevel = rawPriceLevel === 1 || rawPriceLevel === 2 || rawPriceLevel === 3 ? rawPriceLevel : 2;

  return {
    menuType,
    detectedLanguage: String(aiResult?.detectedLanguage ?? (language === 'zh' ? 'zh' : 'en')).slice(0, 5) || 'zh',
    priceLevel,
    currency: String(aiResult?.currency ?? '').trim() || undefined,
    categories,
    items: normalizedItems,
    processingMs: 0,
    imageCount: Math.max(1, Number(aiResult?.imageCount ?? imageCount ?? 1)),
  };
}

async function parseAnalyzeRequest(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const rawImages = form.getAll('images') as unknown[];
    const imageFiles = rawImages.filter(
      (item): item is Blob => typeof item === 'object' && item !== null && 'arrayBuffer' in item,
    );

    if (imageFiles.length === 0) {
      return { images: [], context: {} };
    }

    const images = await Promise.all(
      imageFiles.map(async (file: Blob) => {
        const base64 = arrayBufferToBase64(await file.arrayBuffer());
        const mimeType = file.type || 'image/jpeg';
        return {
          data: base64,
          mimeType,
        };
      }),
    );

    const rawLocation = form.get('context_location');
    let location: { lat: number; lng: number; accuracy?: number } | undefined;
    if (typeof rawLocation === 'string' && rawLocation.trim().length > 0) {
      try {
        location = JSON.parse(rawLocation) as { lat: number; lng: number; accuracy?: number };
      } catch {
        // Let Zod handle invalid location shape
      }
    }

    return {
      images,
      context: {
        language: form.get('context_language'),
        timestamp: Number(form.get('context_timestamp') ?? Date.now()),
        ...(location ? { location } : {}),
      },
    };
  }

  return request.json();
}

async function runAnalyzePipeline(
  normalizedRequest: AnalyzeRequest,
  env: Env,
  requestId: string,
  onProgress?: (event: { stage: string; progress: number; message: string }) => void,
) {
  const { images, context } = normalizedRequest;
  const t0 = Date.now();

  let totalBytes = 0;
  for (const img of images) {
    const bytes = estimateBase64Bytes(img.data);
    if (bytes > MAX_IMAGE_BYTES) {
      throw Object.assign(new Error('Image exceeds 4 MB'), { code: 'PAYLOAD_TOO_LARGE' as const });
    }
    totalBytes += bytes;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw Object.assign(new Error('Total images exceed 10 MB'), { code: 'PAYLOAD_TOO_LARGE' as const });
  }

  onProgress?.({
    stage: 'preparing',
    progress: 20,
    message: context.language === 'zh' ? '图片上传完成，准备识别…' : 'Upload complete. Preparing vision analysis…',
  });

  const startMs = Date.now();
  const tVisionStart = Date.now();
  let tVisionEnd = tVisionStart;
  let rawText: string;
  let useBailian = false; // 地理封锁兜底标志：Gemini 不可用时切换到百炼
  let modelUsed = 'gemini-2.0-flash';

  onProgress?.({
    stage: 'analyzing',
    progress: 55,
    message: context.language === 'zh' ? '正在识别菜单内容…' : 'Analyzing menu content…',
  });

  try {
    rawText = await fetchGeminiComplete({
      model: 'gemini-2.0-flash',
      systemPrompt: MENU_ANALYSIS_SYSTEM,
      userText: buildMenuAnalysisUserMessage(context.language, images.length),
      images: images.map((img) => ({ mimeType: img.mimeType, data: img.data })),
      apiKey: env.GEMINI_API_KEY,
      timeoutMs: 35_000,
      requestId,
      maxOutputTokens: 8192,
    });
    tVisionEnd = Date.now();
  } catch (err) {
    // 地理封锁（从中国大陆 CF 节点无法访问 Google API）→ 自动切换百炼 qwen3-vl-flash
    if ((err as { geoBlocked?: boolean }).geoBlocked) {
      logger.warn('analyze: Gemini geo-blocked, falling back to Bailian VL', { requestId });
      useBailian = true;
      modelUsed = 'qwen3-vl-flash(fallback)';
      try {
        rawText = await fetchBailianComplete({
          model: 'qwen-vl-plus',
          messages: [
            { role: 'system', content: MENU_ANALYSIS_SYSTEM },
            { role: 'user', content: [
              ...images.map(img => ({
                type: 'image_url' as const,
                image_url: { url: `data:${img.mimeType};base64,${img.data}` },
              })),
              { type: 'text' as const, text: buildMenuAnalysisUserMessage(context.language, images.length) },
            ]},
          ],
          apiKey: env.BAILIAN_INTL_API_KEY,
          baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
          timeoutMs: 40_000,
          requestId,
        });
        tVisionEnd = Date.now();
      } catch (bailianErr) {
        const e = String(bailianErr);
        const timeout = e.includes('timeout') || e.includes('AbortError') || e.includes('TimeoutError');
        throw Object.assign(
          new Error(timeout ? STREAM_ERROR_MESSAGES.AI_TIMEOUT.en : STREAM_ERROR_MESSAGES.AI_UNAVAILABLE.en),
          { code: timeout ? ('AI_TIMEOUT' as const) : ('AI_UNAVAILABLE' as const) },
        );
      }
    } else {
      const errText = String(err);
      const timeout = errText.includes('timeout') || errText.includes('AbortError') || errText.includes('TimeoutError');
      throw Object.assign(
        new Error(timeout ? STREAM_ERROR_MESSAGES.AI_TIMEOUT.en : STREAM_ERROR_MESSAGES.AI_UNAVAILABLE.en),
        { code: timeout ? ('AI_TIMEOUT' as const) : ('AI_UNAVAILABLE' as const) },
      );
    }
  }

  onProgress?.({
    stage: 'validating',
    progress: 85,
    message: context.language === 'zh' ? '解析识别结果…' : 'Validating result…',
  });

  /**
   * 确保所有 item.id 唯一。
   * 将每个 item 的 ID 替换为基于其 index 的确定唯一值，
   * 同时更新 categories.itemIds 中的映射（按原来顺序位置重建）。
   *
   * 只在检测到有重复时才执行，避免改动已经正确的 ID。
   */
  function ensureUniqueItemIds<T extends { items: Array<{ id: string }>; categories: Array<{ itemIds: string[] }> }>(result: T): T {
    // 只处理重复情况
    const ids = result.items.map(it => it.id);
    if (ids.length === new Set(ids).size) return result; // 已全部唯一

    // 为每个 item 分配新的基于 index 的唯一 ID
    const oldToNew = new Map<string, string>(); // 仅适用于第一次出现的旧→新
    const itemNewIds: string[] = [];
    const usedIds = new Set<string>();

    for (let i = 0; i < result.items.length; i++) {
      let newId = `i${i.toString(36).padStart(3, '0')}${Math.random().toString(36).slice(2, 5)}`;
      while (usedIds.has(newId)) newId += Math.random().toString(36).slice(2, 4);
      const oldId = result.items[i]!.id;
      if (!oldToNew.has(oldId)) oldToNew.set(oldId, newId); // 记录第一次出现
      itemNewIds.push(newId);
      usedIds.add(newId);
      (result.items[i] as Record<string, unknown>).id = newId;
    }

    // 重建 category.itemIds：原 ID 按 oldToNew 映射（仅第一次出现的映射有效）
    // 对于第二次及以后出现的重复 ID，它们现在有各自的新 ID，但 category 原本只记录了一次该旧 ID
    // 策略：直接重建 itemIds 为 result.items 中属于该 category 的条目
    // 由于没有额外的分类元数据，退回到：仅保留 oldToNew 的映射
    for (const cat of result.categories) {
      cat.itemIds = cat.itemIds
        .map(oldId => oldToNew.get(oldId))
        .filter((id): id is string => id !== undefined);
    }

    return result;
  }

  async function parseAndValidate(text: string) {
    const jsonStr = extractJson(text);
    const aiResult = JSON.parse(jsonStr);

    const strict = MenuAnalyzeResultSchema.safeParse(aiResult);
    if (strict.success && strict.data.items.length > 0) {
      const fixed = ensureUniqueItemIds(strict.data);
      return { ...fixed, processingMs: Date.now() - startMs };
    }

    const looseNormalized = normalizeLooseResult(aiResult, context.language, images.length);
    const repaired = MenuAnalyzeResultSchema.safeParse(looseNormalized);
    if (!repaired.success) {
      throw new Error('zod_invalid');
    }

    const result = { ...repaired.data, processingMs: Date.now() - startMs };
    if (result.items.length === 0) {
      throw new Error('zero_items');
    }
    return result;
  }

  try {
    const result = await parseAndValidate(rawText);

    // ── Step 2: 文本模型补全语义字段（brief/allergens/spiceLevel）──
    onProgress?.({
      stage: 'enriching',
      progress: 90,
      message: context.language === 'zh' ? '正在补充菜品详情…' : 'Enriching dish details…',
    });

    try {
      const enrichInput = result.items.map(i => ({
        nameOriginal: i.nameOriginal,
        nameTranslated: i.nameTranslated,
        category: result.categories.find(c => c.itemIds.includes(i.id))?.nameOriginal,
        // 将 VL 阶段提取的过敏原编号传递给 Enrich（临时字段，不在 schema 中）
        allergenCodes: (i as Record<string, unknown>).__allergenCodes as number[] | undefined,
      }));

      const enrichRaw = useBailian
        // 地理封锁兜底：使用百炼文本模型（Enrich 不需要视觉）
        ? await fetchBailianComplete({
            model: 'qwen-plus-latest',
            messages: [
              { role: 'system', content: MENU_ENRICH_SYSTEM },
              { role: 'user', content: buildEnrichUserMessage(enrichInput, context.language) },
            ],
            apiKey: env.BAILIAN_INTL_API_KEY,
            baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
            timeoutMs: 30_000,
            requestId: `${requestId}-enrich`,
          })
        : await fetchGeminiComplete({
            model: 'gemini-2.0-flash',
            systemPrompt: MENU_ENRICH_SYSTEM,
            userText: buildEnrichUserMessage(enrichInput, context.language),
            apiKey: env.GEMINI_API_KEY,
            timeoutMs: 25_000,
            requestId: `${requestId}-enrich`,
            maxOutputTokens: 8192,
          });

      const enrichJson = extractJson(enrichRaw);
      const enrichData: unknown[] = JSON.parse(enrichJson);

      if (Array.isArray(enrichData)) {
        // Build lookup by nameOriginal
        const enrichMap = new Map<string, Record<string, unknown>>();
        for (const e of enrichData) {
          if (e && typeof e === 'object' && 'nameOriginal' in (e as Record<string, unknown>)) {
            const rec = e as Record<string, unknown>;
            enrichMap.set(String(rec.nameOriginal), rec);
          }
        }

        // Merge enrich data into items (exact match, then fuzzy startsWith)
        for (const item of result.items) {
          let enriched = enrichMap.get(item.nameOriginal);
          if (!enriched) {
            // Fuzzy: find enrichMap key that starts with or contains the item nameOriginal
            for (const [key, val] of enrichMap.entries()) {
              if (key.startsWith(item.nameOriginal) || item.nameOriginal.startsWith(key)) {
                enriched = val;
                break;
              }
            }
          }
          if (!enriched) continue;

          if (typeof enriched.brief === 'string' && enriched.brief.length > 0) {
            item.brief = enriched.brief;
          }
          if (typeof enriched.briefDetail === 'string' && enriched.briefDetail.length > 0) {
            (item as Record<string, unknown>).briefDetail = enriched.briefDetail;
          }
          if (Array.isArray(enriched.allergens) && enriched.allergens.length > 0) {
            // Validate allergen format
            const validTypes = new Set(['peanut','shellfish','fish','gluten','dairy','egg','soy','tree_nut','sesame']);
            const validAllergens = enriched.allergens
              .filter((a: unknown) => a && typeof a === 'object' && 'type' in (a as Record<string, unknown>) && validTypes.has(String((a as Record<string, unknown>).type).toLowerCase()))
              .map((a: unknown) => {
                const rec = a as Record<string, unknown>;
                return { type: String(rec.type).toLowerCase(), uncertain: Boolean(rec.uncertain) };
              });
            if (validAllergens.length > 0) {
              item.allergens = validAllergens as typeof item.allergens;
            }
          }
          if (Array.isArray(enriched.dietaryFlags)) {
            const validFlags = new Set(['halal','vegetarian','vegan','raw','contains_alcohol']);
            const flags = enriched.dietaryFlags
              .map((f: unknown) => typeof f === 'string' ? f.toLowerCase() : '')
              .filter((f: string) => validFlags.has(f));
            if (flags.length > 0) {
              item.dietaryFlags = flags as typeof item.dietaryFlags;
            }
          }
          if (typeof enriched.spiceLevel === 'number' && enriched.spiceLevel >= 0 && enriched.spiceLevel <= 5) {
            item.spiceLevel = enriched.spiceLevel;
          }
        }

        // 清理临时字段，避免发往前端
        for (const item of result.items) {
          delete (item as Record<string, unknown>).__allergenCodes;
        }

        logger.info('analyze: enrich success', { requestId, enrichedCount: enrichMap.size, totalItems: result.items.length });
      }
    } catch (enrichErr) {
      // Enrich is best-effort — don't fail the whole pipeline
      logger.warn('analyze: enrich failed (non-fatal)', { requestId, err: String(enrichErr).slice(0, 200) });
      // Clean up temp fields even on failure
      for (const item of result.items) {
        delete (item as Record<string, unknown>).__allergenCodes;
      }
      // Push enrich_error event so frontend can show lightweight toast
      onProgress?.({
        stage: 'enrich_error',
        progress: 92,
        message: context.language === 'zh' ? '菜品详情加载失败，不影响基本功能' : 'Dish details failed to load, basic features unaffected',
      });
    }

    const rawTextBytes = new TextEncoder().encode(rawText).length;
    const resultBytes = new TextEncoder().encode(JSON.stringify(result)).length;
    logger.info('analyze: success', {
      requestId,
      modelUsed,
      imageCount: images.length,
      uploadBytes: totalBytes,
      visionMs: tVisionEnd - tVisionStart,
      validateMs: Date.now() - tVisionEnd,
      totalMs: Date.now() - t0,
      rawTextBytes,
      resultBytes,
      processingMs: result.processingMs,
      itemCount: result.items.length,
      lang: result.detectedLanguage,
    });

    return result;
  } catch (parseError) {
    logger.error('analyze: parse failed', { requestId, modelUsed, err: String(parseError), rawTextHead: rawText.slice(0, 1000) });
    throw Object.assign(new Error('invalid response'), { code: 'AI_INVALID_RESPONSE' as const });
  }
}

export async function handleAnalyze(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const origin = request.headers.get('Origin');
  const accept = request.headers.get('accept')?.toLowerCase() ?? '';
  const wantsStream = accept.includes('text/event-stream');

  if (!checkRateLimit(`analyze:${ip}`, 20, 60 * 60 * 1000)) {
    return errorResponse('RATE_LIMIT_EXCEEDED', request, env, requestId);
  }

  let body: unknown;
  try {
    body = await parseAnalyzeRequest(request);
  } catch {
    return errorResponse('INVALID_REQUEST', request, env, requestId, 'Request body parse failed');
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn('analyze: invalid request', { requestId, issues: parsed.error.issues });
    return errorResponse('INVALID_REQUEST', request, env, requestId, parsed.error.issues[0]?.message);
  }

  const uploadBytes = parsed.data.images.reduce((sum, img) => sum + estimateBase64Bytes(img.data), 0);
  logger.info('analyze: request', {
    requestId,
    wantsStream,
    imageCount: parsed.data.images.length,
    uploadBytes,
    language: parsed.data.context.language,
  });

  if (!wantsStream) {
    try {
      const result = await runAnalyzePipeline(parsed.data, env, requestId);
      return Response.json(
        { ok: true, data: result, requestId },
        { headers: getCorsHeaders(origin, env) },
      );
    } catch (err) {
      const code = (err as { code?: AnalyzeErrorCode }).code ?? 'INTERNAL_ERROR';
      const message =
        err instanceof Error && err.message
          ? err.message
          : parsed.data.context.language === 'zh'
            ? STREAM_ERROR_MESSAGES[code].zh
            : STREAM_ERROR_MESSAGES[code].en;
      return errorResponse(code, request, env, requestId, message);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(toSSE(event, payload)));
      };

      emit('progress', {
        stage: 'uploading',
        progress: 10,
        message: parsed.data.context.language === 'zh' ? '收到图片，开始上传处理…' : 'Images received. Processing upload…',
      });

      try {
        const result = await runAnalyzePipeline(parsed.data, env, requestId, (progress) => {
          emit('progress', progress);
        });

        emit('result', { ok: true, data: result, requestId });
        emit('progress', {
          stage: 'completed',
          progress: 100,
          message: parsed.data.context.language === 'zh' ? '识别完成' : 'Completed',
        });
        emit('done', '[DONE]');
      } catch (err) {
        const code = (err as { code?: AnalyzeErrorCode }).code ?? 'INTERNAL_ERROR';
        const detail = err instanceof Error ? err.message : undefined;
        emit('error', toAnalyzeErrorPayload(code, requestId, detail));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...getCorsHeaders(origin, env),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Request-Id': requestId,
    },
  });
}
