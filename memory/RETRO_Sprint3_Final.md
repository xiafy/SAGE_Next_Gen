# Sprint 3 最终复盘

## 时间线
- 2026-03-02：Sprint 3 代码完成 + Opus/Codex 审计（8.4/10）
- 2026-03-03 AM：自动化验收 Round 1-3，修复 BUG-001~004, A/B/C
- 2026-03-03 PM：夏总真机验收 Round 4，发现 BUG-D~J + OPEN-001 + ISSUE-008
- 2026-03-03 PM：Round 4 全量修复 + 部署 + 自动化回归验证

## 交付数据
- **Commits**: 20+ (Sprint 3 全周期)
- **Tests**: 116 pass / 12 files
- **Bugs Found & Fixed**: 14 (001-004, A-J, ISSUE 005-008, OPEN-001)
- **Deploys**: App (sage-next-gen.pages.dev) + Worker (sage-worker) 多次

## 做得好的
1. **自动化验收有效**：浏览器自动化发现了多个人工难以覆盖的边界 bug
2. **修复速度快**：Claude Code 13 分钟完成 8 项修复 + 测试
3. **文档驱动有效**：TASK_BUGFIX_ROUND4.md 模板下发，Agent 一次完成

## 做得不好的
1. **真机验收太晚**：自动化能过但真机不行（BUG-F Enrich 线上失效、BUG-G iOS 放大）
2. **Prompt 测试缺失**：BUG-J（AI 不输出 MealPlan JSON）在自动化中无法覆盖
3. **货币处理系统性遗漏**：formatPrice 存在但调用不一致，说明缺乏全局搜索 checklist

## 经验教训
- **真机验收必须前置**：下个 Sprint 起，每个功能完成后立即真机验证，不等集中验收
- **Prompt 变更 = 行为变更**：需要 before/after 真实输入输出对比，不能只看代码 diff
- **全局一致性 grep**：货币/语言/样式等全局规则，修复时必须 `rg` 全量搜索

## Sprint 4 方向
个性化记忆系统（历史记录 + 记忆机制 + 自我进化）——从工具到伙伴
