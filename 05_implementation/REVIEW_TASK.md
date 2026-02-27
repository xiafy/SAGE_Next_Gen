# SAGE MVP 业务逻辑审查 + 代码 Review

你是一名资深全栈工程师，同时熟悉产品设计。请对 SAGE MVP 的 Worker 和 App 代码进行全面审查。

## 审查范围

代码位于当前目录的两个子目录：
- `worker/` — Cloudflare Worker API 服务
- `app/src/` — React + TypeScript 前端

## 关键产品背景

**SAGE 是什么**：面向全球旅行者的餐饮智能体。核心场景：拍菜单 → AI 识别 → Pre-Chat 引导 → 主 Chat 推荐 → 点单卡片 → 展示给服务员。

**关键决策（必须对照检查）**：
- DEC-019：识别失败只引导重拍，不做文字输入兜底
- DEC-020：响应中绝对不能有 agentRole / agentGreeting 字段
- DEC-021：GPS 被拒时静默跳过，零 UI 提示
- DEC-027：Pre-Chat → Handoff → 主 Chat 三阶段，主 Chat 不重复问已回答问题
- DEC-028：所有 Bailian API 调用必须有 `enable_thinking: false`（违反会导致 TTFT 7-26s）

**chatPhase 状态机**：`pre_chat → handing_off → chatting`（或 `failed`）

**性能目标**：Pre-Chat TTFT < 1.5s，主 Chat TTFT < 2s，菜单识别 < 30s

## 审查维度

### 1. 业务逻辑正确性
- Pre-Chat → Handoff → 主 Chat 三阶段是否正确实现？
- Handoff 时是否携带完整 Pre-Chat 历史 + menuData + preferences？
- 主 Chat 收到 Handoff 后是否会重复问已答问题（看 Prompt 设计）？
- Icebreaker 是否本地生成（不调 API，避免冷启动延迟）？
- 识别失败后是否正确引导重拍（无文字输入兜底）？
- OrderCard 是否能正确接收 AI recommendations 并加入点单？
- WaiterMode 是否只显示原文菜名（不显示翻译）？

### 2. API 契约一致性
- Worker `/api/analyze` 请求/响应结构是否与 App `analyzeMenu()` 对齐？
- Worker `/api/chat` SSE 格式是否与 App `streamChat()` 解析逻辑对齐？
- Pre-Chat 的 `menuData: null` 是否正确处理（Worker 端）？
- AI 返回的 JSON 结构（`message` / `quickReplies` / `recommendations` / `preferenceUpdates`）是否在前后端都一致解析？
- Zod schema 校验失败时，前端是否有对应的降级处理？

### 3. 状态管理
- `chatPhase` 转换逻辑是否有遗漏或死路？
- `menuData` 的到来是否可靠触发 Handoff？
- AbortController 是否在所有路径下都正确取消（unmount、重新触发、错误）？
- orderItems 的增删改是否正确（重复菜品累加数量 vs 新建条目）？

### 4. 错误处理 & 边界情况
- SSE 中途断流（没有 [DONE]）如何处理？
- AI 返回非 JSON 文本时，前端是否会崩溃？
- 网络超时是否有用户可见的提示？
- 多次点击"识别菜单"按钮是否有防重复提交？
- 图片数量超过 5 张时是否有正确限制？

### 5. 安全 & 性能
- API Key 是否严格在 Worker 内，前端零接触？
- `enable_thinking: false` 是否在 `streamAggregate` 和 `streamPassthrough` 中都设置了？
- CORS 白名单是否正确（只允许 pages.dev + localhost）？
- 速率限制是否在 analyze 和 chat 两个端点都有效？
- 大菜单（>200 道菜）的采样逻辑是否正确实现？

### 6. TypeScript 代码质量
- 是否有任何 `any` 类型（明确或隐含）？
- 类型定义是否与实际数据结构一致（Worker schema vs App types）？
- 是否有未处理的 Promise rejection？
- React 组件是否有缺失的 useEffect 依赖？

## 输出要求

请按以下结构输出 Review 报告：

```
# SAGE MVP Code Review 报告
日期: 2026-02-26

## 🔴 严重问题（必须修复，影响功能或安全）
[编号] 问题描述
  位置: 文件:行号
  影响: ...
  修复建议: ...

## 🟡 中等问题（应该修复，影响体验或健壮性）
[编号] 问题描述
  位置: ...
  修复建议: ...

## 🟢 轻微问题（建议优化，不阻塞发布）
[编号] 问题描述
  修复建议: ...

## ✅ 做得好的地方
- ...

## 📊 总体评分
- 业务逻辑正确性: X/10
- API 契约一致性: X/10
- 错误处理完整性: X/10
- 代码质量: X/10
- 综合: X/10

## 优先修复顺序
1. ...
```

完成后输出：REVIEW_DONE
