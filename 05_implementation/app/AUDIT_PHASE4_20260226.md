# Codex 审计报告 — Phase 4 UI 完善
日期：2026-02-26

## 评分：6.5/10

## 问题列表
🔴 严重 | [src/views/AgentChatView.tsx:269] | `failed` 状态点击“重新扫描”仅执行 `NAV_TO('scanner')`，未重置 `chatPhase`；若用户中途返回聊天页会继续停留在 `failed`，状态机不闭合。 | 在该按钮补充 `dispatch({ type: 'SET_CHAT_PHASE', phase: 'pre_chat' })`（先重置再跳转），或在 `NAV_TO('scanner')` 时统一重置聊天阶段。

🔴 严重 | [src/views/AgentChatView.tsx:247-253] | Path C 相机按钮在 TopBar 始终显示，不满足“仅在 `chatting` 阶段显示，`pre_chat/handing_off` 不显示”的要求。 | 将 TopBar 相机按钮也加上 `state.chatPhase === 'chatting'` 条件，或仅保留输入区相机入口。

🔴 严重 | [src/views/HomeView.tsx, src/views/AgentChatView.tsx, src/views/SettingsView.tsx, src/views/OrderCardView.tsx 等] | `explore` 视图存在路由但无可达入口（全局检索无 `NAV_TO('explore')`），形成功能死路。 | 在 Home/Chat/Order 任一主路径增加“Explore/菜单浏览”入口，并保证有回退路径。

🟡 中等 | [src/views/HomeView.tsx:30, src/views/HomeView.tsx:42, src/views/AgentChatView.tsx:338, src/views/AgentChatView.tsx:360] | 多个可交互按钮缺少 `aria-label`（首页“扫描菜单/继续上次”、推荐卡“加入点单”、底部订单汇总按钮）。 | 为所有 button 添加语义化 `aria-label`，并按中英语言状态动态文案。

🟡 中等 | [项目根目录] | `PROGRESS.md` 与 `EXECUTION_STATE.md` 不存在，无法完成“文档同步检查”要求。 | 补齐两份文档并与 Phase 4 实际代码状态一致更新（完成项/未完成项/风险）。

🟢 轻微 | [src/views/SettingsView.tsx:3-16] | `DIETARY_OPTIONS` 允许任意字符串，包含 `halal/kosher` 等不在 `MenuItemTag` 中的值；虽与 `preferences.dietary: string[]` 类型一致，但缺乏约束，后续易与后端枚举漂移。 | 引入独立 `DietaryRestriction` 联合类型并在前后端契约对齐。

✅ 优秀 | [src/types/index.ts:3, src/App.tsx:13-27] | `ViewName` 与 `ViewRouter` 分支已覆盖 `explore/settings`，类型与路由主干基本一致。

✅ 优秀 | [src/types/index.ts:70-82, src/context/AppContext.tsx:95-129] | 新增 `AppAction`（`RESET_SESSION/SET_LANGUAGE/ADD_DIETARY/REMOVE_DIETARY`）均有 reducer 处理，接口一致。

✅ 优秀 | [src/context/AppContext.tsx:95-102] | `RESET_SESSION` 保留了 `preferences.language`，满足“语言偏好不重置”要求。

✅ 优秀 | [src/views/ExploreView.tsx:35-57, 62-68, 158-165] | `menuData` 为空时有空状态保护；分类过滤与 `ADD_TO_ORDER` 参数传递正确；`itemIds` 中不存在的 id 不会导致崩溃（通过 `items.filter` 自然忽略）。

✅ 优秀 | [src/views/SettingsView.tsx:22-33, 97-113] | 饮食偏好 toggle 逻辑正确（已选中走 `REMOVE_DIETARY`，未选中走 `ADD_DIETARY`）；`RESET_SESSION` 后显式导航 home，可触发重渲染。

✅ 优秀 | [src/context/AppContext.tsx:21-26, src/views/ScannerView.tsx:56] | Scanner 二次上传后 `SET_MENU_DATA` 采用覆盖写入（非合并），符合“按设计应覆盖”的要求。

✅ 优秀 | [src/index.css:1-20] | Tailwind v4 主题变量使用 `@theme`，未发现 `tailwind.config.js` 旧语法依赖。

## 总结
Phase 4 主体结构已落地，类型系统、reducer 对齐、设置页和探索页核心交互基本正确，构建通过（`npm run build` 成功）。当前主要风险集中在状态机闭环与入口可达性：`failed -> scanner` 未重置阶段、Path C 相机显示条件不完全满足需求、`explore` 路由无入口。建议先修复这三项再进行验收，其次补齐无障碍标签与执行文档。
