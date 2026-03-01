/**
 * App-specific types — UI 状态、视图、Actions
 *
 * ⚠️ 所有 API 相关类型（MenuItem, MenuData, ChatRequest 等）
 *    从 shared/types.ts 导入，禁止在此重新定义。
 */

// 从 shared 重新导出所有 API 类型，让现有 import 路径不变
export type {
  Language,
  GeoLocation,
  MenuItemTag,
  MenuItem,
  MenuCategory,
  MenuType,
  PriceLevel,
  MenuData,
  ImageMimeType,
  AnalyzeRequestImage,
  AnalyzeRequestContext,
  AnalyzeRequest,
  AnalyzeProgressStage,
  AnalyzeProgressEvent,
  ChatMode,
  MessageRole,
  ChatMessage,
  Restriction,
  FlavorPreference,
  DiningHistory,
  ChatPreferences,
  ChatContext,
  ChatRequest,
  Recommendation,
  PreferenceUpdateType,
  PreferenceUpdateAction,
  PreferenceUpdate,
  PreChatResponse,
  AgentChatResponse,
  ApiSuccessResponse,
  ErrorCode,
  ApiError,
  ApiErrorResponse,
  ApiResponse,
} from '../../../shared/types';

export { TIMEOUTS, LIMITS, VALID_TAGS } from '../../../shared/types';

// ─────────────────────────────────────────────
// App-only types（UI 状态，不与后端共享）
// ─────────────────────────────────────────────

export type ChatPhase = 'pre_chat' | 'handing_off' | 'chatting' | 'failed';

export type ViewName = 'home' | 'scanner' | 'chat' | 'order' | 'waiter' | 'explore' | 'settings';

/** UI 层的消息（含 id 和 timestamp，比 ChatMessage 多字段）*/
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** App 本地偏好存储格式（简化版，和 ChatPreferences 不同）*/
export interface Preferences {
  language: 'zh' | 'en';
  dietary: string[];           // restriction values
  flavors?: string[];          // flavor values
  other?: string[];            // other values
}

export interface OrderItem {
  menuItem: import('../../../shared/types').MenuItem;
  quantity: number;
}

export interface AppState {
  chatPhase: ChatPhase;
  menuData: import('../../../shared/types').MenuData | null;
  messages: Message[];
  preferences: Preferences;
  location: import('../../../shared/types').GeoLocation | null;
  orderItems: OrderItem[];
  currentView: ViewName;
  analyzingFiles: File[] | null;
  isSupplementing: boolean;
}

export type AppAction =
  | { type: 'NAV_TO'; view: ViewName }
  | { type: 'SET_MENU_DATA'; data: import('../../../shared/types').MenuData }
  | { type: 'SET_CHAT_PHASE'; phase: ChatPhase }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'ADD_TO_ORDER'; item: import('../../../shared/types').MenuItem }
  | { type: 'REMOVE_FROM_ORDER'; itemId: string }
  | { type: 'UPDATE_ORDER_QTY'; itemId: string; quantity: number }
  | { type: 'UPDATE_PREFERENCES'; updates: import('../../../shared/types').PreferenceUpdate[] }
  | { type: 'RESET_SESSION' }
  | { type: 'SET_LANGUAGE'; language: 'zh' | 'en' }
  | { type: 'ADD_DIETARY'; restriction: string }
  | { type: 'REMOVE_DIETARY'; restriction: string }
  | { type: 'START_ANALYZE'; files: File[] }
  | { type: 'SET_SUPPLEMENTING'; value: boolean }
  | { type: 'CLEAR_ANALYZING_FILES' }
  | { type: 'SET_LOCATION'; location: import('../../../shared/types').GeoLocation | null };
