# TASK_TEMPLATE.md — 编码任务下发模板 v2.0

> SAGE Agent 向子 Agent 下发任务时，必须使用此模板。
> 更新日志：v2.0 (2026-03-02) — 新增决策上下文、冲突检查、集成测试要求（DEC-063/064 复盘改进）

---

## 模板

```markdown
# TASK: [任务名称]

## 决策上下文（MUST READ）

> 列出与本任务相关的所有 DEC，每条用一句话解释决策动机和约束。
> 子 Agent 必须理解"为什么"，不只是"做什么"。

- DEC-XXX: [一句话解释决策动机和约束]
- DEC-YYY: [一句话解释决策动机和约束]

## 冲突检查（编码前逐条确认）

> 列出与本任务数据模型相关的所有 DEC/Spec，确认无矛盾。

| DEC/Spec A | DEC/Spec B | 冲突点 | 确认无矛盾 |
|-----------|-----------|--------|-----------|
| DEC-XXX   | DEC-YYY   | [可能冲突的点] | □ |

## 必读文件（开始编码前先 cat 以下文件）

- `CLAUDE.md` — Agent 行为基准
- `docs/prd.md` 的 [F编号] 章节 — 验收标准
- `docs/api-design.md` 的 [§编号] — API 契约
- `shared/types.ts` — 权威类型定义
- `specs/[相关spec].md` — 功能 Spec（注意 [MUST]/[SHOULD]/[TBD] 标注）
- [其他相关文件]

## 硬门禁（必须按顺序执行）

- [ ] G0 一致性矩阵：DEC ↔ PRD ↔ Spec ↔ types.ts ↔ Prompt 已确认一致
- [ ] G1 Spec：[TBD] 项已全部确认，无模糊项
- [ ] G2 Test：P0 验收测试骨架已写（.test.ts）
- [ ] G3 Code：开始编码
- [ ] G4 Unit+Component Test：单元 + 组件测试通过
- [ ] G5 Integration Test：集成测试通过（跨组件数据流）
- [ ] G6 Build：`npm run build` + `npx tsc --noEmit` 通过
- [ ] G7 Local Preview：`npm run dev` 走完目标路径

## PRD 验收标准清单（完成后逐条确认）

- [ ] [F编号] AC1: [具体验收条件]
- [ ] [F编号] AC2: [具体验收条件]

## 必须新增的测试（DEC-064 要求）

### 单元测试（必须）
- [ ] [描述要测的 reducer/util 行为]

### 组件测试（必须）
- [ ] [描述要测的组件渲染/交互]

### 集成测试（如涉及跨组件数据流）
- [ ] [描述要测的数据流链路]

### Worker 测试（如涉及 handler 变更）
- [ ] [描述要测的 handler 行为]

## 契约断言（完成后 grep 验证）

```bash
# 示例
grep -n "import.*shared/types" src/api/         # 确认从 shared 导入
grep -rn "orderStore" src/ --include="*.tsx"     # 确认无遗留引用
```

## 技术约束

- 所有 API 相关类型必须从 `shared/types.ts` 导入，禁止重新定义
- Tailwind v4：用 `@theme`，不用 `tailwind.config.js`
- 禁止 `any`、禁止 `console.log`（调试用 debug 面板）
- 百炼 API 调用必须有 `enable_thinking: false`（DEC-028）

## 任务描述

[具体编码要求。禁止内联 schema，用"按照 shared/types.ts 的 XXX 接口"引用。]

## Spec 模糊项处理

> 如果 Spec 中有 [TBD] 标注的项，**必须停下来问**，不得自行跳过或猜测实现。

## 完成后自检

1. `npx tsc --noEmit` — 零错误
2. `npm run build` — 零警告
3. `npm test` — 全部通过
4. 上方"硬门禁 G0~G7"全部打 ✅
5. 上方"PRD 验收标准清单"全部打 ✅
6. 上方"必须新增的测试"全部打 ✅
7. 上方"契约断言"全部 grep 通过
8. 状态机 trace：手动确认主路径 home → scanner → chat → order → waiter 无断裂

## 完成信号

TASK_DONE
```

---

## 反模式

### ❌ 内联 API schema
在 TASK.md 中手写简化版接口定义 → 子 Agent 照着简化版写代码，丢失字段结构。

### ✅ 正确做法
"请求体类型严格按照 `shared/types.ts` 的 `ChatRequest` 接口。开始前先 `cat shared/types.ts` 确认字段。"

### ❌ 跳过冲突检查
多条 DEC 涉及同一数据模型但未交叉验证 → 实现后审查发现矛盾 → 返工。

### ✅ 正确做法
在"冲突检查"表中列出所有相关 DEC 对，逐一确认无矛盾后再编码。

### ❌ 遇到 [TBD] 自行猜测
Spec 中标注 [TBD] 的需求项，子 Agent 选择跳过或猜一个实现 → 审查发现遗漏。

### ✅ 正确做法
遇到 [TBD] 立即停止编码，回报 SAGE Agent 或夏总确认后继续。
