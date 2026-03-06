# ARCHITECTURE.md — 系统技术架构

> 版本: v2.1
> 日期: 2026-03-04
> 状态: ✅ 当前基准版本（已对齐 DEC-044/045/050/051/068）
> 变更说明: v1.1→v2.0 重大更新——AI 供应商从纯百炼切换为 Gemini 主路径 + 百炼兜底；v2.1 (DEC-068) 单阶段 Gemini 调用（OCR+语义合一）
> 上游文档: `docs/product/prd.md`、`DECISIONS.md`

---

## 一、系统全景图

```
┌─────────────────────────────────────────────────────────────┐
│                    用户设备（手机浏览器）                        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              SAGE Web App (SPA)                     │   │
│   │       Vite + React + TypeScript + Tailwind v4       │   │
│   │                                                     │   │
│   │  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  │   │
│   │  │   Home   │  │  AgentChat   │  │  OrderCard  │  │   │
│   │  └──────────┘  └──────────────┘  └─────────────┘  │   │
│   │                                                     │   │
│   │  本地存储：localStorage（偏好记忆、临时会话状态）         │   │
│   └────────────────────┬────────────────────────────────┘   │
│                        │ HTTPS / multipart + SSE            │
└────────────────────────┼────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│           Cloudflare Workers（东京 asia-northeast1）          │
│              API 代理层 + 安全层 + 路由层                       │
│                                                             │
│  POST /api/analyze  → 菜单识别（单次 Gemini 调用，SSE 返回）   │
│  POST /api/chat     → AI 对话（SSE 流式透传）                  │
│  GET  /api/health   → 健康检查                                │
│                                                             │
│  职责：持有 API Key / 速率限制 / CORS / 请求日志 / 路由兜底      │
└──────┬─────────────────────────┬────────────────────────────┘
       │                         │
       │ 正常路径（/api/analyze）  │ 所有路径（/api/chat）
       │                         │
┌──────▼──────────────────────┐  ┌──────▼──────────────────────────┐
│  Google Gemini API           │  │  阿里云百炼 DashScope（国内站）   │
│  (gemini-2.0-flash)          │  │  dashscope.aliyuncs.com          │
│                              │  │                                  │
│  菜单识别 OCR+语义（主路径）  │  │  Chat: qwen3.5-plus/flash        │
│  （DEC-068 单次调用）         │  │  （对话推荐，全程流式 SSE）         │
│                              │  │                                  │
│  DEC-045: ~8-10s 总耗时      │  │                                  │
└──────┬──────────────────────┘  └──────────────────────────────────┘
       │ FAILED_PRECONDITION (geo-block)
       │ 自动触发兜底（DEC-051）
┌──────▼──────────────────────────────────────────────────────┐
│  阿里云百炼国际站 DashScope（新加坡）                            │
│  dashscope-intl.aliyuncs.com                                │
│                                                             │
│  菜单识别兜底: qwen-vl-plus                                  │
│  （仅 Gemini 地理封锁时触发，正常流量不经此路径）                  │
└─────────────────────────────────────────────────────────────┘

外部数据 API:
  GPS: 浏览器 Geolocation API（客户端直连）
  天气: Open-Meteo（CF Worker 代理，免费，无需 Key）
```

---

## 二、前端架构

### 2.1 技术栈

| 层 | 技术 | 版本要求 | 说明 |
|----|------|---------|------|
| 构建工具 | Vite | ^6.0 | 开发启动 < 1s，HMR 极快 |
| UI 框架 | React | ^19.0 | 函数组件 + Hooks |
| 类型系统 | TypeScript | ^5.0 | 严格模式，禁止 `any` |
| 样式 | Tailwind CSS | ^4.0 | CSS `@theme` 配置，见 visual-design.md |
| 数据校验 | Zod | ^3.0 | 所有 AI 返回数据必须 Zod 校验 |
| E2E 测试 | Playwright | ^1.40 | 核心旅程冒烟测试 |

### 2.2 实际目录结构（当前）

