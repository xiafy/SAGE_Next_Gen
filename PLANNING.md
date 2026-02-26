# PLANNING.md — 工作计划

> 更新规则：每次 Sprint 开始时更新当前 Sprint，完成后归档到历史区。  
> 当前状态以 `PROGRESS.md` 为准。

---

## 当前阶段：Sprint 1 Phase 3 — API 集成（2026-02-26）

**目标**: 将 Worker（已完成）与 App 骨架（已完成）接通，完成 Path A 核心链路真机可用。

**进度**: Sprint 0 ✅ | Phase 0 Prompt Lab ✅ | Phase 1 Worker ✅ | Phase 2 App 骨架 ✅ | **Phase 3 API 集成 🔄**

---

## Sprint 0 — 文档完备（✅ 已完成，2026-02-26）

**目标**: 完成 M1 里程碑（文档完备）  
**预计时长**: 1-2 天  
**负责人**: SAGE Agent

### 任务清单

#### 01_strategy（战略层）
- [x] `VISION.md` — 产品愿景 & 战略
- [ ] `COMPETITIVE_ANALYSIS.md` — 竞品深度分析

#### 02_product（产品层）
- [ ] `PRD.md` — 产品需求文档（含功能规格、验收标准）
- [ ] `USER_STORIES.md` — 用户故事（按场景分类）

#### 03_design（设计层）
- [ ] `UX_PRINCIPLES.md` — 交互设计原则
- [ ] `VISUAL_DESIGN.md` — 视觉规范（品牌色、字体、组件）

#### 04_technical（技术层）
- [ ] `ARCHITECTURE.md` — 系统架构（前端/API/AI 层）
- [ ] `API_DESIGN.md` — API 接口设计
- [ ] `TECH_STACK.md` — 技术栈选型与理由
- [ ] `DEPLOYMENT.md` — 部署方案（Cloudflare）

#### 06_testing（测试层）
- [ ] `TEST_PLAN.md` — 测试策略
- [ ] `TEST_CASES.md` — 核心场景测试用例

#### 根目录
- [x] `README.md` — 人类文档
- [x] `CLAUDE.md` — Agent 工作手册
- [x] `PLANNING.md` — 本文件
- [x] `PROGRESS.md` — 进展追踪
- [x] `DECISIONS.md` — 决策记录

**Sprint 0 完成标准**: 所有文档写完，一个全新 Agent 读完后能独立知道下一步做什么。

---

## Sprint 1 — MVP Alpha 骨架

**前置条件**: Sprint 0 全部完成  
**目标**: 跑通核心链路（拍菜单 → 识别 → 对话）

### 任务清单（待细化）
- [ ] 初始化前端项目（Vite + React + TS + Tailwind v4）
- [ ] Cloudflare Worker API 代理搭建（API Key 安全）
- [ ] 菜单识别 API 接入（zod 校验）
- [ ] Home 双入口 UI
- [ ] AgentChat 核心对话 UI
- [ ] Scanner / Image Picker（Chat-Native 风格）
- [ ] 基础对话引擎（接入 AI 模型）
- [ ] 端到端流程验证（真机测试）

**Sprint 1 完成标准**: 真机拍一张菜单，30 秒内得到 AI 推荐对话。

---

## Sprint 2 — 感知体系接入

**前置条件**: Sprint 1 Alpha 稳定  
**目标**: 接入 4+1 维感知，体验从"工具"升级为"智能体"

### 任务清单（待细化）
- [ ] GPS 位置获取（空间维度）
- [ ] 系统时间注入（时间维度）
- [ ] 天气 API 接入（环境维度）
- [ ] 历史记忆系统（localStorage 持久化）
- [ ] Prompt 工程：将 4+1 维数据融入 System Prompt
- [ ] 偏好学习（从对话中自动提炼偏好关键词）

---

## Sprint 3 — 质量与上线

**前置条件**: Sprint 2 功能稳定  
**目标**: 生产级质量，正式部署

### 任务清单（待细化）
- [ ] 完整 QA 测试矩阵（多语言菜单、边界场景）
- [ ] 性能优化（首屏 < 2s，识别等待体验）
- [ ] Cloudflare Pages 正式部署
- [ ] 错误监控接入
- [ ] 用户反馈闭环

---

## 历史 Sprint（归档）

*暂无*

---

## 阻塞与风险追踪

| 风险 | 描述 | 缓解方案 | 状态 |
|------|------|---------|------|
| AI 识别准确率 | 复杂菜单（手写/竖排/低质量图片）识别失败 | Mock 降级 + 引导重拍（DEC-019）；Prompt Lab 基础验证通过 | 🟡 待真机验证 |
| AI 响应速度 | 模型默认开启 Thinking 模式，TTFT 7-26s | `enable_thinking: false`（DEC-028），TTFT 降至 <500ms | ✅ 已解决 |
| Scanner 真机问题 | getUserMedia 在非 HTTPS 无法使用 | 部署到 CF Pages（HTTPS）后验证 | 🟡 待验证 |
| API Key 安全 | 历史版本曾暴露前端 | CF Worker 代理（Phase 1 已实现）| ✅ 已解决 |
| AI 供应商 | Gemini 已废弃（严重限流）| 阿里云百炼 DashScope（DEC-026）| ✅ 已解决 |
