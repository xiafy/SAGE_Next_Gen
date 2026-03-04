# F10 — 语言切换 Spec

> 从 PRD F10 提取，Sprint 1 实现

## 概述

SAGE 支持中英双语 UI，默认根据系统语言自动检测（中文系统→中文，其他→英文），用户可在设置中手动切换。切换后全局生效，持久保存。

## 用户故事

- 作为中国旅行者，我打开 App 自动显示中文界面，无需设置。
- 作为英语用户，我的手机是英文系统，App 自动显示英文。
- 作为用户，我可以在设置中手动切换语言，切换后所有页面的文案立即更新。

## 交互流程

```
[首次进入 App]
  ├─ 检测系统语言
  │    ├─ navigator.language 以 'zh' 开头 → 设为 'zh'
  │    └─ 其他 → 设为 'en'
  └─ 保存到 localStorage

[手动切换]
  Home → ⚙️ 设置 → 语言设置
  ├─ 中文 ◉ / English ○
  └─ 选择后：
       ├─ 更新全局语言状态
       ├─ 所有 UI 文案立即更新
       └─ 持久保存到 localStorage
```

## 数据模型

引用 `shared/types.ts`：
- `Language`：`'zh' | 'en'`

i18n 实现：
```typescript
// AppContext 中的语言状态
interface AppState {
  language: Language;
  // ...
}

// 检测逻辑
function detectLanguage(): Language {
  const lang = navigator.language || navigator.languages?.[0] || 'en';
  return lang.startsWith('zh') ? 'zh' : 'en';
}

// localStorage key
const LANGUAGE_KEY = 'sage_language';
```

## 验收标准

- [ ] AC1: 自动检测准确（中文/非中文两档）
- [ ] AC2: 手动切换后全部 UI 文案更新，无遗漏
- [ ] AC3: 语言设置跨 session 持久

## 边界情况

| 场景 | 处理 |
|------|------|
| 系统语言为繁体中文（zh-TW） | 识别为中文，使用简体中文 UI |
| 系统语言为日文/韩文/法文 | 识别为非中文，使用英文 UI |
| localStorage 不可用 | 每次使用系统语言检测结果，不持久化 |
| 切换语言时正在 Chat 对话 | UI 文案切换，已有对话内容不翻译（AI 回复语言在下次请求时更新） |
| AI 回复语言与 UI 语言不一致 | 下次 Chat 请求会携带新的 `language` 字段，AI 自动适配 |

## 依赖

- F01（Home）：设置入口在 Home 右上角
- F06（AgentChat）：`ChatContext.language` 传递给 AI
- F03（菜单识别）：`AnalyzeRequestContext.language` 影响翻译目标语言