```
app/src/
├── api/
│   ├── analyze.ts        # 调用 /api/analyze（multipart + SSE）
│   ├── chat.ts           # 调用 /api/chat（SSE 流式）
│   ├── config.ts         # Worker URL 配置
│   └── transcribe.ts     # 语音转写（Sprint 2）
│   └── summarize.ts      # /api/memory/summarize（记忆）
├── hooks/
│   └── useAppState.ts
├── types/
│   └── index.ts          # 从 shared/types.ts re-export + UI-only 类型
├── utils/
│   ├── allergenMapping.ts
│   ├── debugLog.ts
│   └── errorMessage.ts
└── views/
    ├── AgentChatView.tsx # 核心对话视图（Pre-Chat → Handoff → Chat）
    ├── ExploreView.tsx   # 菜单探索列表（分类 Tab + 双出口）
    ├── HomeView.tsx      # 首页（扫描入口 + 设置）
    ├── OrderCardView.tsx # 点餐单 + 展示给服务员按钮
    └── WaiterModeView.tsx# 全屏展示模式（原文大字）

shared/
└── types.ts              # 前后端唯一权威类型定义（DEC-031）

worker/
├── handlers/
│   ├── analyze.ts        # /api/analyze 处理器（单阶段 Gemini，DEC-068）
│   ├── chat.ts           # /api/chat 处理器（SSE 透传）
│   ├── health.ts         # /api/health
│   └── transcribe.ts     # /api/transcribe（语音）
│   └── summarize.ts      # /api/memory/summarize（记忆）
├── middleware/
│   └── cors.ts           # CORS + Env 类型（持有所有 Secret 引用）
├── prompts/
│   ├── agentChat.ts      # 主 Chat Prompt + menuSummary 构建
│   ├── menuAnalysis.ts   # 菜单识别 Prompt v9（单阶段 OCR+语义，DEC-068）
│   └── preChat.ts        # Pre-Chat Icebreaker Prompt
├── schemas/
│   ├── chatSchema.ts     # Zod：/api/chat 请求校验
│   └── menuSchema.ts     # Zod：菜单识别结果校验
├── utils/
│   ├── bailian.ts        # 百炼 API 客户端（fetchComplete + streamPassthrough）
│   ├── errors.ts         # 标准化错误响应
│   ├── gemini.ts         # Gemini API 客户端（fetchGeminiComplete）
│   ├── logger.ts         # 结构化日志
│   ├── rateLimit.ts      # IP 速率限制
└── index.ts              # Worker 入口路由
```

### 2.3 视图状态机

```
HOME
 └─→ [扫描菜单] → SCANNER（选图/拍照，最多 5 张）
                      └─→ [确认] → AGENT_CHAT（核心视图）
                                       ├─→ [浏览菜单] → EXPLORE
                                       │                   ├─→ [查看点餐单] → ORDER_CARD
                                       │                   │                     └─→ [展示给服务员] → WAITER_MODE
                                       │                   └─→ [带选菜去咨询] → AGENT_CHAT（带已选菜品上下文）
                                       └─→ [点餐单 badge] → ORDER_CARD
```

### 2.4 状态管理

Context + useReducer，不引入 Redux/Zustand：

```typescript
// AppContext（内存态，会话结束清空）
interface AppState {
  view: 'home' | 'scanner' | 'agent_chat' | 'explore' | 'order_card' | 'waiter_mode' | 'settings';
  menuData: MenuData | null;
  isAnalyzing: boolean;
  analyzeProgress: { stage: string; percent: number } | null;
  messages: ChatMessage[];
  orderedItems: OrderItem[];
  contextData: ContextData;   // GPS + 天气 + 时间
}

// localStorage（持久态）
interface StoredPreferences {
  version: 1;
  language: 'zh' | 'en';
  restrictions: Restriction[];
  flavors: FlavorPreference[];
  history: DiningRecord[];    // 最多 50 条，FIFO 淘汰
}
```

---

## 三、Worker API 层

### 3.1 端点列表

| 端点 | 方法 | 返回格式 | 功能 |
|------|------|---------|------|
| `/api/analyze` | POST | SSE（progress + result） | 菜单图片识别（单阶段，DEC-068） |
| `/api/chat` | POST | SSE（流式文本） | AI 对话推荐 |
| `/api/health` | GET | JSON | 健康检查 |
| `/api/transcribe` | POST | JSON | 语音转写（Sprint 2） |
| `/api/memory/summarize` | POST | JSON | 会话摘要 + 偏好进化（Sprint 4b） |

### 3.2 `/api/analyze` SSE 事件序列

```
→ [multipart/form-data 上传，含图片 + context]

← event: progress  { stage: 'uploading',   percent: 10 }
← event: progress  { stage: 'preparing',   percent: 20 }
← event: progress  { stage: 'analyzing',   percent: 40 }   ← Gemini 推理中（OCR+语义，~18s）
← event: progress  { stage: 'validating',  percent: 80 }   ← 结果校验
← event: progress  { stage: 'completed',   percent: 100 }
← event: result    { ok: true, data: MenuData, requestId }
```

### 3.3 安全约束

```typescript
// Worker Secrets（前端零接触）
GEMINI_API_KEY       // Gemini 2.0 Flash（菜单识别正常路径，DEC-068）
BAILIAN_API_KEY      // 百炼国内站（/api/chat）
BAILIAN_INTL_API_KEY // 百炼新加坡国际站（菜单识别地理兜底，DEC-051）

// 速率限制（基于 CF IP）
analyze: 20 次/小时
chat: 100 次/小时

// CORS 白名单
https://sage-next-gen.pages.dev
http://localhost:5173
```

