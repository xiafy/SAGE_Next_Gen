# ICEBREAKER_STATE_MACHINE.md — Icebreaker 状态机设计

> 版本: v1.1（已纳入 Mr. Xia 确认意见，DEC-027）
> 日期: 2026-02-26
> 状态: ✅ 已对齐，待合并入 PRD v1.4

---

## 一、核心模型（v1.1 修订）

ANALYZING 阶段**不是等待界面**，而是一段独立的**前置对话（Pre-Chat）**。

```
┌─────────────────────────────────────────────────────────────────┐
│                     两条并行时间线                                │
│                                                                 │
│  用户侧: [Icebreaker] → AI 主动多轮追问 → 用户充分表达需求        │
│                                    ↕                            │
│  系统侧: 图片上传 ──────── /api/analyze ────── 识别完成           │
│                                    ↕                            │
│                          [交接] 提炼关键信息 → 喂给主 Chat AI     │
└─────────────────────────────────────────────────────────────────┘
```

**设计哲学**：把识别等待的 5-15 秒从"焦虑的空白"变成"有价值的准备"。
AI 在这段时间主动了解用户，交接时主 Chat AI 已经"认识"这个用户了。

---

## 二、状态定义

```
chatPhase:
  'pre_chat'    — ANALYZING 阶段，AI 主动引导多轮对话（有 API 调用）
  'handing_off' — 识别完成，正在提炼信息 + 调用主 Chat
  'chatting'    — 正常对话（主 Chat AI 全权接管）
  'failed'      — 识别失败
```

---

## 三、Pre-Chat 阶段设计（ANALYZING）

### 3.1 AI 角色切换

Pre-Chat 阶段使用独立的 System Prompt，与主 Chat 不同：

```
[Pre-Chat System Prompt]

你是 SAGE，正在帮用户准备点餐。

当前状态：菜单图片识别中（约需几秒）。你还没有看到菜单内容。

你的任务：
在等待期间，主动、自然地和用户聊起来，了解：
  - 用餐人数和场景（一个人？朋友聚餐？商务？）
  - 有什么忌口或过敏原
  - 今天的心情和偏好（想吃清淡还是重口？探索新奇还是稳妥？）
  - 预算大致范围（如果自然引出）

原则：
  - 像朋友一样聊，不要像问卷调查
  - 每次只问一个问题，不要一次列举多个
  - 不要承诺推荐（你还没有看到菜单）
  - 用户语言：{{language}}

输出格式（JSON）：
{
  "message": "...",
  "quickReplies": ["...", "..."],       // 2-3 个，帮助推进对话
  "preferenceUpdates": [...]            // 随时提炼，格式同主 Chat
}
```

### 3.2 模型选择

Pre-Chat 使用 **`Qwen3.5-Flash`**（轻量、快速、低成本）。
- Pre-Chat 不需要菜单推理能力，只需对话和偏好提炼
- Flash 响应更快（< 1s），让用户感觉 AI 反应灵敏
- 主 Chat 再切回 `Qwen3.5-Plus`

### 3.3 对话流示例

```
[识别中动画 + "菜单识别中" 顶部提示]

AI（本地 Icebreaker，毫秒出现）:
  "菜单识别中～先聊两句，你们今天几位用餐？"

用户: "就我一个人"

AI（Qwen3.5-Flash，< 1s）:
  "一个人吃饭，正好可以点几道精选试试！
   有什么不吃的吗，还是都OK？"
  [不吃辣] [有过敏] [都OK]

用户: "不吃辣，对花生过敏"

AI: "记下了～是想探索一下这里的特色菜，
     还是要点比较稳妥保险的？"
  [探索特色] [稳妥保险]

用户: "探索一下"

AI: "好，等菜单出来我给你挑几道有意思的
     ——应该就快好了 🔍"

[识别完成] → 进入 HANDING_OFF
```

### 3.4 输入框行为

```
pre_chat 阶段：
  ✅ 输入框完全开放
  ✅ 发送后 AI 立即响应（Qwen3.5-Flash，< 1s）
  ✅ 快捷回复按钮随 AI 回复动态更新
  ⚠️ 顶部有"识别中"状态条（让用户知道系统还在后台工作）
```

---

## 四、交接逻辑（HANDING_OFF）

识别完成时，执行以下两步：

### 4.1 Step 1：提炼关键信息

Pre-Chat 过程中，AI 每次响应都已经在 inline 提炼 `preferenceUpdates`，
写入 `PreferencesContext`（和主 Chat 完全一致的机制）。

识别完成时，已提炼的偏好直接存在 preferences 里，无需额外 API 调用。

```typescript
// 识别完成时，PreferencesContext 已经包含：
// restrictions: [{type: 'allergy', value: '花生'}, {type: 'dislike', value: '辣'}]
// 以及其他 Pre-Chat 中提炼的信息
```

### 4.2 Step 2：构建第一次主 Chat 调用

