# DECISIONS.md — 重要决策记录

> 规则：**仅追加，不修改历史记录。**  
> 每条决策包含：背景、选项、决策结果、决策人、日期。  
> 目的：防止"为什么当初这么做"的失忆问题，支持多 Agent 协作时的一致性。

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

*后续决策按此格式追加，不修改以上历史记录。*
