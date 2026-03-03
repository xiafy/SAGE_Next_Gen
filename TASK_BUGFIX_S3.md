# TASK: Sprint 3 验收 Bug 修复

## 必读文件
- `DECISIONS.md`（特别是 DEC-052v2, DEC-054, DEC-057, DEC-058, DEC-059, DEC-059v2）
- `shared/types.ts`（MealPlan, OrderItem 类型定义）
- `docs/acceptance-test-report-20260303.md`（完整 bug 描述）
- `docs/prd.md`（F06 AgentChat, F07 Explore, F08 Order）

## Bug 清单（按优先级）

### 🔴 P0 — 阻塞上线

#### BUG-001: Explore 所有菜品显示成同一道菜
- **位置**: `app/src/views/ExploreView.tsx`
- **现象**: 3 个不同分类下的菜品名字全是"泰式煎蛋盖饭"，价格全是 70
- **根因排查**: 检查菜单识别结果（menuResult.items）是否正确，Explore 渲染是否用了错误的 key/id 映射
- **验证**: 每个分类下的菜品应该有不同的名称、价格、描述

#### BUG-002: Order/Waiter 把不同菜品合并为同一条目 ×N
- **位置**: `app/src/context/AppContext.tsx`（reducer 中 ADD_TO_ORDER 逻辑）
- **现象**: "整套加入订单"后，泰式煎蛋+猪肉炒河粉变成 "Rice topped with Thai omelet ×2"
- **根因排查**: addToOrder 是否用 name/id 去重时把不同菜品视为同一个
- **验证**: Order 页和 Waiter 模式应显示 2 个不同条目，各 ×1

#### BUG-003: MealPlanCard 替换后不更新
- **位置**: `app/src/views/AgentChatView.tsx` + `worker/prompts/agentChat.ts`
- **现象**: 点击替换按钮，AI 文字回复了建议，但没有生成新的 MealPlanCard v2
- **根因排查**: 替换请求是否触发了 AI 输出新的 JSON 代码块？Prompt 是否指示 AI 在替换时输出完整的新 MealPlan JSON？
- **验证**: 替换后应出现新的 MealPlanCard（v2），旧卡片标记为已过期或移除

#### BUG-004: Explore 数量与 Order 耦合
- **位置**: `app/src/views/ExploreView.tsx`
- **现象**: Explore 中菜品的 +/- 数量显示为 2（来自 Order）
- **根因排查**: Explore 的数量控件是否引用了 Order state？应该独立或不显示数量
- **验证**: Explore 中菜品初始数量应为 0 或不显示数量计数器

### 📝 决策变更

#### DEC-059v2: MealPlanCard 触发阈值
- **变更**: ≥2 道菜即出 MealPlanCard（原 <5 道不出卡片的规则已废弃）
- **修改位置**: `worker/prompts/agentChat.ts` 中的方案型输出 Prompt
- **验证**: 让 AI 推荐 2 道菜时也输出 JSON 代码块

#### 术语修正: "课程"→"分组"
- **范围**: 所有文档（DECISIONS.md, prd.md）和 Prompt 中的中文文案
- **代码**: `courses` 变量名保留不变，只改中文注释和 UI 显示文案
- **注意**: 英文 "course" 在代码/类型里保留，中文面向用户的文案改为"分组"

### 🟡 P1 — 体验优化

#### ISSUE-005: Pre-Chat handoff 竞态
- **位置**: `app/src/views/AgentChatView.tsx`（handoff 逻辑）
- **现象**: 菜单识别完成后立即 handoff 到主 Chat，打断了 Pre-Chat 的忌口/过敏问答
- **修复方向**: handoff 应该等 Pre-Chat 轮次完成（至少完成当前一问一答），不因识别完成而提前中断

#### ISSUE-006/007: 价格和货币符号不一致
- **现象**: MealPlanCard 用 "฿65"，Order 底部用 "THB 140"，Explore 用 "70.-"
- **修复**: 统一为一种格式（建议统一用 "฿" + 数字，如 "฿65"）

## 质量门控
1. `cd app && npx tsc --noEmit` ✅
2. `cd worker && npx tsc --noEmit` ✅
3. `cd app && pnpm build` ✅
4. `cd app && pnpm test` ✅（106+ 测试通过）
5. grep 验证：
   - `rg "课程" app/ worker/ shared/ --glob '!*.md' --glob '!node_modules'` → 0 命中
   - 每个 bug 的具体验证条件见上方

## 完成后
运行: `openclaw system event --text "Done: Sprint 3 bugfix 完成 — BUG-001/002/003/004 + DEC-059v2 + 术语修正 + ISSUE-005/006/007" --mode now`
