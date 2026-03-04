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
| 质量门控 | `docs/engineering-guardrails.md` | 三级门控 + Git hooks + deploy 脚本 |
| 审查方法论 | `docs/quality-review-methodology.md` | 2+1 审查模式 |

### 产品 & 设计
| 主题 | 文件 | 一句话 |
|------|------|--------|
| 产品愿景 | `docs/vision.md` | SAGE 是什么、为谁做、核心价值 |
| 功能规格 | `docs/prd.md` | F01-F13 功能定义 + 验收标准 |
| 导航架构 | `docs/navigation-spec.md` | Home→Scanner→Chat 中枢 |
| UX 原则 | `docs/ux-principles.md` | Duolingo 风格交互设计 |
| 视觉设计 | `docs/visual-design.md` | 品牌色 #6366F1、字体、布局 |

### 技术
| 主题 | 文件 | 一句话 |
|------|------|--------|
| 技术栈 | `docs/tech-stack.md` | Vite+React+Tailwind / CF Workers / Gemini+百炼 |
| 系统架构 | `docs/architecture.md` | 前后端分层、数据流 |
| API 设计 | `docs/api-design.md` | 接口契约 v3.0 |
| 部署 | `docs/deployment.md` | Cloudflare Pages + Workers |

### 功能规格 (specs/)
| 主题 | 文件 |
|------|------|
| 核心流程 | `specs/core-loop-s1-first-visit.md` |
| MealPlan & Order | `specs/mealplan-and-order-spec.md` |
| Waiter 模式 | `specs/waiter-upgrade-spec.md` |
| 更多... | `specs/README.md` (索引) |

---

## 项目结构速查

```
app/                    # Vite + React 前端
├── src/views/          # 页面组件
├── src/utils/          # 工具函数（含 processAIResponse 纯函数）
├── src/components/     # UI 组件
└── tests/e2e/          # Playwright E2E

worker/                 # Cloudflare Workers API
├── handlers/           # 路由处理
├── prompts/            # AI Prompt（变更需 Before/After）
└── schemas/            # Zod schema

shared/types.ts         # 前后端共享类型（唯一权威）
```

---

## 当前 Sprint

**Sprint 4a: 工程治理改革**（2026-03-04）
- [x] Git hooks 硬门控
- [x] Deploy 门控脚本
- [x] processAIResponse 纯函数提取
- [x] AGENTS.md 重构
- [ ] Prompt 工程化 + 日常质量扫描

---

## Git 约定

- Conventional Commits: `feat:` / `fix:` / `refactor:` / `docs:` / `test:`
- `fix:` 必须带 `.test.` 文件（hook 强制）
- `worker/prompts/` 变更必须带 `Before:` / `After:` 行（hook 强制）
- 安装 hooks: `bash setup-hooks.sh`
