# TASK: Sprint 1 Phase 4 — UI 完善

## 背景
SAGE Next Gen MVP App。目前 Phase 2+3 完成了核心链路，Phase 4 需要补全：
- ExploreView（菜单探索）
- SettingsView（偏好管理 + 语言设置）
- HomeView 和 AgentChatView 的功能完善
- 错误状态 UI 全面补全
- Path C：AgentChat 内补充菜单入口

## 项目规范（必读）
- 技术栈：Vite + React + TypeScript + Tailwind CSS v4
- 品牌色：Indigo `#6366F1`（已在 index.css @theme 中定义为 --color-brand）
- 视觉风格：Linear × ChatGPT 极简技术感，深色为主
- 严禁：any 类型、console.log、tailwind.config.js（用 CSS @theme）
- 严禁：未使用的 import、变量

## 当前文件状态
- `src/types/index.ts`：ViewName = 'home' | 'scanner' | 'chat' | 'order' | 'waiter'（需新增 'explore' | 'settings'）
- `src/App.tsx`：ViewRouter switch 分支
- `src/views/HomeView.tsx`：Settings 图标按钮暂未连接 dispatch
- `src/context/AppContext.tsx`：useReducer 状态机（7 actions）
- `src/views/AgentChatView.tsx`：chatPhase 状态机，推荐卡片

## 任务清单

### T1：types/index.ts 扩展
- ViewName 新增：'explore' | 'settings'
- AppAction 新增：`{ type: 'RESET_SESSION' }` — 清空菜单、对话、点单，回到 home（用于"重新开始"）
- AppAction 新增：`{ type: 'SET_LANGUAGE'; language: 'zh' | 'en' }` — 设置语言
- AppAction 新增：`{ type: 'ADD_DIETARY'; restriction: string }` — 添加饮食限制
- AppAction 新增：`{ type: 'REMOVE_DIETARY'; restriction: string }` — 移除饮食限制

### T2：AppContext.tsx 更新
在 reducer 中新增上述 4 个 action 的处理逻辑：
- RESET_SESSION：`{ ...initialState }` 完整重置（保留 preferences.language）
- SET_LANGUAGE：更新 state.preferences.language
- ADD_DIETARY：往 state.preferences.dietary 追加（去重）
- REMOVE_DIETARY：从 state.preferences.dietary 移除
同时 ViewRouter 路由新增 'explore' 和 'settings'

### T3：HomeView.tsx 更新
- Settings 按钮：`dispatch({ type: 'NAV_TO', view: 'settings' })`
- 底部按钮文案双语（根据 state.preferences.language）：
  - zh：扫描菜单 / 拍照，发现美食
  - en：Scan Menu / Point camera at the menu
- 如果存在 menuData，在扫描按钮下方显示"继续上次" / "Continue last session"链接 → NAV_TO 'chat'

### T4：ExploreView.tsx（新建）
菜单探索视图，当 menuData 存在时展示，否则引导扫描。

**布局**：
- TopBar："Explore" / "菜单" 标题，左侧返回箭头 → NAV_TO 'chat'
- 顶部：Category Tab 横向滚动（All + 各分类）
- 主体：菜单项网格/列表（每行 1 个 item card）
- 可选筛选：Tag badges（vegetarian / spicy / popular 等）

**ItemCard 结构**：
- 左：菜名（nameTranslated 大字，nameOriginal 小字灰色）
- 右：价格（priceText，若无则不显示）
- 角标：tags（最多显示 2 个 tag badge）
- 右下角："+" 加入点单按钮（ADD_TO_ORDER）

**空状态**（menuData 为 null）：
- 居中提示："No menu scanned yet" / "还没有菜单"
- 大按钮：NAV_TO 'scanner'

**无障碍**：所有按钮有 aria-label

### T5：SettingsView.tsx（新建）
ChatGPT 风格设置页，Home 右上角 ⚙ 进入。

**布局**：
- TopBar："Settings" / "设置"，左侧关闭 ✕ → NAV_TO 'home'
- Section 1：语言 / Language
  - 两个 radio 卡片：中文 / English（当前语言高亮品牌色边框）
  - 点击 → dispatch SET_LANGUAGE
- Section 2：饮食偏好 / Dietary Preferences
  - 小标题说明："Tap to toggle restrictions" / "点击切换饮食限制"
  - 预设限制列表（badge 形式，选中=品牌色，未选=灰色边框）：
    - vegetarian（素食）/ vegan（纯素）/ gluten_free（无麸质）
    - contains_nuts（坚果过敏）/ contains_seafood（海鲜过敏）/ contains_pork（不吃猪肉）
    - halal（清真）/ kosher（犹太洁食）
  - 点击 toggle → ADD_DIETARY / REMOVE_DIETARY
- Section 3：关于 / About
  - "SAGE v0.1.0 — Dining Agent"
  - "Powered by Alibaba Cloud Bailian"
- Section 4：重置 / Reset
  - 红色 "Start New Session" / "开始新会话" 按钮
  - 点击 → dispatch RESET_SESSION → NAV_TO 'home'

**样式**：
- 深色背景，Section 间用分割线
- 每个 Section 有标题灰色小字

### T6：AgentChatView.tsx — 补充功能

#### 6-A：Path C — 补充菜单入口
在 chatting 阶段的 InputBar 左侧（文字输入框旁），添加相机图标按钮：
- 仅在 `state.chatPhase === 'chatting'` 时显示
- 点击 → NAV_TO 'scanner'（ScannerView 会重新上传图片，analyze 完成后 dispatch SET_MENU_DATA 合并菜单）
- aria-label："Add more photos" / "补充菜单照片"

#### 6-B：失败状态 UI（chatPhase === 'failed'）
当前代码中 failed 状态无 UI，需补全：
- 显示错误卡片（居中，⚠️ icon）
- 文案："Recognition failed. Try again?" / "识别失败，要重试吗？"
- 两个按钮：
  - "Rescan Menu" / "重新扫描" → NAV_TO 'scanner'
  - "Continue Anyway" / "继续对话" → dispatch SET_CHAT_PHASE('chatting')（直接进主 Chat，无菜单数据）

#### 6-C：对话区底部安全区
底部 InputBar 固定时，消息列表最后一条下方需 padding-bottom 避免被遮挡（`pb-24` 或计算实际高度）

### T7：App.tsx 更新
- import ExploreView 和 SettingsView
- ViewRouter switch 新增 case 'explore' 和 case 'settings'

### T8：验证
```bash
npx tsc --noEmit
npm run build
```
两项均须零错误/警告。记录产物大小。

### T9：文档同步（完成前必须）
完成后更新以下文件：
1. `../../../PROGRESS.md` — Sprint 1 Phase 4 UI 完善，列出新增文件和改动
2. `../../../EXECUTION_STATE.md` — Phase 4 T1（UI完善）更新为 ✅，当前批次更新

完成所有任务后输出：
```
TASK_DONE
Build: [JS大小] / [CSS大小]
新增文件: ExploreView.tsx, SettingsView.tsx
```
