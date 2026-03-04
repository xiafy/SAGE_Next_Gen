# 每日质量扫描（Daily Quality Scan）

> 版本: v1.0
> 日期: 2026-03-04
> 状态: ⚠️ 待启用（SAGE Gateway cron 当前 disabled）

## 目标

持续小额还债（OpenAI "垃圾回收"原则），而非积累后爆发。

## 扫描内容

| 检查项 | 命令 | 报告 |
|--------|------|------|
| 编译状态 | `cd app && npx tsc --noEmit` | ✅/❌ |
| 测试状态 | `cd app && npx vitest run` | N/N 通过 |
| 技术债 | `grep -r "TODO\|FIXME\|HACK" --include="*.ts"` | 数量统计 |
| 未推送 commits | `git log origin/main..HEAD --oneline` | 数量 |
| 覆盖率变化 | `npx vitest run --coverage` | Stmts% 变化趋势 |

## 启用方式

需要 Mr. Xia 在 SAGE Gateway 配置中启用 cron：

```json
// ~/.openclaw-sage/openclaw.json
{
  "cron": {
    "enabled": true
  }
}
```

然后通过 OpenClaw cron API 创建每日 09:00 任务。

## 报告格式

```
📊 SAGE 每日质量报告 (2026-03-04)
━━━━━━━━━━━━━━━━━━━━━━
✅ 编译: 通过
✅ 测试: 119/119 通过
📝 技术债: TODO×3 FIXME×1
⚠️ 未推送: 2 commits
📈 覆盖率: Stmts 73.8% (→0%)
```
