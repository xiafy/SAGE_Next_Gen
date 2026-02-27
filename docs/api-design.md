# API_DESIGN.md — API 接口详细设计

> 版本: v1.0
> 日期: 2026-02-26
> 状态: ✅ 完整版（含错误码/超时/重试/Payload 限制）
> 上游文档: `ARCHITECTURE.md v1.1`、`PRD.md v1.3`、`DECISIONS.md`
> 供应商: 阿里云百炼 DashScope（OpenAI 兼容模式）

---

## 一、全局约定

### 1.1 Base URL

```
生产环境: https://sage-worker.{account}.workers.dev
开发环境: http://localhost:8787
```

### 1.2 通用请求头

```http
Content-Type: application/json
Accept: application/json
```

> 无需前端传 Authorization，Key 仅在 Worker 环境变量中存储。

### 1.3 ⚠️ Bailian API 必填参数（DEC-028，违反将导致 TTFT 7-26s）

所有对 Bailian DashScope 的 API 调用，**必须**同时包含以下两个参数：

```json
{
  "stream": true,
  "enable_thinking": false
}
```

**背景**：Qwen3.x 系列默认开启 Chain-of-Thought 思考模式，导致 TTFT 高达 7-26 秒。
关闭后 TTFT 降至 2-450ms（提升 22x）。`stream: true` 配合前端 SSE 接收，确保用户感知延迟 < 500ms。

已在 `worker/utils/bailian.ts` 中强制设置，但需确保任何新增调用也遵守此约束。

### 1.4 通用响应格式

**成功响应**:
```typescript
{
  ok: true;
  data: T;              // 具体类型见各端点
  requestId: string;    // UUID，用于日志追踪
}
```

**失败响应**:
```typescript
{
  ok: false;
  error: {
    code: string;       // 见 §1.5 错误码表
    message: string;    // 人类可读，用于前端展示（已国际化）
    messageZh: string;  // 中文版本
    messageEn: string;  // 英文版本
    retryable: boolean; // 是否可重试
  };
  requestId: string;
}
```

### 1.5 超时策略

| 端点 | 前端超时 | Worker 超时 | 说明 |
|------|---------|-----------|------|
| `POST /api/analyze` | 30s | 25s | Vision 推理较慢 |
| `POST /api/chat` | 15s | 12s | 对话要求低延迟 |
| `GET /api/health` | 5s | — | 健康检查 |

> Worker 超时比前端超时短 5s，确保 Worker 有时间返回友好错误而非超时断连。

### 1.6 错误码表

| 错误码 | HTTP 状态 | retryable | 含义 |
|--------|-----------|-----------|------|
| `INVALID_REQUEST` | 400 | false | 请求格式错误（缺字段/类型错误）|
| `PAYLOAD_TOO_LARGE` | 413 | false | 图片总大小超限（>10MB）|
| `TOO_MANY_IMAGES` | 400 | false | 图片数量超过 5 张 |
| `UNSUPPORTED_IMAGE_TYPE` | 400 | false | 不支持的图片格式 |
| `RATE_LIMIT_EXCEEDED` | 429 | true | 速率超限，含 Retry-After header |
| `AI_TIMEOUT` | 504 | true | AI API 响应超时 |
| `AI_UNAVAILABLE` | 503 | true | AI API 不可用（已重试后）|
| `AI_INVALID_RESPONSE` | 502 | true | AI 返回无法解析的数据 |
| `ORIGIN_NOT_ALLOWED` | 403 | false | CORS：来源不在白名单 |
| `INTERNAL_ERROR` | 500 | true | 未预期的服务器错误 |

### 1.7 速率限制

```
基于前端 IP（CF-Connecting-IP）：
  /api/analyze: 20 次/IP/小时
  /api/chat:   100 次/IP/小时

超限响应头：
  Retry-After: <seconds>          # 距离重置的秒数
  X-RateLimit-Limit: 20
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: <timestamp>
```

### 1.8 CORS 白名单

```typescript
const ALLOWED_ORIGINS = [
  'https://sage-next-gen.pages.dev',   // 正式域名
  'https://sage-di9.pages.dev',        // 旧域名（兼容期）
  'http://localhost:5173',             // Vite 开发服务器
  'http://localhost:4173',             // Vite preview
];
```

