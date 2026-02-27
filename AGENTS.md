# AGENTS.md — AI Agent 工作手册

> 每个 Agent（Codex、Claude Code、或任何 coding agent）在开始任何工作前必须完整阅读本文件。  
> 本文件是所有 Agent 的行为基准和上下文入口。

---

## 0. 研发方法论：Spec-Driven + Test-Driven

### 核心理念

**先定义「是什么」（Spec），再定义「怎么验」（Test），最后才写「怎么实现」（Code）。**

```
Spec（规格） → Test（测试） → Code（实现）
```

### 基本原则

1. **规格先行** — 每个功能开发前，先产出明确的规格文档，存放在 `specs/` 目录
2. **测试护航** — 规格确定后，先写测试（或测试骨架），再写实现
3. **质量为纲** — 粒度不做一刀切，唯一标准是高质量交付符合预期的结果

### 规格层次

| 层次 | 规格形式 | 测试形式 |
|------|---------|---------|
| 产品层 | PRD / User Story + 验收标准 | E2E 场景测试 |
| API 层 | 接口契约 / OpenAPI | 契约测试 + 集成测试 |
| 模块层 | 函数签名 + 行为描述 | 单元测试 |

### AI 辅助策略

- ✅ 允许从 spec 自动生成测试骨架
- ✅ 允许从 spec + test 直接实现代码
- AI 生成的所有产出仍需满足规格和测试要求

### 工作流

```
1. 需求对齐 → 明确要做什么、为谁做、价值是什么
2. 撰写 Spec → 存入 specs/，明确输入/输出/边界/验收标准
3. 编写测试 → 基于 spec 写测试（AI 可辅助生成骨架）
4. 实现代码 → 让测试通过（AI 可辅助实现）
5. 验证交付 → 测试全绿 + 人工验收
6. 复盘沉淀 → 更新方法论和最佳实践
```

---

## 1. 每次任务开始前（必做 Checklist）

### 1.1 理解当前状态
1. `cat PROGRESS.md` — 当前进展
2. `cat PLANNING.md` — 当前 Sprint 任务和优先级

### 1.2 理解要做什么（规格驱动）
3. `cat docs/prd.md` — 找到本次任务涉及的功能编号（F01-F10），阅读其 AC（验收标准）
4. `cat docs/api-design.md` — 找到本次任务涉及的 API 端点，阅读请求/响应 schema
5. `cat shared/types.ts` — 权威类型定义，代码必须与此文件一致

### 1.3 理解上下文约束
6. `cat DECISIONS.md` — 所有已决策项（特别是 DEC-026~030）

**不要重复做已完成的工作。不要在不了解当前状态和规格的情况下开始写代码。**

---

## 2. 项目一句话定位

SAGE 是一个**餐饮智能体（Dining Agent）**。核心价值：用户拍菜单 → AI 感知场景 → 对话推荐 → 30 秒完成点餐决策。

详见 `docs/vision.md`。

---

## 3. 核心设计哲学（禁止违反）

| 原则 | 含义 | 禁止行为 |
|------|------|---------|
| **Goal > Process** | 只设终极目标，流程由 AI 动态生成 | ❌ 写死业务逻辑树和 if-else 场景分支 |
| **Scenario-Free** | 不给用户贴标签 | ❌ 预设"急行军/探索者/避雷针"等 Persona |
| **感知层优先** | 传 Context，不做判断 | ❌ 在代码层做推荐决策，应交给 LLM |
| **Conversation-First** | 对话驱动，列表是辅助 | ❌ 以列表/卡片为主界面 |

---

## 4. 项目目录结构

```
SAGE_Next_Gen/
├── AGENTS.md              # 本文件（Agent 必读，Codex/Claude Code 自动加载）
├── README.md              # 人类文档
├── PLANNING.md            # 工作计划 & Sprint
├── PROGRESS.md            # 实时进展（每完成一项立即更新）
├── DECISIONS.md           # 重要决策记录（仅追加，不修改历史）
├── specs/                 # ⭐ 功能规格文档（Spec-Driven 的载体）
├── docs/                  # 产品 + 技术文档
│   ├── vision.md          # 产品战略
│   ├── prd.md             # ⭐ 功能规格 + 验收标准
│   ├── user-stories.md    # 用户故事
│   ├── api-design.md      # ⭐ API 契约（请求/响应 schema）
│   ├── architecture.md    # 技术架构
│   ├── tech-stack.md      # 技术栈
│   ├── deployment.md      # 部署方案
│   ├── ux-principles.md   # UX 原则
│   └── visual-design.md   # 视觉设计
├── shared/                # ⭐ 前后端共享类型（唯一权威）
│   └── types.ts
├── app/                   # 前端应用（Vite + React）
├── worker/                # Cloudflare Worker API
├── tests/                 # 测试
│   ├── test-plan.md
│   ├── test-cases.md
│   └── prompt-lab/        # AI Prompt 测试
└── archive/               # 历史文件归档（不再活跃）
```

