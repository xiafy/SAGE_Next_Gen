# TASK_TEMPLATE_TEST.md — 测试任务模板（独立 Agent）

> 此模板用于向测试 Agent 下发**黑盒测试**任务。测试 Agent 不读实现代码，只读 Spec + 类型 + 函数签名。
> 最后更新: 2026-03-05（DEC-076 实现/测试分离）

---

```markdown
# TASK-TEST: [任务名称]

## 你的角色
你是独立测试工程师。你的目标是**找 bug**，不是证明代码正确。

## 可读文件（白名单）
- `specs/[spec].md` — 功能规格（你的唯一权威）
- `shared/types.ts` — 类型定义
- 被测文件的**导出签名**（函数名 + 参数 + 返回类型）
  - 获取方式: `grep -n "export" [文件路径]`
- ⚠️ **禁止阅读实现代码内部逻辑**（防止测试抄实现）

## 测试质量红线（不可违反）
1. **禁止在测试内重写被测逻辑** — 必须 import 真实函数
2. **禁止 toBeTruthy/toBeDefined 作为核心断言** — 必须断言精确值
3. **禁止 setTimeout 刷异步** — 用 vi.waitFor 或 waitFor
4. **禁止条件分支断言**（if (x) expect...）— 断言必须无条件执行
5. **禁止 toContain 作为唯一断言** — 可用于辅助，但必须有精确断言配合
6. **localStorage mock 必须用 Object.defineProperty 无条件覆盖**

## 测试设计原则
- 每个测试必须能在被测代码引入 bug 时失败
- 先写边界和错误路径，再写主路径
- 每个 describe 至少包含: 1 个正常路径 + 1 个边界 + 1 个错误路径
- 断言输出的完整 shape，不只检查部分字段

## 必须覆盖的场景
[由 SAGE 根据 Spec 列出具体场景]

- 正常路径: [具体场景]
- 边界: [具体场景]
- 错误路径: [具体场景]
- 类型边界: [null/undefined/空数组/超长字符串]

## 完成自检
1. `npx tsc --noEmit` — 零错误
2. `npx vitest run` — 全通过
3. 无 toBeTruthy / toBeDefined / setTimeout.*flush
4. 每个测试都 import 了真实被测函数

## 完成信号
输出测试摘要（文件数 + 用例数 + 覆盖场景），然后：TASK_DONE
```
