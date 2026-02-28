# TASK: UI/UX 重构 — 多邻国风格

## 必读文件（开始前必须全部读完）
- `specs/ui-redesign-duolingo-style.md` — 完整设计规格
- `shared/types.ts` — 共享类型
- `app/src/context/AppContext.tsx` — 状态管理
- `app/src/index.css` — 当前 Tailwind 配置

## 吉祥物素材
已生成好，在 `app/public/mascot/generated/` 下：
- sage-default.jpg, sage-thinking.jpg, sage-excited.jpg, sage-eating.jpg
- sage-confused.jpg, sage-celebrating.jpg, sage-waving.jpg, sage-sleeping.jpg

## 任务清单

### T1: 设计系统基础
1. 安装 `@fontsource/nunito`：`cd app && npm install @fontsource/nunito`
2. 重写 `app/src/index.css`：
   - 移除所有 Indigo 相关 token
   - 新增 spec 里的所有 CSS 变量（--sage-primary, --sage-bg 等）
   - 引入 Nunito 字体
   - 添加 3D 按钮、卡片、Chip 的基础 CSS class
   - 按钮 active 动效：translateY(4px) + box-shadow:none
3. 在 `app/src/main.tsx` 顶部加 `import '@fontsource/nunito/600.css'; import '@fontsource/nunito/700.css'; import '@fontsource/nunito/800.css';`

### T2: 通用组件
新建以下组件（`app/src/components/`）：
1. `Button3D.tsx` — 多邻国式 3D 按钮（variant: primary/secondary/danger/ghost, size: sm/md/lg）
2. `Card3D.tsx` — 3D 卡片容器
3. `Chip.tsx` — 圆角胶囊选择标签（selected/unselected）
4. `BottomNav.tsx` — 底部导航栏（3 tab: 首页/点餐单/设置，当前 view 高亮）
5. `MascotImage.tsx` — 吉祥物组件（props: expression, size, className）

### T3: HomeView 重构
- 暖白背景 --sage-bg
- 顶部居中显示吉祥物 default 表情（约 200px）
- 时间段动态问候语（粗体 28px）
- 「扫描菜单」大号 3D 橙色按钮
- 「随便聊聊」白底边框次要按钮（UI 占位，点击可弹 toast "即将推出"）
- 底部导航栏

### T4: AgentChatView 重构
- AI 气泡：左侧小头像用吉祥物（MascotImage expression=default size=32），白底 + 粗圆角 + 厚阴影
- 用户气泡：橙色底 + 白字 + 深橙阴影
- Quick Replies：横向滚动的 3D 胶囊按钮
- 推荐卡片：Card3D + 橙色价格 + 「加入点餐单」小 3D 按钮
- 加载状态：MascotImage expression=thinking + "正在分析菜单..."
- 识别进度条：橙色 + 圆角
- TopBar 适配新配色

### T5: SettingsView 重构
- 背景 --sage-bg
- 每个 section 用 Card3D 包裹
- 语言切换：两个 3D 胶囊按钮
- 饮食限制/口味偏好：用 Chip 组件
- 自定义偏好输入框：粗圆角 + 2px 边框
- 「添加」按钮：小号 Button3D
- 底部「重置」按钮：Button3D variant=danger

### T6: ScannerView 重构
- 保持深色全屏相机界面
- 快门按钮：橙色圆形 + 白色边框
- 缩略图条：半透明暖色背景
- 「确认」按钮：Button3D primary
- 单页/多页 toggle：圆角胶囊切换器，选中态橙色
- 顶部返回箭头加大触控区

### T7: OrderCardView 重构
- 列表项用 Card3D
- 数量控制：圆形 3D 按钮 +/-
- 合计金额：大号粗体橙色
- 「展示给服务员」：全宽 Button3D 特大号
- 空状态：MascotImage expression=confused + 引导文案

### T8: WaiterModeView 微调
- 保持黑底大字
- 顶部小 MascotImage expression=waving
- 返回按钮用白色 Button3D

### T9: ExploreView 重构
- 分类 tab：横向滚动 Chip
- 菜品列表：Card3D
- 空状态：MascotImage expression=confused + 引导扫描

### T10: App.tsx
- 引入 BottomNav 组件
- 在非 Scanner/WaiterMode 视图底部显示 BottomNav
- 移除旧的导航逻辑（如有）

## 风格约束
- 全局无 Indigo #6366F1 残留
- 所有颜色使用 CSS 变量
- 所有按钮使用 Button3D
- 所有卡片使用 Card3D
- 字体统一 Nunito，标题 28px/800，正文 16px/600
- 背景色统一 --sage-bg (#FFFBF5)

## 质量门控
完成后必须：
1. `cd app && npx tsc --noEmit` 零错误
2. `cd app && npm run build` 成功
3. 无任何 Indigo 色值残留（grep 确认）

完成后运行: openclaw system event --text "Done: UI/UX 多邻国风格重构完成" --mode now
