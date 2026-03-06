# PROGRESS.md — 实时进展

> 更新规则：每完成一项任务立即更新本文件。  
> 这是所有 Agent 的共享状态板，任何 Agent 都可读写。  
> 格式：`[日期 时间] 操作内容`

---

## 当前状态

**阶段**: Sprint 4b ✅ 完成
**当前子阶段**: Sprint 5 Beta 内测 — 待规划
**整体进度**: Sprint 0 ✅ | Sprint 1 ✅ | Sprint 2 ✅ | Sprint 3 ✅ | Sprint 4a ✅ | Sprint 4b ✅
**最后更新**: 2026-03-06 18:45

## 🌐 线上地址
- **App**: https://sage-next-gen.pages.dev (deploy: 62730ff)
- **Worker**: https://sage-worker.xiafy920.workers.dev

---

## 🔴 进行中（锁定区）

**Sprint 4b Phase 2: Memory System (DEC-067)** ✅
- [x] Step 0: Spec 审查 + 一致性闸门 — 通过 (2026-03-06)
- [x] Step 1: types + 偏好迁移 + 版本化 — memory.ts 全套
- [x] Step 2: 会话持久化 + sessionId + 边界检测 — AppContext
- [x] Step 3: Worker /api/memory/summarize — 线上验证通过 (59c3faf)
- [x] Step 4: 懒摘要 hook + 前端 API — useLazySummarize
- [x] Step 5: Chat prompt 记忆注入 — agentChat.ts matchSessions
- [x] Step 6: Zod schema null 兼容修复 + 部署
- 待做: 真机端到端验证（App 打开 → 摘要生成 → 下次会话注入）

## ✅ Sprint 4b Phase 1: Agent Swarm 基建 (2026-03-05)

12 commits: `76460a4` → `ad62405` (DEC-075)
- Step 1: git worktree 并行脚本 (.sage/worktree.sh) — v2 通过
- Step 2: Agent Task Registry (.sage/task-manager.sh + active-tasks.json) — v2 通过
- Step 3: 自动化双路 Code Review (.sage/auto-review.sh) — v4 9.0/10
- Step 4: PR Screenshot + E2E — 25 data-testid + API mock + 14 E2E tests
- Step 5: Prompt 模式记忆 (.sage/prompt-patterns.md)
- 测试: 175 单测 + 14 E2E specs 全绿

## ✅ Sprint 4a 完成 (2026-03-04)

9 commits: `36088cc` → `62730ff`
- Git hooks 硬门控 (pre-commit + commit-msg)
- Deploy 门控脚本 (scripts/deploy.sh)
- processAIResponse 纯函数提取 + 10 回归测试
- AGENTS.md 331→93 行重构
- Prompt fixtures + verify 脚本
- 线上部署：https://48bd630c.sage-next-gen.pages.dev

## 🔴 进行中（锁定区）

无。Sprint 3 已完成。

---

## 🔧 Sprint 1 复盘改进（2026-02-26 晚）✅

| # | 改进项 | 状态 |
|---|--------|------|
| 1 | 创建 `shared/types.ts` 共享类型包（DEC-031）| ✅ |
| 2 | App `types/index.ts` 改为从 shared re-export | ✅ |
| 3 | App/Worker tsconfig 加入 shared include | ✅ |
| 4 | `chat.ts` 重写：使用 shared ChatRequest 类型 + 正确的 preferences 转换 | ✅ |
| 5 | `analyze.ts` 重写：使用 shared AnalyzeRequest 类型 + TIMEOUTS 常量 | ✅ |
| 6 | AGENTS.md 全面重写（§0 必读清单 + §7 三级门控 + §8 契约规则）（DEC-032）| ✅ |
| 7 | 创建 TASK_TEMPLATE.md（DEC-033，已归档至 archive/）| ✅ |
| 8 | DECISIONS.md 记录 DEC-031/032/033 | ✅ |
| 9 | 前端 `tsc --noEmit` 零错误验证 | ✅ |
| 10 | 前端 `vite build` 成功（286 KB JS）| ✅ |
| 11 | Worker `tsc --noEmit` 零错误验证 | ✅ |

---

## 🔧 真机验收 Bug 修复（2026-02-26 晚）✅

| # | 修复项 | 状态 |
|---|--------|------|
| 1 | `START_ANALYZE` Path C 时不覆盖 chatPhase | ✅ |
| 2 | AgentChatView 移除冗余 `SET_CHAT_PHASE` dispatch | ✅ |
| 3 | HomeView 合并重复 afternoon 问候区间 | ✅ |
| 4 | **Worker: Zod tags 宽容处理** — `z.enum()` → `z.string().transform(filter)` | ✅ |
| 5 | Worker 重新部署 | ✅ |
| 6 | App 重新部署 | ✅ |
| 7 | curl 端到端测试：菜单识别成功（9 道菜）| ✅ |

---

## ✅ 已完成

### Sprint 0 — 文档完备（M1 里程碑）✅

