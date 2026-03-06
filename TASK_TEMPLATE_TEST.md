# TASK_TEMPLATE_TEST.md — 测试任务模板

> SAGE Agent 向子 Agent 下发**测试任务**时使用此模板。
> 测试 Agent 只写测试，禁止阅读实现代码内部逻辑（DEC-076）。
> 最后更新: 2026-03-06（治理能力恢复 + DEC-076 职责隔离）

---

```markdown
# TASK-TEST: [任务名称]

## 你的角色

你是独立测试工程师。你的目标是**找 bug**，不是证明代码正确。

## 0. 前置检查（开始前确认，任何一项未通过 → 停止）

- [ ] vision.md 与本次变更方向一致
- [ ] PRD.md 已更新，验收标准明确，无 [TBD] 项悬空
- [ ] Spec 已写，[MUST]/[SHOULD]/[TBD] 均已标注
- [ ] shared/types.ts 已更新（如涉及）
- [ ] 相关 DEC 之间无矛盾（见 §3 冲突检查）

> ⚠️ 任何一项未通过 → 停止，先解决再继续编码。

## 1. 可读文件（白名单，只读这些）

- `docs/product/vision.md` — 产品愿景（顶层权威）
- `docs/product/prd.md` 的 [F编号] 章节 — 验收标准
- `specs/[spec文件].md` — 功能 Spec（你的唯一权威）
- `shared/types.ts` — 类型定义
- `docs/technical/api-design.md` §[编号] — API 契约（如涉及）
- 被测模块的 `.d.ts` 类型声明（由 SAGE 提供，来自 tsc --declaration）
- ⚠️ **禁止阅读 .ts/.tsx 实现源码**

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

## 5. 测试质量红线（违反任何一条 = 不合格）

1. 禁止在测试内重写被测逻辑 — 必须 import 真实函数
2. 禁止 toBeTruthy/toBeDefined 作为核心断言 — 必须断言精确值
3. 禁止 setTimeout 刷异步 — 用 vi.waitFor
4. 禁止条件分支断言（if (x) expect...）— 断言必须无条件执行
5. 禁止 toContain 作为唯一断言
6. localStorage mock 必须 Object.defineProperty 无条件覆盖

## 6. 测试设计原则

> 配比目标：单元 50% / 组件 20% / 集成 20% / E2E 10%

- 先写边界和错误路径，再写主路径
- 每个 describe 至少: 1 正常 + 1 边界 + 1 错误
- 断言输出的完整 shape，不只部分字段

## 7. 必须覆盖的场景

[由 SAGE 根据 Spec 列出具体场景]

- 单元: `[测试文件]` — [具体场景，如"sold_out 后 orderItems 移除对应菜品"]
- 组件: `[测试文件]` — [具体渲染行为]
- 集成: `[测试文件]` — [跨层验证场景，如"Explore选菜→注入Chat→AI响应"]
- Worker: `[handler测试]` — [至少 1 个 handler 单元测试]

## 8. 契约断言（完成后 grep 验证）

```bash
grep -n "[关键字段]" [文件路径]     # 确认 [预期行为]
grep -n "[关键字段]" [文件路径]     # 确认 [预期行为]
```

## 9. 约束

- 禁止 `any`、禁止 `console.log`
- 禁止阅读实现源码（只读白名单文件）
- Tailwind v4：用 `@theme`，不用 `tailwind.config.js`

## 10. 完成自检

1. `npx tsc --noEmit` — 零错误
2. `npx vitest run` — 全部通过，无新 skip
3. grep 确认无 toBeTruthy / setTimeout.*flush / if.*expect
4. 上方"PRD 验收标准清单"全部打 ✅
5. 上方"契约断言"全部 grep 通过
6. 上方"必须覆盖的场景"全部有对应测试

## 完成输出

测试摘要（文件数 + 用例数 + 覆盖场景），然后 TASK_DONE
```

---

## 反模式（禁止）

### ❌ 跳过前置检查直接写测试

**为什么错**：不理解 Spec 就写测试，写出来的用例验证的是自己的猜测而不是规格。

### ❌ 读了实现源码再写测试

**为什么错**：认知污染（DEC-076）。读了源码后会不自觉地"验证实现"而不是"验证行为"，丧失独立视角。

### ❌ 只写单元测试

**为什么错**：106 条单元测试，覆盖率仍只有 5/10（Sprint 3 教训）。集成测试和 E2E 才能验证真实行为链路。

### ❌ toBeTruthy 作为核心断言

```typescript
// 错误
expect(result).toBeTruthy();
// 正确
expect(result).toEqual({ id: 'dish-1', name: '宫保鸡丁', price: 38 });
```

**为什么错**：toBeTruthy 只验证"有值"，不验证值是否正确。任何非空对象都能通过。
