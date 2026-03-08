# TASK-TEST: F07/F08 AC 测试补充（Batch 1）

## 你的角色

你是独立测试工程师。你的目标是**找 bug**，不是证明代码正确。

## 0. 前置检查（开始前确认，任何一项未通过 → 停止）

- [x] vision.md 与本次变更方向一致（测试补充，不涉及功能变更）
- [x] PRD.md 已更新，验收标准明确，无 [TBD] 项悬空
- [x] shared/types.ts 已更新（不涉及新增）
- [x] 相关 DEC 之间无矛盾

## 1. 可读文件（白名单，只读这些）

- `docs/product/prd.md` 的 F07 和 F08 章节 — **你的唯一权威**
- `specs/mealplan-and-order-spec.md` — MealPlan & Order Spec
- `specs/waiter-upgrade-spec.md` — Waiter 模式 Spec
- `shared/types.ts` — 类型定义
- 已有测试文件（了解现有覆盖，避免重复）：
  - `app/src/components/__tests__/MealPlanCard.test.tsx`
  - `app/src/components/__tests__/DishCommunicationPanel.test.tsx`
  - `app/src/components/__tests__/AllergenWarningSheet.test.tsx`
  - `app/src/components/__tests__/WaiterAllergyBanner.test.tsx`
  - `app/src/views/__tests__/orderBadge.test.ts`
  - `app/src/views/__tests__/waiterActions.test.ts`
  - `app/src/__tests__/navigationIntegration.test.ts`
- ⚠️ **禁止阅读 views/*.tsx / components/*.tsx 实现源码**

## 2. 关键决策上下文（MUST READ）

- **DEC-055**: MealPlanCard 是 AI 的"提案"，Order 是用户的"决定"。两者分离。
- **DEC-057**: 导航状态机规则 — Chat ↔ Explore ↔ Order 自由切换，Waiter 双出口（继续点菜 / 结束用餐），"结束用餐"需二次确认后清空。
- **DEC-060**: 指点式沟通面板 — Waiter Mode 下点击菜品弹出双语沟通面板。
- **DEC-043**: Explore 双出口 — 展示给服务员 / 咨询 AI。

## 3. 冲突检查

无已知冲突。

## 4. PRD 验收标准清单（你需要覆盖的 AC）

### F07 探索视图（6 个 AC 待覆盖）

- [ ] F07-AC2: 菜品分类由 AI 识别决定，不硬编码
- [ ] F07-AC3: 返回 AgentChat 时定位到最新消息
- [ ] F07-AC4: "全部"tab 下菜品按分类分组，每组有标题
- [ ] F07-AC6: 已选菜品 > 0 时底部操作栏自动出现
- [ ] F07-AC8: 「展示给服务员」从 Explore 直接进入 Waiter Mode
- [ ] F07-AC9: SelectedDishesCard 使用系统消息样式

### F08 点餐单（4 个 AC 待覆盖）

- [ ] F08-AC2: 展示模式字号 ≥ 28px，高对比（深色背景白字）
- [ ] F08-AC3: 展示模式只显示原文菜名 + 数量，不显示翻译、不显示价格
- [ ] F08-AC4: 展示模式屏幕常亮（navigator.wakeLock）
- [ ] F08-AC5: 「继续点菜」回到 Order，可继续回 Chat 加菜

## 5. 测试质量红线（违反任何一条 = 不合格）

1. 禁止在测试内重写被测逻辑 — 必须 import 真实函数/组件
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
- **每个 describe 名称必须以 F{xx}-AC{yy} 开头**

## 7. 必须覆盖的场景

读取 PRD 中每个 AC 的描述，独立判断需要哪些测试场景。

对于每个 AC，你需要：
1. 读 PRD 中 AC 的完整描述
2. 读相关 Spec 的详细说明
3. 根据描述设计测试场景（正常 + 边界 + 错误）
4. 用 `@testing-library/react` 渲染组件 或 用 reducer 验证状态变更
5. 在 describe 名称中标注 F{xx}-AC{yy}

**重要**：你自行判断每个 AC 需要什么测试，不要依赖外部给你的映射。

## 8. 契约断言（完成后 grep 验证）

```bash
grep -q 'F07-AC2' app/src/**/*.test.*
grep -q 'F07-AC3' app/src/**/*.test.*
grep -q 'F07-AC4' app/src/**/*.test.*
grep -q 'F07-AC6' app/src/**/*.test.*
grep -q 'F07-AC8' app/src/**/*.test.*
grep -q 'F07-AC9' app/src/**/*.test.*
grep -q 'F08-AC2' app/src/**/*.test.*
grep -q 'F08-AC3' app/src/**/*.test.*
grep -q 'F08-AC4' app/src/**/*.test.*
grep -q 'F08-AC5' app/src/**/*.test.*
```

## 9. 约束

- 禁止 `any`、禁止 `console.log`
- **禁止阅读实现源码（只读白名单文件）**
- 新测试文件放在对应模块的 `__tests__/` 目录下
- 可以在已有测试文件中追加 describe 块，也可以新建文件

## 10. 完成自检

1. `npx tsc --noEmit` — 零错误
2. `npx vitest run` — 全部通过，无新 skip
3. grep 确认无 toBeTruthy / setTimeout.*flush / if.*expect
4. 上方"PRD 验收标准清单"全部打 ✅
5. 上方"契约断言"全部 grep 通过

## 完成输出

测试摘要（文件数 + 用例数 + 覆盖 AC 列表），然后 TASK_DONE

完成后运行: openclaw system event --text "Done: F07/F08 AC测试补充完成 — Batch 1" --mode now
