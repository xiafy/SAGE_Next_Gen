# Test Checklist: Explore → Chat 注入

> 对应 Spec: `specs/explore-chat-injection-spec.md`
> 格式: Given-When-Then

---

## 1. Explore 选菜写入 Order

### TC-EX-001: 单道菜加入
- **Given** Explore 菜单有 10 道菜，Order 为空
- **When** 点某道菜的 ➕ 按钮
- **Then** Order 新增该菜品 x1，DishCard 显示数量控件

### TC-EX-002: 重复加入
- **Given** 某菜品已在 Order（x1）
- **When** 再次点 ➕
- **Then** Order 中该菜品变为 x2

---

## 2. 咨询 AI 注入

### TC-CI-001: 有选菜 + 无已有 Order
- **Given** 进入 Explore 前 Order 为空，在 Explore 选了 3 道菜
- **When** 点「咨询 AI」
- **Then** Chat 中插入 SelectedDishesCard（newlySelected=3, existingOrder=0） + AI 自动回复事实摘要

### TC-CI-002: 有选菜 + 有已有 Order
- **Given** 进入 Explore 前 Order 有 2 道菜，在 Explore 又选了 3 道
- **When** 点「咨询 AI」
- **Then** SelectedDishesCard 显示 newlySelected=3 + existingOrder=2；AI 回复区分新选和已有

### TC-CI-003: 无选菜
- **Given** 进入 Explore 但未选任何菜品
- **When** 点「咨询 AI」
- **Then** 不注入 SelectedDishesCard，直接回 Chat 正常对话，不自动触发 AI

### TC-CI-004: 多次往返
- **Given** 第一次 Explore→Chat 注入了卡片
- **When** 再次进入 Explore 选新菜后点「咨询 AI」
- **Then** 新的 SelectedDishesCard 注入（基于新的 Order 快照差异），不覆盖旧卡片

### TC-CI-005: AI 偏离事实摘要格式
- **Given** system message 注入成功，AI 收到已选菜品信息
- **When** AI 回复不符合事实摘要格式（如直接给搭配建议或闲聊）
- **Then** 仍正常展示 AI 回复，不阻塞对话流（prompt 约束为 best-effort）

---

## 3. SelectedDishesCard 显示

### TC-SC-001: 系统消息样式
- **Given** Chat 中有 SelectedDishesCard
- **When** 查看消息流
- **Then** 卡片样式与用户气泡/AI 气泡明显不同（无头像，浅灰/蓝底色，居中或左对齐）

### TC-SC-002: 内容完整性
- **Given** newlySelected 有 3 道菜（含价格和分类）
- **When** 渲染 SelectedDishesCard
- **Then** 显示 📋 标题 + 3 道菜（菜名+价格）按分类分组 + 预估总价

### TC-SC-003: 部分菜品无价格
- **Given** 3 道菜中 1 道无价格（price=null）
- **When** 渲染
- **Then** 总价计算跳过该道菜，显示"部分菜品价格未知"

---

## 4. AI 事实摘要回复

### TC-AI-001: 纯新选格式
- **Given** newlySelected=3, existingOrder=0
- **When** AI 收到 system message 后回复
- **Then** 回复包含数量（3 道）、分类分布、预估总价；不主动分析搭配

### TC-AI-002: 新选 + 已有格式
- **Given** newlySelected=3, existingOrder=5
- **When** AI 回复
- **Then** 回复区分"新选的 3 道"和"已有的 5 道"，给出总计和总价；开放引导

---

## 5. Explore 空状态

### TC-ES-001: menuData 不存在
- **Given** menuData === null
- **When** 进入 Explore
- **Then** 显示"还没有扫描菜单哦" + 「去扫描」按钮

### TC-ES-002: menuData 存在但 items 为空
- **Given** menuData.items.length === 0
- **When** 进入 Explore
- **Then** 显示"暂未识别到菜品，试试重新拍一张？" + 「📷 重新拍摄」按钮

### TC-ES-003: 重新拍摄导航
- **Given** 空状态显示「📷 重新拍摄」按钮
- **When** 点击
- **Then** 导航到 Scanner
