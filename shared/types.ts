/**
 * SAGE Shared Types — 前后端唯一权威类型定义
 *
 * ⚠️ 规则：
 * - 前端 (app/) 和后端 (worker/) 都必须从此文件 import 类型
 * - 禁止在 app/src/types/ 或 worker/schemas/ 中重复定义相同的接口
 * - Worker 的 Zod schema 用于运行时校验，但 z.infer<> 结果必须与此文件类型兼容
 * - 修改此文件后，运行 `tsc --noEmit` 确认前后端都编译通过
 *
 * 来源：API_DESIGN.md v1.0 + Worker Zod Schemas + DEC-016~028
 */

// ─────────────────────────────────────────────
// 基础类型
// ─────────────────────────────────────────────

export type Language = 'zh' | 'en';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

// ─────────────────────────────────────────────
// 菜单相关（/api/analyze 响应）
// ─────────────────────────────────────────────

export type MenuItemTag =
  | 'spicy' | 'vegetarian' | 'vegan' | 'gluten_free'
  | 'contains_nuts' | 'contains_seafood' | 'contains_pork'
  | 'contains_alcohol' | 'popular' | 'signature';

export interface MenuItem {
  id: string;
  nameOriginal: string;
  nameTranslated: string;
  descriptionTranslated?: string;
  price?: number;
  priceText?: string;
  tags: MenuItemTag[];
  imageSource?: 'menu';
}

export interface MenuCategory {
  id: string;
  nameOriginal: string;
  nameTranslated: string;
  itemIds: string[];
}

export type MenuType = 'restaurant' | 'bar' | 'dessert' | 'fastfood' | 'cafe' | 'other';
export type PriceLevel = 1 | 2 | 3;

export interface MenuData {
  menuType: MenuType;
  detectedLanguage: string;
  priceLevel: PriceLevel;
  currency?: string;
  categories: MenuCategory[];
  items: MenuItem[];
  processingMs: number;
  imageCount: number;
}

// ─────────────────────────────────────────────
// /api/analyze 请求
// ─────────────────────────────────────────────

export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';

export interface AnalyzeRequestImage {
  data: string;         // Base64（不含 data:image/ 前缀）
  mimeType: ImageMimeType;
}

export interface AnalyzeRequestContext {
  language: Language;
  timestamp: number;
  location?: GeoLocation;
}

export interface AnalyzeRequest {
  images: AnalyzeRequestImage[];  // 1-5 张
  context: AnalyzeRequestContext;
}

// ─────────────────────────────────────────────
// /api/chat 请求
// ─────────────────────────────────────────────

export type ChatMode = 'pre_chat' | 'chat';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface Restriction {
  type: 'allergy' | 'diet' | 'dislike';
  value: string;
}

export interface FlavorPreference {
  type: 'like' | 'dislike';
  value: string;
  strength: 1 | 2 | 3;
}

export interface DiningHistory {
  restaurantType: string;
  orderedItems: string[];
  timestamp: number;
  location?: string;
}

export interface ChatPreferences {
  restrictions: Restriction[];
  flavors: FlavorPreference[];
  history: DiningHistory[];
}

export interface ChatContext {
  language: Language;
  timestamp: number;
  location?: GeoLocation;
  weather?: {
    condition: string;
    temperatureCelsius: number;
  };
}

export interface ChatRequest {
  mode: ChatMode;
  messages: ChatMessage[];
  menuData: MenuData | null;
  preferences: ChatPreferences;
  context: ChatContext;
}

// ─────────────────────────────────────────────
// /api/chat 响应（AI 返回解析后的结构）
// ─────────────────────────────────────────────

export interface Recommendation {
  itemId: string;
  reason: string;
}

export type PreferenceUpdateType = 'restriction' | 'flavor' | 'other';
export type PreferenceUpdateAction = 'add' | 'remove';

export interface PreferenceUpdate {
  type: PreferenceUpdateType;
  action: PreferenceUpdateAction;
  value: string;
  strength?: 1 | 2 | 3;
}

export interface PreChatResponse {
  message: string;
  quickReplies: string[];
  preferenceUpdates: PreferenceUpdate[];
}

export interface AgentChatResponse {
  message: string;
  recommendations: Recommendation[];
  quickReplies: string[];
  preferenceUpdates: PreferenceUpdate[];
  triggerExplore: boolean;
}

// ─────────────────────────────────────────────
// API 通用响应信封
// ─────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  requestId: string;
}

export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'TOO_MANY_IMAGES'
  | 'UNSUPPORTED_IMAGE_TYPE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE'
  | 'ORIGIN_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  messageZh: string;
  messageEn: string;
  retryable: boolean;
  suggestion?: string;
  suggestionZh?: string;
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiError;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────

/** 各端点超时（毫秒）— 来源 API_DESIGN.md §1.5 */
export const TIMEOUTS = {
  ANALYZE_CLIENT: 65_000,   // 多图场景实测需要 50-60s
  ANALYZE_WORKER: 60_000,
  CHAT_CLIENT: 15_000,
  CHAT_WORKER: 12_000,
  HEALTH: 5_000,
} as const;

/** 限制值 */
export const LIMITS = {
  MAX_IMAGES: 5,
  MAX_IMAGE_SIZE_MB: 4,
  MAX_TOTAL_IMAGES_SIZE_MB: 10,
  MAX_MESSAGES: 50,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_MENU_ITEMS_FOR_PROMPT: 200,
} as const;

/** 有效菜品标签列表 */
export const VALID_TAGS: readonly MenuItemTag[] = [
  'spicy', 'vegetarian', 'vegan', 'gluten_free',
  'contains_nuts', 'contains_seafood', 'contains_pork',
  'contains_alcohol', 'popular', 'signature',
] as const;