---

## 四、AI 层设计

### 4.1 模型矩阵（当前生产配置）

| 场景 | 正常路径 | 兜底路径 | 决策 |
|------|---------|---------|------|
| 菜单识别（OCR+语义） | `gemini-2.0-flash`（Gemini API） | `qwen-vl-plus`（百炼新加坡） | DEC-045、DEC-051、DEC-068 |
| AI 对话 | `qwen3.5-plus`（百炼国内） | `qwen3.5-flash`（百炼国内） | DEC-026 |
| Pre-Chat | `qwen3.5-flash`（百炼国内） | — | DEC-027 |

> ⚠️ **注意**：DEC-003（"Gemini 废弃"）已被 DEC-045 覆盖。Gemini 2.0 Flash 现为菜单识别主力模型，Chat 路径仍使用百炼。详见 DECISIONS.md 覆盖关系表。

### 4.2 /api/analyze 单阶段 Vision Pipeline（DEC-068）

```
图片输入（multipart，最多 5 张，≤500KB/张）
    │
    ▼ 单次 Gemini 2.0 Flash 调用（Prompt v9，DEC-068）
    │   模型: gemini-2.0-flash
    │   超时: 35s（maxOutputTokens=8192）
    │   任务: OCR + 结构化提取 + 语义补全（一次完成）
    │   输出: 完整 MenuData JSON
    │
    ▼ normalizeLooseResult()  ← 容错解析，修复 AI 不规范 JSON
    │
    ▼ Zod schema 校验
    │
    ▼ SSE result 事件 → 前端
```

> **DEC-068**：单次 Gemini 2.0 Flash 调用同时完成 OCR + 语义补全。总延迟 ~18s，成功率大幅提升。

### 4.3 Prompt 版本（当前：v9，DEC-068）

**菜单识别 Prompt（MENU_ANALYSIS_SYSTEM v9）**
- 单次调用同时完成 OCR + 语义补全（DEC-068）
- 每道菜拆分为独立卡片（蛋白质变体/规格变体/销售方式变体均拆分，DEC-049）
- 输出 JSON Only，无 markdown
- 完整 Prompt 见 `worker/prompts/menuAnalysis.ts`

**质量基准（2026-03-02 v2 Benchmark，COENTRO 菜单）**
- Recall：**100%**（26/26）✅
- Precision：**93%** ✅
- 临界测试（Chicken Leg→花生）：✅ 通过

### 4.4 stream 策略（DEC-044）

| 场景 | stream | 工具函数 |
|------|--------|---------|
| 菜单识别（OCR+语义） | `false` | `fetchGeminiComplete()` |
| AI 对话 | `true` | `streamPassthrough()` |

> 核心结论：菜单识别输出 JSON，前端必须等完整结果才能解析；stream=true 在此场景额外增加约 2.4× 开销。

### 4.5 降级机制

```
正常路径:
  前端 → CF Worker(东京) → Gemini API → 返回

兜底路径 A（地理封锁，DEC-051）:
  Gemini 返回 FAILED_PRECONDITION
  → Worker 捕获 geoBlocked 标记
  → 切换 qwen-vl-plus（百炼新加坡）做菜单识别
  → 用户无感知，同样返回完整 MenuData

兜底路径 B（Gemini 超时/不可用）:
  Gemini 超时（>35s）或网络异常
  → 返回 AI_TIMEOUT / AI_UNAVAILABLE 错误
  → 前端展示用户友好错误 + 重试引导
  （注：此路径暂不自动切换模型，规避误切）

Chat 降级:
  qwen3.5-plus 不可用 → qwen3.5-flash 降级
```

---

## 五、Path A 完整数据流（当前实现）

```
1. 用户打开 App
   └─ GPS 授权（成功→存入 contextData；失败→静默跳过，DEC-021）
   └─ 读取 localStorage 偏好记忆

2. 用户选图/拍照（ScannerView，最多 5 张）
   └─ 前端压缩：maxDim=1280px / maxBytes=500KB（DEC-040）
   └─ 并发限制：同时压缩 ≤2 张（iPhone Safari 内存优化）

3. 确认 → 立即跳转 AgentChatView
   └─ Icebreaker 消息本地生成（无 API 调用）
   └─ Pre-Chat 主动多轮（DEC-027）: qwen3.5-flash 引导用户说出需求
   └─ 后台 multipart 上传 → /api/analyze（SSE）

4. /api/analyze 单阶段执行（~18s，DEC-068）
   └─ Gemini 2.0 Flash 单次调用：OCR + 语义补全一次完成
   └─ SSE result → 前端 dispatch SET_MENU_DATA

5. 对话循环（AgentChatView）
   └─ Pre-Chat 历史 + handoff note → 主 Chat（qwen3.5-plus）
   └─ 用户消息 → /api/chat（SSE 流式）→ 推荐卡片 + 快捷回复
   └─ 加入点餐单 → orderedItems 更新

6. ExploreView（辅助）
   └─ 分类 Tab 浏览 + DishCard 展示（含 allergens/spiceLevel）
   └─ 双出口：展示给服务员 / 带选菜咨询 AI（DEC-043）

7. 点餐结束
   └─ OrderCardView → WaiterModeView（原文大字）
   └─ 偏好信号写入 localStorage
```

