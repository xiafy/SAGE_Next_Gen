# DECISIONS.md — 重要决策记录

> 规则：**仅追加，不修改历史记录。**  
> 每条决策包含：背景、选项、决策结果、决策人、日期。  
> 目的：防止"为什么当初这么做"的失忆问题，支持多 Agent 协作时的一致性。

> ⚠️ **路径变更说明（2026-02-27）**：项目于 DEC-036 完成目录重构。  
> 历史决策中的旧路径映射如下（历史文本不做修改）：  
> `01_strategy/` → `docs/` | `02_product/` → `docs/` | `03_design/` → `docs/` | `04_technical/` → `docs/`  
> `05_implementation/app/` → `app/` | `05_implementation/worker/` → `worker/` | `05_implementation/shared/` → `shared/`  
> `06_testing/` → `tests/` | `CLAUDE.md` → `AGENTS.md` | `TASK_TEMPLATE.md` → `archive/TASK_TEMPLATE.md`

---

## 决策格式

```
## [DEC-NNN] 决策标题

- **日期**: YYYY-MM-DD
- **决策人**: Mr. Xia / SAGE Agent / 共同
- **背景**: 为什么需要做这个决策
- **选项**: 考虑过哪些方案
- **决策**: 最终选择什么，以及原因
- **影响**: 哪些文件/模块受此决策影响
```

---

## 决策记录

---

### [DEC-001] 项目从零开始，放弃历史代码库

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: 历史版本（Dish Pilot 2.0 → SAGE v4.0）代码积累了多次架构反转、技术债务（API Key 前端暴露、Tailwind v4 配置混乱、测试覆盖率不足），且旧代码库文档分散在 Agent 私有记忆中，不支持多 Agent 协作。
- **选项**:
  1. 在历史代码基础上重构
  2. 从零开始，保留设计经验，重建工程体系
- **决策**: 选项 2 — 完全从零开始
- **理由**: 历史代码技术债太重（85/100 产品完成度，但 B- 代码评级），且这次要建立多 Agent 协作的工程范式，地基必须干净。经验和教训保留在文档中，代码不继承。
- **影响**: 全项目重建，历史仓库仅作参考

---

### [DEC-002] 所有项目记忆存于项目目录，禁止 Agent 私有记忆

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: 历史工作中，项目决策、进展、结论大量存在于 SAGE Agent 的私有 MEMORY.md 中，导致：
  1. 上下文过载时记忆丢失
  2. 多 Agent 分工时新 Agent 无法快速上下文
  3. 人工审查困难
- **选项**:
  1. 继续用 Agent 私有 MEMORY.md
  2. 所有项目信息存入项目目录（PROGRESS.md / DECISIONS.md / 各层文档）
- **决策**: 选项 2 — 项目目录是唯一真相来源（Single Source of Truth）
- **影响**: CLAUDE.md 中写入强制规范，所有 Agent 遵守

---

### [DEC-003] AI 模型策略 — 废弃 Gemini，使用 Claude + 轻量模型

- **日期**: 2026-02-25（继承自历史决策 2026-02-14）
- **决策人**: Mr. Xia
- **背景**: 历史版本以 Gemini API 为主力（菜单识别 + 对话），但实际运行中发现 Gemini 严重限速，影响用户体验。
- **选项**:
  1. 继续使用 Gemini
  2. 切换到 Claude API（Anthropic）
  3. 多模型策略（按场景选择）
- **决策**: 选项 3 — 多模型策略
  - 复杂推理/架构设计：`claude-opus-4-6`
  - 日常对话/功能实现：`claude-sonnet-4-6`
  - 轻量/低成本场景：`glm-5` / `kimi`
  - **Gemini 全系列废弃**（不再使用）
- **影响**: `04_technical/ARCHITECTURE.md`、`04_technical/API_DESIGN.md`、所有 AI 调用代码

---

### [DEC-004] 前端技术栈选型

- **日期**: 2026-02-25（继承自历史决策）
- **决策人**: 共同（Mr. Xia 确认）
- **背景**: 需要选择一套能快速迭代、支持 PWA/移动端、部署简单的前端技术栈。
- **选项**:
  1. Next.js（SSR + 全栈）
  2. Vite + React（纯前端 SPA）
  3. Remix / Astro
- **决策**: **Vite + React + TypeScript + Tailwind CSS v4**
  - Vite：构建速度快，配置简单，适合快速迭代
  - React：生态成熟，组件复用性强
  - TypeScript：严格模式，减少 AI 写代码时的隐性 bug
  - Tailwind v4：最新版，CSS-first 配置，移动端优先
  - 部署：Cloudflare Pages（无需 SSR，纯静态即可）
- **关键注意**: Tailwind v4 使用 CSS `@theme` 配置，不读 `tailwind.config.js`
- **影响**: `05_implementation/app/` 所有代码

---

### [DEC-005] API 安全策略 — 所有 AI Key 通过 Cloudflare Worker 代理

- **日期**: 2026-02-25（历史教训升级为硬性约定）
- **决策人**: 共同
- **背景**: 历史版本最严重的安全问题是 API Key 直接暴露在前端代码中（QA 评级 C-01 Critical），导致 Key 可被任意用户提取。
- **决策**: 
  - 前端**零 API Key**
  - 所有 AI API 调用通过 Cloudflare Worker 代理
  - Key 存于 Worker 的 `wrangler secret`（环境变量）
  - 这是 Sprint 1 的第一优先级任务，不可推迟
- **影响**: `04_technical/ARCHITECTURE.md`、`04_technical/DEPLOYMENT.md`、所有 AI 调用代码

---

### [DEC-006] 产品架构 — Conversation-First + 双入口

- **日期**: 2026-02-25（继承自 2026-02-18 战略决策）
- **决策人**: Mr. Xia
- **背景**: 历史版本经历三次架构转向（AR → 结构化列表 → 对话驱动），最终确认对话是核心。
- **决策**: 
  - **主路径**: 对话驱动（AgentChatView 是核心）
  - **双入口**: Home Dashboard = 解读菜单（Scanner Path）+ 随便聊聊（Chat Path）
  - **列表视图**: 存在但作为辅助入口，不是主界面
  - **动态角色**: 菜单类型决定 AI 角色（酒单→侍酒师，正餐→美食顾问），不预设
- **影响**: `02_product/PRD.md`、`03_design/UX_PRINCIPLES.md`、前端路由设计

---

### [DEC-007] 目标用户定义与 MVP 用户范围

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: 产品愿景对齐会议，明确目标用户边界
- **决策**:
  - 长期目标：全球旅行者（任意国籍，任意目的地）
  - MVP 范围：中国旅行者 + 英语系欧美旅行者
  - 选择理由：控制复杂度、用户基数大、Mr. Xia 有触及渠道
- **影响**: `01_strategy/VISION.md`、`02_product/PRD.md`、UI 语言策略

---

### [DEC-008] "陌生"场景的操作性定义

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: 需要可量化的定义用于 Beta 验收
- **决策**: 菜单内容超过 30% 是用户母语以外的语言，即为目标场景
- **影响**: Beta 验收标准、产品边界说明

---

### [DEC-009] MVP 产品形态：Web App + 无登录 + 本地存储

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: 讨论 MVP 技术复杂度与上市速度的平衡
- **决策**:
  - Web App（手机浏览器），无需下载安装
  - MVP 不需要登录/账号体系
  - 历史记忆存 localStorage（MVP），云端同步是长期目标
- **影响**: `04_technical/ARCHITECTURE.md`、Sprint 1 范围

---

### [DEC-010] UI 双语策略

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: MVP 同时服务中文和英文用户群
- **决策**: 中/英双语界面，根据系统语言自动选择；非中文系统默认英文
- **影响**: `03_design/`、前端 i18n 实现

---

### [DEC-011] 商业模式：订阅制 Freemium

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: 确定变现路径
- **决策**:
  - 订阅制（Freemium）
  - 免费试用 X 次后付费（X 待市场验证）
  - 按周/月订阅
  - 具体定价由市场和 API 成本决定，持续迭代
- **影响**: 功能分层设计、`02_product/PRD.md`

---

### [DEC-012] Beta 验收三层指标体系

- **日期**: 2026-02-25
- **决策人**: 共同（Mr. Xia 确认框架）
- **背景**: Mr. Xia 初稿验收标准较模糊，需可操作化
- **决策**:
  | 层次 | 指标 | 阈值 |
  |------|------|------|
  | 激活 | 在陌生餐厅完成 ≥1 次菜单扫描 | ≥ 80% 用户 |
  | 价值传递 | 通过交互最终得到推荐 | ≥ 60% 使用次数 |
  | 复购意愿 | 表示下次还会用 | ≥ 50% 用户 |
  - 测试对象：10-20 位种子用户（Mr. Xia 私人关系网络）
  - 测试周期：2 周
- **影响**: Beta 测试计划、`06_testing/TEST_PLAN.md`

---

### [DEC-013] GPS 请求时机：进入 App 时立即请求

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: OQ2 — GPS 请求时机影响用户体验与授权转化率。进入 App 即请求 vs 扫描菜单时才请求。
- **选项**:
  1. 进入 App 时立即请求
  2. 扫描菜单时才请求（延迟请求，感知更自然）
- **决策**: 选项 1 — 进入 App 时立即请求
- **影响**: `02_product/PRD.md` F04-B、前端 App 启动逻辑

---

### [DEC-014] 多图上传上限：5 张

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: PRD 初稿设定为 3 张，讨论实际用餐场景后调整
- **决策**: 单次上传最多 5 张（覆盖食物菜单/酒单/甜品单/套餐规则等多本菜单场景）
- **影响**: `02_product/PRD.md` F02 AC3、`02_product/USER_STORIES.md` US-006

---

### [DEC-015] 展示模式只显示原文，不显示翻译

