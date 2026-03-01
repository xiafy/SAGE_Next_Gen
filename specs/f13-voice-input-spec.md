# Spec — F13 语音输入（Voice Input）

> 版本: v1.0 | 日期: 2026-03-01  
> 关联规则: PRD §4.3 F13  
> 关联决策: DEC-039

---

## 目标

在 AgentChat 输入栏增加🎤按钮，支持按住说话、松手发送，让餐厅场景下的输入更自然。

---

## 用户路径

1. 用户在 Chat 界面看到输入栏右侧有🎤按钮
2. **按住**🎤 → 开始录音，按钮出现脉冲动画
3. **松手** → 识别结果填入输入框并自动发送
4. 浏览器不支持时 → 🎤按钮不渲染，不影响文字输入

---

## 验收标准（AC）

- **AC1**: 按住🎤录音，松手后自动转文字并发送（无需额外确认）
- **AC2**: 支持中文和英文语音识别（跟随 UI 语言，`zh-CN` / `en-US`）
- **AC3**: 浏览器不支持 Web Speech API 时，🎤按钮完全隐藏
- **AC4**: 录音中有视觉反馈（按钮脉冲 + 波纹动画）
- **AC5**: 录音中若发生错误（无权限/识别失败），Toast 提示用户，不崩溃

---

## 技术方案

### API

`window.SpeechRecognition` / `window.webkitSpeechRecognition`（Web Speech API）

```typescript
const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const supported = !!SR;
```

### 核心逻辑

```
pointerdown → recognition.start()
pointerup / pointercancel → recognition.stop()
onresult(最终结果) → setInputValue(transcript) → handleSend()
onerror → showToast(错误提示)
```

### 参数配置

```typescript
recognition.continuous = false;      // 单句识别
recognition.interimResults = false;  // 只要最终结果
recognition.lang = isZh ? 'zh-CN' : 'en-US';
recognition.maxAlternatives = 1;
```

### 按钮视觉状态

| 状态 | 样式 |
|------|------|
| 待机 | 灰色 🎤，`btn-3d-ghost` |
| 录音中 | Indigo 底色 + `animate-pulse`，🎤变红点 |
| 禁用（streaming）| `opacity-50 cursor-not-allowed` |

---

## 约束

- MVP 只做输入，不做 TTS
- 按住期间 `isStreaming=true` 时按钮置灰，不触发录音
- 手机浏览器（iOS Safari / Android Chrome）需要 HTTPS 才能使用麦克风——已满足（CF Pages）

---

## 影响文件

- `app/src/views/AgentChatView.tsx` — 添加 VoiceButton + 录音逻辑
- `app/src/index.css` — 可复用 `animate-pulse`（Tailwind 已内置）