| 完成时间 | 文件/任务 | 说明 |
|---------|------|------|
| 2026-02-25 | 目录结构 | 六层目录体系建立 |
| 2026-02-25 | `README.md` / `AGENTS.md` | 人类文档 + Agent 工作手册 |
| 2026-02-25 | `PLANNING.md` / `PROGRESS.md` / `DECISIONS.md` | 核心管理文档 |
| 2026-02-25 | `docs/product/vision.md` v1.1 | 产品愿景，已与 Mr. Xia 对齐 |
| 2026-02-25 | `docs/product/competitive-analysis.md` | 竞品分析 v1.0 |
| 2026-02-25 | `docs/product/prd.md` v1.4 | F01-F10 全部对齐（DEC-016~027）|
| 2026-02-25 | `docs/user-stories.md` | 20 个用户故事，6 组场景 |
| 2026-02-25 | `docs/product/ux-principles.md` | 10 条 UX 原则 + 反模式清单 |
| 2026-02-25 | `docs/product/visual-design.md` | 完整视觉规范 + Tailwind v4 配置 |
| 2026-02-25 | `docs/product/icebreaker-state-machine.md` v1.1 | Pre-Chat 状态机设计（DEC-027）|
| 2026-02-26 | `docs/technical/architecture.md` v1.1 | OQ3/OQ4 解决，TBD 全清，DEC-028 更新 |
| 2026-02-26 | `docs/technical/api-design.md` v1.0 | 完整 API 契约（错误码/超时/重试/Prompt）|
| 2026-02-26 | `docs/technical/tech-stack.md` v1.0 | 技术栈选型说明 |
| 2026-02-26 | `docs/technical/deployment.md` v1.0 | CI/CD + Secret + 回滚 + 成本 |
| 2026-02-26 | `tests/test-plan.md` v1.0 | 5 层测试策略 |
| 2026-02-26 | `tests/test-cases.md` v1.0 | 60+ 用例，L1-L5 |

### Sprint 1 Phase 0 — Prompt Lab ✅

| 完成时间 | 任务 | 结果 |
|---------|------|------|
| 2026-02-26 | 确认可用模型 ID | qwen3-vl-plus / qwen3-vl-flash / qwen3.5-plus / qwen3.5-flash |
| 2026-02-26 | 生成合成测试菜单图片 | `test-images/menu_ja_izakaya.jpg` + `menu_zh_restaurant.jpg` |
| 2026-02-26 | Task 1: 菜单识别测试 | ✅ PASS — Schema 全通，翻译准确 |
| 2026-02-26 | Task 2: Pre-Chat 测试 v1 | ❌ FAIL — AI 不听用户输入，偏好提炼弱 |
| 2026-02-26 | Task 2: Pre-Chat 测试 v2 | ✅ PASS — 重写 Prompt，3/3 场景通过 |
| 2026-02-26 | Task 3: Handoff + 主 Chat | ✅ PASS — 2 轮完成决策，推荐尊重忌口 |
| 2026-02-26 | Task 4: Streaming 速度测试 | ✅ PASS — 平均 TTFT 377ms（目标 <1.5s）|
| 2026-02-26 | **DEC-028 发现并记录** | `enable_thinking: false` 必填，22x 速度提升 |

关键产出（`tests/prompt-lab/`）：
- `test-01-menu-recognition.mjs` — 菜单识别测试脚本
- `test-02-pre-chat.mjs` / `test-02-pre-chat-v2.mjs` — Pre-Chat 测试（v2 通过）
- `test-03-handoff.mjs` — Handoff + 主 Chat 测试
- `test-04-streaming.mjs` — Streaming 速度验证

### Sprint 1 Phase 1 — Cloudflare Worker ✅

| 完成时间 | 文件 | 说明 |
|---------|------|------|
| 2026-02-26 | `worker/index.ts` | 入口路由（GET health / POST analyze / POST chat）|
| 2026-02-26 | `worker/middleware/cors.ts` | CORS 白名单（Pages + localhost）|
| 2026-02-26 | `worker/utils/bailian.ts` | Bailian 流式客户端（聚合 + 透传两种模式）|
| 2026-02-26 | `worker/utils/rateLimit.ts` | IP 限速（内存 Map，20/100 次/小时）|
| 2026-02-26 | `worker/utils/errors.ts` | 标准化错误响应（8 种错误码）|
| 2026-02-26 | `worker/utils/logger.ts` | 结构化日志 |
| 2026-02-26 | `worker/prompts/menuAnalysis.ts` | 菜单识别 Prompt（已验证）|
| 2026-02-26 | `worker/prompts/preChat.ts` | Pre-Chat Prompt v2（双语）+ Icebreaker 本地生成 |
| 2026-02-26 | `worker/prompts/agentChat.ts` | 主 Chat Prompt（模板填充 + 智能菜单采样）|
| 2026-02-26 | `worker/schemas/menuSchema.ts` | Zod schema（菜单识别结果校验）|
| 2026-02-26 | `worker/schemas/chatSchema.ts` | Zod schema（请求/响应校验）|
| 2026-02-26 | `worker/handlers/analyze.ts` | 识别 handler（主/降级模型，Zod 校验）|
| 2026-02-26 | `worker/handlers/chat.ts` | 对话 handler（SSE 透传，Pre/主 Chat 分支）|
| 2026-02-26 | `worker/handlers/health.ts` | 健康检查 handler |
| 2026-02-26 | `worker/wrangler.toml` / `tsconfig.json` | Worker 配置 |
| 2026-02-26 | **验证通过** | `tsc --noEmit` 零错误；`wrangler dev` 启动；端到端 SSE 流式测试通过 |

### Sprint 1 Phase 2 — App 骨架 ✅

| 完成时间 | 文件 | 说明 |
|---------|------|------|
| 2026-02-26 | `app/src/index.css` | Tailwind v4 `@theme`（品牌色 #6366F1 等 12 个变量）|
| 2026-02-26 | `app/src/types/index.ts` | 全量 TypeScript 类型定义 |
| 2026-02-26 | `app/src/context/AppContext.tsx` | `useReducer` 状态机（7 actions，4 chat phases）|
| 2026-02-26 | `app/src/hooks/useAppState.ts` | 便捷 hook |
| 2026-02-26 | `app/src/views/HomeView.tsx` | 首屏（品牌 + 扫描按钮 + 设置入口）|
| 2026-02-26 | `app/src/views/ScannerView.tsx` | 相机/上传页（深色，最多 5 张图片预览）|
| 2026-02-26 | `app/src/views/AgentChatView.tsx` | AI 对话页（Pre-Chat 进度条 + 消息区 + 快捷回复）|
| 2026-02-26 | `app/src/views/OrderCardView.tsx` | 点单卡片（数量控制 + 合计 + 展示给服务员按钮）|
| 2026-02-26 | `app/src/views/WaiterModeView.tsx` | 服务员模式（黑底大字原文）|
| 2026-02-26 | `app/src/components/` | TopBar / ChatBubble / QuickReplies / LoadingDots |
| 2026-02-26 | `app/src/App.tsx` / `main.tsx` | 路由 + 入口 |
| 2026-02-26 | **验证通过** | `tsc --noEmit` 零错误；`npm run build` 成功（206 KB JS，14.9 KB CSS）；dev server HTTP 200 |