---

## 二、端点详细规范

---

### `POST /api/analyze`

**功能**: 菜单图片识别，返回结构化菜单数据

#### 2.1 请求 Payload

```typescript
interface AnalyzeRequest {
  // 图片数组（同时提交，最多 5 张，DEC-026 OQ4）
  images: {
    data: string;           // Base64 编码图片内容（不含 data:image/ 前缀）
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';
  }[];

  // 上下文（前端采集）
  context: {
    language: 'zh' | 'en';       // 用户 UI 语言
    timestamp: number;            // Unix timestamp（毫秒）
    location?: {                  // GPS（可选，DEC-013/021）
      lat: number;
      lng: number;
      accuracy?: number;          // 精度（米）
    };
  };
}
```

**Payload 限制**:
- 单张图片最大: 4MB（编码后 Base64 约 5.3MB）
- 全部图片总大小（原始）: ≤ 10MB
- 图片数量: 1–5 张
- 支持格式: `jpeg`, `png`, `webp`, `heic`

#### 2.2 成功响应 Data

```typescript
interface AnalyzeResponse {
  // 菜单元信息
  menuType: 'restaurant' | 'bar' | 'dessert' | 'fastfood' | 'cafe' | 'other';
  detectedLanguage: string;       // ISO 639-1，如 "ja"、"th"、"ar"
  priceLevel: 1 | 2 | 3;         // 1=经济 2=中等 3=高端
  currency?: string;              // ISO 4217，如 "JPY"、"THB"（如能识别）

  // 注：agentRole / agentGreeting 字段已由 DEC-020 删除
  // 识别完成后的 AI 开场由 /api/chat 首条消息生成，不由 /api/analyze 返回

  // 菜单内容
  categories: {
    id: string;                   // 分类唯一 ID（稳定，用于前端 key）
    nameOriginal: string;         // 原文分类名
    nameTranslated: string;       // 翻译后分类名（用户语言）
    itemIds: string[];            // 属于此分类的菜品 ID 列表
  }[];

  items: {
    id: string;                   // 菜品唯一 ID（稳定）
    nameOriginal: string;         // 原文菜名（展示给服务员用，DEC-015）
    nameTranslated: string;       // 翻译后菜名
    descriptionTranslated?: string; // 翻译后描述（可选，菜单无描述时为空）
    price?: number;               // 价格数值（无法识别时为 undefined）
    priceText?: string;           // 原文价格字符串（如 "¥1,200"）
    tags: (
      | 'spicy' | 'vegetarian' | 'vegan'
      | 'gluten_free' | 'contains_nuts' | 'contains_seafood'
      | 'contains_pork' | 'contains_alcohol' | 'popular'
      | 'signature'
    )[];
    imageSource?: 'menu';         // 菜单上有图片时标记（未来扩展）
  }[];

  // 处理元数据
  processingMs: number;           // AI 处理耗时（毫秒）
  imageCount: number;             // 实际处理的图片数
}
```

#### 2.3 降级模式

当 `Qwen3-VL-Plus` 超时或报错：
1. 自动切换到 `Qwen3-VL-Flash` 重试一次
2. 如仍失败，返回 `AI_UNAVAILABLE` 错误

#### 2.4 Icebreaker 机制（前端本地）

> `POST /api/analyze` 发出后，前端**不等待**响应，而是立即显示本地生成的 Icebreaker 消息。

```typescript
// 前端本地 Icebreaker（无需 API 调用）
const ICEBREAKER_MESSAGES = {
  zh: '菜单识别中，先告诉我你们几位用餐？',
  en: 'Scanning the menu — how many people are dining with you today?',
};
```

#### 2.5 前端重试策略

```typescript
const analyzeRetryConfig = {
  maxAttempts: 2,          // 最多重试 1 次（含首次共 2 次）
  retryOn: ['AI_TIMEOUT', 'AI_UNAVAILABLE', 'AI_INVALID_RESPONSE'],
  delayMs: 1000,           // 重试等待 1s
};
```

---