---

## 六、安全架构

| 威胁 | 缓解措施 |
|------|---------|
| AI API Key 泄露 | 三个 Key 均存于 Worker wrangler secret，前端零接触 |
| XSS 注入 | React 默认 HTML 转义；所有 AI 输出经 Zod 校验后渲染 |
| CSRF | Worker 校验 Origin header，非白名单请求拒绝 |
| 速率滥用 | CF Worker 速率限制（20次/小时识别，100次/小时对话）|
| 图片存储 | 菜单图片仅在 Worker 内存中处理，不持久化 |
| 用户数据 | 偏好数据仅存本地 localStorage，服务器不收集（MVP）|

---

## 七、部署架构

```
代码仓库（GitHub，main 分支）
    │
    ├─► Cloudflare Pages CI/CD（自动）
    │   └─ pnpm build → 静态文件 → CDN 全球边缘
    │   └─ 域名: sage-next-gen.pages.dev
    │
    └─► Cloudflare Workers（wrangler deploy）
        └─ worker/ → CF Workers 全球网络（东京 PoP 优先）
        └─ Secrets:
           - GEMINI_API_KEY          ← Gemini 2.0 Flash
           - BAILIAN_API_KEY         ← 百炼国内站（Chat）
           - BAILIAN_INTL_API_KEY    ← 百炼新加坡（兜底）
```

---

## 七-B、Chat 输出与 Order 交互架构（DEC-052v2/055/057/058/059/060）

> 以下决策在 2026-03-02 批量确认，补充 Chat↔Order↔Waiter 的数据流架构。

### Chat 回复末尾 JSON 代码块（DEC-052v2）

AI 对话回复采用"流式叙事文字 + 末尾 \`\`\`json 代码块"格式。代码块可能包含两种结构：
- **MealPlan**：完整用餐方案（courses 数组），前端提取后渲染 MealPlanCard
- **OrderAction**：Order 操作指令（add/remove/replace），前端自动执行

分级 fallback：L1 完整解析→卡片 / L2 jsonrepair→简化卡片 / L3 纯文字+"重新生成方案"按钮。

### MealPlanCard 提案模式（DEC-055）

MealPlanCard 与 Order 是独立数据：
- MealPlanCard = AI 搭配提案，「整套加入」= 复制到 Order 后脱钩
- Order = 唯一执行数据源，用户可在 Order 页自由增删
- 新 MealPlanCard 替换旧卡片（不保留历史版本）
- 并发防抖：`basedOnVersion` 版本号，旧响应丢弃

### 导航状态机（DEC-057）

Order 是 Waiter 的唯一数据源。Explore 的两个出口（展示给服务员 / 咨询 AI）都先将已选菜品写入 Order。详见 `docs/product/navigation-spec.md` v2.0。

### Chat 直接操作 Order（DEC-058）

AI 回复末尾 JSON 代码块可包含 `orderAction`（add/remove/replace），前端检测到后自动执行 Order 修改。用户在 Chat 中说"把牛排换成龙虾"→ AI 直接操作，无需二次确认。

### 课程结构动态生成（DEC-059）

MealPlan 的 `courses` 数组由 AI 根据菜单所属餐饮文化动态生成（中餐/日料/泰餐/西餐各有不同课程结构），前端不假设固定顺序。菜品 <5 道时不输出 MealPlanCard。

### Waiter 指点式沟通面板（DEC-060）

Waiter Mode 下点击菜品弹出双语沟通面板（用户语言 + `detectedLanguage`），支持：售罄标记（移除+推荐替代）、换菜、加份、其他问题（转 Chat）。详见 `docs/product/navigation-spec.md` v2.0。

---

## 八、性能基准（2026-03-02 实测）

| 指标 | 数值 | 备注 |
|------|------|------|
| 菜单识别耗时（Gemini） | ~18s | 单次调用，DEC-068 |
| Allergen Recall | 100%（26/26）| COENTRO 菜单 ground truth |
| Allergen Precision | 93% | |
| Worker RTT | ~349ms | CF 东京节点往返 |

> **下一步优化**: DEC-068 已将 Pipeline 合并为单次调用（~18s）。进一步优化方向：流式 JSON 解析（partial result 提前推送），预期感知时间 ~8s。