### Sprint 1 Phase 3 — API 集成 ✅

| 完成时间 | 任务 | 说明 |
|---------|------|------|
| 2026-02-26 | T1: API 客户端层 | `src/api/config.ts`（Worker URL from env）+ `analyze.ts`（base64+HEIC→JPEG）+ `chat.ts`（SSE 流式解析）|
| 2026-02-26 | T2: ScannerView → `/api/analyze` | 真实 `<input type="file">` 图片选择、缩略图预览、删除单张、30s 超时、AbortController |
| 2026-02-26 | T3: AgentChatView → `/api/chat` | Pre-Chat icebreaker + 流式对话 → Handoff 自动检测 → 主 Chat 推荐 + 推荐卡片 + 快捷回复 |
| 2026-02-26 | T4: OrderCardView 完善 | 移除 mock 数据，使用 AppContext 真实 orderItems，空状态引导 |
| 2026-02-26 | T5: 错误处理 | 网络异常 Toast（3s 自动消失）、识别超时（30s）、JSON 解析降级、组件 unmount abort |
| 2026-02-26 | T6: 验证通过 | `tsc --noEmit` 零错误；`npm run build` 成功（269 KB JS，17.7 KB CSS）|
| 2026-02-26 | T7: 文档同步 | PROGRESS.md + EXECUTION_STATE.md 更新 |

### Sprint 1 Phase 5 — P0 审计修复（2026-02-26）✅

| 完成时间 | 任务 | 说明 |
|---------|------|------|
| 2026-02-26 | T1: F06 Pre-Chat 状态机修复 | AgentChatView 重构，analyze 异步化，恢复 pre_chat→handing_off→chatting |
| 2026-02-26 | T2: F09/F10 localStorage 持久化 | AppContext 启动读取 + 变更写入，系统语言自动检测 |
| 2026-02-26 | T3: F02 Scanner 重构 | 确认即跳 Chat + 后台分析，图片压缩<2MB，Path C 返回逻辑修复 |
| 2026-02-26 | T4: F01 动态问候语 | HomeView 基于时段显示问候语，移除"继续上次"（DEC-018）|
| 2026-02-26 | T5: Codex 审计修复 | 修复 2🔴严重问题（CLEAR_ANALYZING_FILES/Path C 入口/failed 态逻辑）|
| 2026-02-26 | T6: P1/P2 中等问题修复 | 完成 F02 相机权限检测、F03 错误文案映射、F04 GPS 静默请求、F08 waiter 模式优化、chat 偏好契约对齐 |
| 2026-02-26 | 验证通过 | `pnpm build` 成功（282 KB JS，20.8 KB CSS）|

### Sprint 1 Phase 4 — UI 完善 ✅

| 完成时间 | 任务 | 说明 |
|---------|------|------|
| 2026-02-26 | T1: types/index.ts 扩展 | ViewName 新增 'explore' \| 'settings'，AppAction 新增 RESET_SESSION / SET_LANGUAGE / ADD_DIETARY / REMOVE_DIETARY |
| 2026-02-26 | T2: AppContext.tsx 更新 | 4 个新 reducer case |
| 2026-02-26 | T3: HomeView.tsx 更新 | Settings 按钮连接 dispatch，双语文案，"继续上次"入口 |
| 2026-02-26 | T4: ExploreView.tsx 新建 | 菜单探索视图（分类 Tab + 菜品列表 + ADD_TO_ORDER + 空状态引导扫描）|
| 2026-02-26 | T5: SettingsView.tsx 新建 | 语言切换、饮食偏好 toggle、关于信息、重置会话（红色按钮）|
| 2026-02-26 | T6: AgentChatView.tsx 更新 | Path C 相机入口（InputBar 左侧）、failed 状态双按钮 UI、消息列表底部安全区 |
| 2026-02-26 | T7: App.tsx 路由更新 | 新增 explore / settings case |
| 2026-02-26 | T8: 验证通过 | `tsc --noEmit` 零错误；`pnpm build` 成功（280 KB JS，19.5 KB CSS）|

---

## 📋 待处理

### Sprint 1 Phase 3.1 — Codex Review 修复 ✅

| 完成时间 | 任务 | 说明 |
|---------|------|------|
| 2026-02-26 | T1: analyze.ts 请求体修复 | 字段 `base64` → `data`，加 `context: {language, timestamp}` |
| 2026-02-26 | T2: MenuItem/MenuData 对齐 Worker schema | nameOriginal/nameTranslated/tags/categories/menuType 等 |
| 2026-02-26 | T2b: analyze.ts 响应解包 | Worker 返回 `{ok, data, requestId}`，前端正确解包 `json.data` |
| 2026-02-26 | T3: chat.ts SSE ok:false 修复 | 分离 JSON.parse 错误与业务错误，ok:false 正确 throw |
| 2026-02-26 | T4: Handoff 失败态 | onError 触发 SET_CHAT_PHASE('failed') + 恢复 UI |
| 2026-02-26 | T5: Recommendation 字段统一 | `{itemId, reason}` + 通过 menuData.items 查表渲染 |
| 2026-02-26 | T6: UPDATE_PREFERENCES action | AppContext reducer + AgentChatView dispatch |
| 2026-02-26 | T7: ScannerView 防重复提交 | 按钮 disabled + loading 文案 |
| 2026-02-26 | T8: WaiterModeView nameOriginal | 确认显示原文菜名 |
| 2026-02-26 | 验证通过 | `tsc --noEmit` 零错误；`pnpm build` 成功（270 KB JS，17.8 KB CSS）|