### `POST /api/chat`

**功能**: AI 对话推理与推荐

#### 3.1 请求 Payload

```typescript
interface ChatRequest {
  // 对话历史（含本次用户消息）
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[];

  // 对话模式（DEC-027）
  // 'pre_chat': ANALYZING 阶段，菜单识别中，用 Qwen3.5-Flash，AI 主动引导用户
  // 'chat':     正常对话，菜单识别完成，用 Qwen3.5-Plus
  mode: 'pre_chat' | 'chat';

  // 当前菜单数据
  // pre_chat 模式时必须为 null（菜单尚未识别完成）
  // chat 模式时为完整识别结果
  menuData: AnalyzeResponseData | null;

  // 用户偏好（localStorage 读取）
  preferences: {
    restrictions: {
      type: 'allergy' | 'diet' | 'dislike';
      value: string;
    }[];
    flavors: {
      type: 'like' | 'dislike';
      value: string;
      strength: 1 | 2 | 3;
    }[];
    history: {
      restaurantType: string;
      orderedItems: string[];
      timestamp: number;
      location?: string;
    }[];
  };

  // 感知上下文
  context: {
    language: 'zh' | 'en';
    timestamp: number;               // 用于判断 meal type
    location?: {
      lat: number;
      lng: number;
    };
    weather?: {                      // Sprint 2 启用
      condition: string;
      temperatureCelsius: number;
    };
  };
}
```

**Payload 限制**:
- `messages` 最多 50 条（超出 FIFO 裁剪，前端负责）
- 单条 `content` 最大 2000 字符
- `menuData.items` 如超过 200 条，Worker 随机采样 200 条送入 Prompt

#### 3.2 成功响应 Data

```typescript
interface ChatResponse {
  // AI 回复文本
  message: string;

  // 推荐菜品（AI 决定是否附上，0-3 个）
  recommendations?: {
    itemId: string;               // 对应 AnalyzeResponse.items[].id
    reason: string;               // 推荐理由（≤1 句）
  }[];

  // 快捷回复（AI 动态生成，2-4 个）
  quickReplies?: string[];

  // AI 提炼的偏好更新（前端合并写入 localStorage）
  preferenceUpdates?: {
    type: 'restriction' | 'flavor';
    action: 'add' | 'remove';
    value: string;
    strength?: 1 | 2 | 3;
  }[];

  // 是否应触发探索视图（AI 判断用户想浏览全部菜单）
  triggerExplore?: boolean;

  // 处理元数据
  processingMs: number;
  model: string;                  // 实际使用的模型名（用于调试）
}
```

#### 3.3 前端重试策略

```typescript
const chatRetryConfig = {
  maxAttempts: 2,
  retryOn: ['AI_TIMEOUT', 'AI_UNAVAILABLE'],
  delayMs: 500,
};
```

---

### `GET /api/health`

**功能**: 健康检查（CI/CD 部署验证、监控探针）

#### 响应

```typescript
// 200 OK
{
  ok: true;
  data: {
    status: 'healthy';
    version: string;            // Worker 版本号（CI 注入）
    timestamp: number;
  };
  requestId: string;
}
```

---

### `GET /api/weather` `[Sprint 2]`

**功能**: 获取当前位置天气

**参数**: `?lat={lat}&lng={lng}`

**响应** (Sprint 2 设计，此处占位):
```typescript
{
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'hot' | 'cold';
  temperatureCelsius: number;
  description: string;        // 翻译后的天气描述
}
```

**数据来源**: Open-Meteo（免费，无需 API Key）

---

## 三、Worker 内部处理流程

### 3.1 `/api/analyze` 处理流

```
1. 校验 CORS Origin
2. 解析 + 校验请求体（Zod）
   └─ 图片数量、大小、格式校验
   └─ 校验失败 → 400 + 对应错误码
3. 速率限制检查（基于 CF-Connecting-IP）
   └─ 超限 → 429 + Retry-After
4. 构建 Qwen3-VL Prompt
   └─ 系统提示 + 5 张图片 content array + 上下文
5. 调用百炼 API（Qwen3-VL-Plus，超时 25s）
   └─ 超时/报错 → 降级到 Qwen3-VL-Flash 重试
   └─ 仍失败 → 503 AI_UNAVAILABLE
6. 解析 AI 返回 JSON（Zod schema 校验）
   └─ 校验失败 → 502 AI_INVALID_RESPONSE
7. 补充 item.id（UUID v4 生成，稳定性保障）
8. 返回 200 + AnalyzeResponse
```