```typescript
// 构建 messages 历史
const icebreakerHistory = preChatMessages; // Pre-Chat 全部对话记录

// 注入一条系统过渡消息（不显示给用户）
const handoffNote = {
  role: 'system' as const,
  content: `
    [菜单已识别完成，以下是识别结果摘要]
    菜单类型: ${menuData.menuType}
    价格档次: ${menuData.priceLevel}
    检测语言: ${menuData.detectedLanguage}
    菜品总数: ${menuData.items.length}

    [用户在等待期间已告知]
    ${buildPreferenceSummary(preferences)}

    请基于以上信息，自然接续之前的对话，直接给出推荐。
    不要重新问已经回答过的问题。
  `,
};

const payload = {
  messages: [...icebreakerHistory, handoffNote],
  menuData,          // 识别结果完整传入
  preferences,       // Pre-Chat 已丰富的偏好
  context,
  language,
};
// 调用主 /api/chat（Qwen3.5-Plus）
```

### 4.3 交接效果示例

```
[Pre-Chat 结束后，用户已知: 1人，不辣，花生过敏，想探索特色]

主 Chat AI 首条消息:
  "好，菜单出来了！这是一家泰北风味的小馆子，
   我帮你挑了两道很有特色又不辣的——

   [推荐卡片: 炸猪皮沙拉（青木瓜替代，无花生版）]
   [推荐卡片: 清迈猪肉冬粉汤]

   这两道算比较小众，一般游客不会主动点，
   你要不要都来一个？"
```

用户感受：AI 已经完全了解自己，第一条消息就切中要害。

---

## 五、识别失败处理（FAILED）

### 场景 A：Pre-Chat 没有发生（用户没回复 Icebreaker）

```
错误气泡: "菜单有点难识别，换个角度或者找光线好一点的地方再拍一张试试？"
操作按钮: [重新拍摄]
行为: 跳转 Scanner，清空状态
```

### 场景 B：Pre-Chat 已有多轮对话

```
错误气泡: "菜单没识别出来，不过你跟我说的我都记住了。
           重拍一张，我们接着来。"
操作按钮: [重新拍摄]
行为: 跳转 Scanner，保留 preChatMessages + 已提炼的 preferences
      重新识别成功后，HANDING_OFF 时带上保留的历史
```

---

## 六、Path C（补充菜单）—— 不变

识别完成后，注入本地系统消息，不触发 HANDING_OFF：

```typescript
const systemNotice = {
  role: 'assistant',
  content: language === 'zh'
    ? `菜单更新了，新加了 ${newItemCount} 道菜。有什么想了解的？`
    : `Menu updated with ${newItemCount} new items. Anything you'd like to know?`,
};
AppState.messages.push(systemNotice);
AppState.menuData = mergeMenus(existingMenu, newMenu);
// chatPhase 保持 'chatting'，不重置
```

---

## 七、AppContext 完整状态定义

```typescript
interface AppState {
  view: 'home' | 'agent_chat' | 'explore' | 'order_card' | 'waiter_mode';
  menuData: MenuData | null;
  orderedItems: OrderItem[];
  contextData: ContextData;

  // 对话状态
  chatPhase: 'pre_chat' | 'handing_off' | 'chatting' | 'failed';
  messages: ChatMessage[];          // 全部消息（含 Pre-Chat 阶段）
  isAiTyping: boolean;              // AI 正在生成回复

  // 识别状态
  isAnalyzing: boolean;
  analyzeError: 'timeout' | 'invalid_image' | 'api_unavailable' | null;

  // Path C
  pathCActive: boolean;             // 是否处于 Path C 补充菜单流程
}
```

---

## 八、API 影响（需更新 API_DESIGN.md）

`/api/chat` 需要支持 `menuData = null` 的调用：

```typescript
// Pre-Chat 阶段调用 /api/chat 时
{
  messages: [...],
  menuData: null,          // ← 新增合法值
  preferences: {...},
  context: {...},
  language: 'zh',
  mode: 'pre_chat',        // ← 新增字段，Worker 侧切换到 Pre-Chat Prompt
}
```

Worker 侧判断逻辑：
```typescript
const prompt = payload.mode === 'pre_chat'
  ? buildPreChatPrompt(payload)    // Pre-Chat System Prompt
  : buildChatPrompt(payload);      // 主 Chat System Prompt（含菜单数据）
```

---

## 九、决策摘要（DEC-027）

| 问题 | 最终决策 |
|------|---------|
| ANALYZING 阶段用户体验 | AI **主动**多轮引导，非静态等待 |
| Pre-Chat AI 模型 | `Qwen3.5-Flash`（轻量快速） |
| Pre-Chat 偏好提炼方式 | inline preferenceUpdates（无额外 API 调用）|
| 交接时消息处理 | 全量 Pre-Chat 历史 + handoff system note 喂给主 Chat |
| Pre-Chat 对话被保留到主 Chat | ✅ AI 不会重复问已回答的问题 |
| 识别失败时 Pre-Chat 内容 | 保留，重试成功后一起带入 |
| Path C 是否重走 Pre-Chat | ❌ 直接注入系统消息，chatPhase 保持 chatting |

---

*v1.1 已对齐，合并入 PRD v1.4 后生效*
