# TASK-TEST: F01/F09/F10/F04 AC 测试补充（Batch 2）

## 你的角色

你是独立测试工程师。你的目标是**找 bug**，不是证明代码正确。

## 0. 前置检查

- [x] 不涉及功能变更，纯测试补充
- [x] PRD AC 定义明确

## 1. 可读文件（白名单）

- `docs/product/prd.md` 的 F01、F04、F09、F10 章节
- `shared/types.ts`
- 已有测试文件（避免重复）：
  - `app/src/context/__tests__/appReducer.test.ts`
  - `app/src/utils/__tests__/preferences.test.ts`
  - `app/src/__tests__/navigationIntegration.test.ts`
- ⚠️ **禁止阅读 .ts/.tsx 实现源码**

## 2. 关键决策上下文

- **DEC-040**: 纯任务流导航，无 Tab Bar
- **DEC-057**: 导航状态机规则

## 3. PRD 验收标准清单（你需要覆盖的 AC）

### F01 Home（2 个 AC 待覆盖）
- [ ] F01-AC2: 主入口在 375px-430px 屏宽下清晰可见，无需滚动
- [ ] F01-AC4: 设置图标可访问，点击进入设置页

### F04 感知数据（2 个 AC 待覆盖）
- [ ] F04-AC1: 所有感知数据采集失败时，主流程不中断
- [ ] F04-AC2: GPS 被拒后无任何弹窗或提示

### F09 偏好管理（3 个 AC 待覆盖）
- [ ] F09-AC2: AI 提及偏好的方式自然，不机械念清单
- [ ] F09-AC3: 偏好管理页可查看/删除/添加每条偏好
- [ ] F09-AC4: 用户在对话中说"其实我现在可以吃香菜了"，AI 更新记录

### F10 语言切换（1 个 AC 待覆盖）
- [ ] F10-AC1: 自动检测准确（中文/非中文两档）

## 4. 测试质量红线

1. 禁止在测试内重写被测逻辑
2. 禁止 toBeTruthy/toBeDefined 作为核心断言
3. 禁止 setTimeout 刷异步
4. 禁止条件分支断言
5. localStorage mock 必须 Object.defineProperty 无条件覆盖

## 5. 测试设计原则

- 每个 describe 至少: 1 正常 + 1 边界 + 1 错误
- **每个 describe 名称必须以 F{xx}-AC{yy} 开头**
- 你自行判断每个 AC 需要什么测试，不要依赖外部给你的映射

## 6. 契约断言

```bash
grep -q 'F01-AC2' app/src/**/*.test.*
grep -q 'F01-AC4' app/src/**/*.test.*
grep -q 'F04-AC1' app/src/**/*.test.*
grep -q 'F04-AC2' app/src/**/*.test.*
grep -q 'F09-AC2' app/src/**/*.test.*
grep -q 'F09-AC3' app/src/**/*.test.*
grep -q 'F09-AC4' app/src/**/*.test.*
grep -q 'F10-AC1' app/src/**/*.test.*
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
