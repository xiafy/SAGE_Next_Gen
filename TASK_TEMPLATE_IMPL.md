# TASK_TEMPLATE_IMPL.md — 实现任务模板

> SAGE Agent 向子 Agent 下发**实现任务**时使用此模板。
> 实现 Agent 只写代码，不写测试。测试由独立 Agent 编写（DEC-076）。
> 最后更新: 2026-03-06（治理能力恢复 + DEC-076 职责隔离）

---

```markdown
# TASK-IMPL: [任务名称]

## 0. 前置检查（开始前确认，任何一项未通过 → 停止）

- [ ] vision.md 与本次变更方向一致
- [ ] PRD.md 已更新，验收标准明确，无 [TBD] 项悬空
- [ ] Spec 已写，[MUST]/[SHOULD]/[TBD] 均已标注
- [ ] shared/types.ts 已更新（如涉及）
- [ ] 相关 DEC 之间无矛盾（见 §3 冲突检查）
- [ ] worker/prompts/ 已更新（如涉及 AI）

> ⚠️ 任何一项未通过 → 停止，先解决再继续编码。

## 1. 必读文件（开始编码前按顺序完整读取）

- `docs/product/vision.md` — 产品愿景（顶层权威）
- `docs/product/prd.md` 的 [F编号] 章节 — 验收标准
- `specs/[spec文件].md` — 功能 Spec（执行细则）
- `shared/types.ts` — 权威类型定义
- `docs/technical/api-design.md` §[编号] — API 契约（如涉及）
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

## 5. 契约断言（完成后 grep 验证）

```bash
grep -n "[关键字段]" [文件路径]     # 确认 [预期行为]
grep -n "[关键字段]" [文件路径]     # 确认 [预期行为]
```

## 6. 任务描述

[具体编码要求。引用 shared/types.ts，不内联 schema。
用"按照 shared/types.ts 的 XxxType 接口"代替复述类型定义]

## 7. 约束

- 禁止 `any`、禁止 `console.log`（用 logger.ts）
- 禁止内联 API schema，引用 shared/types.ts
- 禁止遗留废弃文件（修改前 grep 确认无残留引用后删除）
- 百炼 API 必须 `enable_thinking: false`（DEC-028）
- Tailwind v4：用 `@theme`，不用 `tailwind.config.js`
- **不写测试**（测试由独立 Agent 负责，DEC-076）
- 所有可测试的核心逻辑必须 export

## 8. 完成自检

1. `npx tsc --noEmit` — 零错误
2. `npm run build` — 零警告
3. `npx vitest run` — 全部通过（现有测试不破坏），无新 skip
4. 上方"PRD 验收标准清单"全部打 ✅
5. 上方"契约断言"全部 grep 通过
6. 若改了公共组件，全局 grep 使用点并逐页回归
7. 若涉及导航，手动确认主路径 Home→Scanner→Chat→Explore→Order→Waiter 无断裂

## 9. 完成输出（必须包含）

1. 变更摘要（文件数 + 新增/修改行数）
2. **Spec 偏离清单**（必填，无偏离则写"无偏离"）:
   - 偏离了 Spec 哪条？
   - 为什么偏离？
   - 建议如何更新 Spec？

TASK_DONE
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

### ❌ 只跑 tsc 不跑 build

**为什么错**：tsc 只检查类型，build 还会检查 bundle 依赖和 tree-shaking 问题。

### ❌ 最终审查发现业务逻辑 Bug

**为什么错**：最终审查只允许样式/文案/性能微调。业务逻辑 Bug 必须在实现审查（轮 2）关闭。
