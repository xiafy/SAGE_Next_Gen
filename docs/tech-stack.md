# TECH_STACK.md — 技术栈选型说明

> 版本: v1.0
> 日期: 2026-02-26
> 状态: ✅ 已定（DEC-004 / DEC-005 / DEC-026）
> 说明: 本文档解释每个技术选择的原因、替代方案对比、关键约束，供 Agent/人类开发者快速上手

---

## 一、选型决策总览

| 层 | 选型 | 版本 | 决策依据 |
|----|------|------|---------|
| 构建工具 | Vite | ^6.0 | 冷启动 < 1s，HMR 极快，无需 webpack 配置 |
| UI 框架 | React | ^19.0 | 生态最大，团队熟悉度高 |
| 类型系统 | TypeScript | ^5.0 | 严格模式，多 Agent 协作时接口契约清晰 |
| 样式 | Tailwind CSS | **^4.0** | CSS-first，原生 `@theme`，无需 config.js |
| 数据校验 | Zod | ^3.0 | 前后端共享 Schema，AI 返回数据必过校验 |
| 状态管理 | React Context + useReducer | — | 无需额外依赖，MVP 复杂度可控 |
| 图标 | Lucide React | ^0.400 | Tree-shaking，Bundle 体积小 |
| 测试 | Vitest + RTL + Playwright | — | 与 Vite 生态原生集成 |
| 边缘运行时 | Cloudflare Workers | — | 全球低延迟，serverless，0 冷启动 |
| 部署 | Cloudflare Pages | — | 与 Workers 无缝集成，CDN 全球加速 |
| AI 供应商 | 阿里云百炼（DashScope）| — | Mr. Xia 提供 Key，Qwen3-VL 多语言强 |
| 包管理器 | pnpm | ^9.0 | 磁盘效率高，Monorepo 友好 |

---

## 二、前端技术栈

### 2.1 Vite ^6.0

**为什么选 Vite 而不是 Next.js / CRA**:
- SAGE 是纯 SPA（无需 SSR / SSG）——Next.js 的路由和 SSR 是不需要的复杂度
- Vite 开发体验明显优于 webpack（HMR < 100ms）
- 与 Cloudflare Pages 静态托管完美匹配

**关键配置** (`vite.config.ts`):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',  // 开发时代理到本地 Worker
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          zod: ['zod'],
        },
      },
    },
  },
});
```

---

### 2.2 React ^19.0

**为什么 React 19**:
- React 19 Server Components 在纯 SPA 中无用，但 Concurrent Features（useTransition、Suspense）对 AI 流式体验有帮助
- 函数组件 + Hooks 是强制规范，不使用 Class Component

**强制规范**:
- 禁止使用 `any` 类型
- 禁止 `useEffect` 依赖数组缺失（ESLint 规则强制）
- 组件文件命名：`PascalCase.tsx`
- 工具函数文件命名：`camelCase.ts`

---

### 2.3 Tailwind CSS ^4.0 ⚠️ 关键约束

**⚠️ 与 v3 的重大区别，必读**：

```
❌ v3 方式（本项目禁止使用）：
   tailwind.config.js
   module.exports = { theme: { extend: { colors: { brand: '#6366F1' } } } }

✅ v4 方式（本项目强制使用）：
   在 global.css 中：
   @import "tailwindcss";
   @theme {
     --color-brand: #6366F1;
     --color-brand-50: #eef2ff;
     /* ... */
   }
```

**完整 `@theme` 配置见** `03_design/VISUAL_DESIGN.md`

**使用方式**:
```html
<!-- ✅ 正确 -->
<button class="bg-brand text-white">...</button>