- **日期**: 2026-02-25
- **决策人**: Mr. Xia
- **背景**: 确认展示给服务员模式的内容设计
- **决策**: 只显示菜品原文名称 + 数量，不显示母语翻译。理由：服务员看不懂用户的母语，原文才有意义。
- **影响**: `02_product/PRD.md` F08 AC3

---

### [DEC-016] Path C 补充菜单回归 MVP

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: 昨日将 Path C 移入 Backlog，今日对齐时 Mr. Xia 指出"对话途中增加菜单是普遍场景"
- **决策**: Path C 重回 MVP。Scanner 页面需支持两个入口：Home（Path A）和 AgentChat 内「📷 补充菜单」按钮（Path C）
- **影响**: `02_product/PRD.md`、`04_technical/ARCHITECTURE.md`（状态机需增加 Path C 分支）

---

### [DEC-017] F02 Scanner：全屏相机页面（非底部弹层）

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: PRD 初稿设计为 Chat-Native 底部弹层
- **决策**: 改为独立全屏相机页面。理由：对连续拍照友好，用户可预览/删除已拍照片
- **功能要求**: 支持拍照 + 相册选择；缩略图预览条；单张可删除；最多 5 张；确认后跳转 AgentChat
- **影响**: `02_product/PRD.md` F02、`03_design/UX_PRINCIPLES.md`（需更新"不打断心流"原则说明）

---

### [DEC-018] F01 Home：不显示历史记录

- **日期**: 2026-02-26
- **决策人**: 共同（Mr. Xia 认可）
- **决策**: Home 极简，不显示历史记录。历史偏好由 AI 在对话中自然提及
- **影响**: `02_product/PRD.md` F01

---

### [DEC-019] F03 失败降级：重新拍摄，不引导文字输入

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: PRD 初稿设计了"文字描述"作为识别失败的降级方案
- **决策**: 移除文字输入降级。理由：①用户手机可能没有菜单语言的输入法；②手输菜单失去使用 SAGE 的意义。失败时统一引导重新拍摄
- **影响**: `02_product/PRD.md` F03

---

### [DEC-020] F05 动态 AI 角色系统：整体删除

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: PRD 设计了根据菜单类型动态切换 AI 角色（侍酒师/美食顾问等）
- **决策**: 该功能为伪需求，整体删除。AI 使用统一餐饮助手身份，不预设角色
- **影响**: `02_product/PRD.md` F05 标记删除、`04_technical/ARCHITECTURE.md`（移除 agentRole/agentGreeting 字段）

---

### [DEC-021] F04-B GPS 被拒：静默跳过，无任何提示

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **决策**: GPS 权限被拒时静默跳过，不显示任何弹窗或提示，AI 推荐时不考虑位置维度
- **影响**: `02_product/PRD.md` F04-B、前端 GPS 授权逻辑

---

### [DEC-022] F07 探索视图：保留在 MVP，计划 A/B Test

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: Mr. Xia 个人习惯先看全量菜单再让 AI 推荐，但不确定其他用户是否相同
- **决策**: 保留在 MVP，上线后做 A/B Test（有探索视图 vs 无探索视图对下单率的影响）
- **影响**: `02_product/PRD.md` F07

---

### [DEC-023] F08 小费建议：不在 MVP，美国市场时高优

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **决策**: MVP 不实现小费建议。当产品进入美国市场推广时，该功能升为高优先级
- **影响**: `02_product/PRD.md` F08

---

### [DEC-024] F09 偏好管理：参考 ChatGPT 个性化设置，入口在 Home 设置页

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **决策**: 偏好管理支持查看/编辑/删除单条，入口在 Home 右上角设置图标。参考 ChatGPT App 个性化设置的交互范式
- **影响**: `02_product/PRD.md` F09、F01

---

### [DEC-025] F10 语言切换：系统自动检测 + 支持手动切换

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **决策**: 自动检测系统语言的基础上，在设置页提供手动切换入口
- **影响**: `02_product/PRD.md` F10

---

### [DEC-026] AI 模型体系：采用阿里云百炼 Qwen3 系列（解决 OQ3 + OQ4）

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: OQ3（Vision 模型选型）和 OQ4（多图提交方式）是 Sprint 1 代码的最后两个 Blocker。Mr. Xia 提供了阿里云百炼 API Key，并指定了模型组合。
- **选项**:
  - Option A: Claude Vision（claude-sonnet-4-6）做识别，保持单一供应商
  - Option B: 阿里云百炼 Qwen3-VL 系列做识别，Chat 用 Qwen3.5
  - Option C: 混合——百炼识别 + Claude 对话
- **决策**:
  - 菜单识别主力：`Qwen3-VL-Plus`
  - 菜单识别快速/降级：`Qwen3-VL-Flash`
  - AI 对话主力：`Qwen3.5-Plus`
  - 轻量判断：`Qwen3.5-Flash`
  - API 供应商：阿里云百炼（DashScope），OpenAI 兼容接口
  - OQ4 同步解决：5 张图片**同时提交**一次 API 调用（message content array，Qwen3-VL 原生支持多图）
- **影响**: `04_technical/ARCHITECTURE.md`（TBD 全部填充）、`worker/handlers/analyze.ts`、`worker/handlers/chat.ts`
- **安全说明**: API Key 仅存于 Cloudflare Worker `wrangler secret`，不出现在任何代码/文档中

---

### [DEC-027] Icebreaker 状态机：Pre-Chat 主动多轮对话模型

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: PRD F06 中"Icebreaker"原设计为静态等待占位，识别完成后 AI 接管。Mr. Xia 指出应将等待期间升级为主动多轮对话，充分利用这段时间收集用户需求。
- **决策**:
  1. ANALYZING 阶段 = **Pre-Chat 主动对话模式**，AI 用 `Qwen3.5-Flash` 主动引导用户说出需求，支持多轮
  2. Pre-Chat 偏好提炼与主 Chat 相同机制（inline preferenceUpdates），无额外 API 调用
  3. 识别完成后（HANDING_OFF）：全量 Pre-Chat 对话历史 + handoff system note 一起喂给主 Chat AI（`Qwen3.5-Plus`）
  4. 主 Chat AI 接管时已充分了解用户，**不重复问已回答的问题**，直接给出基于完整菜单的推荐
  5. 识别失败时：Pre-Chat 内容和已提炼偏好全部保留，重试成功后带入
  6. Path C 补充菜单：不重走 Pre-Chat，直接注入本地系统消息，chatPhase 保持 chatting
- **影响**:
  - `03_design/ICEBREAKER_STATE_MACHINE.md`（新文件）
  - `02_product/PRD.md` F06 章节（需更新）
  - `04_technical/API_DESIGN.md`（`/api/chat` 新增 `mode: 'pre_chat'`，支持 `menuData: null`）
  - Worker `handlers/chat.ts`（Pre-Chat vs 主 Chat prompt 分支）

---

### [DEC-028] 所有 API 调用必须设置 `enable_thinking: false`

- **日期**: 2026-02-26
- **决策人**: SAGE Agent（Phase 0 Prompt Lab 实测发现）
- **背景**: Qwen3 系列模型默认开启思考模式（Chain-of-Thought Reasoning），TTFT 达到 7-26 秒，远超产品可接受范围。
- **实测数据**:
  - qwen3.5-flash，thinking=ON：TTFT **7000ms** ❌
  - qwen3.5-flash，thinking=OFF：TTFT **315ms** ✅（22x 提升）
  - qwen3.5-plus，thinking=OFF：TTFT **450ms** ✅
  - qwen3-vl-plus，thinking=OFF：TTFT **2ms** ✅，Total **1528ms** ✅
- **决策**: Worker 所有 Bailian API 调用必须包含 `enable_thinking: false`；同时启用 `stream: true` 流式输出，确保用户感知延迟 < 500ms
- **影响**: `04_technical/API_DESIGN.md`、`worker/utils/bailian.ts`、所有 handler

---

### [DEC-029] 强制 Codex 审计：Claude Code 完成任务后必须触发

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: Phase 3 由 Claude Code 独立生成前端代码，未参照 Worker Zod schema，导致前后端契约断裂（API 字段名不一致、类型结构不对齐）。Codex Review 发现 5 个严重问题，综合评分仅 4/10。
- **决策**:
  1. Claude Code 完成**任何任务**后（代码或文档），必须立即启动 Codex 审计
  2. 审计对象：代码变更 + 文档变更，二者均须覆盖
  3. 审计流程：`Claude Code 完成 → tsc/build 通过 → Codex 审计 → 修复🔴问题 → git commit`
  4. 不得在 Codex 审计完成前 git commit
  5. 审计报告写入 `AUDIT_[任务名]_[日期].md`，保留在项目目录
- **影响**: `CLAUDE.md` §7.1（已更新），所有后续任务 TASK.md 模板须包含审计步骤

---

### [DEC-030] 免费试用次数 X = 5

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: OQ1 悬而未决，Sprint 2 Paywall 实现前需要确认免费试用次数上限。
- **决策**: X = **5 次**（每设备免费使用 5 次完整对话流程）
- **影响**: Sprint 2 Paywall 实现时，localStorage 记录使用次数，第 6 次触发订阅引导；计费单位为一次完整的"扫描→对话→点单"流程

---

### [DEC-031] 建立 shared/ 共享类型包，前后端唯一权威类型源

- **日期**: 2026-02-26
- **决策人**: SAGE Agent（复盘驱动）
- **背景**: Sprint 1 复盘发现前端 `types/index.ts` 和 Worker `schemas/*.ts` 各自定义类型，导致契约 drift，Phase 3 Codex 审计评分 4/10。
- **决策**:
  1. 创建 `05_implementation/shared/types.ts` 作为前后端共享的唯一权威类型定义
  2. App 的 `types/index.ts` 从 shared re-export API 类型，只保留 UI-only 类型（ViewName, ChatPhase, AppState 等）
  3. Worker 的 Zod schema 的 `z.infer<>` 结果必须与 shared 类型兼容
  4. TASK.md 禁止内联 API schema，必须引用 `shared/types.ts`
