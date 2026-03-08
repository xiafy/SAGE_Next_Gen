# TASK: 修复 AC 覆盖率计量 Bug + 补标注

## 背景

`scripts/quality-check.sh` 中的 AC 覆盖率计算有 3 个严重 Bug，导致每日扫描连续 4 天报告 11/77 = 14%，实际覆盖率约 35%。

## Bug 描述

### Bug 1（致命）：分子分母计数逻辑不匹配

PRD (`docs/product/prd.md`) 中 AC 按功能模块独立编号：
- F01: AC1-AC6, F02: AC1-AC8, F03: AC1-AC5 ...（共 77 个条目）
- AC1 在 10+ 个模块中各出现一次

脚本当前逻辑：
```python
total_ac = len(re.findall(r'- \*?\*?AC\d+', c))           # 分母 = 77（所有条目）
test_acs.update(re.findall(r'AC\d+', t))                   # 分子 = set 去重后最多 13 个
```

**分子去重后天花板 = 13，分母 = 77，即使 100% 覆盖也只能报 17%。**

### Bug 2：无标注测试被忽略

7 个测试文件没有 `F+AC` 格式标注，但实际覆盖了 AC：
- `AllergenWarningSheet.test.tsx` → 覆盖 F08-AC7, F08-AC9
- `WaiterAllergyBanner.test.tsx` → 覆盖 F08-AC7
- `waiterActions.test.ts` → 覆盖 F08-AC5, F08-AC6
- `localLanguage.test.ts` → 覆盖 F08-AC8
- `memory.test.ts` → 覆盖 F09-AC1, F04-AC3
- `stateMachine.test.ts` → 覆盖导航状态机相关 AC

### Bug 3：非 MVP 功能算入分母

F11（Sprint 2）、F12（Sprint 2）、F13（Sprint 3）共 17 个 AC 不在 MVP 范围，但被算入分母。

## 任务要求

### Part 1: 修复 `scripts/quality-check.sh` 中的 AC 覆盖率计算

**修改 `# 8c. AC→测试覆盖` 部分的 python 代码**：

1. **分母**：从 PRD 提取 `{Feature}-{AC}` 组合（如 `F01-AC1`），而不是裸 AC 编号
   - 解析 PRD 结构：遇到 `### F\d+` 时记录当前 Feature，遇到 `- AC\d+` 时生成 `F{xx}-AC{yy}`
   - 只统计 `[MVP]` 优先级的功能（排除 `[Sprint 2]`、`[Sprint 3]`、`[Future]`、`[Backlog]`、`[已删除]`）
   - F05 已删除，F11/F12/F13 是 Sprint 2/3，应排除

2. **分子**：从测试文件中提取 `F\d+-AC\d+` 组合
   - 搜索范围：`app/src/**/*.test.*` + `worker/**/*.test.*` + `tests/**/*.md`
   - 匹配格式：`F\d+[-_]AC\d+`（支持 - 和 _ 分隔符）

3. **输出格式**：
   ```
   AC 覆盖: 17/60 (MVP)
   ```

4. **trend.csv 也要更新格式**，确保新旧数据兼容

### Part 2: 给无标注的测试文件补 F+AC 引用

在以下测试文件的 describe 块中补充 AC 引用：

1. `app/src/components/__tests__/AllergenWarningSheet.test.tsx` → F08-AC9
2. `app/src/components/__tests__/WaiterAllergyBanner.test.tsx` → F08-AC7
3. `app/src/views/__tests__/waiterActions.test.ts` → F08-AC5, F08-AC6
4. `app/src/utils/__tests__/localLanguage.test.ts` → F08-AC8
5. `app/src/utils/__tests__/memory.test.ts` → F09-AC1, F04-AC3
6. `app/src/context/__tests__/stateMachine.test.ts` → 检查实际内容标注对应 AC

**标注格式**：在 describe 名称中加入 `F{xx}-AC{yy}`，例如：
```typescript
describe('F08-AC7: Waiter allergy banner shows allergens', () => {
```

### Part 3: 验证

1. 运行 `bash scripts/quality-check.sh` 确认 AC 覆盖率输出格式正确
2. 运行 `cd app && npx vitest run` 确认所有测试通过
3. 确认 trend.csv 追加的新行格式正确

## 必读文件

- `scripts/quality-check.sh` — 要修改的脚本
- `docs/product/prd.md` — AC 的权威来源
- 上述 6 个测试文件

## AC Checklist

- [ ] Bug 1 修复：AC 覆盖率分子分母都用 `F{xx}-AC{yy}` 格式
- [ ] Bug 3 修复：只统计 MVP 优先级的功能
- [ ] 6 个测试文件补 F+AC 标注
- [ ] `bash scripts/quality-check.sh` 运行成功
- [ ] `cd app && npx vitest run` 全部通过
- [ ] git commit: `fix: AC覆盖率计量Bug修复 + 测试标注补全`

## grep 断言

```bash
grep -q 'F.*AC' scripts/quality-check.sh
grep -q 'F08-AC' app/src/components/__tests__/AllergenWarningSheet.test.tsx
grep -q 'F08-AC' app/src/components/__tests__/WaiterAllergyBanner.test.tsx
grep -q 'F08-AC' app/src/views/__tests__/waiterActions.test.ts
grep -q 'F08-AC' app/src/utils/__tests__/localLanguage.test.ts
grep -q 'F09-AC\|F04-AC' app/src/utils/__tests__/memory.test.ts
```