### Sprint 1 Phase 4 — 完善 + 部署

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 创建 CF Pages 项目 `sage-next-gen` | 手动一次性操作 |
| P0 | 真机验收测试 | iPhone Safari / Android Chrome |
| P1 | ExploreView 实现 | 菜单探索视图（MVP 保留，A/B 计划）|
| P1 | 偏好管理 Settings 页 | ChatGPT 风格，Home 设置入口 |
| P1 | 错误状态 UI | 识别失败 / 网络超时 / 重试 |

### 待决策（阻塞项）

| 编号 | 问题 | 阻塞 |
|------|------|------|
| OQ1 | 免费试用次数 X = ？ | Sprint 2 Paywall 实现 |

---

## 🏆 里程碑

| 里程碑 | 目标 | 状态 | 完成时间 |
|--------|------|------|---------|
| M0: 项目初始化 | 目录结构 + 根文档建立 | ✅ 完成 | 2026-02-25 |
| M1: 文档完备 | 所有 01-06 文档完成 | ✅ 完成 | 2026-02-26 |
| M2: MVP Alpha | 核心链路跑通（线上部署）| ✅ 完成 | 2026-02-26 |
| M3: MVP Beta | 4+1 感知全部接入 | ⏳ 待开始 | — |
| M4: 公测上线 | Cloudflare 正式部署 | ⏳ 待开始 | — |

---

## 📝 工作日志

### 2026-02-28（核心闭环优先级重排）

- 按夏总指示：**Paywall 降低优先级**，在核心业务闭环完成前不进入开发。
- 新增规划文档：`docs/core-loop-closure-plan-v1.md`
  - 主线切换为：用户场景（S1/S2/S3）→ 体验优化 → 功能闭环
  - 明确 3 个批次（Batch A/B/C）按 Spec→Test→Code 执行
- Batch A 已启动（S1 首次到店闭环）：
  - `specs/core-loop-s1-first-visit.md` ✅
  - `tests/core-loop-s1-checklist.md` ✅

### 2026-02-28（流程固化 + 任务 1/4/5 启动）

- 新增 `docs/engineering/engineering-guardrails.md`：将本次 Scanner 4 轮迭代教训固化为强制流程（Spec → Test → Code → 本地预览 → Build → Deploy 回归）
- 新增 Hotfix 硬规则：公共组件全局回归、进度条绑定状态机、overflow-hidden 裁切检查、缓存优先排查
- 新增提交前 Checklist，作为后续 UI/bugfix 任务的门禁
- 新增 Sprint2 回补 specs：
  - `specs/sprint2-model-fallback-spec.md`
  - `specs/sprint2-weather-api-spec.md`
  - `specs/sprint2-error-suggestion-spec.md`
- 新增测试清单：`tests/sprint2-backfill-test-checklist.md`
- Prompt 质量修复（KI-001 / KI-002）：
  - `worker/prompts/menuAnalysis.ts` 增加 `contains_seafood` 误判约束
  - `worker/prompts/preChat.ts` 增加“便宜点”预算偏好标准化映射
- 验证：`worker npx tsc --noEmit` ✅，`app npm run build` ✅
- 新增可执行回归脚本：`tests/test-06-sprint2-backfill-regression.mjs`
  - 覆盖 fallback / weather / error suggestion 三项回补验收
  - 执行结果：`node tests/test-06-sprint2-backfill-regression.mjs` ✅

### 2026-02-26（Sprint 1 开发日）

**上午**
- 确定 Sprint 1 开发计划，Mr. Xia 授权开始 Phase 0 Prompt Lab
- 向百炼 API 确认可用模型 ID（qwen3-vl-plus / flash，qwen3.5-plus / flash）
- 生成合成测试菜单图片（PIL，日文居酒屋 + 中文餐厅）
- 完成 Task 1 菜单识别测试：PASS，Schema 校验通过

**下午（上）**
- Task 2 Pre-Chat v1：FAIL（AI 忽略用户输入，偏好提炼弱，语速 9-26s）
- 根因分析：Qwen3.5 默认开启思考模式（thinking=ON），TTFT 高达 7-26s
- 修复：`enable_thinking: false`，TTFT 从 7s → 315ms（22x 提升）
- Task 2 Pre-Chat v2：PASS（3/3 场景，偏好提炼正确，无矛盾回复）
- Task 3 Handoff + 主 Chat：PASS（2 轮完成，推荐尊重忌口）
- Task 4 Streaming：PASS（平均 TTFT 377ms）
- **记录 DEC-028**，更新 ARCHITECTURE.md
- Mr. Xia 确认速度方案：方案 A（Streaming）

**下午（中）**
- 发现 Claude Code 调用方式有 bug（shell 单引号嵌套），修复为 `cat TASK.md | claude -p` 管道方式
- 验证新调用方式（3 轮测试，全部通过）
- Phase 1 Worker：直接手写 13 个 TypeScript 文件
  - Bailian 流式客户端（聚合 + 透传）
  - 所有 handlers / prompts / schemas / middleware / utils
  - `wrangler dev` 启动验证 + 端到端 SSE 流式测试通过

**下午（晚）**
- Phase 2 App 骨架：Claude Code 成功完成（新调用方式）
  - 15 个文件，Tailwind v4 @theme，useReducer 状态机
  - `tsc --noEmit` 零错误，`npm run build` 成功