- **影响**: `CLAUDE.md` §8（新增）、tsconfig.json（app + worker 都 include shared）、TASK_TEMPLATE.md（新增）

---

### [DEC-032] CLAUDE.md 升级为三级质量门控 + 必读规格清单

- **日期**: 2026-02-26
- **决策人**: SAGE Agent（复盘驱动）
- **背景**: 原 CLAUDE.md §7 只有编译级检查（tsc + build），导致 Claude Code "编译通过但逻辑不对"。
- **决策**:
  1. §0 新增"每次任务开始前"必读清单：PROGRESS + PRD AC + API_DESIGN + shared/types.ts
  2. §7 升级为三级门控：Level 1 编译 → Level 2 契约一致性（grep 验证）→ Level 3 行为正确性（状态机 + PRD AC）
  3. §8 新增"前后端契约规则"章节，明确禁止重复定义类型
  4. Codex 审计 checklist 增加"PRD AC 逐条对照"要求
- **影响**: CLAUDE.md 全面重写、TASK_TEMPLATE.md 新增

---

### [DEC-033] TASK.md 模板化，禁止内联规格

- **日期**: 2026-02-26
- **决策人**: SAGE Agent（复盘驱动）
- **背景**: Phase 3 TASK.md 内联了简化版 API schema（如 `preferences: {"restrictions":[],"flavors":[],"history":[]}`），丢失了 `Restriction` 结构体的 `type/value` 字段，导致 Claude Code 实现了错误的数据结构。
- **决策**:
  1. 创建 `TASK_TEMPLATE.md` 标准模板
  2. 每个 TASK.md 必须包含：必读文件清单 + PRD AC checklist + 契约 grep 断言
  3. 禁止在 TASK.md 中复述 API schema，必须写"参照 shared/types.ts 的 XXX 接口"
  4. OpenClaw (SAGE Agent) 下发任务时 workdir 改为项目根目录
- **影响**: 所有后续 TASK.md 编写方式

---

### [DEC-034] ScannerView 多图拍摄 UX 升级（参考千问相机）

- **日期**: 2026-02-26
- **决策人**: Mr. Xia
- **背景**: 竞品分析千问相机的拍照交互——全屏取景器 + 单页/多页 toggle + 连续拍摄缩略图条 + 相册多选。当前 SAGE Scanner 功能单一，缺乏多页菜单连续拍摄体验。
- **决策**:
  1. 增加「单页/多页」胶囊式 toggle（快门按钮上方）
  2. 单页模式：拍/选 1 张后自动压缩+跳转 chat
  3. 多页模式：连续拍摄，底部缩略图条 + × 删除 + 「去分析」按钮
  4. 拍照和相册均上限 **5 张**（不跟千问的 7 张，考虑 API 成本+延迟）
  5. 去掉进入 Scanner 时自动弹出原生相机的行为
- **影响**: `app/src/views/ScannerView.tsx` 重写，scannerMode 为组件内部状态

---

*后续决策按此格式追加，不修改以上历史记录。*

---

### [DEC-044] VL API 调用改为 stream=false（非流式）

- **日期**: 2026-03-02
- **决策人**: Mr. Xia / SAGE Agent（实测数据驱动）
- **背景**: 延迟诊断测试（2026-03-02 10:09）发现，Worker 内部对百炼 VL API 使用 `stream=true` + SSE 聚合（`streamAggregate`）的方案，实际性能远低于 `stream=false` 直接等待完整响应。
- **实测数据**:
  - `stream=true`（streamAggregate，原方案）：均值 **31.4s**，TTFT 698-2974ms
  - `stream=false`（fetchComplete，新方案）：均值 **13.3s**
  - **stream=false 约快 2 倍**
- **根因**:
  - VL 输出为 JSON，前端必须等完整结果才能 parse，`stream=true` 对此场景无 UX 价值
  - `stream=true` 产生大量小 SSE 帧，HTTP 分块传输 + 每帧解析的累计开销显著
  - `stream=false` 模式下 API 服务端可采用批量优化路径，减少 round-trip
- **决策**:
  1. `worker/utils/bailian.ts` 新增 `fetchComplete()` 函数（stream=false，直接 await 完整 JSON 响应）
  2. `worker/handlers/analyze.ts` 中 VL（qwen3-vl-flash）和 Enrich（qwen3.5-flash）调用均改用 `fetchComplete`
  3. `streamAggregate` 保留但标记为"仅供 Chat 流式场景使用"
  4. **注意**：此决策覆盖 DEC-028 中"同时启用 stream:true"的说明——DEC-028 的 stream:true 建议基于文本对话场景，不适用于 JSON 输出场景
- **预期效果**: VL 阶段 ~25s → ~13s，总链路 ~25s → ~15s（含 enrich ~2s）
- **影响**: `worker/utils/bailian.ts`、`worker/handlers/analyze.ts`、`docs/technical/api-design.md`

---

### [DEC-045] VL 模型换用 Gemini 2.0 Flash

- **日期**: 2026-03-02
- **决策人**: Mr. Xia / SAGE Agent（实测数据驱动）
- **背景**: qwen3-vl-flash 经 CF Worker 调用耗时 ~23s，用户体验不可接受。测试 Gemini 2.0 Flash 同等任务仅需 ~8s（直连），经 CF 东京节点调用也不走国内→东京→国内跨境路由，延迟更稳定。
- **实测数据（2026-03-02）**:
  - Gemini 2.0 Flash stream=false：均值 **8.2s**（3次：8605/7843/8151ms）
  - Gemini 2.0 Flash stream=true：均值 **7.8s**，TTFT ~2.8s
  - qwen3-vl-flash stream=false（直连）：均值 ~13.3s
  - qwen3-vl-flash 经 Worker：~23s
- **识别质量**：与 qwen3-vl-flash 相当，中文翻译准确，价格提取完整
- **决策**:
  1. `worker/utils/gemini.ts`：新增 `fetchGeminiComplete()` 封装 Gemini generateContent API
  2. `worker/handlers/analyze.ts`：VL 阶段从 qwen3-vl-flash 换用 gemini-2.0-flash
  3. `worker/middleware/cors.ts`：Env 接口新增 `GEMINI_API_KEY`
  4. Enrich 阶段继续使用 qwen3.5-flash（纯文本，无需视觉，~2s 够快）
  5. 预期总链路：~8s（VL）+ ~2s（Enrich）≈ **~10s**
- **API Key 存放**: `GEMINI_API_KEY` 存于 Cloudflare Worker wrangler secret，不出现在代码中
- **影响**: `worker/utils/gemini.ts`（新建）、`worker/handlers/analyze.ts`、`worker/middleware/cors.ts`、`docs/technical/api-design.md`

---

### [BACKLOG-001] 超大菜单 Enrich 分批处理

- **记录日期**: 2026-03-02
- **状态**: 待实现（暂缓）
- **背景**: Gemini 2.0 Flash 硬限制 max_tokens=8192，实测每道菜 Enrich 约 218 chars：
  - ≤60 道菜：✅ 充裕（≤5200 tokens）
  - 80 道菜：⚠️ 接近上限（~7000 tokens）
  - 100+ 道菜：❌ 会超出（~8700 tokens）
- **方案**: 当 items > 60 时，将 Enrich 阶段按 35 道一组分批调用，并行发出后合并结果（约 20 行代码）
- **触发条件**: 出现大菜单截断报错时实施

---

### [DEC-050] Prompt v8：allergenCodes 提取 + EU 编号对照表 + max_tokens=8192

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: 基准测试（v2）显示：加入 EU 过敏原编号对照表后，Gemini allergens 召回率从 75% 提升至 100%；max_tokens=4096 导致大菜单 JSON 截断。
- **决策**:
  1. `MENU_ANALYSIS_SYSTEM` 升级为 v8：VL 阶段额外提取 `allergenCodes`（图片上的括号数字）
  2. `MENU_ENRICH_SYSTEM` 加入 EU 1-11 编号对照表，allergens 综合"编号转换"和"食品知识推理"双来源
  3. `buildEnrichUserMessage` 将 allergenCodes 传入 Enrich 文本输入
  4. `fetchGeminiComplete` 的 VL 和 Enrich 调用均改为 `maxOutputTokens=8192`
  5. VL timeout 25s → 35s，Enrich timeout 20s → 25s
- **测试依据**: `tests/vl-model-benchmark/raw-v2/` + `RESULTS-summary.md`
- **影响**: `worker/prompts/menuAnalysis.ts`，`worker/handlers/analyze.ts`

---

### [DEC-046] 两阶段 SSE 展示策略：通过 A/B Test 决策，不提前假设结论

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: Tier 1（VL ~8s 展示基础信息）+ Tier 2（Enrich ~+10s 补全语义字段）的两阶段 SSE 方案在技术上可行，但不确定用户是否真正偏好"快速但不完整"的体验。
- **决策**: 不轻易下结论。通过 A/B Test 验证：A 组等待完整结果一次性展示，B 组分两阶段推送。以实测数据决定是否全量上线 B 组。
- **影响**: `docs/vl-display-tiers-spec.md`，两阶段 SSE 实施计划

---

### [DEC-047] allergens 加载状态：有过敏偏好用户显示「正在检查过敏原…」

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: 两阶段 SSE 中，Tier 1 推送时 allergens 字段尚未就绪。对有过敏原偏好的用户，空白区域可能被误读为"无过敏原"，存在安全风险。
- **决策**: Enrich 完成前，有过敏原偏好的用户的菜品卡片显示「正在检查过敏原…」状态，而非留空。具体 UI 形态（文字/图标/动画）待设计评审。
- **底线**: 绝不能以"空白"暗示"无过敏原"。
- **影响**: `app/src/components/DishCard.tsx`，UI 设计稿

---