---

## 5. 常用命令

```bash
# 前端开发
cd app
pnpm install
pnpm dev          # 启动 dev server，默认 http://localhost:5173
pnpm build        # 必须零 TS 错误、零 build 警告才算通过
pnpm preview      # 预览 build 产物

# Worker 开发
cd worker
npx wrangler dev  # 启动本地 Worker，默认 http://localhost:8787

# 类型检查（从项目根运行）
cd app && npx tsc --noEmit    # 前端类型检查
cd worker && npx tsc --noEmit  # Worker 类型检查
```

---

## 6. 技术栈约定

| 层 | 技术 | 注意事项 |
|----|------|---------|
| 前端框架 | Vite + React + TypeScript | 严格 TypeScript，禁止 `any` |
| 样式 | Tailwind CSS v4 | v4 不读 tailwind.config.js，用 CSS `@theme` 配置 |
| 状态管理 | React hooks（useState/useReducer/Context） | 不引入 Redux/Zustand，保持简单 |
| API 层 | Cloudflare Workers | 所有 AI API Key 只在 Worker 端，禁止前端暴露 |
| AI 模型 | 阿里云百炼 DashScope（Qwen3 系列）| 所有调用必须 `enable_thinking: false`（DEC-028）|
| 共享类型 | `shared/types.ts` | 前后端都 import，禁止重复定义 |

### Tailwind CSS v4 配置方式
```css
/* 正确方式 */
@import "tailwindcss";
@theme {
  --color-brand: #6366F1;
  --color-brand-dark: #4F46E5;
}

/* ❌ 错误方式（v4 不生效） */
/* tailwind.config.js 中的 extend.colors */
```

---

## 7. 安全约定（红线）

- **❌ 禁止**将任何 API Key 写入前端代码或 git 仓库
- **❌ 禁止** console.log 残留在 production 代码
- **❌ 禁止** `any` 类型（TypeScript 严格模式）
- **✅ 必须** 所有外部 API 调用通过 Cloudflare Worker 代理
- **✅ 必须** 用 `zod` 做运行时 JSON 校验（LLM 返回数据不可信）

---

## 8. 质量标准（三级门控）⭐⭐⭐

### Level 1：编译（必过）
- [ ] `tsc --noEmit` 零错误（前端 + Worker 都要检查）
- [ ] `pnpm build` 成功，零警告
- [ ] 无 `any`、无多余的 `console.log`

### Level 2：契约一致性（必过）
- [ ] 前端 API 调用的 request body 类型从 `shared/types.ts` 导入
- [ ] 前端 API 调用的 response 解析类型从 `shared/types.ts` 导入
- [ ] `grep` 验证关键字段存在：
  ```bash
  # 示例：确认 preferences 传递了 restrictions 结构体
  grep -n "restrictions" src/api/chat.ts
  # 示例：确认 analyze 请求有 context.language
  grep -n "language" src/api/analyze.ts
  ```
- [ ] Worker Zod schema 的 `z.infer<>` 结果与 `shared/types.ts` 兼容

### Level 3：行为正确性（必过）
- [ ] **状态机完整性**：每个 `chatPhase` 值有进入条件 + 正常退出 + 异常退出（→ failed）
  ```bash
  grep -n "chatPhase\|SET_CHAT_PHASE\|ChatPhase" src/context/AppContext.tsx
  ```
- [ ] **错误恢复路径**：每个 `failed` 态有用户可操作的恢复按钮
- [ ] **PRD AC 逐条确认**：对照 PRD 中相关功能的 AC 列表，每条都能在代码中找到对应实现
- [ ] **主路径 trace**：手动 trace 状态转换 `home → scanner → chat(pre_chat) → chat(handing_off) → chat(chatting) → order → waiter`，确认无断裂

---

## 8.1 强制 Codex 审计（DEC-029）

**规则：Claude Code 完成任何任务后，必须立即触发 Codex 审计，无例外。**

### 审计流程

```
Claude Code 完成 → Level 1-3 自检 → Codex 审计 → 修复问题 → git commit
                                         ↑
                                  不得跳过此步
```