**晚间**
- Phase 3 API 集成：全 7 项任务完成
  - T1: API 客户端层（`src/api/` — config + analyze + chat）
  - T2: ScannerView 接通真实图片上传 + HEIC 转换 + 30s 超时 + AbortController
  - T3: AgentChatView 完整 Pre-Chat → Handoff → 主 Chat SSE 流式链路
  - T4: OrderCardView 移除 mock，真实数据 + 空状态
  - T5: Toast 网络错误提示、JSON 解析降级、unmount abort
  - T6: `tsc --noEmit` 零错误，`npm run build` 成功（269 KB JS）
  - 安装 `browser-image-compression` 依赖

### 2026-02-26（Sprint 0 收官）

- 确定 AI 模型体系（DEC-026）：Qwen3-VL-Plus/Flash + Qwen3.5-Plus/Flash（阿里云百炼）
- 解锁 OQ3 + OQ4，更新 `ARCHITECTURE.md` v1.1
- 完成 4 个剩余技术文档（API_DESIGN / TECH_STACK / DEPLOYMENT / TEST_CASES）
- **M1 里程碑达成** 🎉

### 2026-02-25（项目启动日）

- 项目目录建立，六层目录体系
- Sprint 0 文档全套（VISION / COMPETITIVE / PRD / USER_STORIES / UX / VISUAL / ARCHITECTURE）
- 与 Mr. Xia 完成愿景对齐（DEC-001~015）

---

## 已知问题

| 编号 | 描述 | 严重级别 | 状态 |
|------|------|---------|------|
| KI-001 | 菜单识别 tag 准确度：夫妻肺片被标为 contains_seafood | P2 | 待 Prompt 迭代 |
| KI-002 | Pre-Chat "便宜" 偏好提炼为 "低"（过于简略）| P3 | 待 Prompt 迭代 |
| KI-003 | `claude` CLI 调用方式需用 `cat TASK.md \| claude -p`（已修复）| P0 | ✅ 已修复 |
| KI-004 | 菜单展示不全：AI 生成的 item.id 与 category.itemIds 存在 mismatch，导致分类筛选时部分菜品消失 | P1 | ✅ 已修复（孤儿 items 归入"其他"tab）|
| KI-005 | 空标签显示：category 下 itemIds 全部无效时，Tab 仍然显示该分类 | P1 | ✅ 已修复（ExploreView 过滤空 category）|
| KI-006 | Chat 推荐与菜单不一致：buildMenuSummary 跳过孤儿 items + AI 偶发幻觉 itemId，导致推荐找不到对应菜品 | P1 | ✅ 已修复（补全孤儿 items + 前端过滤无效 itemId）|

### Sprint 1 Phase 3.1 — Codex Review 修复 ✅

| 完成时间 | 修复项 | 严重级别 |
|---------|--------|---------|
| 2026-02-26 | [1] analyze 请求体契约对齐（data + context） | 🔴 |
| 2026-02-26 | [2] MenuData/MenuItem 类型对齐 Worker schema | 🔴 |
| 2026-02-26 | [3] SSE ok:false 错误不再吞掉 | 🔴 |
| 2026-02-26 | [4] Handoff 失败→failed 态 + 恢复 UI | 🔴 |
| 2026-02-26 | [5] Recommendations itemId 查表渲染 | 🔴 |
| 2026-02-26 | [6] UPDATE_PREFERENCES 偏好落状态 | 🟡 |
| 2026-02-26 | [7] ScannerView 防重复提交 | 🟡 |
| 2026-02-26 | [8] WaiterMode 显示 nameOriginal | 🟡 |

Codex Review 评分：修前 4/10 → 修后预估 7.5/10（契约一致+状态机完整+错误可恢复）

---


### Sprint 3 — 文档重整 + 四方评审（2026-03-02）✅

| 完成时间 | 任务 | 说明 |
|---------|------|------|
| 2026-03-02 | 延迟链路优化 + 模型切换 (DEC-044/045/050/051) | Gemini 2.0 Flash 主模型，百炼新加坡国际站 geo-block 兜底 |
| 2026-03-02 | 文档重整：architecture v2.0 + api-design v2.0 | DEC-039 文档唯一真理原则遵守 |
| 2026-03-02 | 四方独立评审（Opus/Codex/Qwen/Kimi） | P0×6 全解决，P1×20 全处理，P2×6 归后续迭代 |
| 2026-03-02 | DEC-052v2 ~ DEC-060 共 9 条新决策 | 覆盖输出格式/组件生命周期/过敏原安全/导航状态机/Waiter 面板等 |
| 2026-03-02 |  v1.1 → v1.3 | 顶层愿景与新决策对齐 |
| 2026-03-02 |  v1.8 → v2.0 | F06/F07/F08 AC 全面修订，新增 F14 Waiter 沟通面板 |
| 2026-03-02 | DECISIONS.md 新增 DEC-052v2~DEC-060 | 9 条决策完整记录 |

**关键决策速览**:
- DEC-052v2：方案型输出格式 → 流式文字 + 末尾 JSON 代码块
- DEC-053v2：Explore→Chat 注入 → 事实摘要 + 开放引导
- DEC-054：逐道替换 AI 驱动
- DEC-055：MealPlanCard 生命周期（提案模式 + 替换策略 + 并发防抖）
- DEC-056：过敏原安全（AI排除 + Waiter入口确认 + 三语展示）
- DEC-057：导航状态机（Order 为唯一执行数据源，6条规则）
- DEC-058：Chat 可直接操作 Order（AI 驱动，末尾 JSON 代码块指令）
- DEC-059：方案型课程结构（AI 动态生成，不硬编码西餐逻辑）
- DEC-060：Waiter 指点式沟通面板（跨语言：售罄/换菜/加份）

## Sprint 2 进度

