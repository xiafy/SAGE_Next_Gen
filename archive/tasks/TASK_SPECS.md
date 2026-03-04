# TASK: 补齐 7 个缺失的 Feature Specs

## 背景
check-consistency.sh 显示 PRD 中 13 个 Feature，仅 6 个有 specs/ 对应文件。
需补齐 F01, F02, F03, F04, F05, F08, F10 的 spec。

## 必读文件
- `docs/product/prd.md` — 产品需求文档（每个 Feature 有详细描述和验收标准 AC）
- `specs/` 目录下的现有 spec 文件 — 了解格式和详细程度
- `specs/core-loop-s1-first-visit.md` — 最佳参考，看 spec 的标准格式
- `shared/types.ts` — 共享类型定义

## Spec 格式要求

每个 spec 文件命名为 `specs/f{XX}-{feature-name}.md`，包含：

```markdown
# F{XX} — {Feature 名称} Spec

> 从 PRD F{XX} 提取，Sprint X 实现

## 概述
简要描述功能目标和用户价值。

## 用户故事
从 PRD 提取。

## 交互流程
描述用户操作步骤和 UI 状态变化。

## 数据模型
涉及的类型（引用 shared/types.ts）。

## 验收标准
从 PRD AC 逐条列出，标记实现状态。

## 边界情况
列出异常场景和处理方式。

## 依赖
列出与其他 Feature 的依赖关系。
```

## 具体要求

### F01 — Home
- 文件: `specs/f01-home.md`
- 关注: 会话感知（有会话→继续/新的，无→扫描）、无 Tab Bar 架构

### F02 — Scanner
- 文件: `specs/f02-scanner.md`
- 关注: 全屏相机、多张拍摄、删除重拍

### F03 — 菜单识别
- 文件: `specs/f03-menu-recognition.md`
- 关注: Gemini 2.0 Flash VL、两阶段 SSE（DEC-044/045）、JSON 输出

### F04 — 4+1 维感知
- 文件: `specs/f04-context-sensing.md`
- 关注: 时间/空间/环境/视觉/历史五维、GeoLocation 类型

### F05 — Pre-Chat
- 文件: `specs/f05-pre-chat.md`
- 如果 PRD 中 F05 没有详细内容，从 prd.md 和现有代码推断
- 关注: Pre-Chat 意图收集、偏好预设

### F08 — 点餐单与展示模式
- 文件: `specs/f08-order-waiter.md`
- 关注: 点餐清单、展示给服务员模式、Waiter 双出口

### F10 — 语言切换
- 文件: `specs/f10-language-switch.md`
- 关注: i18n、Language 类型、UI 切换

## 验收标准
- [ ] 7 个 spec 文件全部创建
- [ ] 每个文件从 PRD 提取了 AC
- [ ] 格式一致
- [ ] 运行 `bash scripts/check-consistency.sh` 确认 Spec 覆盖从 6/13 → 13/13

## 禁止
- 不要编造 PRD 中没有的需求
- 不要修改 PRD 本身
- 不要写代码