### [DEC-048] categories 缺失处理规则

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: Gemini 2.0 Flash 经常返回空的 categories 数组，Worker 靠 normalizeLooseResult 重建，但分类名为原文未翻译（如 "Main Dishes Thai Cuisine"）。
- **决策**:
  1. **全部缺失**：整张菜单无分类时，不展示分类区域，直接展示菜品列表
  2. **部分缺失**：待进一步评估后选择方案：
     - 方案 a：无法识别分类的菜品归入「其他」
     - 方案 b：调用 AI 根据菜品名称推理出合理分类
  3. **禁止**：直接展示未翻译的原文分类名
- **影响**: `worker/utils/gemini.ts`（prompt 优化），`app/src/views/ExploreView.tsx`（分类为空时的展示逻辑）

---

### [DEC-049] 变体菜品展示方式：拆分为独立卡片

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: 菜单印刷为节省空间将同一道菜的多个选项合并展示（如 Pad Thai：猪肉/鸡肉/虾）。当前 VL 模型已自然拆分为多条 item，是否保留或折叠待确认。
- **决策**: 保留拆分，每个独立可点单的选项作为一张卡片展示。
- **覆盖场景**（VL Prompt 需明确处理）:
  - 蛋白质变体：猪肉 / 鸡肉 / 虾 / 素食
  - 规格变体：大份 / 小份
  - 销售方式变体：红酒杯卖 / 瓶卖
  - 类似结构均拆分，不折叠
- **影响**: `worker/prompts/menuAnalysis.ts`（MENU_ANALYSIS_SYSTEM prompt 需明确描述拆分规则）

---

### [DEC-035] 研发方法论：Spec-Driven + Test-Driven

- **日期**: 2026-02-27
- **决策人**: Mr. Xia
- **背景**: 确立 SAGE 项目的底层研发方法论，确保高质量交付和 AI agent 高效协作。
- **决策**:
  1. 采用 Spec → Test → Code 三步法
  2. Spec 存放在代码仓库 `specs/` 目录，与代码同版本
  3. 粒度灵活，以交付质量为准绳，在实践中迭代标准
  4. AI agent 高权限起步（可生成测试骨架、从 spec+test 实现代码），根据产出动态调整
- **影响**: `AGENTS.md` §0（新增研发方法论章节）、`specs/` 目录创建

---

### [DEC-036] AI-First 项目重构：扁平化目录 + AGENTS.md

- **日期**: 2026-02-27
- **决策人**: Mr. Xia
- **背景**: 原项目结构（01-06 编号目录、三级嵌套实现目录、根目录散落临时文件）对 AI agent 不友好，影响开发效率。
- **决策**:
  1. `CLAUDE.md` → `AGENTS.md`（Codex + Claude Code 都自动读取）
  2. 合并 `01_strategy/` ~ `04_technical/` → `docs/`（扁平、小写文件名）
  3. `05_implementation/{app,worker,shared}/` → 根目录 `app/` `worker/` `shared/`
  4. `06_testing/` → `tests/`
  5. 所有临时文件（AUDIT_*、CODEX_*、TASK_*）→ `archive/`
  6. 基本原则：AI 友好、AI First
- **影响**: 全项目目录结构、AGENTS.md 路径引用、README.md、PLANNING.md、PROGRESS.md

---

### [DEC-037] F11 菜品概要 + F12 饮食标签需求确认

- **日期**: 2026-07-23
- **决策人**: Mr. Xia
- **背景**: 用户在不熟悉的餐厅无法从菜名判断菜品内容、安全性和适口性。
- **决策**:
  1. **F11 菜品概要**: 每道菜默认一句话（食材+味道），可展开（类比+文化背景）。所有菜都生成。
  2. **F12 饮食标签**: 过敏原（8大类）+ 清真/素食/纯素 + 辣度(1-5) + 卡路里(~XXXkcal) + 生食/含酒精
  3. **标签来源**: 菜单标注优先，否则 AI 推断；不确定时标"可能含有"，宁可多标
  4. **F09 联动**: 标签高亮(红底) + 卡片顶部橙色警告条
  5. **卡路里**: 用"~350 kcal"格式，MVP 只做卡路里不做其他营养维度
  6. **F11+F12 打包进 Sprint 2**；Paywall 和 Path B 移至 Sprint 3
- **影响**: PRD v1.5、PLANNING.md、shared/types.ts（菜品数据结构扩展）、Worker Prompt

---

### [DEC-038] F13 语音输入需求确认

- **日期**: 2026-07-23
- **决策人**: Mr. Xia
- **背景**: 餐厅场景打字不便，语音更自然。
- **决策**:
  1. 按住说话，松手发送
  2. 支持多语言（中文问英文菜单）
  3. 只做输入不做 TTS
  4. 技术: Web Speech API 优先，不支持时隐藏按钮
  5. 排入 Sprint 3
- **影响**: PRD v1.5、F06 AgentChat 输入栏 UI

---

### [DEC-039] 文档是唯一真理

- **日期**: 2026-07-23
- **决策人**: Mr. Xia
- **背景**: AI 原生研发中，多个 Agent（OpenClaw、Claude Code、Codex）协作时，文档和代码容易 drift。
- **决策**: 无论是 OpenClaw 直接使用模型还是调用 Claude Code 或 Codex，做任何代码修改之前都必须先对齐文档，保证文档是唯一真理。需求、规格、rules.yaml、计划都是如此。先改文档再改代码，不一致时以文档为准。
- **影响**: AGENTS.md（第零原则）、docs/dev-methodology.md、全体 Agent 工作流

---

### [DEC-040] 前端图片压缩参数升级：maxDim 960→1280，maxBytes 350KB→500KB

- **日期**: 2026-03-01
- **决策人**: Mr. Xia / SAGE Agent
- **背景**: 专项压缩测试发现，手机大图（12MP，3024×4032）在 maxDim=960 下输出仅 0.69MP，相较原图压缩超过 4 倍。菜单识别属 OCR 类任务，小字（价格、配料）对像素密度高度敏感，当前压缩策略导致可用信息量不足，可能影响识别质量。
- **选项**:
  1. 维持 960px / 350KB（现状，传输最小，但识别质量最弱）
  2. 升级至 1280px / 500KB（推荐：信息量 1.8x，网络成本 +150KB，Worker 限额内）
  3. 升级至 1600px / 700KB（信息量 2.8x，但对弱网络更敏感）
- **决策**: 选项 2（1280px / 500KB）。理由：
  1. Worker 侧单图限额 4MB，500KB 仍有 8x 余量，完全安全
  2. 有效像素从 0.69MP 升至 1.23MP（+78%），对小字菜单收益显著
  3. 传输差异仅约 150KB，4G 网络 <0.1s，用户无感
  4. quality ladder 最高档从 0.6 升至 0.75，减少文字边缘 JPEG artifact
- **影响**: `app/src/api/analyze.ts`（`compressImage` 默认参数）、`docs/technical/api-design.md`（客户端预处理规范）

---

### [DEC-041] 图片识别链路改为 Binary Upload + Analyze SSE

- **日期**: 2026-03-01
- **决策人**: Mr. Xia / SAGE Agent
- **背景**: iPhone Safari + 弱网场景下，`/api/analyze` 采用 base64 JSON 上传 + Worker 聚合返回，导致请求体膨胀和长时间无反馈，超时失败率偏高。
- **决策**:
  1. 前端 `app/src/api/analyze.ts` 改为 `multipart/form-data` 二进制上传（图片不再在前端转 base64）
  2. Worker `/api/analyze` 改为 SSE：持续发送 `progress` 事件，完成后发送 `result`
  3. Worker 保留旧 JSON 请求兼容路径，支持灰度回滚
  4. 超时链路收紧：flash 9s + plus 7s，前端 20s（含重试余量）
  5. 前端图片压缩并发限制为 2，降低 iPhone Safari 内存峰值
- **影响**:
  - `app/src/api/analyze.ts`
  - `app/src/views/AgentChatView.tsx`
  - `worker/handlers/analyze.ts`
  - `shared/types.ts`（Analyze 超时常量）
  - `docs/technical/api-design.md`

---

### [DEC-042] 两阶段菜单识别架构

- **日期**: 2026-03-01
- **决策人**: SAGE Agent
- **背景**: qwen3-vl-flash 擅长 OCR 但忽略 brief/allergens/spiceLevel 等语义字段。
- **决策**: Step 1 VL-Flash 纯 OCR 提取菜品 → Step 2 qwen3.5-flash 文本模型补全语义字段（brief/allergens/dietaryFlags/spiceLevel）
- **影响**: `worker/handlers/analyze.ts`、`worker/prompts/menuAnalysis.ts`

---

### [DEC-043] 用户场景重定义：Chat 双意图 + Explore 双出口

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: 夏总基于真实使用体验，重新定义了 Chat 和 Explore 的核心用户场景。
- **决策**:
  1. **Chat 双意图**（自然涌现，不做 UI 显式区分）：
     - 探索型：深入了解单道菜的味道、文化、历史
     - 方案型：AI 根据约束条件（人数/忌口/过敏/预算）输出完整结构化用餐方案（前菜→主菜→甜品→酒水）。用户可微调，确认后整套加入订单
  2. **Explore 双出口**：用户在菜单总览中选完菜品后：
     - 直接展示给服务员（→Waiter Mode）
     - 带已选菜品咨询 AI（→AgentChat，AI 给出搭配建议）
  3. **新增 MealPlanCard 组件**：方案型回复使用结构化方案卡片，支持逐道替换和一键加入订单
- **影响**:
  - `docs/product/prd.md` v1.8（F06/F07/旅程D/§3.1 更新）
  - `worker/prompts/agentChat.ts`（方案生成 Prompt）
  - `app/src/views/AgentChatView.tsx`（MealPlanCard 组件）
  - `app/src/views/ExploreView.tsx`（底部操作栏 + 双出口）
  - `docs/user-stories.md`（新增场景）

---

## 决策覆盖关系速查表

> 追加于 2026-03-02。规则同样仅追加，不删改历史条目。
> 当某决策被后续决策完全或部分覆盖时，在此表登记，避免歧义。

