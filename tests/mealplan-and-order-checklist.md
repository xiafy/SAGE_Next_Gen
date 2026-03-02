# Test Checklist: MealPlan & Order System

> 对应 Spec: `specs/mealplan-and-order-spec.md`
> 格式: Given-When-Then

---

## 1. MealPlanCard 渲染

### TC-MP-001: 正常多课程渲染
- **Given** AI 返回 MealPlan JSON，含 3 个 courses（凉菜/主菜/饮品），每个 course 2-3 道菜
- **When** 流式结束，JSON 解析成功（L1）
- **Then** MealPlanCard 显示 3 个分组标题 + 所有菜品行 + rationale + 总价 + 「🍽 整套加入订单」按钮

### TC-MP-002: 空 courses 降级
- **Given** AI 返回 JSON 但 courses 为空数组 `[]`
- **When** Zod 校验失败（courses.min(1)）
- **Then** 降级 L3：纯文字展示 + 「🔄 重新生成方案」按钮

### TC-MP-003: 单道菜方案
- **Given** AI 返回 MealPlan 只有 1 个 course，1 道菜
- **When** 解析成功
- **Then** 正常渲染，显示 1 个分组 + 1 道菜 + 总价 + 加入按钮

### TC-MP-004: 灰化已替换卡片
- **Given** 对话流中有活跃 MealPlanCard
- **When** AI 返回新 MealPlan（替换后）
- **Then** 旧卡片 opacity-50，所有按钮 disabled，顶部标注"已更新"；新卡片活跃

---

## 2. 替换交互

### TC-RP-001: 单次替换
- **Given** 活跃 MealPlanCard 中有"Pad Thai"
- **When** 用户点「🔄 换一道」
- **Then** 自动发消息"帮我把 Pad Thai 换成别的，保持整体搭配" + 按钮 disabled + spinner

### TC-RP-002: 替换成功
- **Given** 替换请求已发出，按钮 loading
- **When** AI 回复包含新 MealPlan JSON
- **Then** 新 MealPlanCard 替换旧卡片位置，spinner 消失，按钮恢复

### TC-RP-003: 连续替换（并发防抖）
- **Given** 用户点了「🔄」（version=1），请求尚未返回
- **When** 用户再次试图点另一道菜的「🔄」
- **Then** 按钮 disabled，无法触发第二次请求

### TC-RP-004: 过期响应丢弃
- **Given** activeMealPlanVersion = 3
- **When** 收到 version=2 的 AI 响应
- **Then** 响应静默丢弃，不渲染

### TC-RP-005: 替换超时
- **Given** 替换请求发出 15s 无响应
- **When** 超时触发
- **Then** 按钮恢复可点，toast "网络问题，请重试"

---

## 3. 整套加入订单

### TC-OA-001: 正常加入
- **Given** MealPlanCard 含 5 道菜，Order 为空
- **When** 点「🍽 整套加入订单」
- **Then** Order 新增 5 项，toast "已加入 5 道菜到点菜单"

### TC-OA-002: 重复菜品合并
- **Given** MealPlanCard 含 Pad Thai，Order 中已有 Pad Thai x1
- **When** 点「整套加入」
- **Then** Order 中 Pad Thai 变为 x2，其他菜品新增，toast 含"已合并重复菜品"

### TC-OA-003: Order 已有其他菜品
- **Given** Order 有 3 道菜，MealPlanCard 有 5 道菜（无重复）
- **When** 点「整套加入」
- **Then** Order 变为 8 道菜，MealPlanCard 保持活跃可操作

---

## 4. 流式 JSON 解析

### TC-JP-001: L1 完整解析
- **Given** AI 流式输出包含叙事文字 + 末尾合法 ```json MealPlan ```
- **When** 流式结束
- **Then** 叙事文字正常显示 + MealPlanCard 渲染 + "🍽 正在生成方案…" 占位消失

### TC-JP-002: L2 部分可修复
- **Given** AI 返回 JSON 有小错误（如尾部缺 `}`）
- **When** JSON.parse 失败 → jsonrepair 成功
- **Then** 渲染简化卡片（缺失字段用默认值）

### TC-JP-003: L3 完全失败
- **Given** AI 返回 JSON 完全损坏（如截断在中间）
- **When** jsonrepair 也失败
- **Then** 纯文字展示 + 「🔄 重新生成方案」按钮

### TC-JP-004: 重试按钮
- **Given** L3 降级显示"重新生成方案"按钮
- **When** 用户点击
- **Then** 自动发预设消息给 AI 请求重新生成

### TC-JP-005: 占位显示
- **Given** 流式输出进行中
- **When** 检测到 ```json 标记
- **Then** 立即在消息流中显示"🍽 正在生成方案…"占位

### TC-JP-006: OrderAction 识别
- **Given** AI 返回 ```json {"orderAction": "add", ...} ```
- **When** 流式结束，JSON 解析成功
- **Then** 识别为 orderaction（非 mealplan），执行 EXECUTE_ORDER_ACTION

---

## 5. Chat 操作 Order

### TC-CO-001: add 操作
- **Given** 用户说"加一份冬阴功"，AI 返回 orderAction=add
- **When** 前端执行
- **Then** Order 新增冬阴功 x1，AI 文字正常显示

### TC-CO-002: remove 操作
- **Given** Order 有冬阴功，用户说"去掉冬阴功"，AI 返回 orderAction=remove
- **When** 前端执行
- **Then** 冬阴功从 Order 移除

### TC-CO-003: replace 操作
- **Given** Order 有牛排，用户说"牛排换成龙虾"，AI 返回 orderAction=replace
- **When** 前端执行
- **Then** 牛排移除 + 龙虾新增

### TC-CO-004: 无效 dishId
- **Given** AI 返回的 dishId 不在 menuData 中
- **When** 前端尝试执行
- **Then** 忽略该指令，不报错，AI 文字正常显示

---

## 6. OrderStore 状态机

### TC-OS-001: 规则 1 — Waiter 数据源
- **Given** Order 有 3 道菜
- **When** 进入 Waiter Mode
- **Then** Waiter 显示 Order 中的 3 道菜（名称 + 数量一致）

### TC-OS-002: 规则 2 — Explore 展示给服务员
- **Given** Explore 中选了 2 道新菜
- **When** 点「展示给服务员」
- **Then** 2 道菜写入 Order + 跳转 Waiter + Waiter 显示 Order 全部内容

### TC-OS-003: 规则 3 — Explore 咨询 AI
- **Given** Explore 中选了 2 道新菜
- **When** 点「咨询 AI」
- **Then** 2 道菜写入 Order + Chat 注入 SelectedDishesCard + AI 收到 system message

### TC-OS-004: 规则 4 — Waiter 继续点菜
- **Given** 在 Waiter Mode
- **When** 点「继续点菜」
- **Then** 导航到 Order，Order 数据完整保留

### TC-OS-005: 规则 5 — Waiter 结束用餐
- **Given** 在 Waiter Mode，Order 有 5 道菜
- **When** 点「结束用餐」→ 确认弹窗 → 确认
- **Then** Order 清空 + 会话清空 + 导航到 Home

### TC-OS-006: 规则 6 — 过敏原检查
- **Given** 用户有花生过敏，Order 含 Pad Thai（allergens 含 peanut）
- **When** 从 Order 点「展示给服务员」
- **Then** 弹出 AllergenWarningSheet，列出 Pad Thai（花生）
