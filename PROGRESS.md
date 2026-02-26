# PROGRESS.md — 实时进展

> 更新规则：每完成一项任务立即更新本文件。  
> 这是所有 Agent 的共享状态板，任何 Agent 都可读写。  
> 格式：`[日期 时间] 操作内容`

---

## 当前状态

**阶段**: Sprint 1 完成 → 复盘改进完成 → Sprint 2 待开始
**当前子阶段**: 流程改进全部落地（shared types + CLAUDE.md 重写 + TASK 模板化）
**整体进度**: Sprint 1 ██████████ 100% ✅ | 流程改进 ██████████ 100% ✅
**最后更新**: 2026-02-26 18:30

## 🌐 线上地址
- **App**: https://sage-next-gen.pages.dev
- **Worker**: https://sage-worker.xiafy920.workers.dev ✅

---

## 🔴 进行中（锁定区）

| Agent | 任务 | 开始时间 |
|-------|------|---------|
| — | 无进行中任务 | — |

---

## 🔧 Sprint 1 复盘改进（2026-02-26 晚）✅

| # | 改进项 | 状态 |
|---|--------|------|
| 1 | 创建 `shared/types.ts` 共享类型包（DEC-031）| ✅ |
| 2 | App `types/index.ts` 改为从 shared re-export | ✅ |
| 3 | App/Worker tsconfig 加入 shared include | ✅ |
| 4 | `chat.ts` 重写：使用 shared ChatRequest 类型 + 正确的 preferences 转换 | ✅ |
| 5 | `analyze.ts` 重写：使用 shared AnalyzeRequest 类型 + TIMEOUTS 常量 | ✅ |
| 6 | CLAUDE.md 全面重写（§0 必读清单 + §7 三级门控 + §8 契约规则）（DEC-032）| ✅ |
| 7 | 创建 TASK_TEMPLATE.md（DEC-033）| ✅ |
| 8 | DECISIONS.md 记录 DEC-031/032/033 | ✅ |
| 9 | 前端 `tsc --noEmit` 零错误验证 | ✅ |
| 10 | 前端 `vite build` 成功（286 KB JS）| ✅ |
| 11 | Worker `tsc --noEmit` 零错误验证 | ✅ |

---

## ✅ 已完成

### Sprint 0 — 文档完备（M1 里程碑）✅

| 完成时间 | 文件/任务 | 说明 |
|---------|------|------|
| 2026-02-25 | 目录结构 | 六层目录体系建立 |
| 2026-02-25 | `README.md` / `CLAUDE.md` | 人类文档 + Agent 工作手册 |
| 2026-02-25 | `PLANNING.md` / `PROGRESS.md` / `DECISIONS.md` | 核心管理文档 |
| 2026-02-25 | `01_strategy/VISION.md` v1.1 | 产品愿景，已与 Mr. Xia 对齐 |
| 2026-02-25 | `01_strategy/COMPETITIVE_ANALYSIS.md` | 竞品分析 v1.0 |
| 2026-02-25 | `02_product/PRD.md` v1.4 | F01-F10 全部对齐（DEC-016~027）|
| 2026-02-25 | `02_product/USER_STORIES.md` | 20 个用户故事，6 组场景 |
| 2026-02-25 | `03_design/UX_PRINCIPLES.md` | 10 条 UX 原则 + 反模式清单 |
| 2026-02-25 | `03_design/VISUAL_DESIGN.md` | 完整视觉规范 + Tailwind v4 配置 |
| 2026-02-25 | `03_design/ICEBREAKER_STATE_MACHINE.md` v1.1 | Pre-Chat 状态机设计（DEC-027）|
| 2026-02-26 | `04_technical/ARCHITECTURE.md` v1.1 | OQ3/OQ4 解决，TBD 全清，DEC-028 更新 |
| 2026-02-26 | `04_technical/API_DESIGN.md` v1.0 | 完整 API 契约（错误码/超时/重试/Prompt）|
| 2026-02-26 | `04_technical/TECH_STACK.md` v1.0 | 技术栈选型说明 |
| 2026-02-26 | `04_technical/DEPLOYMENT.md` v1.0 | CI/CD + Secret + 回滚 + 成本 |
| 2026-02-26 | `06_testing/TEST_PLAN.md` v1.0 | 5 层测试策略 |
| 2026-02-26 | `06_testing/TEST_CASES.md` v1.0 | 60+ 用例，L1-L5 |

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

关键产出（`05_implementation/prompt-lab/`）：
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