| Task | 状态 | 完成时间 |
|------|------|---------|
| #7 Playwright E2E（5 个冒烟测试） | ✅ | 2026-02-27 |
| Batch A: Core Loop S1 WaiterMode 返回对话（AC6）| ✅ | 2026-03-01 |
| KI-004/005/006 菜单展示+推荐一致性修复 | ✅ | 2026-03-01 |
| F11 菜品概要 Dish Brief | ✅ | 已实现 |
| F12 饮食标签与过敏原 | ✅ | 已实现 |
| E2E T6/T7 DishCard 冒烟测试（7/7 通过）| ✅ | 2026-03-01 |
| 图片压缩参数升级 DEC-040（maxDim 960→1280）| ✅ | 2026-03-01 |
| F13 语音输入（hold-to-speak，zh-CN/en-US）| ✅ | 2026-03-01 |
| #1 Scanner 重构（单页/多页 toggle）| ✅ (Sprint 1 已完成) | 2026-02-26 |
| #3 错误信息区分（识别失败 vs 对话失败）| ✅ | 2026-02-27 |
| #5 偏好管理 F09（口味+自定义标签）| ✅ | 2026-02-27 |
| #6 语言切换 F10（自动检测+手动）| ✅ (Sprint 1 已完成) | 2026-02-26 |
| #2 百炼 qwen3.5-plus 切回 | ✅ | 2026-02-27 |
| #3b 天气 API 接入（Open-Meteo, 4+1感知补全）| ✅ | 2026-02-27 |
| #4 Worker 错误信息优化（suggestion 字段）| ✅ | 2026-02-27 |
| Codex Review 修复: model fallback + weather perf + type contract | ✅ | 2026-02-27 |
| 线上部署（Worker + Pages）| ✅ | 2026-02-27 15:21 |

### 2026-03-01（图片识别链路系统性重构）

- 新增规格文档：`specs/sprint3-image-recognition-pipeline-refactor.md`
- 前端 `app/src/api/analyze.ts`：base64 JSON → multipart 二进制上传；新增 SSE 进度流消费；压缩并发限制=2
- 前端 `app/src/views/AgentChatView.tsx`：`performAnalyze` 接入进度事件并展示实时阶段文案/百分比
- Worker `worker/handlers/analyze.ts`：支持 multipart 解析 + SSE 返回 `progress/result/error`；兼容旧 JSON 调用
- Worker `worker/utils/bailian.ts`：默认超时 30s → 12s，避免遗漏 timeout 参数时长时间等待
- Worker Analyze 超时策略：flash 9s + plus 7s；失败返回标准化错误
- Prompt 优化：`worker/prompts/menuAnalysis.ts` v3，减少冗余 token，保留原 JSON 结构
- 共享常量更新：`shared/types.ts` `TIMEOUTS.ANALYZE_CLIENT=20s`、`ANALYZE_WORKER=16s`
- 文档同步：`docs/technical/api-design.md` 更新 Analyze 契约（multipart + SSE + 新超时）
- 验证：
  - `cd app && npx tsc --noEmit` ✅
  - `cd worker && npx tsc --noEmit` ✅
  - `cd app && pnpm build` ✅
  - `cd app && pnpm test:e2e` ⚠️ 当前环境端口权限限制（`EPERM ::1:5173`），未能执行

### 2026-03-01（图片识别链路彻底修复）

- `worker/handlers/analyze.ts`：移除 `qwen3-vl-plus` fallback 链路、`preferPlusOnly`、iOS Safari 模型分支与 retry；统一为 `qwen3-vl-flash` 单模型，超时 `20000ms`
- Analyze SSE 阶段收敛为：`uploading → preparing → analyzing → validating → completed`
- 错误信息升级为用户友好文案（超时/服务不可用/内容不可读）
- `worker/prompts/menuAnalysis.ts` 升级 v6：强制 item 输出 `brief/allergens/dietaryFlags/spiceLevel`，并提供完整 item 示例，继续要求只输出 JSON
- `app/src/api/analyze.ts`：`compressImage` 主路径改为 `createImageBitmap(file)`，失败自动 fallback 到 `new Image()`；保留 `loadImage` 作为兜底
- iOS Safari 压缩参数放宽：`maxSize` 从 `220KB` 提升至 `350KB`，维度起始从 `960` 提升到 `1024`
- 验证：
  - `cd app && npx tsc --noEmit` ✅
  - `cd worker && npx tsc --noEmit` ✅
  - `cd app && pnpm build` ✅
  - `rg -n "qwen3-vl-plus|preferPlusOnly" app worker shared --glob '!**/*.md'` ✅（无命中）

### 2026-03-01（Chat 菜单展示/推荐 + Explore 分类修复）

- `worker/handlers/analyze.ts`：
  - `parsePrice` 支持区间价（`50-60` / `50~60` 等），统一取低值
  - `normalizeLooseResult` 改为优先使用 AI 返回 `menuType/priceLevel`，`priceLevel` 非 1/2/3 时回退 2
- `worker/prompts/agentChat.ts`：
  - `buildMenuSummary` 每道菜追加 `brief`、`[allergens:...]`、`[spice:n]`（含 orphan items）
- `worker/prompts/menuAnalysis.ts`：
  - Prompt v6 新增 `briefDetail`、顶层 `menuType`、`priceLevel` 约束与示例
- `app/src/views/ExploreView.tsx`：
  - “全部”tab 改为分组渲染（按 validCategories 分节，孤儿项归“其他”）
  - `referencedIds` 改为基于 `validCategories`
- `app/src/views/AgentChatView.tsx`：
  - 右上角 order badge 从菜品种类数改为总数量（`reduce(sum + quantity)`）
- 验证：
  - `cd app && npx tsc --noEmit` ✅
  - `cd worker && npx tsc --noEmit` ✅
  - `cd app && pnpm build` ✅
  - 任务 grep 断言 4 项全部命中 ✅

---

