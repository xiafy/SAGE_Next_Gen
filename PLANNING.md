# PLANNING.md — 工作计划

> 更新规则：每次 Sprint 开始时更新当前 Sprint，完成后归档到历史区。  
> 当前状态以 `PROGRESS.md` 为准。

---

## 当前阶段：Sprint 3 完成 ✅

**进度**: Sprint 0 ✅ | Sprint 1 ✅ | Sprint 2 ✅ | Sprint 3 ✅

**下一阶段**: Sprint 4 — Paywall + Beta

---

## Sprint 2 — 感知体系接入 ✅

**前置条件**: Sprint 1 Alpha 稳定 ✅  
**目标**: 接入 4+1 维感知，体验从"工具"升级为"智能体"  
**完成时间**: 2026-03-01

### 任务清单
- [x] GPS 位置获取（空间维度）— Sprint 1 已实现
- [x] 系统时间注入（时间维度）— Sprint 1 已实现
- [x] 天气 API 接入（环境维度）— Open-Meteo, 500ms 超时
- [x] 历史记忆系统（localStorage 持久化）— Sprint 1 已实现
- [x] Prompt 工程：将 4+1 维数据融入 System Prompt — 天气已注入
- [x] 偏好学习（从对话中自动提炼偏好关键词）— F09 完成
- [x] qwen3.5-plus 切回（带 flash fallback）
- [x] 错误信息优化（suggestion 字段）
- [x] E2E 冒烟测试（Playwright, 5 tests）
- [x] **F11 菜品概要（Dish Brief）** — 每道菜一句话概要 + 可展开详情
- [x] **F12 饮食标签与过敏原** — 过敏原/清真/素食/辣度/卡路里 + F09 联动高亮

---

## Sprint 3 — 体验升级与质量（进行中）

**前置条件**: Sprint 2 功能稳定 ✅  
**目标**: 核心体验升级 + 性能优化 + 生产级质量

### 已完成
- [x] **F13 语音输入** — MediaRecorder + 服务端 ASR (qwen-omni-turbo)，微信风格按住说话
- [x] **图片识别链路重构 (DEC-041)** — multipart 上传 + SSE 流式进度
- [x] **两阶段识别架构 (DEC-042)** — VL-Flash OCR + qwen3.5-flash 语义补全
- [x] **KI-004/005/006 修复** — 菜单展示/推荐一致性
- [x] **延迟链路优化 (DEC-044/045)** — Gemini 2.0 Flash 主模型，stream=false，TTFT 大幅提升
- [x] **过敏原 pipeline (DEC-050)** — EU 编号表，recall 100%（26/26）
- [x] **Geo-block 兜底 (DEC-051)** — 百炼新加坡国际站 fallback，生产稳定
- [x] **文档重整** — architecture v2.0 + api-design v2.0，DEC-039 遵守
- [x] **四方独立评审（Opus/Codex/Qwen/Kimi）** — P0×6✅ P1×20✅ P2×6 归后续
- [x] **9 条新决策 (DEC-052v2~DEC-060)** — 输出格式/组件规范/过敏原/状态机/Waiter面板
- [x] **vision.md v1.3 + prd.md v2.0** — 顶层文档与评审结论全面对齐

### 已完成（Sprint 3 代码实现）
- [x] **Phase 0: 文档对齐 + Spec + Test Cases**（3/3 ~ 3/4 午）
  - [x] T0-1: docs/ 过时文档更新或归档（navigation-spec/icebreaker/临时文档）
  - [x] T0-2: architecture.md / api-design.md 补齐 DEC-052v2~060
  - [x] T0-3: 3 份新功能 Spec（mealplan-and-order / explore-chat-injection / waiter-upgrade）
  - [x] T0-4: 测试用例 checklist（given-when-then，覆盖正常流+边界+错误恢复）
  - 门禁：夏总审关键 Spec

#### Phase 1: 数据层 + POC（3/4 午 ~ 3/5）
- [x] T1: shared/types.ts 新增 MealPlan/OrderAction/WaiterMessage 类型
- [x] T2: OrderStore 重构（DEC-057 状态机 6 条规则）
- [x] T3: **流式 JSON 代码块解析器 POC**（100 次真实调用，L1 ≥85%）
- [x] T4: Prompt 更新（方案型格式 + Order 操作指令）
- 门禁：T3 POC 通过

#### Phase 2: 核心组件 + 视图改造（3/5 ~ 3/8）
- [x] T5: MealPlanCard 组件（课程分组+替换+整套加入+并发防抖）
- [x] T6: SelectedDishesCard 组件（系统消息样式+事实摘要）
- [x] T7: AgentChatView 改造（流式JSON解析+MealPlanCard+OrderAction）
- [x] T8: ExploreView 改造（双出口+写入Order+空状态）
- [x] T9: Pre-Chat handoff 改造（结构化偏好+竞态处理）

