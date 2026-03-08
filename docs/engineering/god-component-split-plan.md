# God Component 拆分方案

> **创建时间**: 2026-03-09
> **计划 Sprint**: Sprint 5
> **来源**: 技术债清理 cron 任务评估

---

## 1. AgentChatView.tsx (1163 行)

### 当前结构分析

```
AgentChatView (1163行)
├── 工具函数 (文件顶层)
│   ├── pickMimeType()
│   └── buildSelectedDishesSystemMessage()
├── 状态管理 (useState x ~15 + useRef x ~8)
├── 语音录音逻辑 (~120行)
│   ├── cleanupRecording()
│   ├── releaseMic()
│   ├── handleVoicePointerDown/Move/Up()
├── AI 通信核心 (~180行)
│   └── sendToAI()
├── 用户交互处理 (~80行)
│   ├── handleSend()
│   ├── handleQuickReply()
│   ├── handleKeyDown()
│   └── handleAddToOrder()
└── JSX 渲染 (~400行)
    ├── 进度条区域
    ├── 消息列表区域
    └── 输入栏区域
```

### 拆分方案

#### 方案 A：Hook 提取（推荐，风险最低）

| 新文件 | 内容 | 预估行数 |
|--------|------|---------|
| hooks/useVoiceRecorder.ts (待创建) | MediaRecorder 状态、pointer 事件处理、音频上传 | ~150行 |
| hooks/useChatAI.ts (待创建) | sendToAI、streaming 状态、processAIResponse 调用 | ~200行 |
| hooks/useMealPlanState.ts (待创建) | mealPlans 状态、MealPlanCard 数据管理 | ~80行 |
| `AgentChatView.tsx` (瘦身后) | 组装 hooks + JSX 渲染 | ~600行 |

**优先提取**: `useVoiceRecorder` — 内聚性强，边界清晰，无副作用渗透

#### 方案 B：子组件提取（可配合 A）

| 新文件 | 内容 | 前提条件 |
|--------|------|---------|
| components/ChatInputBar.tsx (待创建) | 输入框 + 语音按钮 + 发送按钮 | useVoiceRecorder 已提取 |
| components/ChatMessageList.tsx (待创建) | 消息列表渲染 + MealPlanCard 集成 | props 接口设计清晰 |

### 实施顺序

1. 提取 `useVoiceRecorder` hook（独立、可测试）
2. 提取 `useChatAI` hook（核心逻辑，需仔细测试）
3. 提取 `ChatInputBar` 组件（依赖 useVoiceRecorder）
4. 最终 AgentChatView 降至 ~500 行

### 风险点

- `sendToAI` 依赖大量 state，提取为 hook 需传入 dispatch
- 语音录制的 refs（mediaRecorderRef 等）与 UI 状态耦合较深
- 建议：提取前先写 E2E 测试覆盖录音→发送→AI响应完整流程

---

## 2. worker/handlers/analyze.ts (597 行)

### 当前结构分析

```
analyze.ts (597行)
├── 纯工具函数 (~100行)
│   ├── estimateBase64Bytes()
│   ├── extractJson()
│   ├── toAnalyzeErrorPayload()
│   ├── toSSE()
│   ├── arrayBufferToBase64()
│   ├── randId()
│   └── parsePrice()
├── 归一化逻辑 (140~253行)
│   └── normalizeLooseResult() (~110行)
├── 请求解析 (254~301行)
│   └── parseAnalyzeRequest()
├── 分析 Pipeline (302~end)
│   └── runAnalyzePipeline() (~290行)
└── 导出入口 handleAnalyze()
```

### 拆分方案

| 新文件 | 内容 | 预估行数 |
|--------|------|---------|
| worker/utils/analyzeHelpers.ts (待创建) | estimateBase64Bytes, extractJson, toSSE, arrayBufferToBase64, randId, parsePrice | ~100行 |
| worker/utils/normalizeResult.ts (待创建) | normalizeLooseResult 及相关类型 | ~120行 |
| `worker/handlers/analyze.ts` (瘦身) | parseAnalyzeRequest + runAnalyzePipeline + handleAnalyze | ~350行 |

**注意**: analyze.ts 已在 `.lint-ignore` 豁免，优先级低于 AgentChatView

### 实施顺序

1. 提取 `analyzeHelpers.ts`（纯函数，零风险）
2. 提取 `normalizeResult.ts`（有单元测试覆盖后再做）
3. analyze.ts 降至 ~350 行

---

## 执行时机

- **Sprint 5 启动前确认**: 需夏总拍板是否纳入 Sprint 5
- **优先级**: `useVoiceRecorder` > `analyzeHelpers` > 其他
- **门控**: 拆分后所有现有测试必须通过，E2E 冒烟不回归
