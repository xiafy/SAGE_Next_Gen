# Prompt 变更规范

> 版本: v1.0
> 日期: 2026-03-04

---

## 机械化强制（hook 已生效）

- `.githooks/commit-msg` 会检查 `worker/prompts/` 下文件变更
- commit message 中必须包含 `Before:` 和 `After:` 两行（各自非空）
- 不符合则 commit 被拒绝

## 人工检查清单（hook 无法覆盖）

Prompt 变更 PR 前，逐项确认：

```
□ Before/After 是真实 API 调用的结果，不是编造的
□ 至少用 1 张测试图片验证（app/public/test-menu.jpg 或其他）
□ JSON 输出通过 worker/schemas/ 下对应的 Zod schema 校验
□ 如涉及新字段，shared/types.ts 已同步更新
□ 如涉及输出格式变化，前端解析代码已同步更新
```

## 测试夹具（v2 计划）

未来在 `worker/prompts/__fixtures__/` 下放置：
- 标准化测试菜单图片（泰餐/中餐/西餐各 1 张）
- 对应的期望输出 JSON
- 验证脚本：调用 API → 对比输出 → 报告差异

当前 v1 依赖 hook + 人工检查，已比之前（0% 覆盖）大幅提升。

## 参考

- DEC-041：Prompt 变更必须附带 I/O diff
- DEC-044：JSON 输出必须 stream=false
- OpenAI Harness Engineering 原则 6：品味通过工具编码
