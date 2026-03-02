# Sprint 3 Spec — 图片识别链路重构（性能与可靠性）

- 日期: 2026-03-01
- 目标: 拍照到菜单结果 P95 ≤ 10s，失败率 < 5%
- 范围: `app/src/api/analyze.ts`、`worker/handlers/analyze.ts`、`worker/utils/bailian.ts`、`worker/prompts/menuAnalysis.ts`、`shared/types.ts`、`app/src/views/AgentChatView.tsx`

## 背景问题
- 前端 Base64 + JSON 上传体积膨胀约 33%
- Worker `/api/analyze` 聚合等待，用户无中途反馈
- 弱网时大 JSON 上传与跨境调用导致频繁超时

## 设计
1. 传输层
- 前端改为 `multipart/form-data` 二进制上传图片
- Worker 支持 multipart 解析并兼容旧 JSON 请求
- Worker 内部再转 data URL 调 DashScope（不改上游 API）

2. 返回层
- `/api/analyze` 改为 SSE 响应：`progress` 事件 + `result` 事件
- 前端流式消费 SSE，实时更新识别阶段文案与进度

3. 超时与降级
- 优先 `qwen3-vl-flash`（短超时），失败后降级 `qwen3-vl-plus`（短超时）
- 前端总超时留余量并支持一次自动重试（仅 retryable 错误）

4. 并发策略
- 前端图片压缩并发限制为 2，避免 iPhone Safari 同时压缩多张导致卡顿/内存峰值

5. Prompt 优化
- 缩短菜单识别 prompt，减少冗余 token，保持输出 schema 不变

## 验收标准
- 前端与 Worker `tsc --noEmit` 全绿
- `app` 构建成功
- `app` E2E 冒烟不回归
- Path A/Path C 都能收到 SSE 进度并拿到最终菜单结果
- 兼容旧 JSON Analyze 请求（回滚/灰度安全）
