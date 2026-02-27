# ARCHITECTURE.md — 系统技术架构

> 版本: v1.1
> 日期: 2026-02-26
> 状态: ✅ OQ3/OQ4 已解决，TBD 全部填充（DEC-026）
> 上游文档: `docs/prd.md`、`DECISIONS.md`

---

## 一、系统全景图

```
┌─────────────────────────────────────────────────────────────┐
│                      用户设备（手机浏览器）                     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              SAGE Web App (SPA)                     │   │
│   │         Vite + React + TypeScript + Tailwind v4    │   │
│   │                                                     │   │
│   │  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  │   │
│   │  │   Home   │  │  AgentChat   │  │  OrderCard  │  │   │
│   │  └──────────┘  └──────────────┘  └─────────────┘  │   │
│   │                                                     │   │
│   │  本地存储：localStorage (偏好记忆、临时会话状态)        │   │
│   └────────────────────┬────────────────────────────────┘   │
│                        │ HTTPS                              │
└────────────────────────┼────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Cloudflare Workers (asia-northeast1)            │
│              API 代理层 + 安全层                               │
│                                                             │
│   POST /api/analyze   → AI Vision（菜单识别）                 │
│   POST /api/chat      → AI Chat（对话推荐）                   │
│   GET  /api/weather   → 天气 API（Sprint 2）                  │
│                                                             │
│   职责：持有 API Key / 速率限制 / CORS / 请求日志              │
└─────────────┬──────────────────────────┬────────────────────┘
              │                          │
┌─────────────▼──────────────────────┐  ┌────────────▼───────────────────┐
│     阿里云百炼 AI API (DashScope)    │  │    外部数据 API                 │
│  兼容接口: /compatible-mode/v1      │  │                                │
│                                    │  │  GPS: 浏览器 Geolocation API   │
│ Vision:  Qwen3-VL-Plus (主力)       │  │  天气: Open-Meteo（免费）        │
│          Qwen3-VL-Flash (降级/快速) │  │        Sprint 2 实现            │
│ Chat:    Qwen3.5-Plus (主力)        │  └────────────────────────────────┘
│          Qwen3.5-Flash (轻量判断)   │
│ ⚠️ 禁止: Gemini 全系列              │
└────────────────────────────────────┘

部署：
  前端 → Cloudflare Pages（CDN 全球加速）
  Worker → Cloudflare Workers（asia-northeast1 东京，低延迟访问百炼 API）
```

---

## 二、前端架构

### 2.1 技术栈

| 层 | 技术 | 版本要求 | 说明 |
|----|------|---------|------|
| 构建工具 | Vite | ^6.0 | 开发启动 < 1s，HMR 极快 |
| UI 框架 | React | ^19.0 | 函数组件 + Hooks |
| 类型系统 | TypeScript | ^5.0 | 严格模式，禁止 `any` |
| 样式 | Tailwind CSS | ^4.0 | CSS `@theme` 配置，见 VISUAL_DESIGN.md |
| 图标 | Lucide React | ^0.400 | Tree-shaking 友好 |
| 数据校验 | Zod | ^3.0 | 所有 AI 返回数据必须 zod 校验 |
| 测试 | Vitest + @testing-library/react | ^2.0 | 单元 + 组件测试 |
| E2E 测试 | Playwright | ^1.40 | 核心旅程测试 |

### 2.2 目录结构