### 3.2 `/api/chat` 处理流

```
1. 校验 CORS + 速率限制
2. 解析 + 校验请求体（Zod）
3. messages 超 50 条时 FIFO 裁剪（保留最近 50 条）
4. menuData.items 超 200 条时采样（优先保留 popular/signature）
5. 构建 Qwen3.5-Plus Prompt（System + 对话历史 + 本次消息）
6. 调用百炼 API（Qwen3.5-Plus，超时 12s）
   └─ 超时/报错 → 降级到 Qwen3.5-Flash 重试
   └─ 仍失败 → 503 AI_UNAVAILABLE
7. 解析 AI 返回 JSON（Zod 校验）
8. 返回 200 + ChatResponse
```

---

## 四、Prompt 设计（Worker 侧）

### 4.1 菜单识别 System Prompt

```
你是 SAGE，一个专业的全球餐饮智能体，擅长识别世界各地餐厅菜单。

## 任务
分析用户提供的菜单图片（可能有多张），输出严格的 JSON 数据。

## 支持语言
中文、英文、日文、韩文、泰文、越南文、西班牙文、法文、阿拉伯文（共 9 种）。
遇到其他语言，尝试识别并翻译；完全无法识别时，nameTranslated 填"（无法识别）"。

## 输出规则
- 严格 JSON，不要 markdown 代码块
- 所有 id 字段：字母+数字组合，全局唯一，长度 8 位
- nameOriginal：菜单上的原文（含原始字符）
- nameTranslated：翻译成 {{language}} 语言
- price：仅数值（数字），priceText：含货币符号的原文
- tags 只用预定义集合，不自创新 tag
  （注：不输出 agentRole/agentGreeting，见 DEC-020）

## 多张图片
将所有图片视为同一份菜单的不同页面，合并输出，去重。
```

### 4.2 对话推荐 System Prompt

```
你是 SAGE，一个专为旅行者设计的餐饮智能体。

## 当前信息
- 时间：{{time}}（{{mealType}}）
- 位置：{{location}}
- 用户语言：{{language}}
- 用户偏好：{{preferenceSummary}}

## 菜单数据（部分）
{{menuDataSummary}}

## 回复规则
- 使用 {{language}} 回复
- 每次回复不超过 3 句话
- 提供具体可操作建议，必须带菜名
- 生成 2-4 个 quickReplies 推进对话
- 优先规避用户的过敏/禁忌食材
- recommendations 最多 3 个，itemId 必须来自菜单数据
- 所有输出为 JSON，不要 markdown

## JSON 格式
{
  "message": "...",
  "recommendations": [{"itemId": "...", "reason": "..."}],
  "quickReplies": ["...", "..."],
  "preferenceUpdates": [],
  "triggerExplore": false
}
```

---

## 五、Zod Schema（前端 + Worker 共用）

### 5.1 菜单识别响应 Schema

```typescript
// schemas/menuSchema.ts
import { z } from 'zod';

export const MenuItemSchema = z.object({
  id: z.string().min(1),
  nameOriginal: z.string().min(1),
  nameTranslated: z.string().min(1),
  descriptionTranslated: z.string().optional(),
  price: z.number().positive().optional(),
  priceText: z.string().optional(),
  tags: z.array(z.enum([
    'spicy', 'vegetarian', 'vegan', 'gluten_free',
    'contains_nuts', 'contains_seafood', 'contains_pork',
    'contains_alcohol', 'popular', 'signature',
  ])).default([]),
  imageSource: z.literal('menu').optional(),
});

export const MenuCategorySchema = z.object({
  id: z.string().min(1),
  nameOriginal: z.string().min(1),
  nameTranslated: z.string().min(1),
  itemIds: z.array(z.string()),
});

export const AnalyzeResponseSchema = z.object({
  menuType: z.enum(['restaurant', 'bar', 'dessert', 'fastfood', 'cafe', 'other']),
  detectedLanguage: z.string().length(2),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  currency: z.string().optional(),
  // agentGreeting / agentRole 已由 DEC-020 删除
  categories: z.array(MenuCategorySchema),
  items: z.array(MenuItemSchema).min(1),
  processingMs: z.number().int().nonnegative(),
  imageCount: z.number().int().min(1).max(5),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type AnalyzeResponseData = z.infer<typeof AnalyzeResponseSchema>;
```