## 📝 方向记录（2026-03-01 16:10）
- 夏总确认：暂不执行“中国区后端迁移”，先记录方向，后续再启动。
- 方向：
  1) 保留 Cloudflare Pages 前端
  2) 后端 API（analyze/chat/transcribe）迁移至中国区计算（阿里云 FC 杭州优先）
  3) 前端 `VITE_WORKER_URL` 指向中国区 API 域名
- 触发条件：夏总有空后再提供平台拍板、部署权限、域名方案。

### 2026-03-02 18:00（四方评审 + 文档全面升级）

- **四方独立评审完成**（Opus/Codex/Qwen/Kimi）
  - P0 问题 6 条：全部解决
  - P1 问题 20 条：8条夏总拍板 + 12条自主处理
  - P2 问题 6 条：归入后续迭代 Backlog
- **新增 9 条决策**（DEC-052v2 ~ DEC-060），覆盖：
  - 方案型输出格式（流式文字 + 末尾 JSON 代码块）
  - MealPlanCard 完整生命周期规范
  - 过敏原安全三层防护（AI+Waiter确认+三语展示）
  - 导航状态机 6 条规则（Order 为唯一执行数据源）
  - Chat 直接操作 Order（JSON 代码块指令）
  - Waiter 指点式沟通面板（解决跨语言沟通痛点）
- **文档版本升级**：vision.md v1.3、prd.md v2.0、DECISIONS.md +9
- **下一步**：启动代码实现（MealPlanCard / SelectedDishesCard / Waiter面板 / Chat操作Order）

### 2026-03-02（用户场景重定义 + 延迟诊断）

- DEC-043：夏总重新定义核心用户场景
  - Chat 双意图：探索型（单菜品深度了解） + 方案型（整套用餐方案生成）
  - Explore 双出口：展示给服务员 / 带已选菜品咨询 AI
  - 新增 MealPlanCard 组件概念
- PRD v1.8 更新：F06（AgentChat AC8-10）、F07（Explore AC6-8）、旅程 D、§3.1
- DECISIONS.md 新增 DEC-042（两阶段识别）、DEC-043（用户场景重定义）
- PLANNING.md / PROGRESS.md 状态一致性修复（Sprint 2→✅，Sprint 3 进行中 20%）
- Cloudflare China Network 调研：有中国节点（京东云合作），但需 Enterprise + ICP 备案
- 创建延迟链路诊断测试（cron 凌晨 3:00），5 项测试量化跨境中转开销

### 2026-03-02（延迟优化 + AI 模型切换 + 生产稳定）✅

| 完成时间 | 任务 | 决策 | 说明 |
|---------|------|------|------|
| 2026-03-02 早 | T1: 延迟链路 7 轮诊断测试 | — | 量化各阶段耗时；发现 stream=false 快 2.4× |
| 2026-03-02 上午 | T2: stream=false 改造 | DEC-044 | VL+Enrich 从 streamAggregate 改 fetchComplete |
| 2026-03-02 上午 | T3: 切换 Gemini 2.0 Flash | DEC-045 | VL 从 qwen3-vl-flash 换 gemini-2.0-flash；Enrich 从 qwen3.5-flash 换 gemini-2.0-flash |
| 2026-03-02 上午 | T4: `worker/utils/gemini.ts` 新建 | DEC-045 | Gemini generateContent API 封装，含 geoBlocked 识别 |
| 2026-03-02 上午 | T5: VL Model Benchmark v1 | — | 3 图×3 轮；Gemini recall 75%（被 max_tokens=4096 截断）；Doubao 全超时 |
| 2026-03-02 下午 | T6: Prompt v8 + allergenCodes pipeline | DEC-050 | EU 过敏原编号表；VL 提取 allergenCodes；Enrich 双来源；max_tokens=8192 |
| 2026-03-02 下午 | T7: VL Model Benchmark v2 | — | Gemini recall **100%**；Qwen3-VL-Flash recall 65%（淘汰）；模型选型最终确定 |
| 2026-03-02 下午 | T8: 生产部署验证 | — | Worker 19.3s，18 items，allergens 正确；429 为 benchmark 压测导致，非代码问题 |
| 2026-03-02 13:37 | T9: Gemini geo-block fallback v1 | DEC-051 | 捕获 FAILED_PRECONDITION → 切换百炼国内兜底 |
| 2026-03-02 13:53 | T10: Geo-block fallback v2（最终） | DEC-051 | 改为百炼**新加坡国际站**（dashscope-intl.aliyuncs.com）；qwen-vl-plus + qwen-plus-latest |
| 2026-03-02 14:00 | T11: 文档重整 | DEC-039 | architecture v2.0、api-design v2.0、DECISIONS 覆盖关系表 + DEC-051 |

**Sprint 3 已完成核心指标**:
- ✅ 延迟链路诊断：量化完成，根因确认（VL 推理本身，非跨境中转）
- ✅ Allergen recall：**100%**（COENTRO ground truth，26/26）
- ✅ 模型选型最终确定：Gemini 2.0 Flash（唯一可行选项）
- ✅ 生产稳定：geo-block 兜底路径上线，App 错误消除
- ✅ 文档与代码对齐（DEC-039 遵守）

**Sprint 3 Backlog（已记录，暂缓）**:
- BACKLOG-001：Enrich 分批处理（菜单 >60 道菜时）
- Two-stage SSE（VL 完成即推送，感知延迟 19s→8s，DEC-046）
- DEC-043 代码实现（MealPlanCard、Explore 双出口）


---

## 📋 Sprint 3 完成总结（2026-03-02）

### 交付成果
- **Phase 0**: 3 份 Spec + 3 份 Test Checklist（60+ 用例）
- **Phase 1**: 数据层（shared/types + AppContext reducer + streamJsonParser + Prompt）
- **Phase 2**: 组件 + 视图改造（MealPlanCard / SelectedDishesCard / AgentChatView / ExploreView / Pre-Chat）
- **Phase 3**: Waiter 升级（AllergyBanner + WarningSheet + CommunicationPanel + WaiterModeView）
- **测试**: 11 文件 106 条测试全通过（Layer 1 纯逻辑 + Layer 2 组件渲染）
- **部署**: App + Worker 均已上线

