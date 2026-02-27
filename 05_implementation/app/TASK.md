# SAGE App 骨架构建任务（Phase 2）

你是 SAGE 项目的高级前端工程师。在当前目录（已有 git init）构建 SAGE App 前端骨架。

## 技术栈（严格遵守）

- **Vite + React + TypeScript**（严格模式）
- **Tailwind CSS v4**（关键：用 CSS `@theme` 语法，绝对不要 `tailwind.config.js`）
- 禁止 `any` 类型，禁止 `console.log`（用 `console.error` 只在 catch 块里）

## 品牌色

`#6366F1`（Indigo）

## Tailwind v4 配置方式（必须这样做，不能用其他方式）

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-brand: #6366F1;
  --color-brand-hover: #4f46e5;
  --color-brand-light: #eef2ff;
  --color-surface: #ffffff;
  --color-surface-secondary: #f8fafc;
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-error: #ef4444;
  --color-success: #22c55e;
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --border-radius-card: 16px;
  --border-radius-button: 12px;
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}
```

## 视觉风格

"Linear × ChatGPT"：极简、现代、技术感。移动端优先（375px 宽）。

## 五个视图（全部用 mock 数据，不调真实 API）

### 1. HomeView（首屏）
- 居中大号品牌标题"SAGE"（品牌色）
- 副标题："Your dining companion"（双语切换）
- 一个大号"扫描菜单"按钮（品牌色，全宽）
- 右上角设置图标（⚙）
- 底部一行小字"拍照，发现美食"

### 2. ScannerView（相机/上传页）
- 全屏样式，深色背景
- 顶部返回按钮（← 返回）
- 中央虚线框（占位：相机取景区）
- 底部工具栏：从相册上传按钮 + 拍照按钮（大圆形）
- 最多 5 张图片的预览缩略图区域（上传后显示）
- "识别菜单"确认按钮（选择图片后出现）

### 3. AgentChatView（AI 对话页）
- 顶部：返回按钮 + "SAGE" 标题 + 补充菜单按钮（相机图标）
- 聊天消息区（滚动）：
  - AI 消息：左对齐，品牌色小圆点头像，白色气泡
  - 用户消息：右对齐，品牌色气泡
  - mock 数据：3-4 轮对话
- 快捷回复按钮行（横向滚动，pill 样式）
- 底部输入框 + 发送按钮
- Phase 状态指示：`pre_chat` 时显示"菜单识别中…"进度条

### 4. OrderCardView（点单卡片）
- 顶部标题"我的点单"+ 返回按钮
- 菜品列表（mock 3 道菜）：
  - 每行：菜名（中英）、数量增减（-/+）、价格
- 底部汇总：总计金额
- "展示给服务员" 全宽按钮（品牌色）

### 5. WaiterModeView（展示给服务员）
- 黑色全屏背景
- 大号原文菜名列表（白色，字号大，纯原文，不显示翻译）
- 底部"完成"按钮（返回点单页）

## AppContext 状态机（核心，用 useReducer）

```typescript
type ChatPhase = 'pre_chat' | 'handing_off' | 'chatting' | 'failed';

interface AppState {
  chatPhase: ChatPhase;
  menuData: MenuData | null;
  messages: Message[];
  preferences: Preferences;
  orderItems: OrderItem[];
  currentView: 'home' | 'scanner' | 'chat' | 'order' | 'waiter';
}
```

Actions:
- `NAV_TO` — 切换视图
- `SET_MENU_DATA` — 设置识别结果，phase → handing_off
- `SET_CHAT_PHASE` — 更新聊天阶段
- `ADD_MESSAGE` — 追加消息
- `ADD_TO_ORDER` / `REMOVE_FROM_ORDER` / `UPDATE_ORDER_QTY` — 点单操作

## 目录结构

```
src/
├── main.tsx
├── App.tsx
├── index.css          ← Tailwind v4 @theme 在这里
├── context/
│   └── AppContext.tsx  ← useReducer 状态机
├── types/
│   └── index.ts       ← 所有 TypeScript 类型定义
├── views/
│   ├── HomeView.tsx
│   ├── ScannerView.tsx
│   ├── AgentChatView.tsx
│   ├── OrderCardView.tsx
│   └── WaiterModeView.tsx
├── components/
│   ├── TopBar.tsx     ← 通用顶部栏
│   ├── ChatBubble.tsx ← AI/用户消息气泡
│   ├── QuickReplies.tsx ← 快捷回复按钮组
│   └── LoadingDots.tsx  ← 品牌色三点动画
└── hooks/
    └── useAppState.ts ← 便捷 hook，wrap useContext
```

## 执行步骤

1. 运行：`npm create vite@latest . -- --template react-ts --force`（当前目录）
2. 安装依赖：`npm install`
3. 安装 Tailwind v4：`npm install tailwindcss @tailwindcss/vite`
4. 修改 `vite.config.ts`，加入 `@tailwindcss/vite` 插件
5. 按上述规格创建所有文件
6. 运行 `npx tsc --noEmit` 验证零类型错误
7. 运行 `npm run build` 验证构建成功

## 验证成功标准

- `tsc --noEmit` 零错误
- `npm run build` 成功输出 dist/
- 所有 5 个视图都有完整的 JSX 结构
- AppContext 的 useReducer 正确实现

完成后输出：APP_SKELETON_DONE
