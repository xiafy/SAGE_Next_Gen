# 埋点 → 指标 → 决策 映射表

> 版本: v0.1
> 对齐: Sprint 4 埋点事件 + GTM 假设验证

---

## 核心漏斗

```
访问 → 激活(menu_scan) → 深度使用(meal_plan) → 完成(session_completed) → 留存(repeat)
```

## 事件 → 指标 → 假设 → 决策

| 埋点事件 | 计算指标 | 验证假设 | 目标值 | 未达标时的决策 |
|---------|---------|---------|--------|--------------|
| `page_visit` | 总访问量 | — | 基线 | — |
| `menu_scan` | 激活率 = scan/visit | H1: 用户愿意用 AI 点餐 | ≥50% | 优化首屏引导 or 价值传达不清 |
| `meal_plan_generated` | 方案使用率 = plan/scan | H2: 方案型比纯翻译有价值 | ≥30% | Prompt 需优化 or 功能入口不明显 |
| `explore_opened` | 浏览率 = explore/scan | — | 参考值 | — |
| `waiter_mode_opened` | Waiter 使用率 = waiter/session | H3: Waiter 模式是刚需 | ≥20% | 可能场景不对（非线下用餐） |
| `comm_panel_used` | 沟通面板使用率 = comm/waiter | — | ≥30% | 面板设计需简化 |
| `session_completed` | 完成率 = completed/scan | 整体价值 | ≥40% | 流程断点分析 |
| `error_occurred` | 错误率 = error/scan | 稳定性 | ≤5% | 紧急修复 |

## 周报模板

```markdown
# SAGE Beta Weekly Report — Week N (日期)

## 核心指标
- 总访问: X | 激活率: X% | 方案使用率: X% | 完成率: X%
- Waiter 使用率: X% | 错误率: X%

## 假设验证进展
- H1 (愿意用): ✅/⚠️/❌ — 数据: ...
- H2 (方案有价值): ✅/⚠️/❌ — 数据: ...
- H3 (Waiter 刚需): ✅/⚠️/❌ — 数据: ...

## 用户反馈摘要 (Top 3)
1. ...
2. ...
3. ...

## 本周行动
- ...

## 下周计划
- ...
```