### 审查历史（4 轮）
1. 第一轮 Phase 0 三方审查（Opus/Codex/Qwen）→ 4🔴+8🟡 修复
2. 第二轮 Phase 1+2 双审（Opus+Codex）→ 6🔴 修复（数据源统一、Prompt 重设计、并发控制等）
3. 第三轮 Phase 3A 双审（Opus+Codex）→ 5🔴+5🟡 修复（沟通面板流程、uncertain、持久化等）
4. 最终审查（Opus 8.5/10 + Codex 8.3/10）→ 建议有条件上线 Beta ✅

### Git 提交链
- `e44fd66` Phase 0 修复
- `798e4ae` Phase 1 数据层
- `0903ac4` Phase 2A 组件
- `e9fbf4f` Phase 2B 视图
- `08c8722` Phase 1+2 审查修复
- `db5c0ff` Phase 3A Waiter
- `39d8b7f` Phase 3A 审查修复
- `5959fab` 测试补充（106 条）
- `10cdd49` 清理 orderStore
- `bbe5140` 清理 unused imports
- `e69e0ed` 最终审查修复

### 质量指标
- tsc 零错误
- 106 测试全通过（1.95s）
- Build: 290KB / gzip 90KB
- 最终评分: 8.4/10（Opus 8.5 + Codex 8.3 平均）

---

## ⏳ Sprint 3 验收（待完成）

**验收人**: 夏总（真机实测）  
**状态**: 🔴 待验收  
**验收方式**: 夏总亲自在真实设备上走完主线流程，通过后 Sprint 3 正式关闭

### 验收路径（7 步主线）
1. 拍真实菜单 → 等待识别完成
2. Pre-Chat 告诉 AI 偏好/过敏
3. 让 AI 搭配一桌 → MealPlanCard 出现
4. 换掉一道菜 → AI 替换流程
5. 整套加入订单 → 进 Order 页
6. 进 Waiter 模式 → 展示给服务员
7. 模拟一道菜没有了 → 使用沟通面板

### 验收地址
https://sage-next-gen.pages.dev

### 通过标准
- 7 步主线无崩溃、无卡死
- 核心流程体感流畅（不需要完美，但要可用）
- 夏总主观认可可以邀请他人测试

### 验收结果
- [x] Round 1 自动化验收：发现 4×P0 + 3×P1（2026-03-03）
- [x] Round 2-3：BUG-001~004, BUG-A/B/C 全部修复验证通过
- [x] Round 4 夏总真机验收：发现 BUG-D~J + OPEN-001 + ISSUE-008
- [x] Round 4 全量修复并部署（commit 60ded59）
- [x] Round 4 自动化验收通过：货币/Badge/语言层级/过敏源/JSON解析
- [x] Round 5 SAGE Agent 浏览器完整 UI 验收（8 条路径）：
  - BUG-K 发现并修复（processAIResponse 提前 return，DEC-069）
  - BUG-J 连带修复（MealPlanCard 出现）
  - BUG-G 确认（输入框 16px）
  - 7 个 View 全部验证通过（Home/Scanner/Chat/Explore/Order/Waiter/Settings）
  - 已部署线上 sage-next-gen.pages.dev (commit 5208e90)
- [ ] **待夏总真机最终确认**
- [x] Sprint 3 收尾 Checklist（DEC-065）— 2026-03-04 完成

### Sprint 4 规划（DEC-067，2026-03-04 启动）
- T1: 历史记录（扫描/对话/点餐完整可回溯）
- T2: 记忆机制（持久化用户画像）
- T3: 自我进化（AI 越用越懂用户）
- 核心目标：让 SAGE 越来越了解它的主人
- 双重价值：个性化服务 + 产品迭代数据

---

## Sprint 3 收尾 Checklist（DEC-065）— 2026-03-04

| # | 项目 | 状态 | 备注 |
|---|------|------|------|
| 1 | docs/ 版本号与代码对齐 | ✅ | api-design.md v2.0→v3.0 修正，prd v2.0 / vision v1.3 已对齐 |
| 2 | DECISIONS.md 补齐 Sprint 3 DEC | ✅ | DEC-059v2, 061-069 全部在册 |
| 3 | 测试覆盖率报告 | ✅ | 12 文件 / 116 用例 / 全绿。覆盖率: Stmts 73.8%, Branch 61.3%, Funcs 74.2%, Lines 75.3%。AppContext 46% 为最低模块 |
| 4 | PROGRESS.md 更新 | ✅ | 本表 |
| 5 | PLANNING.md 更新 | ✅ | Sprint 4 方向待定（见下） |
| 6 | RETRO_2026-03-03.md | ✅ | 四方审计完成，总分 2.2/5 |
| 7 | 下一 Sprint 前置依赖 | ⚠️ 待夏总确认 | Sprint 4 方向二选一（见下） |

### 下一 Sprint 前置依赖确认

**Sprint 4 方向待定，两个选项：**

- **选项 A（质量 Sprint）**: 工程治理改革（硬门控 + 核心函数提取 + AGENTS.md 重构 + Prompt 工程化），来自四方审计 2.2/5 的结论
- **选项 B（DEC-067 记忆系统）**: 历史记录 + 记忆机制 + 自我进化

**当前执行方向**: 选项 A 已启动（夏总 2026-03-04 13:31 确认），完成后再进入选项 B

### Sprint 3 最终状态

- **代码**: 已部署 sage-next-gen.pages.dev (commit f358dea)
- **测试**: 116/116 通过
- **文档**: 全部对齐
- **真机验收**: 待夏总最终确认
- **质量评估**: 四方审计 2.2/5（详见 RETRO_2026-03-03.md）
