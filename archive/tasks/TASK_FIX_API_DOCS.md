# TASK: 修复 API 文档与代码的一致性问题

## 背景
每日质量扫描发现 🔴 级阻断问题：
- `POST /api/transcribe` 在代码中已实现但 `docs/technical/api-design.md` 未记录
- `GET /api/weather` 在文档中有但代码中未实现（Sprint 2 占位，标记为未实现）

## 必读文件
- `docs/technical/api-design.md` — 当前 API 文档（v3.0）
- `worker/handlers/transcribe.ts` — transcribe handler 完整实现
- `worker/index.ts` — 路由注册
- `shared/types.ts` — 共享类型

## 任务
### 1. 在 api-design.md 中补充 `POST /api/transcribe` 文档

在 `### GET /api/health` 之后、`### GET /api/weather` 之前插入新章节，格式与现有 endpoint 一致。

内容必须从 `worker/handlers/transcribe.ts` 源码提取（不要编造）：
- 功能说明
- 请求体格式（audio: base64, mimeType, language）
- 响应格式（成功/失败）
- 限制（MAX_AUDIO_BYTES=500KB, ASR_TIMEOUT=20s）
- 模型：qwen-omni-turbo
- Sprint 标记：`[Sprint 3]`

### 2. 标记 `GET /api/weather` 为未实现

在现有 weather 章节加上 `⏳ 未实现` 标记，说明这是 Sprint 2 设计占位，代码中尚未注册路由。

### 3. 更新文档版本号

api-design.md 版本从 v3.0 → v3.1，更新日期。

## 验收标准
- [ ] `POST /api/transcribe` 文档完整（请求/响应/限制/模型）
- [ ] `GET /api/weather` 标记为未实现
- [ ] api-design.md 版本号更新
- [ ] 运行 `bash scripts/check-consistency.sh` — API 路由对齐检查通过（0 个错误）

## 禁止
- 不要修改代码，只改文档
- 不要改其他文件
