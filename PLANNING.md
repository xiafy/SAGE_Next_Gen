# PLANNING.md — 工作计划

> 更新规则：每次 Sprint 开始时更新当前 Sprint，完成后归档到历史区。  
> 当前状态以 `PROGRESS.md` 为准。

---

## 当前阶段：Sprint 3 进行中

**进度**: Sprint 0 ✅ | Sprint 1 ✅ | Sprint 2 ✅ | **Sprint 3 ███████░░░ 70%**

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

### 进行中
- [ ] **新功能代码实现** — 基于 PRD v2.0 开始开发（MealPlanCard/SelectedDishesCard/Waiter面板/Chat操作Order）
- [ ] **流式 JSON 代码块解析器 POC** — 验证 fallback 率（DEC-052v2/058 核心技术风险）

### 待开始

#### 新功能实现（基于 PRD v2.0 / DEC-052v2~060）
- [ ] **流式 JSON 代码块解析器** — SSE 末尾 JSON 代码块提取 + fallback（DEC-052v2/058 核心）
- [ ] **shared/types.ts 新增类型** — `MealPlan` / `OrderAction` / `WaiterMessage` 类型定义
- [ ] **MealPlanCard 组件** — 提案模式生命周期 + 逐道替换 + 并发防抖（DEC-052v2/054/055）
- [ ] **SelectedDishesCard 组件** — Explore→Chat 注入事实摘要 + 开放引导（DEC-053v2）
- [ ] **Waiter 过敏栏** — 三语展示过敏原/禁忌（DEC-056）
- [ ] **Waiter 指点式沟通面板** — 售罄/换菜/加份跨语言沟通（DEC-060）
- [ ] **Chat 操作 Order 能力** — AI 末尾 JSON 代码块指令解析 + 执行（DEC-058）
- [ ] **导航状态机实现** — Order 为唯一执行数据源，6 条规则落代码（DEC-057）

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
| **流式 JSON 代码块 fallback 率** | SSE 末尾 JSON 截断/格式错误导致解析失败，影响 MealPlan 和 Order 操作（DEC-052v2/058）| 需 POC 验证 fallback 率，设计健壮 fallback 策略 | 🔴 **需 POC 验证** |

### 已解决的风险
| 风险 | 解决方案 |
|------|---------|
| AI 响应速度 | `enable_thinking: false`（DEC-028），TTFT <500ms ✅ |
| API Key 安全 | CF Worker 代理（DEC-005）✅ |
| AI 供应商 | 阿里云百炼 DashScope（DEC-026）→ Gemini 2.0 Flash 主模型 + 百炼新加坡兜底（DEC-045/051）✅ |
| 过敏原识别准确率 | EU 编号表 pipeline（DEC-050），recall 100% ✅ |
| Geo-block 风险 | 百炼新加坡国际站 fallback（DEC-051）✅ |