| 被覆盖决策 | 覆盖决策 | 覆盖范围 | 覆盖日期 |
|-----------|---------|---------|---------|
| DEC-003（Gemini 全系列废弃） | DEC-045 | VL 识别和 Enrich 阶段改用 Gemini 2.0 Flash；Chat 阶段仍使用百炼 Qwen | 2026-03-02 |
| DEC-026（Qwen3-VL 为识别主力） | DEC-045 | Qwen3-VL 降为地理兜底路径；正常路径改为 Gemini 2.0 Flash | 2026-03-02 |
| DEC-028（"所有调用 stream=true"） | DEC-044 | JSON 输出场景（VL/Enrich）改为 stream=false；Chat 场景 stream=true 保持不变 | 2026-03-02 |
| DEC-041（超时：flash 9s + plus 7s） | DEC-050 | VL timeout 25s→35s，Enrich timeout 20s→25s（Gemini 推理特性不同于 Qwen） | 2026-03-02 |
| DEC-042（VL=qwen3-vl-flash，Enrich=qwen3.5-flash） | DEC-045 | VL 改为 gemini-2.0-flash；Enrich 改为 gemini-2.0-flash | 2026-03-02 |

---

### [DEC-051] Gemini 地理封锁兜底：自动切换百炼新加坡国际站

- **日期**: 2026-03-02
- **决策人**: SAGE Agent（线上问题驱动）
- **背景**: Cloudflare Worker（东京节点）访问 Gemini API 时，部分情况下返回 `FAILED_PRECONDITION` 错误，原因为 Google 对部分地区节点的地理访问限制。纯 Gemini 架构在这种情况下会直接向用户报错 `AI_UNAVAILABLE`。
- **选项**:
  1. 无兜底，直接报错，等 CF 节点自然路由恢复
  2. 兜底到百炼国内站（`dashscope.aliyuncs.com`）— Qwen3-VL-Flash
  3. 兜底到百炼新加坡国际站（`dashscope-intl.aliyuncs.com`）— qwen-vl-plus + qwen-plus-latest
- **决策**: 选项 3 — 百炼新加坡国际站
- **理由**:
  1. 百炼国内站（选项 2）从 CF 东京节点访问同样存在跨境链路不稳定问题
  2. 新加坡国际站地理上与东京节点最近，链路更稳定
  3. `qwen-vl-plus`（新加坡）支持多图输入，功能等价
  4. `qwen-plus-latest` 用于 Enrich 阶段（纯文本，无需视觉）
- **实现细节**:
  - `gemini.ts`：捕获 `FAILED_PRECONDITION` → 抛出带 `geoBlocked: true` 标记的错误
  - `analyze.ts`：VL 阶段捕获 `geoBlocked` → 调用 `fetchBailianComplete`（新加坡端点）
  - `analyze.ts`：`useBailian` 标志在 VL 和 Enrich 阶段共享，保证两阶段供应商一致
  - `bailian.ts`：`fetchComplete()` 新增 `baseUrl` 参数，支持覆盖默认端点
  - `cors.ts`：`Env` 接口新增 `BAILIAN_INTL_API_KEY` 字段
- **新增 Worker Secret**: `BAILIAN_INTL_API_KEY`（百炼新加坡国际站 Key）
- **正常路径不受影响**: 该兜底仅在 Gemini 抛出 `geoBlocked` 时触发，正常情况全程走 Gemini
- **影响**:
  - `worker/handlers/analyze.ts`
  - `worker/utils/gemini.ts`
  - `worker/utils/bailian.ts`（`baseUrl` 参数）
  - `worker/middleware/cors.ts`（`BAILIAN_INTL_API_KEY`）
  - `docs/technical/architecture.md`（降级路径更新）
  - `docs/technical/deployment.md`（新增 Secret 说明）

---

### [DEC-052] 方案型输出格式：流式自然语言 + 末尾 JSON 代码块（v2 修订）

- **日期**: 2026-03-02（v2 修订）
- **决策人**: Mr. Xia
- **背景**: 初版选择 `<meal-plan>` 嵌入标记。经四方独立评审（Opus/Codex/Qwen/Kimi 一致标 🔴），标记方案的 AI 输出不确定性风险过高，遂重新评估。
- **最终选项**:
  - A: 坚持 `<meal-plan>` 标记 + 加固防御层
  - B: 改用 Function Calling（JSON 强约束，但文字与卡片位置关系丢失）
  - C: 流式文字 + 末尾 ```json``` 代码块
- **决策**: **路线 C（流式文字 + 末尾 JSON 代码块）**
- **理由**:
  1. 代码块是 LLM 最熟悉的结构化输出格式，源头降低风险
  2. "三段式排列"是伪需求，用户在意文字在动 + 卡片可操作
  3. 工程复杂度最低：不需要流式解析器/状态机/fuzzy matching
  4. Function Calling 依赖百炼 streaming + function call 组合稳定性（DEC-044 已踩坑）