```
app/
├── src/
│   ├── main.tsx              # 入口，挂载 App
│   ├── App.tsx               # 根组件，状态机控制视图切换
│   ├── styles/
│   │   └── global.css        # Tailwind @theme 配置 + 全局样式
│   ├── components/           # 通用 UI 组件（无业务逻辑）
│   │   ├── MessageBubble.tsx # AI/用户消息气泡
│   │   ├── DishCard.tsx      # 菜品推荐卡片
│   │   ├── QuickReply.tsx    # 快捷回复按钮组
│   │   ├── ImagePicker.tsx   # 底部弹层图片选择
│   │   ├── ImagePreviewBar.tsx # 输入栏上方缩略图
│   │   ├── OrderBar.tsx      # 底部浮动点餐单入口
│   │   └── LoadingDots.tsx   # AI 思考中动画
│   ├── views/                # 页面级视图（含业务逻辑）
│   │   ├── HomeView.tsx      # 首页（扫描菜单入口）
│   │   ├── AgentChatView.tsx # 核心对话视图（Path A 主舞台）
│   │   ├── ExploreView.tsx   # 菜单探索列表（辅助）
│   │   └── OrderCardView.tsx # 点餐单 + 展示给服务员
│   ├── services/             # 外部服务调用（纯函数）
│   │   ├── analyzeMenu.ts    # 调用 /api/analyze
│   │   ├── chatAgent.ts      # 调用 /api/chat
│   │   └── geoLocation.ts    # 浏览器 GPS 获取
│   ├── store/                # 全局状态（React Context）
│   │   ├── AppContext.tsx     # App 级状态（当前视图/菜单数据/对话历史）
│   │   └── PreferencesContext.tsx # 用户偏好（localStorage 同步）
│   ├── schemas/              # Zod Schema 定义
│   │   ├── menuSchema.ts     # AI 返回菜单数据的 schema
│   │   └── chatSchema.ts     # AI 返回对话数据的 schema
│   ├── utils/                # 工具函数
│   │   ├── currency.ts       # 货币符号适配
│   │   ├── mergeMenus.ts     # 多张图片菜单合并
│   │   └── tipCalculator.ts  # 小费建议
│   ├── hooks/                # 自定义 Hooks
│   │   ├── usePreferences.ts # 偏好记忆读写
│   │   └── useWakeLock.ts    # 展示模式屏幕常亮
│   └── types/
│       └── index.ts          # 全局类型定义
├── worker/                   # Cloudflare Worker 代码
│   ├── index.ts              # Worker 入口 + 路由
│   ├── handlers/
│   │   ├── analyze.ts        # /api/analyze 处理器
│   │   └── chat.ts           # /api/chat 处理器
│   └── prompts/
│       ├── menuAnalysis.ts   # 菜单识别 Prompt
│       └── agentChat.ts      # 对话推荐 Prompt
├── public/
│   └── manifest.json         # PWA manifest（基础配置）
├── tests/
│   ├── unit/                 # 单元测试
│   ├── components/           # 组件测试
│   └── e2e/                  # Playwright E2E 测试
├── package.json
├── vite.config.ts
├── tsconfig.json
└── wrangler.toml             # Cloudflare Worker 配置
```

### 2.3 视图状态机（Path A MVP）

```
                    ┌─────────┐
                    │  HOME   │  ← App 初始状态
                    └────┬────┘
                         │ 点击「扫描菜单」
                    ┌────▼────────┐
                    │IMAGE_PICKER │  ← 底部弹层（非独立视图）
                    └────┬────────┘
                         │ 选择图片确认
                    ┌────▼──────────┐
              ┌────►│  AGENT_CHAT   │◄────┐
              │     └──────┬────────┘     │
              │            │              │
         返回对话     点击「浏览全部」   返回对话
              │            │              │
              │     ┌──────▼────────┐     │
              └─────│   EXPLORE     │─────┘
                    └──────┬────────┘
                           │ 点击「查看点餐单」
                    ┌──────▼────────┐
                    │  ORDER_CARD   │
                    └──────┬────────┘
                           │ 点击「展示给服务员」
                    ┌──────▼────────┐
                    │ WAITER_MODE   │  ← 全屏展示模式
                    └───────────────┘
```

### 2.4 状态管理策略

**不引入 Redux/Zustand**，使用 React Context + useReducer：

```typescript
// AppContext 管理的状态
interface AppState {
  view: 'home' | 'agent_chat' | 'explore' | 'order_card' | 'waiter_mode';
  menuData: MenuData | null;          // AI 识别结果
  isAnalyzing: boolean;               // 菜单识别中
  messages: ChatMessage[];            // 对话历史
  orderedItems: OrderItem[];          // 点餐单
  contextData: ContextData;           // 4+1 感知数据（时间/GPS/天气）
}

// PreferencesContext 管理的状态（持久化到 localStorage）
interface PreferencesState {
  restrictions: string[];   // 饮食限制（"花生过敏"/"素食"）
  flavors: string[];        // 口味偏好（"不辣"/"重口"）
  history: DiningRecord[];  // 历史点餐记录
  language: 'zh' | 'en';   // UI 语言
}
```

---

## 三、API 层设计（Cloudflare Worker）

### 3.1 端点列表

#### `POST /api/analyze`
**功能**：菜单图片识别

Request:
```typescript
{
  images: string[];     // Base64 编码的图片（最多 5 张）
  context: {
    language: 'zh' | 'en';
    timestamp: number;
    location?: { lat: number; lng: number };
  }
}
```

