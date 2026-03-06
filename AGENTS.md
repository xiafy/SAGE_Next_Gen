# AGENTS.md — AI Agent 工作手册

> 本文件是所有 Agent（Codex、Claude Code 等）的入口。保持精简——详细规则在 docs/ 下。
> 最后更新: 2026-03-04

---

## 铁律（不可违反）

1. **不通过 pre-commit hook 的代码不允许提交** — `.githooks/pre-commit` 强制 tsc + vitest
2. **不通过 deploy 门控的代码不允许上线** — `scripts/deploy.sh` 强制编译→测试→构建→部署
3. **Prompt 变更必须附带 Before:/After:** — `.githooks/commit-msg` 机械化强制
4. **fix: commit 必须关联测试文件** — `.githooks/commit-msg` 机械化强制

这些规则不靠自觉，靠工具。绕不过去。

---

## 知识地图

按需查阅，不需要全部读完。

### 研发流程
| 主题 | 文件 | 一句话 |
|------|------|--------|
| 研发方法论 | `docs/engineering/spec-driven-workflow.md` | Spec → Test → Code，先定义再实现 |
| 交叉审查 | `docs/engineering/cross-review-workflow.md` | 四步交叉：设计→审查→编码→审查 |
| 质量门控 | `docs/engineering/engineering-guardrails.md` | 三级门控 + Git hooks + deploy 脚本 |
| 审查方法论 | `docs/engineering/quality-review-methodology.md` | 2+1 审查模式 |

### 产品 & 设计
| 主题 | 文件 | 一句话 |
|------|------|--------|
| 产品愿景 | `docs/product/vision.md` | SAGE 是什么、为谁做、核心价值 |
| 功能规格 | `docs/product/prd.md` | F01-F13 功能定义 + 验收标准 |
| 导航架构 | `docs/product/navigation-spec.md` | Home→Scanner→Chat 中枢 |
| UX 原则 | `docs/product/ux-principles.md` | Duolingo 风格交互设计 |
| 视觉设计 | `docs/product/visual-design.md` | 品牌色 #6366F1、字体、布局 |

### 技术
| 主题 | 文件 | 一句话 |
|------|------|--------|
| 技术栈 | `docs/technical/tech-stack.md` | Vite+React+Tailwind / CF Workers / Gemini+百炼 |
| 系统架构 | `docs/technical/architecture.md` | 前后端分层、数据流 |
| API 设计 | `docs/technical/api-design.md` | 接口契约 v3.0 |
| 部署 | `docs/technical/deployment.md` | Cloudflare Pages + Workers |

### 测试
| 主题 | 文件 | 一句话 |
|------|------|--------|
| 测试计划 | `tests/test-plan.md` | 5 层测试策略 |
| 测试用例 | `tests/test-cases.md` | 60+ 用例，L1-L5 |
| E2E | `app/tests/e2e/` | Playwright 冒烟测试 |

### 功能规格 (specs/)
| 主题 | 文件 |
|------|------|
| 核心流程 | `specs/core-loop-s1-first-visit.md` |
| MealPlan & Order | `specs/mealplan-and-order-spec.md` |
| Waiter 模式 | `specs/waiter-upgrade-spec.md` |
| 更多... | `specs/README.md` (索引) |

---

## 项目结构

```
.
├── AGENTS.md              # Agent 工作手册（入口）
├── TASK_TEMPLATE_IMPL.md  # 实现任务模板（DEC-076）
├── TASK_TEMPLATE_TEST.md  # 测试任务模板（DEC-076）
├── PLANNING.md / PROGRESS.md / DECISIONS.md
│
├── docs/
│   ├── product/           # 产品设计（vision, prd, ux, navigation...）
│   ├── technical/         # 技术架构（architecture, api-design...）
│   ├── engineering/       # 工程流程（hooks, review, quality...）
│   └── gtm/               # Go-to-Market
│
├── specs/                 # 功能 Spec（PRD 的执行细则）
├── tests/                 # 测试计划 + 夹具
├── scripts/               # 构建/部署/检查脚本
│
├── app/                   # Vite + React 前端
│   ├── src/views/         # 页面组件
│   ├── src/utils/         # 工具函数（含 processAIResponse）
│   └── src/components/    # UI 组件
├── worker/                # Cloudflare Workers API
│   ├── handlers/          # 路由处理
│   ├── prompts/           # AI Prompt（变更需 Before/After）
│   └── schemas/           # Zod schema
├── shared/types.ts        # 前后端共享类型（唯一权威）
└── archive/               # 已完成的任务/报告（只读）
```

---

## 常用命令

```bash
cd app && npm run dev          # 前端开发服务器 (localhost:5173)
cd worker && npx wrangler dev  # Worker 本地开发 (localhost:8787)
cd app && npx vitest run       # 跑测试
bash scripts/deploy.sh app      # 部署前端
bash scripts/deploy.sh worker   # 部署 Worker
```

---

## 当前 Sprint

**Sprint 4a: 工程治理改革**（2026-03-04）
- [x] Git hooks 硬门控
- [x] Deploy 门控脚本
- [x] processAIResponse 纯函数提取
- [x] AGENTS.md 重构
- [x] Prompt 工程化 + 日常质量扫描

---

## Git 约定

- Conventional Commits: `feat:` / `fix:` / `refactor:` / `docs:` / `test:`
- `fix:` 必须带 `.test.` 文件（hook 强制）
- `worker/prompts/` 变更必须带 `Before:` / `After:` 行（hook 强制）
- 安装 hooks: `bash setup-hooks.sh`

---

## AI 发现漏洞时的行为协议

Spec 或需求中发现歧义、遗漏、矛盾时，按以下分级处理：

| 级别 | 判断条件 | 行为 | 标注 |
|------|---------|------|------|
| **L1 自行决定** | 技术实现细节、有行业惯例、可逆 | 做假设，继续推进 | `[假设: 理由]` |
| **L2 建议+执行** | 影响中等、有合理方案、不涉及商业判断 | 给出方案和理由，继续推进，等审阅确认 | `[待确认: 方案+理由]` |
| **L3 必须问人** | 商业规则、不可逆、无法判断优劣 | 停下来，带选项提结构化问题 | 不写入文档，直接问 |

**规则：**
- L1 假设必须在文档中用 `[假设]` 显式标注，不能悄悄做了不说
- 审阅时一眼可见所有假设点
- 前置消歧优于中途打断 — 写 Spec 时就暴露歧义，不留到编码时
