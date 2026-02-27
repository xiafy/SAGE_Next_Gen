你是资深工程师，正在审计 SAGE Next Gen MVP App 的 Phase 4 UI 完善变更。

## 项目背景
SAGE 是一个餐饮智能体 App，目标用户为全球旅行者。
技术栈：Vite + React + TypeScript + Tailwind CSS v4
AI 后端：Cloudflare Worker → Alibaba Cloud Bailian (Qwen 系列)

## 本次变更内容（Phase 4 UI 完善）

### 新增/修改文件
- `src/types/index.ts` — ViewName 新增 'explore' | 'settings'；AppAction 新增 RESET_SESSION / SET_LANGUAGE / ADD_DIETARY / REMOVE_DIETARY
- `src/context/AppContext.tsx` — reducer 新增 4 个 action 处理
- `src/views/HomeView.tsx` — Settings 按钮连接 dispatch，双语文案，"继续上次"链接
- `src/views/ExploreView.tsx` — **新建**：Category tabs + 菜单项卡片 + 加入点单 + 空状态
- `src/views/SettingsView.tsx` — **新建**：语言切换 + 饮食偏好 toggle + 重置会话
- `src/views/AgentChatView.tsx` — Path C 相机按钮 + failed 状态 UI + pb-24 安全区
- `src/App.tsx` — ViewRouter 新增 explore / settings 路由

## 审计要求

请依次审计以下内容：

### 1. 类型安全与接口一致性
- ViewName 枚举与 App.tsx ViewRouter 分支是否完全对齐（无遗漏 case）
- AppAction 新增类型与 reducer 处理是否完全对齐
- RESET_SESSION 是否保留了 preferences.language（用户语言偏好不应被重置）
- ExploreView 使用 MenuItem/MenuCategory 类型是否与 src/types/index.ts 定义完全一致
- SettingsView 的 dietary toggle 是否与 AppState.preferences.dietary: string[] 一致

### 2. 状态机完整性
- chatPhase 'failed' 状态：两个按钮（重新扫描 / 继续对话）逻辑是否正确
  - 重新扫描：应 dispatch NAV_TO 'scanner' 并确保 chatPhase 重置
  - 继续对话：dispatch SET_CHAT_PHASE('chatting') 能否在无菜单数据时正常工作
- RESET_SESSION：是否会清空 messages / orderItems / menuData / chatPhase
- 'explore' 和 'settings' 视图进入/退出路径是否正确（无死路）

### 3. ExploreView 逻辑
- 当 menuData 为 null 时是否显示空状态（不应崩溃）
- Category tab 过滤：点击分类后，只显示该分类的 itemIds 对应的 items
- "+" 加入点单按钮：dispatch ADD_TO_ORDER 是否传入正确的 MenuItem 对象
- items 查找：categories[i].itemIds 找对应 MenuItem 时是否处理了 id 不存在的情况

### 4. SettingsView 逻辑
- dietary toggle：点击已选中项 → REMOVE_DIETARY，未选中 → ADD_DIETARY
- SET_LANGUAGE dispatch 后，首页文案是否会实时更新（依赖 state.preferences.language）
- RESET_SESSION 后导航到 'home'，是否会触发重渲染

### 5. Path C（AgentChat 内补充菜单）
- 相机按钮仅在 chatting 阶段显示，pre_chat / handing_off 阶段不显示
- 点击跳转到 ScannerView — ScannerView 再次上传图片后会 dispatch SET_MENU_DATA，是否会覆盖现有菜单还是合并？（按设计应覆盖，确认 reducer 行为是否符合预期）

### 6. 无障碍与 UI 规范
- 所有可交互元素是否有 aria-label
- 深色主题一致性：新增视图是否与现有视图风格统一（bg、text 颜色类）
- Tailwind v4：是否有使用 tailwind.config.js 的语法（应全用 CSS @theme 变量）

### 7. 文档同步检查
- PROGRESS.md 内容是否与代码实际变更一致
- EXECUTION_STATE.md 任务状态是否正确更新

## 输出格式

将审计报告写入 `AUDIT_PHASE4_20260226.md`（在当前目录），格式：

```markdown
# Codex 审计报告 — Phase 4 UI 完善
日期：2026-02-26

## 评分：X/10

## 问题列表
🔴 严重 | [位置] | [问题描述] | [修复建议]
🟡 中等 | [位置] | [问题描述] | [修复建议]
🟢 轻微 | [位置] | [问题描述] | [修复建议]
✅ 优秀 | [位置] | [亮点描述]

## 总结
```

完成后在终端输出：AUDIT_DONE