Response（经 Zod 校验）:
```typescript
{
  menuType: 'restaurant' | 'bar' | 'dessert' | 'fastfood' | 'cafe' | 'other';
  detectedLanguage: string;   // ISO 639-1 语言代码
  priceLevel: 1 | 2 | 3;     // 1=经济 2=中等 3=高端
  agentRole: string;          // AI 动态生成的角色描述
  agentGreeting: string;      // AI 开场白（icebreaker 结束后的正式开场）
  categories: MenuCategory[]; // 菜品分类列表
  items: MenuItem[];          // 菜品列表
}
```

#### `POST /api/chat`
**功能**：对话推理与推荐

Request:
```typescript
{
  messages: { role: 'user' | 'assistant'; content: string }[];
  menuData: MenuData | null;
  preferences: PreferencesState;
  context: ContextData;        // 时间/GPS/天气
  language: 'zh' | 'en';
}
```

Response（经 Zod 校验）:
```typescript
{
  message: string;             // AI 回复文本
  recommendations?: MenuItem[]; // 推荐菜品（可选，AI 决定是否附上）
  quickReplies?: string[];     // 快捷回复选项（AI 动态生成，2-4 个）
  updatedPreferences?: Partial<PreferencesState>; // AI 提炼的新偏好
}
```

#### `GET /api/weather` `[Sprint 2]`
**功能**：获取当前位置天气（基于 GPS）

### 3.2 安全约束

```typescript
// Worker 环境变量（wrangler secret 管理，前端零接触）
const BAILIAN_API_KEY = env.BAILIAN_API_KEY;  // 阿里云百炼 API Key

// 速率限制（基于 CF IP）
const RATE_LIMIT = {
  analyze: 20,    // 每 IP 每小时最多 20 次识别
  chat: 100,      // 每 IP 每小时最多 100 次对话
};

// CORS 白名单
const ALLOWED_ORIGINS = [
  'https://sage-next-gen.pages.dev',
  'http://localhost:5173',   // 开发环境
];
```

---

## 四、AI 层设计

### 4.1 模型选择策略（DEC-026，已定）

| 场景 | 模型 | 供应商 | 理由 |
|------|------|--------|------|
| 菜单识别主力 | `Qwen3-VL-Plus` | 阿里云百炼 | 多语言 OCR 强，多图原生支持 |
| 菜单识别降级/快速 | `Qwen3-VL-Flash` | 阿里云百炼 | 成本低，延迟短 |
| AI 对话主力 | `Qwen3.5-Plus` | 阿里云百炼 | 质量/成本平衡 |
| 轻量判断 | `Qwen3.5-Flash` | 阿里云百炼 | 极低延迟，省成本 |
| ⚠️ 禁止 | Gemini 全系列 | — | 严重限速，已废弃（DEC-003）|

**OQ4 解决**（多图提交方式）：5 张图片**同时提交**一次 `/api/analyze` 调用，使用 Qwen3-VL message content array 格式（每张图作为一个 `image_url` content item）。优势：AI 在同一 context 理解多图关系，合并更准确，减少 API 调用次数。

**API 接入方式**：阿里云百炼 OpenAI 兼容模式
```
Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
Auth: Authorization: Bearer ${env.BAILIAN_API_KEY}
```

**⚠️ 所有调用必填参数（DEC-028）**：
```json
{ "stream": true, "enable_thinking": false }
```
实测：不设 `enable_thinking: false` → TTFT 7-26s；设后 → TTFT 2-450ms（22x 提升）

### 4.2 Prompt 架构

**菜单识别 Prompt 结构**：
```
[System]
你是一个专业的餐饮智能体，擅长识别全球各地的餐厅菜单。
请分析提供的菜单图片，输出结构化 JSON 数据。

输出要求：
- menuType: 菜单类型
- detectedLanguage: 检测到的主要语言
- priceLevel: 价格档次（1=经济/2=中等/3=高端）
- agentRole: 根据菜单类型确定的 AI 角色（自然语言描述，如"熟悉居酒屋文化的美食向导"）
- agentGreeting: 识别完成后的开场白（简洁，2句话内）
- categories: 菜品分类
- items: 菜品列表（含原文、翻译、价格、描述、食材标签）

[User]
<菜单图片>
当前时间：{timestamp}
用户语言：{language}
```

**对话推荐 Prompt 结构**：
```
[System]
你是 SAGE，一个专为旅行者设计的餐饮智能体。
你现在扮演的角色是：{agentRole}

当前场景信息：
- 时间：{time}（{mealType}）
- 位置：{location}（如已知）
- 用户偏好：{preferences}

菜单数据：{menuData}

回复原则：
- 使用{language}回复
- 每次回复不超过 3 句话
- 必须提供具体可操作的建议（附上菜品名称）
- 生成 2-4 个快捷回复选项帮助推进对话

[对话历史]
{messages}

[User]
{userMessage}
```

