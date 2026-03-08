# TASK-TEST: F06 AgentChat AC 测试补充（Batch 3）

## 你的角色

你是独立测试工程师。你的目标是**找 bug**，不是证明代码正确。

## 0. 前置检查

- [x] 不涉及功能变更，纯测试补充
- [x] PRD AC 定义明确

## 1. 可读文件（白名单）

- `docs/product/prd.md` 的 F06 章节
- `specs/core-loop-s1-first-visit.md`
- `specs/mealplan-and-order-spec.md`
- `shared/types.ts`
- `docs/technical/api-design.md` — Chat API 契约
- 已有测试文件（避免重复）：
  - `app/src/utils/__tests__/processAIResponse.test.ts`
  - `app/src/utils/__tests__/streamJsonParser.test.ts`
  - `app/src/components/__tests__/MealPlanCard.test.tsx`
  - `app/src/context/__tests__/appReducer.test.ts`
- ⚠️ **禁止阅读 views/*.tsx / components/*.tsx 实现源码**

## 2. 关键决策上下文

- **DEC-027**: Pre-Chat 机制 — AI 主动多轮引导
- **DEC-043**: 两种核心意图（探索型/方案型），由 AI 自然涌现
- **DEC-052v2**: 方案型输出格式 — 流式文字 + 末尾 JSON 代码块
- **DEC-055**: MealPlanCard 是 AI 提案，Order 是用户决定
- **DEC-058**: AI 直接操作 Order
- **DEC-059**: 课程结构由 AI 动态生成，不硬编码西餐顺序

## 3. PRD 验收标准清单（你需要覆盖的 AC）

### F06 AgentChat（7 个 AC 待覆盖）
- [ ] F06-AC4: 主 Chat 首条消息不重复询问 Pre-Chat 已回答的问题
- [ ] F06-AC5: 快捷按钮由 AI 根据上下文动态生成
- [ ] F06-AC7: 网络中断时，已有对话不丢失
- [ ] F06-AC9: MealPlanCard 支持逐道替换和「整套加入订单」
- [ ] F06-AC10: AI 自动识别用户意图（探索/方案），无需用户显式选择
- [ ] F06-AC6: 切换到探索视图再返回，对话历史完整保留（补充：当前测试只覆盖导航，未覆盖对话历史）

注意：F06-AC1/2/3 是性能相关（响应时间 < Xs），不在本批自动化范围内。

## 4. 测试质量红线

1. 禁止在测试内重写被测逻辑
2. 禁止 toBeTruthy/toBeDefined 作为核心断言
3. 禁止 setTimeout 刷异步
4. 禁止条件分支断言
5. localStorage mock 必须 Object.defineProperty 无条件覆盖

## 5. 测试设计原则

- 每个 describe 至少: 1 正常 + 1 边界 + 1 错误
- **每个 describe 名称必须以 F{xx}-AC{yy} 开头**
- 测试重点：状态机行为、reducer 逻辑、数据流，不测 UI 渲染细节
- 对于 AI 行为相关 AC（AC4/5/10），测试 processAIResponse 和 prompt 构建逻辑
- 你自行判断每个 AC 需要什么测试，不要依赖外部给你的映射

## 6. 契约断言

```bash
grep -q 'F06-AC4' app/src/**/*.test.*
grep -q 'F06-AC5' app/src/**/*.test.*
grep -q 'F06-AC6' app/src/**/*.test.*
grep -q 'F06-AC7' app/src/**/*.test.*
grep -q 'F06-AC9' app/src/**/*.test.*
grep -q 'F06-AC10' app/src/**/*.test.*
```

## 7. 约束

- 禁止 `any`、禁止 `console.log`
- **禁止阅读实现源码**
- 新测试文件放在对应模块的 `__tests__/` 目录下

## 8. 完成自检

1. `npx tsc --noEmit` — 零错误
2. `npx vitest run` — 全部通过
3. grep 确认无 toBeTruthy / setTimeout.*flush / if.*expect
4. 契约断言全部通过

## 完成输出

测试摘要（文件数 + 用例数 + 覆盖 AC 列表），然后 TASK_DONE