### 5.2 对话响应 Schema

```typescript
// schemas/chatSchema.ts
import { z } from 'zod';

export const PreferenceUpdateSchema = z.object({
  type: z.enum(['restriction', 'flavor']),
  action: z.enum(['add', 'remove']),
  value: z.string().min(1),
  strength: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export const ChatResponseSchema = z.object({
  message: z.string().min(1).max(500),
  recommendations: z.array(z.object({
    itemId: z.string().min(1),
    reason: z.string().min(1).max(100),
  })).max(3).optional(),
  quickReplies: z.array(z.string().min(1).max(50)).min(2).max(4).optional(),
  preferenceUpdates: z.array(PreferenceUpdateSchema).optional(),
  triggerExplore: z.boolean().optional(),
  processingMs: z.number().int().nonnegative(),
  model: z.string().min(1),
});

export type ChatResponseData = z.infer<typeof ChatResponseSchema>;
```

---

## 六、前端调用示例

### 6.1 菜单识别调用

```typescript
// services/analyzeMenu.ts
import { AnalyzeResponseSchema, type AnalyzeResponseData } from '../schemas/menuSchema';

interface AnalyzeMenuOptions {
  images: { data: string; mimeType: string }[];
  language: 'zh' | 'en';
  location?: { lat: number; lng: number };
}

export async function analyzeMenu(options: AnalyzeMenuOptions): Promise<AnalyzeResponseData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: options.images,
        context: {
          language: options.language,
          timestamp: Date.now(),
          location: options.location,
        },
      }),
      signal: controller.signal,
    });

    const json = await response.json();

    if (!json.ok) {
      throw new SageApiError(json.error.code, json.error.message, json.error.retryable);
    }

    return AnalyzeResponseSchema.parse(json.data);
  } finally {
    clearTimeout(timeoutId);
  }
}

// 自定义错误类
export class SageApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'SageApiError';
  }
}
```

### 6.2 对话调用

```typescript
// services/chatAgent.ts
import { ChatResponseSchema, type ChatResponseData } from '../schemas/chatSchema';
import { SageApiError } from './analyzeMenu';

export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponseData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const json = await response.json();

    if (!json.ok) {
      throw new SageApiError(json.error.code, json.error.message, json.error.retryable);
    }

    return ChatResponseSchema.parse(json.data);
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## 七、可观测性设计

### 7.1 Worker 请求日志（结构化）

每次请求结束，Worker 输出一条日志（`console.log` JSON，CF Logpush 收集）：

```typescript
interface WorkerLog {
  requestId: string;
  endpoint: string;           // "/api/analyze"
  method: string;
  status: number;             // HTTP 状态码
  errorCode?: string;         // 业务错误码
  model?: string;             // 实际调用的模型
  processingMs: number;       // Worker 内部处理时间
  aiMs?: number;              // AI API 调用时间
  imageCount?: number;        // 仅 /api/analyze
  ip: string;                 // CF-Connecting-IP（脱敏：仅保留 /24 段）
  timestamp: string;          // ISO 8601
}
```

### 7.2 关键指标（告警阈值）

| 指标 | 正常范围 | 告警阈值 |
|------|---------|---------|
| `/api/analyze` P90 延迟 | < 15s | > 20s |
| `/api/chat` P90 延迟 | < 5s | > 10s |
| AI_UNAVAILABLE 错误率 | < 1% | > 5% |
| 速率限制触发率 | < 5% | > 20% |

---

*文档版本 v1.0，由 SAGE Agent 起草，需 Mr. Xia 审阅后确认。*
