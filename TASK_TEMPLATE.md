# TASK_TEMPLATE.md — 编码任务下发模板

> SAGE Agent 向子 Agent 下发任务时，必须使用此模板。
> 禁止内联 API schema 或类型定义——必须引用源文件。
> 最后更新: 2026-03-02（DEC-063/064/065 升级）

---

## 模板

```markdown
# TASK: [任务名称]

## 0. 前置检查（开始前确认）

- [ ] vision.md 与本次变更方向一致
- [ ] PRD.md 已更新，验收标准明确，无 [TBD] 项悬空
- [ ] Spec 已写，[MUST]/[SHOULD]/[TBD] 均已标注
- [ ] shared/types.ts 已更新（如涉及）
- [ ] 相关 DEC 之间无矛盾
- [ ] P0 功能测试骨架已写（见下方"测试要求"）

> ⚠️ 任何一项未通过 → 停止，先解决再继续编码。

## 1. 必读文件（开始编码前先完整读取）

- `docs/vision.md` — 产品愿景（顶层权威）
- `docs/prd.md` 的 [F编号] 章节 — 验收标准
- `specs/[spec文件].md` — 功能 Spec（执行细则）
- `shared/types.ts` — 权威类型定义
- `docs/api-design.md` §[编号] — API 契约（如涉及）
- [其他相关文件，如现有 view 代码、worker handler]

## 2. 关键决策上下文（MUST READ）

> 说明每条 DEC 的决策动机和核心约束，不只列编号。

- **DEC-XXX**：[一句话：为什么这么决策 + 关键约束]
- **DEC-YYY**：[一句话：为什么这么决策 + 关键约束]

## 3. 冲突检查

以下 DEC 涉及同一数据模型，确认互相不矛盾：
- DEC-XXX [字段A] vs DEC-YYY [字段A] → [已对齐/差异说明]

## 4. PRD 验收标准清单（完成后逐条确认）

- [ ] [F编号] AC1: [具体验收条件，引用 Spec §X.X]
- [ ] [F编号] AC2: [具体验收条件]
- [ ] 边界场景: [至少列 2 个边界/异常场景]

## 5. 测试要求（DEC-064）

> 配比目标：单元 50% / 组件 20% / 集成 20% / E2E 10%

必须新增的测试（写出具体测试描述，不是"写测试"）：
- 单元: `[测试文件]` — [具体场景，如"sold_out 后 orderItems 移除对应菜品"]
- 组件: `[测试文件]` — [具体渲染行为]
- 集成: `[测试文件]` — [跨层验证场景，如"Explore选菜→注入Chat→AI响应"]
- Worker: `[handler测试]` — [至少 1 个 handler 单元测试]

## 6. 契约断言（完成后 grep 验证）

```bash
grep -n "[关键字段]" [文件路径]     # 确认 [预期行为]
grep -n "[关键字段]" [文件路径]     # 确认 [预期行为]
```

## 7. 禁止项

- 禁止 `any`、禁止 `console.log`（用 logger.ts）
- 禁止内联 API schema，引用 shared/types.ts
- 禁止遗留废弃文件（修改前 grep 确认无残留引用后删除）
- 百炼 API 必须 `enable_thinking: false`（DEC-028）
- Tailwind v4：用 `@theme`，不用 `tailwind.config.js`

## 8. 任务描述

[具体编码要求，不内联 schema。用"按照 shared/types.ts 的 XxxType 接口"代替复述类型定义]

## 9. 完成自检

1. `npx tsc --noEmit` — 零错误
2. `npm run build` — 零警告
3. `npx vitest run` — 全部通过，无新 skip
4. 上方"PRD 验收标准清单"全部打 ✅
5. 上方"契约断言"全部 grep 通过
6. 新增测试覆盖上方"测试要求"所有场景
7. 若改了公共组件，全局 grep 使用点并逐页回归
8. 若涉及导航，手动确认主路径 Home→Scanner→Chat→Explore→Order→Waiter 无断裂

## 完成信号

输出变更摘要（文件数 + 新增/修改行数 + 测试通过数），然后：TASK_DONE
```

---

## 反模式（禁止）

### ❌ 跳过前置检查直接编码

**为什么错**：Sprint 3 复盘显示 40% 的 🔴 来自规格不一致。目标不清晰时进入研发是最大的返工风险。

### ❌ 内联 API schema

```markdown
# 错误示例
/api/chat 请求体：{ "mode": "pre_chat", "messages": [...] }
```

**为什么错**：简化版丢失字段结构，子 Agent 会照着简化版写代码。

### ✅ 正确做法

```markdown
请求体类型严格按照 shared/types.ts 的 ChatRequest 接口。
```

### ❌ 只写单元测试

**为什么错**：106 条单元测试，覆盖率仍只有 5/10（Sprint 3 教训）。集成测试和 E2E 才能验证真实行为链路。

### ❌ 最终审查发现业务逻辑 Bug

**为什么错**：最终审查只允许样式/文案/性能微调。业务逻辑 Bug 必须在实现审查（轮 2）关闭。