<!-- ❌ 错误（v3 写法，v4 不识别）-->
<button class="bg-indigo-600 text-white">...</button>
```

**为什么选 Tailwind v4 而不是 v3**:
- v4 CSS-native，无需 PostCSS 配置
- `@theme` 变量可在 CSS 和 JS 中直接使用
- 零配置文件，更适合多 Agent 协作

---

### 2.4 TypeScript ^5.0

**`tsconfig.json` 关键配置**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**禁止清单**:
- `any` 类型（使用 `unknown` + narrowing）
- `// @ts-ignore`（必须修复根本问题）
- `console.log`（生产代码禁止，使用结构化 Worker 日志）

---

### 2.5 Zod ^3.0

**用途**：所有 AI API 返回数据必须经过 Zod 校验后才能使用。

**原因**：AI 模型输出不可完全信任——可能缺字段、类型错误、值超范围。Zod parse 失败时前端显示降级 UI，不崩溃。

**Schema 位置**: `src/schemas/` — 前端和 Worker 共用同一份 Schema 定义。

---

### 2.6 状态管理：React Context + useReducer

**为什么不用 Redux / Zustand**:
- MVP 状态复杂度可控（2 个 Context：AppContext + PreferencesContext）
- 减少依赖 = 减少 Bundle 体积 = 更快首屏
- 后续如需 Zustand 可无缝迁移（同 Context API）

**何时考虑升级到 Zustand**:
- 超过 5 个 Context 时
- 出现明显的 re-render 性能问题时

---

### 2.7 Lucide React ^0.400

**图标使用原则**:
```typescript
// ✅ 按需引入（Tree-shaking）
import { Camera, Plus, ChevronRight } from 'lucide-react';

// ❌ 禁止全量引入
import * as Icons from 'lucide-react';
```

---

## 三、后端技术栈（Cloudflare Workers）

### 3.1 Cloudflare Workers

**运行时**: V8 Isolates（非 Node.js）

**重要限制**:
| 限制项 | 数值 | 影响 |
|--------|------|------|
| CPU 时间 | 50ms（免费）/ 30s（付费） | Prompt 构建需优化，不能做复杂计算 |
| 内存 | 128MB | 多图 Base64 处理需注意 |
| 请求体大小 | 100MB | 图片上传远低于此限制 |
| 子请求数 | 1000/request | AI API 调用最多 2 次（含重试）|
| 单次执行超时 | 30s（Worker 配置）| 已在 API 设计中预留 |

**不能在 Workers 中使用**:
- Node.js `fs`、`path`、`crypto`（使用 Web Crypto API 替代）
- `setTimeout` 控制执行流（可用但受限）

**可用的 Web API**:
- `fetch`（调用百炼 API）
- `Request` / `Response`
- `TextEncoder` / `TextDecoder`
- `crypto.randomUUID()`（生成 requestId）
- `crypto.subtle`（签名等）

### 3.2 Worker 代码结构

```
worker/
├── index.ts          # 入口：路由分发 + 全局中间件
├── middleware/
│   ├── cors.ts       # CORS 检查
│   └── rateLimit.ts  # 速率限制（基于 CF KV 或 DurableObjects）
├── handlers/
│   ├── analyze.ts    # /api/analyze 处理器
│   ├── chat.ts       # /api/chat 处理器
│   └── health.ts     # /api/health
├── prompts/
│   ├── menuAnalysis.ts   # 菜单识别 Prompt 模板
│   └── agentChat.ts      # 对话推荐 Prompt 模板
├── schemas/          # Zod schemas（与前端共享）
│   ├── menuSchema.ts
│   └── chatSchema.ts
└── utils/
    ├── logger.ts     # 结构化日志
    └── bailian.ts    # 百炼 API 调用封装
```

### 3.3 `wrangler.toml` 配置

```toml
name = "sage-worker"
main = "worker/index.ts"
compatibility_date = "2024-09-23"

[vars]
ENVIRONMENT = "production"

# Secrets（通过 `wrangler secret put` 设置，不提交到 Git）
# BAILIAN_API_KEY = "sk-..."

[[routes]]
pattern = "sage-next-gen.pages.dev/api/*"
zone_name = "pages.dev"

[dev]
port = 8787
local_protocol = "http"
```