### Codex 审计 SOP

**Step 1**：写 `AUDIT_TASK.md`：

```bash
cat > AUDIT_TASK.md << 'ENDAUDIT'
你是资深工程师，审计刚完成的代码变更。

## 变更内容
[描述本次变更]

## 审计要求（全部必检）
1. **PRD AC 对照**：列出本次涉及的 PRD 功能编号，逐条检查 AC 是否实现
2. **前后端契约**：对比 `shared/types.ts` 类型定义与实际代码使用是否一致
3. **状态机完整性**：检查 AppContext reducer 的状态转换图，是否有死路或无限循环
4. **错误处理**：每个 API 调用是否有 error path，error path 是否有用户可见的恢复 UI
5. **文档同步**：PROGRESS.md / EXECUTION_STATE.md 是否与代码一致

## 输出
将审计报告写入 AUDIT_[任务名]_[日期].md，格式：
🔴 严重 / 🟡 中等 / 🟢 轻微 / ✅ 优秀
每项含：位置 + PRD AC 编号 + 影响 + 修复建议

完成后输出：AUDIT_DONE
ENDAUDIT
```

**Step 2**：启动 Codex（在有 git repo 的目录执行）：

```bash
cat AUDIT_TASK.md | codex exec --full-auto
```

**Step 3**：必须修复所有 🔴 严重问题，🟡 中等问题原则上也修复。

**Step 4**：修复完成后再 git commit（commit message 注明"经 Codex 审计"）。

---

## 9. 前后端契约规则（红线）⭐⭐⭐

### 9.1 唯一类型源

```
shared/types.ts  ← 唯一权威
     ↑ import              ↑ import
app/src/types/index.ts    worker/schemas/*.ts
(re-export + 加 UI 类型)  (Zod 运行时校验，z.infer<> 必须兼容)
```

### 9.2 禁止行为

- ❌ 在 `app/src/types/index.ts` 重新定义 `MenuItem`、`MenuData`、`ChatRequest` 等已在 shared 中定义的接口
- ❌ 在 TASK.md 中内联 API schema（应写"参照 `shared/types.ts` 的 `ChatRequest` 接口"）
- ❌ 凭记忆/猜测 API 字段名，必须先 `cat shared/types.ts` 确认

### 9.3 新增字段流程

```
1. 修改 shared/types.ts
2. 运行 tsc --noEmit（前端 + Worker 都要跑）→ 编译错误暴露所有影响点
3. 修复所有影响点
4. 更新 API_DESIGN.md 对应章节
```

---

## 10. 记忆与状态管理约定

### Agent 工作时必须遵守：
1. **读先于写** — 每次开始工作前先读 §0 清单
2. **完成即更新** — 每完成一个任务，立即更新 `PROGRESS.md`
3. **决策即记录** — 做了重要技术/产品决策，立即追加到 `DECISIONS.md`
4. **禁止私有记忆** — 不得将项目信息只存在 Agent 自己的 MEMORY.md，必须写入本项目目录

---

## 11. Multi-Agent 协作协议

当多个 Agent 并行工作时：

```
主 Agent（SAGE）     — 产品决策、任务分发、进度汇总
子 Agent A           — 具体模块实现（如前端）
子 Agent B           — 具体模块实现（如 API）
子 Agent C（QA）     — 独立测试，不由开发 Agent 自测
```

**文件锁定约定**（防冲突）：
- 每个 Agent 在 `PROGRESS.md` 的"进行中"部分声明自己正在处理的文件
- 其他 Agent 看到文件已被声明则等待或选择其他任务
- 完成后解除声明，更新状态为"已完成"

---

## 12. 里程碑定义

| 里程碑 | 定义 | 验收标准 |
|--------|------|---------|
| **M1: 文档完备** | 所有文档层（01-04）完成 | 能给新 Agent 阅读后独立执行 |
| **M2: MVP Alpha** | 拍菜单→对话流程跑通 | 真机可用，无 P0 Bug |
| **M3: MVP Beta** | 4+1 感知全部接入 | 通过完整测试矩阵 |
| **M4: 公测上线** | Cloudflare 正式部署 | 性能、安全双达标 |

---

## 13. 沟通规范

- 里程碑完成时，主动向 Mr. Xia 推送进度（通过 OpenClaw 消息）
- 遇到阻塞（无法独立解决）时立即上报，不要卡着不动
- 非阻塞的决策可自主执行，事后在 `DECISIONS.md` 记录
- 日常不要问"我可以开始了吗"，收到任务就执行
