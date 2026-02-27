# SAGE Next Gen

> 餐饮智能体 · Dining Agent  
> 让 AI 陪你在陌生的餐桌前做出最好的决定。

---

## 项目简介

SAGE 是一个基于多维感知的餐饮智能体。用户拍下菜单，SAGE 通过 **4+1 维感知**（视觉 + 空间 + 时间 + 环境 + 历史记忆）理解当前场景，以对话方式提供个性化推荐，帮助用户在 30 秒内完成点餐决策。

---

## 核心特性

- 📷 **拍菜单即开聊** — 扫描菜单后立即进入 AI 对话，无缝衔接
- 🧠 **场景感知** — 融合 GPS、时间、天气、历史记忆，推荐符合当下的选择
- 💬 **Conversation-First** — 不是列表浏览，是对话决策
- 🌍 **多语言支持** — 覆盖中日韩泰等主要菜单语言
- 📚 **记忆进化** — 每次用餐后更懂你的偏好

---

## 快速上手

### 环境要求

```
Node.js >= 18
pnpm >= 9
Cloudflare account (部署)
```

### 本地开发

```bash
# 前端
cd app
pnpm install
pnpm dev       # http://localhost:5173

# Worker API
cd worker
pnpm install
npx wrangler dev  # http://localhost:8787
```

### 构建部署

```bash
cd app
pnpm build
# 部署到 Cloudflare Pages（见 docs/deployment.md）
```

---

## 项目结构

```
SAGE_Next_Gen/
├── AGENTS.md       # AI Agent 工作手册（Codex/Claude Code 自动读取）
├── README.md       # 本文件
├── PLANNING.md     # 工作计划 & Sprint
├── PROGRESS.md     # 实时进展
├── DECISIONS.md    # 重要决策记录
├── specs/          # 功能规格文档
├── docs/           # 产品 + 技术文档
├── shared/         # 前后端共享类型（唯一权威）
├── app/            # 前端应用（Vite + React + Tailwind v4）
├── worker/         # Cloudflare Worker API
├── tests/          # 测试
└── archive/        # 历史文件归档
```

---

## 文档索引

| 文件 | 内容 |
|------|------|
| `docs/vision.md` | 产品愿景、战略定位 |
| `docs/prd.md` | 功能规格 + 验收标准 |
| `docs/api-design.md` | API 接口契约 |
| `docs/architecture.md` | 系统架构 |
| `docs/tech-stack.md` | 技术栈选型 |
| `docs/deployment.md` | 部署方案 |
| `docs/ux-principles.md` | UX 原则 |
| `docs/visual-design.md` | 视觉规范 |
| `PROGRESS.md` | **当前进展（实时）** |
| `DECISIONS.md` | **重要决策记录** |

---

## 技术栈

- **前端**: Vite + React + TypeScript + Tailwind CSS v4
- **API**: Cloudflare Workers
- **AI**: 阿里云百炼 DashScope（Qwen3 系列）
- **部署**: Cloudflare Pages
- **品牌色**: Indigo `#6366F1`

---

## 线上地址

- **App**: https://sage-next-gen.pages.dev
- **Worker**: https://sage-worker.xiafy920.workers.dev

---

## 项目负责人

- **产品决策**: Mr. Xia（创始人）
- **AI Agent**: SAGE（Product Owner & 执行）
