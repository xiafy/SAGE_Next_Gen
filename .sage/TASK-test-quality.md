# TASK: 测试质量修复 — Codex 审计 Top 5

## 必读文件
- `.sage/prompt-patterns.md` — Anti-Pattern 6（localStorage mock）
- 每个待修复的测试文件本身
- 对应的被测源码文件

## 约束（重要）
- 不能删除已有测试用例（只能改进断言或补充）
- 不能修改非测试文件（业务代码不动）
- 修复后 `cd app && npx vitest run` 全部通过
- localStorage mock 统一用 `Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true })`

## 任务清单

### Fix 1: orderBadge.test.ts (3/10 → 目标 7+)

**问题**: 测试内重写业务逻辑（第 17-27 行），未测试真实导出函数/组件。
**修复**: 
- 找到 orderBadge 对应的真实导出函数（在 app/src/views/ 下）
- 删除测试内的公式重实现
- 改为 import 真实函数并断言其输出
- 补边界用例：空订单、单品、多品、数量为 0

### Fix 2: preferences.test.ts (4/10 → 目标 7+)

**问题**: 假行为测试 — 系统语言测试只算本地变量（121-140），stored override 仅 JSON.parse（142-147）。
**修复**:
- 删除"自证式"测试（在测试内算结果然后断言自己算的结果）
- 改为调用真实的 preference 加载/保存逻辑
- 测试 localStorage 读写的真实行为
- 补 migration 边界（旧格式→新格式）

### Fix 3: appReducer.test.ts + stateMachine.test.ts 去重

**问题**: stateMachine.test.ts 与 appReducer.test.ts 有重复单步断言。
**修复**:
- stateMachine.test.ts 保留"多动作序列"场景（跨步骤状态转换链）
- 删除与 appReducer.test.ts 重复的单步断言
- appReducer.test.ts 中的 truthy 断言改为精确值断言（如 `toBeTruthy()` → `toBe('expected_value')`）

### Fix 4: 全仓宽松断言 → 精确断言

**优先文件**: localLanguage.test.ts, agentChatPrompt.test.ts
**修复**:
- `toBeTruthy()` → 精确值断言（`toBe(xxx)` 或 `toEqual(xxx)`）
- `toContain(substring)` 在 prompt 测试中保留（适合 prompt），但补充结构断言
- localLanguage.test.ts: 每个语言测试改为断言精确返回值，不只 truthiness

### Fix 5: useLazySummarize.test.ts 异步策略

**问题**: `flushPromises` 用 `setTimeout(0)` 脆弱。
**修复**:
- 用 `vi.waitFor` 或 `await vi.runAllTimersAsync()` 替代 `setTimeout(0)`
- 确保异步副作用完成后再断言
- 补重复挂载场景（第二次 mount 不应重复消费已清除的 pending）

## 验收
- [ ] `cd app && npx tsc --noEmit` 零错误
- [ ] `cd app && npx vitest run` 全通过
- [ ] `cd worker && npx vitest run` 全通过
- [ ] 无新增 `toBeTruthy` 或 `setTimeout(0)` 模式
- [ ] orderBadge.test.ts 不包含业务逻辑重实现
- [ ] preferences.test.ts 不包含"自证式"测试