### 3.4 百炼 API 调用封装

```typescript
// worker/utils/bailian.ts
const BAILIAN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export async function callBailian(
  env: Env,
  model: string,
  messages: BailianMessage[],
  options?: { timeoutMs?: number }
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? 25_000
  );

  try {
    const response = await fetch(`${BAILIAN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.BAILIAN_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bailian API error: ${response.status}`);
    }

    const data = await response.json() as BailianResponse;
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## 四、AI 供应商技术细节

### 4.1 百炼 DashScope OpenAI 兼容接口

```
Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
Auth:     Authorization: Bearer {BAILIAN_API_KEY}
Endpoint: POST /chat/completions
```

**多图 Vision 消息格式（OQ4 解决方案）**:
```json
{
  "model": "qwen3-vl-plus",
  "messages": [
    {
      "role": "system",
      "content": "..."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,{base64_data_1}"
          }
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,{base64_data_2}"
          }
        },
        {
          "type": "text",
          "text": "以上是同一份菜单的不同页面，请分析并输出 JSON。\n当前时间：{timestamp}\n用户语言：{language}"
        }
      ]
    }
  ],
  "response_format": { "type": "json_object" }
}
```

### 4.2 模型规格参考

| 模型 | 用途 | Context 窗口 | 图片限制 |
|------|------|-------------|---------|
| `qwen3-vl-plus` | 菜单识别主力 | 128K tokens | 最多 10 张/次 |
| `qwen3-vl-flash` | 识别降级 | 128K tokens | 最多 10 张/次 |
| `qwen3.5-plus` | 对话主力 | 128K tokens | 不支持图片 |
| `qwen3.5-flash` | 轻量判断 | 32K tokens | 不支持图片 |

> **注**: 模型名称以百炼官方文档为准，上述名称如与官方不符请以实际可用名称替换，并更新 `ARCHITECTURE.md` 和本文档。

---

## 五、测试技术栈

### 5.1 Vitest（单元 + 组件测试）

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 70,
        branches: 70,
      },
    },
  },
});
```

### 5.2 Playwright（E2E 测试）

- 目标：覆盖 Path A 核心链路（扫描 → 识别 → 对话 → 点餐）
- 运行环境：CI（GitHub Actions）
- Mock：用 Playwright 的 `route` 拦截 `/api/*` 调用，返回 fixture 数据

---

## 六、开发工具规范

### 6.1 ESLint 配置

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "no-console": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

### 6.2 Git 提交规范

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试
chore: 构建/工具链
```

### 6.3 包管理器：pnpm

```bash
# 安装
pnpm install

# 开发
pnpm dev          # Vite 开发服务器
pnpm worker:dev   # Wrangler 本地 Worker

# 构建
pnpm build        # 前端构建
pnpm worker:deploy # Worker 部署

# 测试
pnpm test         # Vitest 单元测试
pnpm test:e2e     # Playwright E2E 测试
```

---

## 七、浏览器兼容性目标

| 浏览器 | 最低版本 | 说明 |
|--------|---------|------|
| Safari iOS | 16.0+ | 主要目标（旅行者使用 iPhone）|
| Chrome Android | 110+ | 主要目标 |
| Chrome Desktop | 110+ | 开发调试 |
| Safari macOS | 16.0+ | 开发调试 |
| Firefox | 不保证 | 非目标（旅行场景极少使用）|

**关键 API 兼容性检查**:
- `navigator.mediaDevices.getUserMedia` - 拍照（iOS 16+ ✅）
- `navigator.geolocation` - GPS（iOS 16+ ✅）
- `navigator.wakeLock` - 展示模式屏幕常亮（iOS 16.4+ ✅）
- `localStorage` - 偏好存储（全平台 ✅）

---

*文档版本 v1.0，由 SAGE Agent 起草，Mr. Xia 确认后生效。*
