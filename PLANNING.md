# PLANNING.md — 工作计划

> 更新规则：每次 Sprint 开始时更新当前 Sprint，完成后归档到历史区。  
> 当前状态以 `PROGRESS.md` 为准。

---

## 当前阶段：Sprint 1 完成 → Sprint 2 待启动

**进度**: Sprint 0 ✅ | Sprint 1 ✅ | **Sprint 2 ⏳ 待开始**

---

## Sprint 2 — 感知体系接入（待启动）

**前置条件**: Sprint 1 Alpha 稳定 ✅  
**目标**: 接入 4+1 维感知，体验从"工具"升级为"智能体"

### 任务清单（待细化）
- [ ] GPS 位置获取（空间维度）
- [ ] 系统时间注入（时间维度）
- [ ] 天气 API 接入（环境维度）
- [ ] 历史记忆系统（localStorage 持久化）
- [ ] Prompt 工程：将 4+1 维数据融入 System Prompt
- [ ] 偏好学习（从对话中自动提炼偏好关键词）
- [ ] Paywall 实现（免费 5 次，DEC-030）

---

## Sprint 3 — 质量与上线

**前置条件**: Sprint 2 功能稳定  
**目标**: 生产级质量，正式部署

### 任务清单（待细化）
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
| Scanner 真机问题 | getUserMedia 在非 HTTPS 无法使用 | 已部署到 CF Pages（HTTPS）| 🟡 待验证 |

### 已解决的风险
| 风险 | 解决方案 |
|------|---------|
| AI 响应速度 | `enable_thinking: false`（DEC-028），TTFT <500ms ✅ |
| API Key 安全 | CF Worker 代理（DEC-005）✅ |
| AI 供应商 | 阿里云百炼 DashScope（DEC-026）✅ |
