# SAGE — 餐饮智能体

> **让 AI 陪你在陌生的餐桌前做出最好的决定。**  
> Dining Agent for global travelers · 解决语言障碍 · 替你做点餐决策

---

## 产品愿景

全球旅行者在陌生餐厅——语言不通、菜单看不懂、不知道点什么。SAGE 是那个帮你翻译菜单、搭配方案、最后帮你跟服务员沟通的 AI 智能体。

**目标用户**：出境旅行的中文 / 英文母语用户（MVP）

---

## 核心特性（Sprint 3 完成）

| 功能 | 说明 |
|------|------|
| 📷 **拍菜单即开聊** | 扫描菜单 → AI 识别翻译 → 直接进入对话 |
| 🤖 **方案型推荐** | AI 输出完整用餐方案（前菜→主菜→甜品），一键加入订单 |
| 🔄 **对话改菜** | "把这道换成别的" → AI 替换并更新方案 |
| 🌿 **探索单道菜** | 深入了解味道/食材/文化背景 |
| 🗣️ **Waiter 沟通面板** | 9 语言大字显示，指点式跟服务员沟通（售罄/换菜/加份） |
| ⚠️ **过敏原防护** | 三层安全屏障：AI 过滤 + 进入确认 + 服务员展示 |
| 🧠 **4+1 维感知** | 视觉 + GPS + 时间 + 天气 + 历史记忆，推荐符合当下 |

---

## 线上地址

| 组件 | URL |
|------|-----|
| **App** | https://sage-next-gen.pages.dev |
| **Worker API** | https://sage-worker.xiafy920.workers.dev |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vite + React + TypeScript + Tailwind CSS v4 |
| 后端 | Cloudflare Workers |
| AI 识别 | Gemini 2.0 Flash（VL ~8s） |
| AI 对话 | 阿里云百炼 Qwen3.5-Plus/Flash |
| 部署 | Cloudflare Pages + Workers |

---

## 项目结构

```
SAGE_Next_Gen/
├── app/                    # Vite + React 前端
│   ├── src/
│   │   ├── views/          # 页面：Home / Scanner / Chat / Explore / Order / Waiter
│   │   ├── components/     # MealPlanCard / SelectedDishesCard / WaiterAllergyBanner 等
│   │   ├── context/        # AppContext（全局状态机）
│   │   └── utils/          # streamJsonParser / localLanguage / formatPrice
├── worker/                 # Cloudflare Workers API
│   ├── handlers/           # analyze / chat / invite
│   └── prompts/            # AI Prompt 设计
├── shared/
│   └── types.ts            # ⭐ 前后端共享类型（唯一权威）
├── docs/                   # 产品 + 技术文档
│   ├── vision.md           # 产品愿景
│   ├── prd.md              # PRD v2.0
│   └── api-design.md       # API 契约
├── specs/                  # 功能 Spec（执行细则）
└── tests/                  # 测试 Checklist
```

---

## 研发进度

| Sprint | 目标 | 状态 |
|--------|------|------|
| Sprint 0 | 文档完备 | ✅ 完成 |
| Sprint 1 | MVP Alpha 上线 | ✅ 完成 |
| Sprint 2 | 4+1 维感知接入 | ✅ 完成 |
| Sprint 3 | 体验升级（方案推荐 + Waiter 沟通）| 🔄 待验收 |
| Sprint 4 | Beta 内测 | ⬜ 计划中 |

---

## 核心决策记录

重要设计决策见 [`DECISIONS.md`](./DECISIONS.md)（DEC-001 ~ DEC-065）。

关键决策包括：
- **DEC-045**: AI 识别全面切换 Gemini 2.0 Flash（VL ~8s）
- **DEC-052v2**: MealPlan 末尾 JSON 代码块输出，三级 fallback
- **DEC-057**: 导航状态机六规则，Order 为唯一数据源
- **DEC-060**: Waiter 指点式沟通面板，9 语言覆盖
- **DEC-063**: 自顶向下一致性闸门（愿景→PRD→Spec→Code）

---

## 本地开发

```bash
# 前端
cd app && npm install && npm run dev
# 访问 http://localhost:5173

# Worker（需要 .dev.vars 配置 API Key）
cd worker && npx wrangler dev
# 访问 http://localhost:8787

# 测试
cd app && npm test
```

---

## 研发规范

- **文档先行**（DEC-039）：先改文档，再改代码
- **自顶向下**（DEC-063）：愿景 → PRD → Spec → Code，不清晰不动手
- **测试分层**（DEC-064）：单元 50% / 组件 20% / 集成 20% / E2E 10%
- **Conventional Commits**：`feat:` / `fix:` / `docs:` / `test:`