#### Phase 3: Waiter 升级 + 验收（3/9 ~ 3/10）
- [x] T10: WaiterAllergyBanner（三语过敏栏）
- [x] T11: AllergenWarningSheet（Waiter入口确认）
- [x] T12: DishCommunicationPanel（指点式沟通面板）
- [x] T13: WaiterModeView 集成
- [x] T14: 导航状态机端到端验证
- [x] T15: 真机验收 + 部署

#### 质量与运营
- [ ] **Paywall 实现**（免费 5 次，DEC-030）— 降低优先级，核心体验优先
- [ ] 完整 QA 测试矩阵（多语言菜单、边界场景）
- [ ] 性能优化（首屏 < 2s，识别等待体验）
- [ ] 错误监控接入
- [ ] 用户反馈闭环

---

## 历史 Sprint（归档）

### Sprint 0 — 文档完备（✅ 2026-02-25 ~ 2026-02-26）

所有产品+技术文档完成，存放于 `docs/` 目录。详见 PROGRESS.md。

### Sprint 1 — MVP Alpha（✅ 2026-02-26）

核心链路跑通并部署上线：
- Phase 0: Prompt Lab 验证 ✅
- Phase 1: Cloudflare Worker API ✅
- Phase 2: App 骨架 ✅
- Phase 3: API 集成 ✅
- Phase 3.1: Codex Review 修复 ✅
- Phase 4: UI 完善（Explore/Settings）✅
- Phase 5: P0 审计修复 ✅
- 复盘改进（shared types + AGENTS.md 重写）✅

---

## 阻塞与风险追踪

| 风险 | 描述 | 缓解方案 | 状态 |
|------|------|---------|------|
| AI 识别准确率 | 复杂菜单（手写/竖排/低质量图片）识别失败 | Mock 降级 + 引导重拍（DEC-019）| 🟡 待真机验证 |
| Scanner 真机问题 | getUserMedia 在非 HTTPS 无法使用 | 已部署到 CF Pages（HTTPS）| ✅ 已验证（HTTPS 部署正常）|
| **流式 JSON 代码块 fallback 率** | SSE 末尾 JSON 截断/格式错误导致解析失败，影响 MealPlan 和 Order 操作（DEC-052v2/058）| 需 POC 验证 fallback 率，设计健壮 fallback 策略 | ✅ 已验证（L1/L2/L3 fallback，106 测试通过） |

### 已解决的风险
| 风险 | 解决方案 |
|------|---------|
| AI 响应速度 | `enable_thinking: false`（DEC-028），TTFT <500ms ✅ |
| API Key 安全 | CF Worker 代理（DEC-005）✅ |
| AI 供应商 | 阿里云百炼 DashScope（DEC-026）→ Gemini 2.0 Flash 主模型 + 百炼新加坡兜底（DEC-045/051）✅ |
| 过敏原识别准确率 | EU 编号表 pipeline（DEC-050），recall 100% ✅ |
| Geo-block 风险 | 百炼新加坡国际站 fallback（DEC-051）✅ |

---

## Sprint 4 — Beta 内测（计划中）

**前置条件**: Sprint 3 ✅ 已部署上线  
**目标**: 3-5 个内部用户通过邀请码进入，验证功能可用 + 识别最高频场景  
**策略**: Beta 先测，收集真实反馈后再决定 Paywall 付费点  
**预计时长**: 6-7h

### 任务清单

- [ ] **T1: 邀请码门禁**
  - App 首次打开显示邀请码输入页
  - 输入正确 → 存 localStorage → 后续跳过
  - 邀请码：SAGE-ALPHA / SAGE-BETA / SAGE-GAMMA / SAGE-DELTA / SAGE-ECHO（5个，每人一个）
  - Worker 验证接口：`POST /api/invite/verify`
  - 邀请码列表通过 wrangler secret 管理

- [ ] **T2: 行为埋点**（Cloudflare Analytics Engine）
  - `menu_scan` — 菜单识别完成
  - `meal_plan_generated` — AI 输出方案型推荐
  - `explore_opened` — 进入 Explore
  - `waiter_mode_opened` — 进入 Waiter 模式
  - `comm_panel_used` — 使用沟通面板（含 action 类型）
  - `session_completed` — 结束用餐

- [ ] **T3: Beta 欢迎屏**
  - 邀请码验证通过后一次性引导（3 张卡片）
  - 卡片：扫菜单 / AI 帮你点菜 / 跟服务员沟通
  - localStorage 记录已看过，不重复显示

- [ ] **T4: 反馈入口**
  - Settings 页加"反馈问题"按钮
  - 支持 Telegram 跳转 + 邮件两个选项

### 质量要求（DEC-064）
- tsc 零错误 + 106+ 测试通过
- T1 邀请码逻辑必须有 Worker 单元测试
- T2 埋点事件必须有集成测试（验证事件被正确触发）

### 不做
- Paywall / 付费墙
- 新 AI 功能
- UI 大改