### 4.3 降级机制

```
正常路径:   前端 → CF Worker → AI API → 返回
降级路径1:  AI API 超时（>15s）→ Worker 重试一次 → 仍失败 → 返回降级响应
降级路径2:  AI API 异常 → 切换到备用模型（glm-5）→ 重试
降级路径3:  所有模型不可用 → 返回友好错误，引导用户稍后重试
```

---

## 五、Path A 完整数据流

```
1. 用户打开 App
   └─ GPS 授权请求（用户同意/拒绝）
   └─ 读取 localStorage 偏好记忆

2. 用户点击「扫描菜单」→ 选择图片（最多 5 张）

3. 前端立即跳转 AgentChatView（不等上传）
   └─ isAnalyzing = true
   └─ AI Icebreaker 消息出现（本地生成，无需 API）
   └─ 图片后台上传 → /api/analyze

4. /api/analyze 返回 MenuData
   └─ Zod 校验 → 存入 AppState.menuData
   └─ isAnalyzing = false
   └─ 触发 AI 正式开场（调用 /api/chat with menuData）

5. 对话循环（用户 ↔ AI）
   └─ 用户发消息 → /api/chat（携带完整上下文）
   └─ AI 回复 → 含推荐卡片 + 快捷按钮
   └─ 用户点「加入」→ 更新 AppState.orderedItems

6. 用户点击底部点餐单 → OrderCardView
   └─ 展示已选菜品 + 总价 + 小费建议
   └─ 点击「展示给服务员」→ WaiterMode（全屏原文）

7. 流程结束
   └─ 偏好信号写入 localStorage
```

---

## 六、本地存储设计（localStorage Schema）

```typescript
// Key: 'sage_preferences'
interface StoredPreferences {
  version: 1;                  // schema 版本，用于迁移
  language: 'zh' | 'en';
  restrictions: {
    type: 'allergy' | 'diet' | 'dislike';
    value: string;             // "花生" / "素食" / "香菜"
    addedAt: number;           // timestamp
  }[];
  flavors: {
    type: 'like' | 'dislike';
    value: string;             // "辣" / "重口" / "清淡"
    strength: 1 | 2 | 3;      // 强度
  }[];
  history: {
    restaurantType: string;    // "居酒屋" / "泰餐"
    orderedItems: string[];    // 菜名列表
    timestamp: number;
    location?: string;         // 城市名
  }[];
  lastUpdated: number;
}

// 存储上限：50 条 history 记录，超出 FIFO 淘汰
// 最大体积预估：~50KB（不影响性能）
```

---

## 七、安全架构

| 威胁 | 缓解措施 |
|------|---------|
| AI API Key 泄露 | Key 仅存于 Worker env，前端代码零接触 |
| XSS 注入 | React 默认 HTML 转义；所有 AI 输出经 zod 校验后渲染 |
| CSRF | Worker 校验 Origin header，非白名单请求拒绝 |
| 速率滥用 | CF Worker 速率限制（20次/小时识别，100次/小时对话）|
| 图片存储 | 菜单图片仅在 Worker 内存中处理，不持久化到任何存储 |
| 用户数据 | 偏好数据仅存本地 localStorage，服务器不收集用户数据（MVP）|

---

## 八、待定项（TBD）

> ✅ 所有 TBD 已解决（2026-02-26，DEC-026）

| 编号 | 问题 | 解决方案 | 解决日期 |
|------|------|---------|---------|
| OQ3 ✅ | Vision 模型选型 | `Qwen3-VL-Plus`（主）/ `Qwen3-VL-Flash`（降级）| 2026-02-26 |
| OQ4 ✅ | 多图提交方式 | 5 张同时提交一次调用，content array 格式 | 2026-02-26 |

---

## 九、部署架构

```
代码仓库（GitHub）
    │
    ├─ main 分支推送
    │
    ├─► Cloudflare Pages CI/CD
    │   └─ pnpm build → 静态文件部署到 CDN（全球边缘节点）
    │   └─ 域名：sage-next-gen.pages.dev（正式上线后自定义域名）
    │
    └─► Cloudflare Workers CI/CD（wrangler deploy）
        └─ worker/ 目录构建 → 部署到 CF Workers 全球网络
        └─ 注：CF Workers 自动就近路由（非固定节点），
              百炼 API 调用延迟取决于用户所在区域的 CF PoP 到百炼的链路
        └─ BAILIAN_API_KEY 通过 wrangler secret 管理，前端零接触
```
