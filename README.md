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
pnpm >= 8
Cloudflare account (部署)
```

### 本地开发
```bash
cd 05_implementation/app
pnpm install
pnpm dev       # http://localhost:5173
```

### 构建部署
```bash
pnpm build
# 部署到 Cloudflare Pages（见 04_technical/DEPLOYMENT.md）
```

---

## 文档地图

| 目录 | 内容 |
|------|------|
| `01_strategy/` | 产品愿景、战略定位、竞品分析 |
| `02_product/` | PRD、用户故事、验收标准 |
| `03_design/` | UX 原则、视觉规范、交互设计 |
| `04_technical/` | 技术架构、API 设计、部署方案 |
| `05_implementation/` | 源代码 |
| `06_testing/` | 测试计划、测试用例、QA 报告 |
| `PROGRESS.md` | **当前进展（实时）** |
| `DECISIONS.md` | **重要决策记录** |
| `PLANNING.md` | **工作计划** |

---

## 技术栈

- **前端**: Vite + React + TypeScript + Tailwind CSS v4
- **API**: Cloudflare Workers
- **AI**: Claude / Gemini（菜单识别）
- **部署**: Cloudflare Pages
- **品牌色**: Indigo `#6366F1`

---

## 项目负责人

- **产品决策**: Mr. Xia（创始人）
- **AI Agent**: SAGE（Product Owner & 执行）

> 所有重大技术/产品决策记录在 `DECISIONS.md`，里程碑记录在 `PROGRESS.md`。
