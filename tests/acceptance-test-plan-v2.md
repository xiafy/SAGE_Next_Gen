# Sprint 3 验收测试方案 v2

> 版本: v2.0
> 日期: 2026-03-03
> 状态: 待执行（Bug 修复后）
> 执行方式: OpenClaw browser (profile=openclaw) 自动化
> 前置条件: BUG-001~004 + ISSUE-005~007 已修复并部署

---

## 目录

1. [测试素材清单](#1-测试素材清单)
2. [回归测试 Checklist](#2-回归测试-checklist)
3. [场景 A：泰餐 — Persona A 阿明完整旅程](#3-场景-a泰餐--persona-a-阿明完整旅程)
4. [场景 B：日料 — Persona B Sarah 完整旅程](#4-场景-b日料--persona-b-sarah-完整旅程)
5. [场景 C：西餐 — Persona A 阿明方案型验证](#5-场景-c西餐--persona-a-阿明方案型验证)
6. [场景 D：中餐 — 分组逻辑验证](#6-场景-d中餐--分组逻辑验证)
7. [边界场景测试](#7-边界场景测试)
8. [数据一致性链路测试](#8-数据一致性链路测试)

---

## 1. 测试素材清单

| ID | 素材 | 要求 | 用途 |
|----|------|------|------|
| IMG-01 | 泰餐菜单（泰文+英文） | ≥15 道菜，含价格，含过敏原标注 | 场景 A |
| IMG-02 | 日料菜单（日文） | ≥20 道菜，含刺身/烤物/煮物等多分类，含价格 | 场景 B |
| IMG-03 | 西餐菜单（英文/法文） | ≥12 道菜，含 Starter/Main/Dessert/Wine 分类 | 场景 C |
| IMG-04 | 中餐菜单（中文） | ≥15 道菜，含凉菜/热菜/汤/主食分类 | 场景 D |
| IMG-05 | 空白/模糊图片 | 无法识别内容 | 边界 E-01 |
| IMG-06 | 只有1道菜的菜单 | 单一菜品 | 边界 E-02 |
| IMG-07 | 超大菜单 | ≥30 道菜 | 边界 E-03 |
| IMG-08 | 泰餐酒单 | ≥5 种饮品 | Path C 补充菜单 |

> 注：IMG-01 可复用现有 `app/public/test-menu.jpg`（需确认菜品数≥15）；其余需准备真实菜单照片。

---

## 2. 回归测试 Checklist

首轮验收发现的 BUG/ISSUE 逐条回归验证：

| ID | 问题 | 回归验证步骤 | 通过标准 |
|----|------|-------------|---------|
| BUG-001 | Explore 菜品数据全部相同 | 上传 IMG-01 → 进入 Explore → 检查每道菜名称 | Explore 中每道菜的 `nameLocal`、`nameTranslated`、`price` 均不同（至少 3 道菜互不相同） |
| BUG-002 | Order 合并不同菜品 | MealPlanCard「整套加入订单」→ 打开 Order | Order 中每道菜显示为独立条目，菜名各不相同，数量各为 1 |
| BUG-003 | MealPlanCard 替换不更新 | 点「🔄 换一道」→ 等 AI 回复 | 对话流中出现新 MealPlanCard（isActive=true），旧卡片灰化（isActive=false），新卡片包含替换后的菜品 |
| BUG-004 | Explore 数量与 Order 耦合 | Order 有菜品时打开 Explore | Explore 中未加入的菜品显示「➕ 加入」按钮（非数量控件），已加入的菜品显示正确数量 |
| ISSUE-005 | Pre-Chat 过敏问题被跳过 | AI 问忌口后，在用户回复前识别完成 | AI 等待当前 Pre-Chat 轮次完成（用户回复+AI 回复）后再 handoff，不打断 |
| ISSUE-006 | 价格不一致 | MealPlanCard 价格 vs Order 底部总价 | MealPlanCard 各菜品价格之和 = Order 底部显示总价（允许±1 取整误差） |
| ISSUE-007 | 货币符号不统一 | 检查 MealPlanCard、Order、Explore 的货币符号 | 全局统一使用同一货币格式（如泰铢统一为 "฿" 或 "THB"，不混用） |

---

## 3. 场景 A：泰餐 — Persona A 阿明完整旅程

> Persona：阿明，中国旅行者，在曼谷，花生过敏，不吃辣
> 菜单：IMG-01（泰餐，≥15 道菜）
> 验证重点：泰餐共享式分组、过敏原排除、完整 E2E 流程

| ID | 步骤 | 操作 | 预期结果 | 通过标准 |
|----|------|------|---------|---------|
| A-01 | 打开 App | 浏览器访问 `sage-next-gen.pages.dev` | Home 页加载，中文界面，显示时段问候语 | 页面包含"扫描菜单"按钮，问候语匹配当前时段 |
| A-02 | 进入 Scanner | 点击「扫描菜单」 | 全屏 Scanner 页面 | 页面包含快门按钮、相册按钮 |
| A-03 | 上传菜单 | JS 注入 File+DataTransfer 上传 IMG-01 | 缩略图出现在预览条 | 缩略图数量=1，「确认」按钮可点击 |
| A-04 | 确认发送 | 点击「确认」 | 跳转 AgentChat，Pre-Chat 消息 <1s 出现 | 对话区域出现 AI 第一条消息（中文） |
| A-05 | Pre-Chat 人数 | AI 问人数 → 输入"两个人" | AI 确认人数，继续问忌口 | AI 回复包含"2"或"两"相关确认 |
| A-06 | 声明过敏 | 输入"我花生过敏，不吃辣的" | AI 确认过敏信息 | AI 回复提及"花生"和"辣" |
| A-07 | Handoff 验证 | 等菜单识别完成 | Pre-Chat 当前轮次完成后才 handoff | 不打断正在进行的对话轮次（回归 ISSUE-005） |
| A-08 | 主 Chat 推荐 | 等主 Chat AI 首条消息 | AI 基于花生过敏+不辣约束推荐 | AI 不重复问人数/过敏，推荐中不含花生类菜品 |
| A-09 | 方案型触发 | 输入"帮我们配一套菜吧，预算 500 泰铢" | 流式输出+MealPlanCard | ① 流式文字逐字出现 ② JSON 检测时显示"正在生成方案"占位 ③ 渲染 MealPlanCard |
| A-10 | 泰餐分组验证 | 检查 MealPlanCard courses | 共享式分组 | courses[].name 不含"Starter"/"Appetizer"/"前菜"等西餐分层术语 |
| A-11 | 过敏原排除 | 检查 MealPlanCard 所有菜品 | 无含花生的菜品 | 所有菜品 allergens 不包含 "peanut"/"花生" |
| A-12 | 替换菜品 | 点第一道菜「🔄 换一道」 | 旧卡片灰化，新卡片出现 | 新 MealPlanCard 替换菜品不同于原菜品，仍不含花生（回归 BUG-003） |
| A-13 | 加入订单 | 点新 MealPlanCard「整套加入订单」 | 菜品写入 Order | 底部出现订单浮动栏 |
| A-14 | 查看 Order | 点击订单栏 | Order 页 | 每道菜独立条目（回归 BUG-002），总价=各菜品价格之和（回归 ISSUE-006），货币统一（回归 ISSUE-007） |
| A-15 | 进入 Waiter | 点「展示给服务员」 | 过敏原确认弹窗 | 底部 sheet 显示花生过敏提醒（DEC-056） |
| A-16 | Waiter 展示 | 点「确认并继续」 | Waiter Mode | 深色背景+原文菜名+数量（无翻译无价格），顶部过敏栏（图标+英文+泰文） |
| A-17 | 沟通面板 | 点 Waiter 中第一道菜 | 双语沟通面板 | 🚫没有了/ไม่มี、🔄换一道/เปลี่ยน、➕加一份/เพิ่ม、❓其他 |
| A-18 | 菜品售罄 | 点「🚫 没有了」→ 确认 | 菜品移除+替代提示 | Order 数量 -1，提示是否 AI 推荐替代 |
| A-19 | 结束用餐 | 点「结束用餐」→ 确认 | 清空回 Home | Order 清空+会话清空+回到 Home |

---

## 4. 场景 B：日料 — Persona B Sarah 完整旅程

> Persona：Sarah，美国旅行者，乳糖不耐受，英文界面
> 菜单：IMG-02（日料，≥20 道菜）
> 验证重点：日料多分组逻辑、英文界面、Explore 双出口、Path C 补充菜单

| ID | 步骤 | 操作 | 预期结果 | 通过标准 |
|----|------|------|---------|---------|
| B-01 | 英文界面 | 浏览器语言设为英文，访问 App | 英文界面 | 按钮文案英文（"Scan Menu"） |
| B-02 | 上传日料菜单 | Scanner → 上传 IMG-02 → 确认 | 跳转 AgentChat | Pre-Chat 英文 <1s |
| B-03 | Pre-Chat | 输入 "Just me, I'm lactose intolerant" | AI 确认 | 回复含 "lactose" 确认 |
| B-04 | 进入 Explore | 点「📋 View Full Menu」 | Explore 页 | 菜品按分类分组（AC2/AC4），日文原文+英文翻译+价格 |
| B-05 | 数据正确性 | 检查至少 5 道菜 | 各不相同 | 无重复数据（回归 BUG-001） |
| B-06 | 选菜 | 点 3 道菜的「➕」（1 刺身+1 烤物+1 饮品） | 底部操作栏出现 | 显示"3 items"+估算总价 |
| B-07 | 咨询 AI | 点「Ask AI」 | Chat + SelectedDishesCard | ① 系统消息样式的卡片 ② AI 事实摘要（3 dishes, 分类, 总价）③ 不主动分析搭配 |
| B-08 | 请求方案 | 输入 "Suggest a full course meal around ¥5000" | MealPlanCard | 日料分组出现 |
| B-09 | 日料分组验证 | 检查 courses | ≥3 个日料风格分组 | 含 Sashimi/Grilled/Appetizer 等，非 Starter/Main/Dessert |
| B-10 | 乳制品排除 | 检查推荐菜品 | 无乳制品 | allergens 不含 "dairy"/"milk" |
| B-11 | Waiter | 整套加入 → Order → 展示给服务员 | Waiter 展示 | 日文原文+数量，顶部 "Lactose intolerant"（英+日） |
| B-12 | Path C 补充 | Chat → 点「📷 补充菜单」→ 上传 IMG-08 → 确认 | 返回 Chat | — |
| B-13 | 菜单合并 | 等识别完成 | AI 提示新增饮品 | 不重走 Pre-Chat（DEC-027），Chat 继续 |

---

## 5. 场景 C：西餐 — Persona A 阿明方案型验证

> Persona：阿明，无过敏，3人
> 菜单：IMG-03（西餐）
> 验证重点：西餐标准分组、AI 直接操作 Order

| ID | 步骤 | 操作 | 预期结果 | 通过标准 |
|----|------|------|---------|---------|
| C-01 | 上传+Pre-Chat | 上传 IMG-03 → "三个人，没有忌口" | 正常 | — |
| C-02 | 请求方案 | "推荐一套完整的西餐，含前菜、主菜、甜品和酒" | MealPlanCard | — |
| C-03 | 西餐分组验证 | 检查 courses | 经典西餐分层 | 含 Starter/Appetizer、Main Course、Dessert、Wine/Drinks，顺序正确 |
| C-04 | 菜品数量 | 检查总数 | 3人合理 | ≥4 道（前菜+主菜+甜品+酒各≥1） |
| C-05 | 替换→更新→加入 | 替换主菜 → 等新卡片 → 整套加入 → Order | 数据一致 | Order = v2 MealPlanCard 菜品（非 v1） |
| C-06 | AI 删除菜品 | Chat 输入"把甜品去掉" | AI 操作 Order | AI 确认删除 + Order 甜品消失 + 总价更新 |
| C-07 | AI 添加菜品 | "再加一道奶油蘑菇汤" | AI 操作 Order | Order 新增 + 总价更新 |

---

## 6. 场景 D：中餐 — 分组逻辑验证

> Persona：Sarah，英文界面
> 菜单：IMG-04（中餐）

| ID | 步骤 | 操作 | 预期结果 | 通过标准 |
|----|------|------|---------|---------|
| D-01 | 上传 | 上传 IMG-04 → "2 people, no restrictions" | 正常 | — |
| D-02 | 请求方案 | "Recommend a full Chinese meal for 2" | MealPlanCard | — |
| D-03 | 中餐分组验证 | 检查 courses | 中餐分组 | 含"凉菜/Cold"、"热菜/Hot"、"汤/Soup"、"主食/Staples"类分组，无 Starter/Main/Dessert |
| D-04 | 分组顺序 | 验证 courses 顺序 | 中餐上菜逻辑 | 凉菜在热菜前，汤/主食在后 |

---

## 7. 边界场景测试

| ID | 场景 | 操作 | 预期结果 | 通过标准 |
|----|------|------|---------|---------|
| E-01 | 空/模糊菜单 | 上传 IMG-05 | 失败提示 | "图片有点模糊…" + 「重新拍摄」按钮，无技术错误 |
| E-02 | 1 道菜 | 上传 IMG-06 → 请求方案 | 文字推荐 | 只有 1 道可选，AI 自然语言回复（无 MealPlanCard 或仍可出卡片，≥2 道才出卡片 DEC-059v2） |
| E-03 | 30+ 道菜 | 上传 IMG-07 | Explore ≥30 道 | 分类正确，滚动流畅 |
| E-04 | 过敏原冲突 | 声明花生过敏 → Explore 手动加含花生菜 → 展示给服务员 | 警告 | 弹 sheet 列出冲突菜品+过敏原（DEC-056） |
| E-05 | 售罄处理 | Waiter → 点菜品 →「🚫 没有了」 | 移除+替代 | 大字确认 → Order -1 → 提示 AI 推荐 |
| E-06 | 2 道菜阈值 | "推荐 2 道菜" | MealPlanCard | 卡片正常渲染（DEC-059v2：≥2 即出） |
| E-07 | 空选择咨询 | Explore 未选菜 → 点「咨询 AI」 | 回 Chat | 不插入 SelectedDishesCard，正常对话 |

---

## 8. 数据一致性链路测试

| ID | 验证点 | 操作 | 断言 |
|----|--------|------|------|
| DC-01 | MealPlanCard → Order | 记录 MealPlanCard 菜品 → 整套加入 → Order | Order 条目与 MealPlanCard items 一一对应（dishId/name/price/qty） |
| DC-02 | Order → Waiter | Order 页记录 → 进入 Waiter | Waiter 原文菜名+数量与 Order 一致 |
| DC-03 | 替换后一致性 | v1 加入 → 替换 → v2 加入 → Order | Order = v2 方案（非 v1） |
| DC-04 | AI 操作一致性 | Chat AI 删/加 → Order → Waiter | 均反映最新状态 |
| DC-05 | Explore + MealPlan 合并 | Explore 加菜品 A → Chat 方案加 B、C → Order | Order 含 A、B、C 独立条目 |
| DC-06 | 价格总计 | Order 各菜品 price × qty 求和 | = Order 底部总价（精确匹配） |

---

## 附录：分组逻辑速查表

| 餐饮文化 | 预期分组（DEC-059v2） | 场景 |
|---------|----------------------|------|
| 泰餐 | 共享式（"共享菜品"/"主菜搭配"），不分前后 | A |
| 日料 | 前菜→刺身→烤物→煮物→食事→甜品（或子集） | B |
| 西餐 | Starter→Main→Dessert→Wine/Drinks | C |
| 中餐 | 凉菜→热菜→汤→主食 | D |

> AI 动态生成分组名，上表为参考，不要求精确匹配术语，但逻辑应符合该文化上菜习惯。

---

## 执行说明

1. **顺序**：回归 Checklist（§2）全通过 → 场景 A→B→C→D → 边界 → 一致性
2. **自动化**：输入=Chat 输入框发文字；点击=页面可见按钮；检查=DOM snapshot 断言
3. **失败处理**：回归项不通过→停止报告；场景 P0 失败→标红继续
4. **截图**：MealPlanCard/Order/Waiter 关键步骤保存截图