- **实现规格**:
  1. AI 回复格式：流式叙事文字 → 末尾 ```json {MealPlan} ```
  2. 流式中检测到 ```json → 显示"🍽 正在生成方案…"占位
  3. 流式结束后提取最后一个 json 代码块 → parse → 渲染 MealPlanCard
  4. 分级 fallback：L1 完整→卡片 / L2 jsonrepair→简化卡片 / L3 无法解析→纯文字+「重新生成方案」按钮
  5. MealPlanCard JSON schema 定义于 `shared/types.ts`
- **影响**: `docs/product/prd.md` F06、`worker/prompts/agentChat.ts`、`app/src/views/AgentChatView.tsx`、`shared/types.ts`

---

### [DEC-053] Explore → Chat 上下文注入：已选卡片 + 事实摘要引导（v2 修订）

- **日期**: 2026-03-02（v2 修订）
- **决策人**: Mr. Xia
- **背景**: 用户从 Explore 选完菜品点「咨询 AI」回到 Chat 时，需要让 AI 感知已选菜品。初版选择纯轻量引导（"选了 N 道，想看搭配还是聊别的？"）。经四方评审，Opus 认为太轻（用户期望获得分析），Codex 建议事实摘要折中。
- **选项**:
  - D（初版）: 纯轻量引导，不含信息量
  - E（Opus）: 直接分析搭配（可能猜错意图）
  - F（Codex 折中，最终选择）: 事实摘要 + 开放式引导
- **决策**: **方案 F（事实摘要 + 开放式引导）**
- **理由**:
  1. 事实摘要（数量、分类、预估总价）本身有价值，用户可能不记得选了多少
  2. 不做主观判断（不说"太多了"或"缺蔬菜"），符合 Scenario-Free
  3. 区分"新选"和"已有"，覆盖增量/全量两种意图
- **实现规格**:
  1. 前端在对话流插入 `SelectedDishesCard` 组件（系统消息样式，非用户/AI 气泡）
  2. 向 AI 发送 system message，包含结构化字段：`{newlySelected: [{dishId, name, price, category}], existingOrder: [{...}]}`
  3. AI 首条回复格式（示例）：
     - 纯新选："收到你选的 3 道菜——2 道主菜、1 道饮品，预估 ¥180。有什么想调整的吗？"
     - 新选+已有："收到你新选的 3 道菜（2 道主菜、1 道饮品），加上点菜单里已有的 5 道，一共 8 道，预估 ¥420。想聊这几道新的，还是看看整桌搭配？"
  4. AI 不主动分析搭配，等用户明确方向后再深入
- **影响**: `docs/product/prd.md` F07 AC7、`app/src/views/AgentChatView.tsx`、`app/src/components/SelectedDishesCard.tsx`、`worker/prompts/agentChat.ts`

---

### [DEC-054] 方案型逐道替换：AI 驱动

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: MealPlanCard 的"替换某道菜"交互需要决定是 UI 驱动（弹出候选列表）还是 AI 驱动（发消息给 AI 推荐替代品）。
- **选项**:
  - A: UI 驱动（即时，但丢失 AI 搭配判断能力）
  - B: AI 驱动（等 AI 响应，推荐质量高，符合 Goal > Process）
  - C: 混合（UI 快速候选 + AI 推荐入口，UI 复杂度高）
- **决策**: **方案 B（AI 驱动）**
- **理由**:
  1. 方案型核心价值是 AI 搭配能力，UI 选菜等于退化成 Explore
  2. 方案型用户已在 3min 决策流程中，额外 2-3s 不是痛点
  3. 符合 Goal > Process：让 AI 动态判断替代品，不用 if-else 过滤
- **实现规格**:
  1. MealPlanCard 每道菜显示「🔄 换一道」按钮
  2. 点击后自动发送消息给 AI："帮我把 {菜名} 换成别的，保持整体搭配"
  3. AI 回复包含新 MealPlanCard 的完整方案（替换后的版本）
  4. 旧 MealPlanCard 标记为"已更新"（灰化，不可操作）
- **影响**: `docs/product/prd.md` F06 AC9、`app/src/components/MealPlanCard.tsx`、`worker/prompts/agentChat.ts`

---

### [DEC-055] MealPlanCard 生命周期：提案模式 + 替换策略 + 并发防抖

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: MealPlanCard 在 Chat 中可能被多次生成/替换，需要定义：(A) 新旧卡片展示策略 (B) 与 Order 的数据关系 (C) 并发防抖。经四方评审（Opus/Codex/Kimi 标 🔴）后逐项讨论。

#### 子决策 A：新旧卡片展示
- **选项**: 追加（保留所有版本）/ 替换（新覆盖旧）/ 灰化（旧卡片折叠保留）
- **决策**: **替换**。新 MealPlanCard 直接替换旧卡片在对话流中的位置，不保留历史。
- **理由**: 用户看完旧方案后可能的有价值行为（回退/部分回退）都无法直接满足，需要 AI 重新生成。保留旧版只增加视觉噪音，无操作价值。

#### 子决策 B：MealPlanCard 与 Order 的关系
- **选项**:
  - 模型 A（提案模式）：MealPlanCard 和 Order 独立数据，「整套加入」= 复制到 Order，之后脱钩
  - 模型 B（共享视图）：MealPlanCard 是 Order 的结构化视图，共享单一数据源
- **决策**: **模型 A（提案模式）**
- **理由**:
  1. MealPlanCard 的核心价值 = AI 搭配逻辑。搭配逻辑依赖菜品组合完整性，外部修改会导致逻辑失效
  2. 模型 B 下每次 Order 变更都要重新调用 AI 更新搭配文字（3-5s），Order 页面应即时响应
  3. 提案模式职责清晰：MealPlanCard 负责决策辅助，Order 负责执行
- **「整套加入」行为**: 方案菜品复制到 Order，同名菜品合并数量 + 轻提示 toast

#### 子决策 C：替换并发防抖
- 用户点「🔄 换一道」后按钮立即禁用（loading 态）
- 请求带 `basedOnVersion` 版本号
- 只有 `version === activeMealPlanId + 1` 的响应落地，旧响应丢弃
- 前端维护 `activeMealPlanVersion` 状态

- **影响**: `docs/product/prd.md` F06/F08、`shared/types.ts`（MealPlan + Order 类型）、`app/src/stores/orderStore.ts`、`app/src/components/MealPlanCard.tsx`

---

### [DEC-056] 过敏原安全策略：AI 排除 + Waiter 入口确认

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: 四方评审（Codex 标 🔴）指出高风险过敏原场景缺乏安全机制。讨论了 AI 推荐排除、加入时弹窗、Order 警告条、Waiter 入口确认等多种方案。
- **决策**: 两条规则
  1. **AI 推荐排除**：用户在 Pre-Chat 声明过敏原后，AI 生成方案时硬排除含已知过敏原的菜品（Prompt 层约束）
  2. **Waiter 入口确认**：用户自行加入含过敏原菜品后，在点击「展示给服务员」时弹底部 sheet 提醒
- **理由**:
  1. 不在「➕ 加入」时弹窗——打断选菜流程，用户可能知情想尝试
  2. 不在 Order 页面警告——过度提醒降低信任感，SAGE 不是医疗设备
  3. 只在 Waiter 入口（最后关口）确认——用户注意力最集中，一次性列出所有风险
- **实现规格**:
  1. Prompt 硬约束：system message 含用户过敏原列表，要求方案不包含这些成分
  2. Waiter 入口：点「展示给服务员」→ 检查 Order 中是否有菜品的 allergenCodes 命中用户过敏原 → 命中则弹底部 sheet："⚠️ 这些菜品可能含你的过敏原，建议向服务员确认：
🥜 Pad Thai（花生）

[确认并继续] [返回修改]"
  3. 确认后正常进入 Waiter Mode，不再重复提醒
  4. 底部 disclaimer（常驻）："过敏原信息仅供参考，请向餐厅确认"
  5. **Waiter Mode 过敏/禁忌栏**：顶部醒目展示用户声明的过敏原和饮食禁忌，面向服务员
     - 语言：图标 + 英文 + 菜单所在地本地语言（三重表达，确保服务员看懂）
     - 位置：菜品列表上方，第一眼可见
     - 仅在用户有声明过敏/禁忌时显示
- **影响**: `docs/product/prd.md` F08、`worker/prompts/agentChat.ts`、`app/src/views/WaiterView.tsx`、`app/src/components/AllergenWarningSheet.tsx`（新组件）、`app/src/components/WaiterAllergyBanner.tsx`（新组件）

---

### [DEC-057] 导航状态机：Order 为唯一执行数据源

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: 四方评审（Kimi 🔴）指出 Explore→Waiter / Explore→Chat→Order→Waiter 多路径交汇时数据源可能不一致。需要定义完整状态转换图。
- **决策**: 6 条状态机规则
  1. **Waiter 唯一数据源 = Order**，无例外
  2. **Explore「展示给服务员」**= 已选菜品写入 Order + 跳转 Waiter
  3. **Explore「咨询 AI」**= 已选菜品写入 Order + SelectedDishesCard 注入 Chat（DEC-053 v2）
  4. **Waiter「继续点菜」**→ Order → 可继续回 Chat/Explore 加菜
  5. **Waiter「结束用餐」**→ 二次确认 → 清空 Order + 清空会话 → Home
  6. **过敏原检查**（DEC-056）在 Order→Waiter 跳转时触发，无论来源路径
- **关键原则**: Explore 选菜无论走哪个出口都写入 Order。用户点「➕ 加入」= "我要这道菜"，意图不因出口不同而改变
- **影响**: `docs/product/prd.md` F07/F08、`app/src/stores/orderStore.ts`、导航路由

---

### [DEC-058] Chat 可直接操作 Order（AI 驱动）

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: 用户在 Chat 中可能表达修改 Order 的意图（"把牛排换成龙虾"）。讨论了三种方案：A 只建议不操作、B 直接操作、C 操作+撤销确认。
- **决策**: **方案 B（AI 直接操作 Order）**
- **理由**:
  1. 用户说"换成龙虾"是明确指令，二次确认或撤销按钮增加不必要的复杂度
  2. Chat 是对话驱动产品的中枢，自然语言修改 Order 是核心能力
  3. 如果 AI 理解错误，用户可以在 Chat 中继续纠正，或去 Order 页面手动调整
- **实现规格**:
  1. AI 回复末尾附带结构化指令，复用 DEC-052 v2 末尾 JSON 代码块模式
  2. 指令 schema：`{"orderAction": "replace|add|remove", "remove": {"dishId": "..."}, "add": {"dishId": "...", "qty": N}}`
  3. 前端检测到 `orderAction` 代码块 → 执行 Order 修改 → AI 文字部分正常展示（"好的，已帮你把牛排换成龙虾 🦞"）
  4. Order 修改后 Chat 的 system message 自动更新（AI 始终感知最新 Order）
- **影响**: `docs/product/prd.md` F06、`shared/types.ts`（OrderAction 类型）、`app/src/views/AgentChatView.tsx`、`app/src/stores/orderStore.ts`、`worker/prompts/agentChat.ts`

---

### [DEC-059] 方案型课程结构：AI 动态生成，不硬编码西餐逻辑

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: PRD 方案型描述为"前菜→主菜→甜品→饮品"，这是西餐逻辑。不同餐饮文化有不同课程结构（中餐：凉菜→热菜→汤→主食；日料：前菜→刺身→烤物→煮物→食事→甜品；泰餐：共享式同时上桌）。
- **决策**: MealPlanCard 的课程分组由 AI 根据菜单所属餐饮文化动态决定，前端只负责渲染 AI 返回的 courses 数组，不假设固定顺序。
- **实现规格**:
  1. MealPlan JSON 的 `courses` 为有序数组，每个 course 有 `name`（如"凉菜"/"刺身"/"Starter"）和 `items`
  2. Prompt 指示 AI 根据 `detectedCuisineType` 和菜单内容决定课程结构
  3. 菜品 <5 道时不输出 MealPlanCard，改为自然语言推荐
- **影响**: `shared/types.ts`（MealPlan.courses 结构）、`worker/prompts/agentChat.ts`、`docs/product/prd.md` F06

---

### [DEC-060] Waiter Mode 指点式沟通面板：解决服务员-用户语言障碍

- **日期**: 2026-03-02
- **决策人**: Mr. Xia
- **背景**: 用户展示 Waiter Mode 后，服务员下单回来告知某菜售罄需换菜，但双方语言不通。这恰恰是 SAGE 核心要解决的问题。讨论了三种方案：A 服务员操作模式（不现实）、B 指点式沟通（用户点菜品弹双语面板）、C 实时翻译（偏离场景聚焦）。
- **决策**: **方案 B（指点式沟通面板）**
- **理由**:
  1. 零学习成本——服务员只需指，用户点击
  2. 场景聚焦——只有餐饮相关选项（没有了/换菜/加份/其他）
  3. 双语大字展示——双方都能看懂
  4. 自然衔接——标记售罄后可进入 Chat 让 AI 推荐替代品
- **实现规格**:
  1. Waiter Mode 下点击任意菜品 → 弹出沟通面板
  2. 面板选项（双语展示，用户语言 + 菜单所在地语言）：
     - 🚫 没有了 / ไม่มี (sold out)
     - 🔄 换一道 / เปลี่ยน (change)
     - ➕ 加一份 / เพิ่ม (add more)
     - ❓ 其他问题 (other)
  3. 选「🚫 没有了」→ 大字确认（服务员语言）→ 确认后从 Order 移除 → 提示用户是否需要 AI 推荐替代品
  4. 选「🔄 换一道」→ 大字询问服务员推荐（服务员语言）→ 用户可进 Explore 找菜或进 Chat 让 AI 推荐
  5. 选「➕ 加一份」→ Order 数量 +1
  6. 选「❓ 其他」→ 进入 Chat（携带菜品上下文）
  7. 沟通面板的本地语言由 AI 识别菜单时的 `detectedLanguage` 决定
- **影响**: `docs/product/prd.md` F08（Waiter Mode 新增交互）、`app/src/views/WaiterView.tsx`、`app/src/components/DishCommunicationPanel.tsx`（新组件）

---

### DEC-061 — MealPlanCard 替换策略：追加模式

**日期**: 2026-03-02  
**背景**: 第二轮三方评审（Opus/Codex/Qwen）发现 DEC-055 "替换旧卡片位置" 与 Spec "旧卡灰化保留" 逻辑矛盾，且 "同 slot 替换" 破坏 Chat 消息流的 append-only 模式  
**决策**: 采用追加模式——新 MealPlanCard 作为新消息追加到对话流末尾，旧 MealPlanCard 标记 isActive=false 灰化（不可操作，保留历史脉络）  
**理由**: 保留用户决策历史 + 符合 React immutable 数据范式 + 实现简单  
**影响**: 更新 mealplan-and-order-spec.md §3.3 生命周期规则  
**状态**: ✅ 夏总确认

---

### DEC-062 — Explore→Chat 首条回复加轻量 CTA

**日期**: 2026-03-02  
**背景**: 第二轮评审指出 DEC-053v2 "不主动分析搭配" 在用户主动咨询 AI 的场景下可能太保守  
**决策**: AI 首条回复 = 事实摘要 + 开放引导 + 末尾快捷按钮（QuickReplies）如 "看看搭配建议" / "聊聊某道菜"  
**理由**: 快捷按钮是引导不是强制，不违反 Scenario-Free 原则，降低用户思考成本  
**影响**: 更新 explore-chat-injection-spec.md §5 AI 首条回复  
**状态**: ✅ 夏总确认

### DEC-063 — 自顶向下一致性闸门

**日期**: 2026-03-02  
**背景**: Sprint 3 复盘发现 40% 的 🔴 源于规格不一致（DEC 之间、DEC 与 Spec 之间、Spec 与 Type 之间）。根因是变更直接从 DEC 跳到 Spec 编写，未回溯检查上游文档一致性。  
**决策**:  
1. 任何愿景/方向/需求/业务逻辑变更，必须自顶向下落地：**愿景(vision.md) → PRD(prd.md)/设计文档 → Spec → 代码/测试**，每层变更前确认上游已对齐  
2. **目标和需求不明确不清晰时，绝对不进入详细设计和研发**  
3. 进入编码前必须完成「一致性矩阵」自查：DEC ↔ PRD ↔ Spec ↔ shared/types.ts ↔ Prompt，逐对交叉验证无矛盾  
4. 先以愿景为中心充分发散（探索所有可能性），再沿核心主线收敛、聚焦到 MVP 最小必要功能集  
**理由**: 前置 30 分钟一致性检查，可消除后续 40% 的 🔴 返工  
**影响**: 更新 AGENTS.md 六步法、TASK_TEMPLATE.md  
**状态**: ✅ 夏总确认

### DEC-064 — 测试分层配比标准

**日期**: 2026-03-02  
**背景**: Sprint 3 写了 106 条测试但 Codex 初评覆盖率仅 5/10。原因是 100% 单元/组件测试，0% 集成/E2E，Worker 端 0 测试。DEC-035（Spec→Test→Code）未被执行，测试是代码完成后"补"的。  
**决策**:  
1. 测试分层配比：**单元 50% / 组件 20% / 集成 20% / E2E 10%**  
2. Worker handler 变更必须附带至少 1 个单元测试  
3. 新功能的 P0 验收条件必须在编码前写成 `.test.ts`（非 markdown checklist）  
4. 测试不是"补"的，是 Spec 阶段前置写骨架的  
**理由**: 测试金字塔结构 + 前置编写 = 真正的 Spec 驱动开发  
**影响**: 更新 AGENTS.md 三级门控、TASK_TEMPLATE.md  
**状态**: ✅ 夏总确认

### DEC-065 — Sprint 收尾纪律

**日期**: 2026-03-02  
**背景**: Sprint 3 开头花 2 小时补 Sprint 2 的文档债（architecture.md/api-design.md 未同步更新到 v2.0），直接违反 DEC-039。  
**决策**:  
1. Sprint 完成后 **24 小时内**必须完成文档同步（docs/ 下所有 .md 版本号与代码对齐）  
2. 文档同步未完成时，不得开始下一 Sprint  
3. Sprint 收尾 checklist：文档同步 + 测试覆盖率报告 + 下一 Sprint 前置依赖检查 + 复盘记录  
**理由**: 消除跨 Sprint 文档债务，防止下一 Sprint 开头还债  
**影响**: 更新 AGENTS.md Sprint 收尾流程  
**状态**: ✅ 夏总确认

---

### [DEC-059v2] MealPlanCard 触发阈值修订 + 术语修正

- **日期**: 2026-03-03
- **决策人**: Mr. Xia
- **覆盖**: DEC-059 中"菜品 <5 道时不输出 MealPlanCard"的规则
- **变更**:
  1. **触发阈值**: ≥2 道菜即输出 MealPlanCard（原规则 <5 道不出卡片，已废弃）
  2. **术语修正**: 文档中所有"课程"（course 的错误翻译）改为"分组"。代码中 `courses` 变量名保留不变
- **理由**: 
  1. 即使只有 2 道菜，结构化卡片（含价格、替换、一键加入订单）也比纯文字推荐更有操作价值
  2. "课程"在中文里是教育用语，餐饮语境下 course = 一道/一轮上菜，中性表达用"分组"
- **影响**: `DECISIONS.md`、`docs/product/prd.md`、`worker/prompts/agentChat.ts`、`shared/types.ts`（注释）

---

### [DEC-066] Sprint 3 Round 4 Bug 修复决策

- **日期**: 2026-03-03
- **决策人**: Mr. Xia + SAGE
- **变更**:
  1. **OPEN-001**: Badge 显示总份数（非种类数）— `orderItems.reduce(sum + qty)`
  2. **ISSUE-008**: Explore 菜品卡语言顺序 — 用户语言大字(font-semibold)，菜单原文小字(text-sm)
  3. **BUG-D/E/I**: 货币符号统一 — 全视图使用 `formatPrice(price, currency)`，currency 从 menuData 传入
  4. **BUG-G**: iOS Safari 输入框 font-size >= 16px 防自动缩放
  5. **BUG-H**: AI JSON 解析兜底 — tryParseChatJson() fallback
  6. **BUG-F**: Enrich 失败推送 enrich_error 事件，不静默吞错
  7. **BUG-J**: Prompt 强制 ≥2 道菜必须输出 MealPlan JSON（不允许纯文本推荐）
- **状态**: ✅ 已部署

---

### [DEC-067] Sprint 4 重新规划 — 个性化记忆系统

- **日期**: 2026-03-03
- **决策人**: Mr. Xia
- **变更**: 原 Sprint 4（Beta 功能：邀请码/埋点/欢迎屏/反馈）推迟到 Sprint 5
- **新 Sprint 4 内容**:
  1. **T1 历史记录**: 扫描/对话/点餐完整历史，可回溯
  2. **T2 记忆机制**: 从历史提取持久化用户画像（口味、过敏原、饮食习惯等）
  3. **T3 自我进化**: 基于历史+记忆，AI 越用越懂用户
- **双重目标**:
  - 面向用户：个性化服务
  - 面向产品：用户行为数据是迭代依据（覆盖不到的场景、做得不好的环节）
- **理由**: "了解主人"是从工具到伙伴的本质升级，也是产品壁垒
- **状态**: ✅ 夏总确认，明天进入 Spec 阶段

---

### [DEC-068] VL+Enrich 合并为单次 Gemini 调用 (Prompt v9)

- **日期**: 2026-03-03
- **决策人**: SAGE
- **背景**: Enrich 阶段频繁失败（百炼 429 限流 + Cloudflare 东京→百炼跨境延迟），导致菜品 brief/allergen 全部为空
- **变更**:
  1. `worker/prompts/menuAnalysis.ts` 重写为 Prompt v9：单次 Gemini 2.0 Flash 调用同时完成 OCR + 语义补全
  2. `worker/handlers/analyze.ts` 移除 Step 2 Enrich 阶段，只保留 Step 1 VL
  3. 原来的两阶段（VL→Enrich）合并为一阶段，响应结构不变（前端无需改动）
- **影响**: 
  - 总延迟: ~18s（原两阶段 ~19s，略快）
  - 成功率: 大幅提升（消除 Enrich 失败点）
  - Prompt token: 增加（单次 prompt 更长），但省去了一次 API 调用
- **关联**: DEC-044(stream=false), DEC-045(Gemini for VL+Enrich)
- **状态**: ✅ 已部署 (commit 08017a5)

---

### [DEC-069] BUG-K processAIResponse 提前 return 修复

- **日期**: 2026-03-03
- **决策人**: SAGE
- **背景**: Handoff 后主 Chat AI 回复流式完成（464 字符），但 UI 不渲染新消息，chatPhase 卡在 `handing_off`
- **根因**: `AgentChatView.tsx` L730 `processAIResponse()` 中，当 JSON 代码块被 `parseJsonBlock` 判定为非 mealPlan/orderAction 时，进入 else 分支调用 `tryParseChatJson(jsonStr)`。该函数成功解析后返回 `true`，随即 `return` 退出整个 `processAIResponse`——跳过了后续的 `dispatch({ type: 'ADD_MESSAGE' })` 和 `dispatch({ type: 'SET_CHAT_PHASE', phase: 'chatting' })`
- **修复**: `if (tryParseChatJson(jsonStr)) return;` → `if (!tryParseChatJson(jsonStr)) { /* L3 fallback */ }`
- **附带修复**: BUG-J（MealPlanCard 不出现）— 同一根因，因为 chatPhase 卡在 handing_off 导致后续 mealPlan 回复也无法正常处理
- **状态**: ✅ 已部署 (commit 5208e90)

---

### [DEC-070] Git Hooks 硬门控

- **日期**: 2026-03-04
- **决策人**: SAGE
- **背景**: Sprint 3 四方审计得分 2.2/5，AGENTS.md 8 条规则执行率仅 19%。根因是规则靠自觉不靠工具。
- **决策**: 创建 `.githooks/pre-commit` + `.githooks/commit-msg`，工具化强制：
  1. pre-commit: tsc --noEmit + vitest run（scope-aware，docs-only 跳过）
  2. commit-msg: `fix:` 必须关联 .test. 文件；`worker/prompts/` 变更必须有 Before:/After: 行
- **效果**: 规则执行率 19% → 100%（机械化强制）
- **安装**: `bash setup-hooks.sh`（设置 `git config core.hooksPath .githooks`）
- **状态**: ✅ 已上线 (commit 3f0751d)

---

### [DEC-071] Deploy 门控脚本

- **日期**: 2026-03-04
- **决策人**: SAGE
- **背景**: 裸 `wrangler deploy` 无任何质量检查，可能部署编译不过的代码
- **决策**: `scripts/deploy.sh` 4 层门控：
  1. L1: TypeScript 编译（scope-aware）
  2. L2: vitest 测试（scope-aware）
  3. L3: Build（仅 app）
  4. L4: Git 状态检查（警告不阻断）
- **旁路**: `--force` 跳过质量门（保留环境变量检查 + app build）
- **其他**: `--dry-run` 仅跑门控不部署
- **状态**: ✅ 已上线 (commit 70caf88, bugfix 62730ff)

---

### [DEC-072] processAIResponse 纯函数提取

- **日期**: 2026-03-04
- **决策人**: SAGE
- **背景**: processAIResponse 在 AgentChatView.tsx 中是闭包（L642-L810），直接操作 dispatch/state/setters，无法独立单元测试
- **决策**: 提取为纯函数 `app/src/utils/processAIResponse.ts`：
  - 输入: `ProcessAIResponseInput`（fullText, mode, chatPhase, menuItemIds, language, replacingVersion）
  - 输出: `ProcessAIResponseResult`（messages, quickReplies, recommendations, orderAction, toasts...）
  - 不生成 id/timestamp（由调用方负责）
  - 不操作 React state
- **测试**: 10 条回归测试（含 BUG-K #6/#7），替换原有 mock 版本
- **交叉审查**: Opus-A 设计 → Codex-A 审查(3 mandatory fixes) → Codex CLI 编码 → Opus-B 审查(通过)
- **状态**: ✅ 已上线 (commit cacc505)

---

### [DEC-073] AGENTS.md 知识地图重构

- **日期**: 2026-03-04
- **决策人**: SAGE
- **背景**: OpenAI Harness Engineering 原则 "Give Codex a map, not a 1,000-page manual"。AGENTS.md 331 行，上下文占用过大，实际执行率低。
- **决策**: 重构为 93 行"知识地图"：
  - 4 条铁律（hook 机械化强制）
  - 知识索引表（指向 docs/ 下已有文档）
  - 项目结构速查
  - 当前 Sprint 状态
- **迁移**: 研发方法论 → `docs/engineering/spec-driven-workflow.md`；Hook 信息 → `docs/engineering/engineering-guardrails.md`
- **状态**: ✅ 已上线 (commit 119074b)

---

### [DEC-074] 交叉审查工作流 v1.0

- **日期**: 2026-03-04
- **决策人**: SAGE + 夏总
- **背景**: Sprint 3 自我审查形成"虚假繁荣"（8.4/10 自评，实际 2.2/5）
- **决策**: 四步交叉审查，主 session 纯协调：
  1. Opus-A 设计 → 2. Codex-A 审查 → 3. Codex-B 编码 → 4. Opus-B 审查
  - "设计者不审自己的设计，编码者不审自己的代码"
  - 风险分级：High 全 4 步，Medium 3 步（跳设计审查），Low 协调者直接执行
- **实际效果**: Phase 1a/1b/2 共发现 10+ 个设计/实现问题，其中 4 个是真实 bug
- **文档**: `docs/engineering/cross-review-workflow.md`
- **状态**: ✅ 已建立 (commit f644bc7)

---

### [DEC-075] Agent Swarm 五项改进（Elvis 架构对标）

- **日期**: 2026-03-05
- **决策人**: SAGE + 夏总
- **背景**: 对标 Elvis Sun (@elvissun) 的 OpenClaw + Codex/Claude Code Agent Swarm 架构，识别 SAGE 在并行度、自动化、学习闭环上的差距
- **参考**: `memory/ref-elvissun-agent-swarm.md`
- **决策**: 五项改进，Sprint 4b 期间穿插落地（总计 ~6-7 天）

#### 改进 1：git worktree 并行（0.5 天）
- 每个编码 Agent 独立 worktree + branch，通过 sessions_spawn 的 cwd 参数隔离
- Mac Mini 16GB 预计支持 3-4 个并行 Agent
- 任务完成后自动 git worktree remove 清理

#### 改进 2：自动化双路 Code Review — cron 方案（1-2 天）
- PR 创建后 cron 自动触发两路审查：
  - Codex (gpt-5.3-codex)：逻辑、边界 case、race condition、类型一致性
  - Opus 4.6：PRD AC 对照、安全、UX 一致性
- Definition of Done：PR + CI + 双路 Review 全过 → Telegram 通知夏总
- Review 有 critical → 自动 respawn 修复（最多 2 次）→ 仍失败 → SAGE 介入
- 选择 cron 方案（B）而非 GitHub Actions（A）：复用现有基础设施 + 不暴露 API Key + 可带业务 context

#### 改进 3：PR 截图 + E2E 自动化（3 天，三阶段）
- **3A 短期**（1 天）：playwright.config screenshot: 'on'，截图附到 PR comment
- **3B 中期**（2 天）：
  - 补 data-testid（规范：sage-{component}-{element}）
  - API Mock 层（page.route() 拦截 analyze/chat）
  - 标准 mock fixture：thai-dense-01 的识别结果
  - 新增 main-flow.spec.ts（完整主路径 30s）+ regression.spec.ts（BUG-001~004）
  - 多图补充扫描 E2E（english-03~07 Cheesecake Factory 5 页）
- **3C 后期**：截图 baseline 对比 + Waiter/MealPlan 路径 + 真实 API 集成测试
- **测试素材**：22 张真实菜单图片（7 语种），已清理 AI 生成/stock photo 假图

#### 改进 4：Agent 任务 Registry（1 天）
- .sage/active-tasks.json 结构化跟踪所有在跑的 Agent
- 字段：id, branch, worktree, agent, model, sessionKey, status, pr, checks, retries
- 生命周期：running → pr_created → reviewing → ready → merged
- cron 每 10min 扫描：检查 session 存活、PR 状态、CI 状态、Review 状态
- 自动 respawn 失败 Agent（retries < maxRetries）

#### 改进 5：Prompt 模式记忆（0.5 天 + 持续积累）
- .sage/prompt-patterns.md 按任务类型索引
- 记录每类的成功率、关键要素、模型偏好、教训
- Agent 任务一次通过 → 自动提取成功模式；失败 → 记录失败原因 + 修正 diff
- 与 TASK_TEMPLATE.md 互补：模板定结构，patterns 定填法

- **状态**: ✅ 方案确认，待 Sprint 4b 落地

## DEC-076: 实现/测试 Agent 分离（2026-03-05）

**背景**: Codex 审计发现 19 个测试文件总评 6.6/10，存在大量假绿（测试内重写业务逻辑）、宽松断言（toBeTruthy）、自证式测试。根因是同一个 Agent 写代码又写测试，动机是"让测试通过"而非"找出 bug"。

**决策**:
- 编码任务拆为两个独立 Agent：Agent A（实现）+ Agent B（测试）
- Agent B 只读 Spec + 类型 + 函数签名，**禁止阅读实现代码**（黑盒测试）
- 两个 Agent 可并行：A 写实现，B 基于 Spec 写测试骨架
- A 完成后跑 B 的测试，失败的退回 A 修

**模板**:
- `TASK_TEMPLATE_IMPL.md` — 纯实现，不写测试
- `TASK_TEMPLATE_TEST.md` — 纯测试，含质量红线 6 条

**质量红线**:
1. 禁止测试内重写被测逻辑
2. 禁止 toBeTruthy/toBeDefined 作为核心断言
3. 禁止 setTimeout 刷异步
4. 禁止条件分支断言
5. 禁止 toContain 作为唯一断言
6. localStorage mock 必须 Object.defineProperty 无条件覆盖

**拍板**: 夏总 ✅

## DEC-077: AI 工作范式——认知独立性原则（2026-03-06）

- **日期**: 2026-03-06
- **决策人**: 共同（夏总 + SAGE）
- **背景**: 讨论 AI 工作范式的深层问题。"并行 vs 串行"只是表象，更本质的问题是：AI 的思维有路径依赖，同一个 AI 的信息连续性本身是风险。引入多 Agent 的最高价值不是省时间或探索多方案，而是保持**认知独立性**。DEC-076（实现/测试 Agent 分离）是这一原则的具体实例。
- **决策**:
  1. **三维判断框架**：时间（串行降复杂度）/ 探索（并行扩覆盖）/ 认知独立（隔离上下文）
  2. **认知独立 > 并行探索 > 时间节省**（价值优先级）
  3. 需要认知独立的场景：同一 Agent 既生成又验证、自己设计自己审查、多轮迭代产生锚定
  4. SAGE 的职责：制定验收标准 + 设计信息隔离边界，不在单一思维链中既生成又验证
- **影响**: AGENTS.md（workspace）原则 0.5；DEC-076 的理论根基
- **拍板**: 夏总 ✅

## DEC-078: AI 原生工作方式（2026-03-06，补充 DEC-077）

- **日期**: 2026-03-06
- **决策人**: 共同（夏总 + SAGE）
- **背景**: DEC-077 表述过于框架化（"三维判断框架"），是把深层认知压缩成条款的产物，本身就是旧思维范式的体现。今天更深入的讨论揭示了两条更根本的原则。
- **决策**:
  1. **移除资源分配心理变量**：规划时不考虑工作量大小、路径多少、会不会重复。这些是人类分配有限资源的心理变量，对 AI 不适用。规划思维里没有这个过滤器。
  2. **完成 = 目标达成，不是产物交付**：文档写了、代码合并了、测试通过了，都不是完成。完成是功能真正跑通、用户问题真正被解决。产物只是路径。
  3. DEC-077 的认知独立性是第二条的具体推论：同一 AI 既生成又验证，"完成"的定义就会被污染。
- **影响**: SOUL.md § AI 原生工作方式（权威来源）；AGENTS.md 原则 0.5
- **拍板**: 夏总 ✅
