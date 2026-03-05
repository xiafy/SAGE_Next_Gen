# SAGE — 餐饮智能体

> **让 AI 陪你在陌生的餐桌前做出最好的决定。**  
> Dining Agent for global travelers · 解决语言障碍 · 替你做点餐决策

---

## 产品愿景

全球旅行者在陌生餐厅——语言不通、菜单看不懂、不知道点什么。SAGE 是那个帮你翻译菜单、搭配方案、最后帮你跟服务员沟通的 AI 智能体。

**目标用户**：出境旅行的中文 / 英文母语用户（MVP）

---

## 核心特性

| 功能 | 说明 |
|------|------|
| 📷 **拍菜单即开聊** | 扫描菜单 → AI 识别翻译 → 直接进入对话 |
| 🤖 **方案型推荐** | AI 输出完整用餐方案（前菜→主菜→甜品→饮品），一键加入订单 |
| 🔄 **对话改菜** | "把这道换成别的" → AI 替换并更新方案 |
| 🌿 **探索单道菜** | 深入了解味道 / 食材 / 文化背景，支持注入 Chat 继续咨询 |
| 🗣️ **Waiter 沟通面板** | 9 语言大字显示，指点式跟服务员沟通（售罄 / 换菜 / 加份 / 其他） |
| ⚠️ **过敏原三层防护** | AI 硬过滤 + Waiter 入口确认（uncertain 区分）+ 服务员展示 Banner |
| 🧠 **4+1 维感知** | 视觉 + GPS + 时间 + 天气 + 历史记忆，推荐符合当下场景 |
| 🎤 **语音输入** | 按住说话（PTT），支持中英文转写 |

---

## 线上地址

| 组件 | URL | 状态 |
|------|-----|------|
| **App** | https://sage-next-gen.pages.dev | ✅ 运行中 |
| **Worker API** | https://sage-worker.xiafy920.workers.dev | ✅ 运行中 |

---

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | Vite + React + TypeScript + Tailwind CSS v4 | Cloudflare Pages 部署 |
| 后端 | Cloudflare Workers | 东京节点 |
| AI 识别 | Gemini 2.0 Flash | VL 识别 ~8s |
| AI 对话 | 阿里云百炼 Qwen3.5-Plus/Flash | Chat 主模型 |
| AI Fallback | 百炼国际站（新加坡）| Gemini 不可用时自动切换 |

---

## 项目结构

```
SAGE_Next_Gen/
├── app/                      # Vite + React 前端
│   ├── src/
│   │   ├── views/            # Home / Scanner / Chat / Explore / Order / Waiter
│   │   ├── components/       # MealPlanCard / AllergenWarningSheet / DishCommunicationPanel 等
│   │   ├── context/          # AppContext（全局状态机，单一数据源）
│   │   └── utils/            # streamJsonParser / localLanguage / formatPrice
│   └── src/**/__tests__/     # 175 条测试（单元 + 组件 + 集成）+ 14 E2E
├── worker/                   # Cloudflare Workers API
│   ├── handlers/             # analyze / chat
│   ├── prompts/              # AI Prompt
│   └── utils/                # gemini / bailian / allergenMapping
├── shared/
│   └── types.ts              # ⭐ 前后端共享类型（唯一权威）
├── docs/                     # 产品 + 技术文档
│   ├── vision.md             # 产品愿景（v1.3）
│   ├── prd.md                # PRD（v2.0）
│   └── api-design.md         # API 契约
├── specs/                    # 功能 Spec
│   ├── mealplan-and-order-spec.md
│   ├── explore-chat-injection-spec.md
│   └── waiter-upgrade-spec.md
├── .sage/                    # 🤖 Agent Swarm 基建（DEC-075）
│   ├── worktree.sh           # git worktree 并行管理（创建/清理/列表）
│   ├── task-manager.sh       # 任务 Registry CRUD + 生命周期管理
│   ├── active-tasks.json     # 任务状态跟踪（running→pr_created→reviewing→ready→merged）
│   ├── auto-review.sh        # 自动化双路 Code Review（scan→spawn→collect→notify/respawn）
│   └── prompt-patterns.md    # Prompt 模式记忆 + Anti-Patterns
├── tests/fixtures/           # 22 张真实菜单照片（7 语言）
└── DECISIONS.md              # 设计决策记录（DEC-001 ~ DEC-075）
```

---

## 研发进度

| Sprint | 目标 | 状态 |
|--------|------|------|
| Sprint 0 | 文档完备 | ✅ 完成 |
| Sprint 1 | MVP Alpha 上线 | ✅ 完成（2026-02-26）|
| Sprint 2 | 4+1 维感知接入 | ✅ 完成（2026-03-01）|
| Sprint 3 | 体验升级（方案推荐 + Waiter 沟通）| ✅ 完成 |
| Sprint 4a | 工程治理（硬门控 + 测试加固）| ✅ 完成 |
| Sprint 4b | Agent Swarm 基建 + Memory System | 🔄 Phase 1 ✅ Phase 2 进行中 |
| Sprint 5 | Beta 内测 | ⬜ 计划中 |

---

## 本地开发

```bash
# 前端
cd app && npm install && npm run dev
# 访问 http://localhost:5173

# Worker（需配置 .dev.vars，含 GEMINI_API_KEY + BAILIAN_API_KEY）
cd worker && npx wrangler dev
# 访问 http://localhost:8787

# 运行测试
cd app && npm test

# 类型检查
cd app && npx tsc --noEmit
```

---

## 核心设计决策

完整记录见 [`DECISIONS.md`](./DECISIONS.md)（DEC-001 ~ DEC-075）。

| DEC | 决策 |
|-----|------|
| DEC-039 | 文档是唯一真理，先改文档再改代码 |
| DEC-045 | AI 识别全面切换 Gemini 2.0 Flash |
| DEC-052v2 | MealPlan 末尾 JSON 代码块，三级 fallback |
| DEC-057 | 导航状态机六规则，Order 为唯一数据源 |
| DEC-060 | Waiter 指点式沟通面板，9 语言覆盖 |
| DEC-063 | 自顶向下一致性闸门（愿景→PRD→Spec→Code）|
| DEC-064 | 测试分层配比（单元50%/组件20%/集成20%/E2E10%）|

---

## Agent Swarm 工作流（DEC-075）

SAGE 使用多 Agent 并行开发 + 自动化审查：

```
任务分配 → worktree.sh 创建隔离分支
    → sessions_spawn 启动编码 Agent（Claude Code / Codex）
    → 完成后创建 PR
    → auto-review.sh scan 检测新 PR
    → spawn Codex 审查 + Opus 审查（双路并行）
    → collect 聚合结果
    → 全过 → 通知合并 | 有 critical → 自动 respawn 修复（最多 2 次）
```

关键脚本：
- `worktree.sh` — 并行开发隔离（Mac Mini 支持 3-4 Agent）
- `task-manager.sh` — 任务生命周期管理（atomic mkdir 锁 + JSON Registry）
- `auto-review.sh` — 审查引擎（prompt injection 防护 + diff 截断 + CAS 防并发）

---

## 研发规范

- **自顶向下**（DEC-063）：任何变更必须从愿景开始，逐层落地，目标不清晰不动手
- **文档先行**（DEC-039）：先改文档，再改代码
- **测试分层**（DEC-064）：单元 + 组件 + 集成 + E2E 按比例覆盖
- **Conventional Commits**：`feat:` / `fix:` / `docs:` / `test:` / `refactor:`
