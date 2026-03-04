# TASK: 类型契约对齐 + Stale 引用修复

## 背景
check-consistency.sh 发现 5 个类型在 api-design.md 中定义但 shared/types.ts 缺失，
4 个 stale 文档引用在 docs/gtm/ROADMAP.md 中。

## 必读文件
- `shared/types.ts` — 当前共享类型（唯一权威）
- `docs/technical/api-design.md` — API 设计文档 v3.1
- `worker/handlers/analyze.ts` — analyze handler（看实际使用的类型）
- `worker/handlers/chat.ts` — chat handler
- `worker/handlers/transcribe.ts` — transcribe handler
- `docs/gtm/ROADMAP.md` — GTM 路线图

## 任务 1: 类型对齐

5 个类型需要处理。**原则：shared/types.ts 是唯一权威，api-design.md 应该引用它而非定义独立类型。**

对每个类型，先看代码中实际使用情况，然后决定：
- 如果代码中有实际使用但 shared/types.ts 缺失 → 在 shared/types.ts 中新增 export
- 如果 api-design.md 中的定义与代码实际使用不一致 → 以代码为准修正 api-design.md
- 如果是 api-design.md 独有的文档类型（如 WorkerLog）→ 在 api-design.md 中标记为"文档示例"而非正式类型定义

### 具体类型：
1. **AnalyzeMenuOptions** (api-design.md L725) — 前端调用 API 的参数类型，检查 app/ 中是否有对应使用
2. **AnalyzeResponseData** (api-design.md L188) — analyze 返回值类型，检查 worker/handlers/analyze.ts 的实际返回
3. **ChatResponse** (api-design.md L344) — shared/types.ts 有 PreChatResponse 和 AgentChatResponse 但无统一 ChatResponse，检查是否需要
4. **TranscribeRequest** (api-design.md L471) — transcribe 请求体，检查 worker/handlers/transcribe.ts
5. **WorkerLog** (api-design.md L816) — Worker 日志结构

### 注意
- 新增类型到 shared/types.ts 时必须 export
- 修改后运行 `npx tsc --noEmit` 确保编译通过
- 运行 `bash scripts/check-consistency.sh` 确认类型对齐警告减少

## 任务 2: Stale 引用修复

docs/gtm/ROADMAP.md 中引用了 4 个尚未创建的文件：
- `assets/user-guide.md`
- `assets/landing-page.md`
- `assets/launch-copy.md`
- `logs/retro-phase-X.md`

这些是 TODO 计划文件。在 ROADMAP.md 中给这些引用加上 `(TODO: 待创建)` 标记，不要创建空文件。

## 验收标准
- [ ] shared/types.ts 编译通过
- [ ] check-consistency.sh 类型警告从 5 个减少（理想为 0）
- [ ] ROADMAP stale 引用有 TODO 标记
- [ ] `npx tsc --noEmit` 零错误

## 禁止
- 不要修改任何 .tsx/.ts 组件代码的逻辑
- 不要删除 api-design.md 中有用的类型描述
- 不要创建空占位文件
