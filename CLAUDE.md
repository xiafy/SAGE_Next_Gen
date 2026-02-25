# CLAUDE.md — AI Agent 工作手册

> 每个 Agent 在开始任何工作前必须完整阅读本文件。  
> 本文件是所有 Agent 的行为基准和上下文入口。

---

## 0. 项目状态速查

在开始工作前，先读这两个文件：
1. `PROGRESS.md` — 当前进展、哪些完成、哪些进行中、哪些待开始
2. `PLANNING.md` — 当前 Sprint 任务和优先级

**不要重复做已完成的工作。不要在不了解当前状态的情况下开始写代码。**

---

## 1. 项目一句话定位

SAGE 是一个**餐饮智能体（Dining Agent）**。核心价值：用户拍菜单 → AI 感知场景 → 对话推荐 → 30 秒完成点餐决策。

详见 `01_strategy/VISION.md`。

---

## 2. 核心设计哲学（禁止违反）

| 原则 | 含义 | 禁止行为 |
|------|------|---------|
| **Goal > Process** | 只设终极目标，流程由 AI 动态生成 | ❌ 写死业务逻辑树和 if-else 场景分支 |
| **Scenario-Free** | 不给用户贴标签 | ❌ 预设"急行军/探索者/避雷针"等 Persona |
| **感知层优先** | 传 Context，不做判断 | ❌ 在代码层做推荐决策，应交给 LLM |
| **Conversation-First** | 对话驱动，列表是辅助 | ❌ 以列表/卡片为主界面 |

---

## 3. 项目目录结构

```
SAGE_Next_Gen/
├── README.md              # 人类文档
├── CLAUDE.md              # 本文件（Agent 必读）
├── PLANNING.md            # 工作计划 & Sprint
├── PROGRESS.md            # 实时进展（每完成一项立即更新）
├── DECISIONS.md           # 重要决策记录（仅追加，不修改历史）
├── 01_strategy/           # 产品战略层
│   └── VISION.md
├── 02_product/            # 产品需求层
│   ├── PRD.md
│   └── USER_STORIES.md
├── 03_design/             # 设计规范层
│   ├── UX_PRINCIPLES.md
│   └── VISUAL_DESIGN.md
├── 04_technical/          # 技术方案层
│   ├── ARCHITECTURE.md
│   ├── API_DESIGN.md
│   └── DEPLOYMENT.md
├── 05_implementation/     # 代码实现
│   └── app/               # 前端应用
└── 06_testing/            # 测试
    ├── TEST_PLAN.md
    ├── TEST_CASES.md
    └── reports/           # QA 报告（按日期命名）
```

---

## 4. 常用命令

```bash
# 开发
cd 05_implementation/app
pnpm install
pnpm dev          # 启动 dev server，默认 http://localhost:5173

# 构建
pnpm build        # 必须零 TS 错误、零 build 警告才算通过
pnpm preview      # 预览 build 产物

# 测试
pnpm test         # 运行所有测试
pnpm test:watch   # 监听模式

# 代码检查
pnpm lint
pnpm typecheck    # tsc --noEmit
```

---

## 5. 技术栈约定

| 层 | 技术 | 注意事项 |
|----|------|---------|
| 前端框架 | Vite + React + TypeScript | 严格 TypeScript，禁止 `any` |
| 样式 | Tailwind CSS v4 | v4 不读 tailwind.config.js，用 CSS `@theme` 配置 |
| 状态管理 | React hooks（useState/useReducer/Context） | 不引入 Redux/Zustand，保持简单 |
| API 层 | Cloudflare Workers | 所有 AI API Key 只在 Worker 端，禁止前端暴露 |
| AI 模型 | 见下方模型策略 | Gemini 全系列已废弃 |

### 模型使用策略
| 场景 | 模型 |
|------|------|
| 架构设计 / 复杂逻辑 | `anthropic/claude-opus-4-6` |
| 日常对话 / 功能实现 | `anthropic/claude-sonnet-4-6` |
| 轻量任务 | `fireworks/glm-5` 或 `fireworks/kimi-k2p5` |
| ⚠️ 禁用 | Google Gemini 全系列（严重限速） |

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

## 6. 安全约定（红线）

- **❌ 禁止**将任何 API Key 写入前端代码或 git 仓库
- **❌ 禁止** console.log 残留在 production 代码
- **❌ 禁止** `any` 类型（TypeScript 严格模式）
- **✅ 必须** 所有外部 API 调用通过 Cloudflare Worker 代理
- **✅ 必须** 用 `zod` 做运行时 JSON 校验（LLM 返回数据不可信）

---

## 7. 代码质量标准

完成任何代码任务后，必须满足：
- [ ] `pnpm build` 零错误、零警告
- [ ] `pnpm typecheck` 零错误
- [ ] `pnpm test` 全部通过
- [ ] 无 `any`、无 `// TODO`（临时 TODO 需开 issue 跟踪）
- [ ] 无多余的 `console.log`

---

## 8. 记忆与状态管理约定

### Agent 工作时必须遵守：
1. **读先于写** — 每次开始工作前先读 `PROGRESS.md` 和 `PLANNING.md`
2. **完成即更新** — 每完成一个任务，立即更新 `PROGRESS.md`
3. **决策即记录** — 做了重要技术/产品决策，立即追加到 `DECISIONS.md`
4. **禁止私有记忆** — 不得将项目信息只存在 Agent 自己的 MEMORY.md，必须写入本项目目录

### 为什么这很重要：
- 防止上下文过载导致记忆丢失
- 支持多 Agent 分工协作（任何 Agent 接手都能快速上下文）
- 支持人工审查和介入

---

## 9. Multi-Agent 协作协议

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

## 10. 里程碑定义

| 里程碑 | 定义 | 验收标准 |
|--------|------|---------|
| **M1: 文档完备** | 所有文档层（01-04）完成 | 能给新 Agent 阅读后独立执行 |
| **M2: MVP Alpha** | 拍菜单→对话流程跑通 | 真机可用，无 P0 Bug |
| **M3: MVP Beta** | 4+1 感知全部接入 | 通过完整测试矩阵 |
| **M4: 公测上线** | Cloudflare 正式部署 | 性能、安全双达标 |

---

## 11. 沟通规范

- 里程碑完成时，主动向 Mr. Xia 推送进度（通过 OpenClaw 消息）
- 遇到阻塞（无法独立解决）时立即上报，不要卡着不动
- 非阻塞的决策可自主执行，事后在 `DECISIONS.md` 记录
- 日常不要问"我可以开始了吗"，收到任务就执行
