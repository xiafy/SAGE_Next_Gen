# TASK_TEMPLATE_IMPL.md — 实现任务模板（不含测试）

> 编码 Agent 只写实现，不写测试。测试由独立 Agent 编写。
> 最后更新: 2026-03-05（DEC-076）

---

```markdown
# TASK-IMPL: [任务名称]

## 必读文件
- [Spec、types、相关源码]

## 关键决策上下文
- **DEC-XXX**: [一句话决策 + 约束]

## 任务描述
[具体编码要求。引用 shared/types.ts，不内联 schema]

## 约束
- 禁止 `any`、禁止 `console.log`
- 禁止内联 API schema
- 百炼 API: `enable_thinking: false`
- **不写测试**（测试由独立 Agent 负责）
- 所有可测试的核心逻辑必须 export

## 完成自检
1. `npx tsc --noEmit` — 零错误
2. 现有测试不破坏（`npx vitest run` 全通过）

## 完成输出（必须包含）
1. 变更摘要（文件数 + 新增/修改行数）
2. **Spec 偏离清单**（必填，无偏离则写"无偏离"）:
   - 偏离了 Spec 哪条？
   - 为什么偏离？
   - 建议如何更新 Spec？

TASK_DONE
```
