# Sprint 2 Backfill Tests Checklist

## T1 Model Fallback
- [ ] 用 mock/日志验证 `mode=chat` 首选 plus
- [ ] 模拟 403/5xx，验证 fallback 到 flash
- [ ] `mode=pre_chat` 不触发 fallback

## T2 Weather Injection
- [ ] location 正常时返回天气并进入 prompt
- [ ] 天气 API 超时（>500ms）不阻断
- [ ] lat/lng 非法（NaN/越界）直接跳过

## T3 Error Suggestions
- [ ] 9 个错误码均含 suggestion/suggestionZh
- [ ] 前端能按语言输出可执行建议

## T4 KI Prompt Quality Regression
- [ ] KI-001: 非海鲜菜名不误标 `contains_seafood`
- [ ] KI-002: “便宜点”提炼为预算偏好，不降级成含糊“低”
