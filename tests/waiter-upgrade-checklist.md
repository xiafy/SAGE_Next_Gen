# Test Checklist: Waiter Mode 升级

> 对应 Spec: `specs/waiter-upgrade-spec.md`
> 格式: Given-When-Then

---

## 1. 过敏栏显示

### TC-AB-001: 有过敏原
- **Given** 用户声明了 peanut 过敏，detectedLanguage='th'
- **When** 进入 Waiter Mode
- **Then** 顶部显示过敏栏：⚠️ 🥜 Peanut allergy · ไม่ทานถั่ว

### TC-AB-002: 无过敏原
- **Given** 用户无过敏原/禁忌声明
- **When** 进入 Waiter Mode
- **Then** 不显示过敏栏

### TC-AB-003: 多种过敏原
- **Given** 用户声明 peanut + shellfish + vegetarian
- **When** 进入 Waiter Mode
- **Then** 过敏栏逐行列出 3 条，每条三语展示

### TC-AB-004: 未知语言降级
- **Given** detectedLanguage='xx'（不在翻译表中）
- **When** 渲染过敏栏
- **Then** 只显示图标 + 英文，跳过本地语言

---

## 2. 过敏确认 Sheet

### TC-WS-001: 有风险菜品
- **Given** 用户有 peanut 过敏，Order 含 Pad Thai（allergens 含 peanut）
- **When** 从 Order 点「展示给服务员」
- **Then** 弹出 AllergenWarningSheet，列出"🥜 Pad Thai（花生）"+ 两个按钮

### TC-WS-002: 确认继续
- **Given** AllergenWarningSheet 显示中
- **When** 点「确认并继续」
- **Then** 进入 Waiter Mode，Sheet 关闭，不再重复提醒

### TC-WS-003: 返回修改
- **Given** AllergenWarningSheet 显示中
- **When** 点「返回修改」
- **Then** 回到 Order 页面

### TC-WS-004: 无风险菜品
- **Given** 用户有 peanut 过敏，Order 中无含花生菜品
- **When** 点「展示给服务员」
- **Then** 直接进入 Waiter Mode，不弹 Sheet

### TC-WS-005: uncertain 标注
- **Given** 某菜品 allergens 含 {type:'peanut', uncertain:true}
- **When** Sheet 显示
- **Then** 该行标注"可能含有花生"而非"含有花生"

### TC-WS-006: Explore→Waiter 路径
- **Given** 用户有过敏原，从 Explore 点「展示给服务员」，Order 有风险菜品
- **When** 触发导航
- **Then** 同样弹出 AllergenWarningSheet（规则 6：无论来源路径）

---

## 3. 沟通面板四选项

### TC-CP-001: 面板弹出
- **Given** Waiter Mode 显示 3 道菜
- **When** 点击 Pad Thai 行
- **Then** 弹出 DishCommunicationPanel，显示 Pad Thai 双语名 + 4 个选项

### TC-CP-002: 🚫 没有了 → 完整流程
- **Given** 沟通面板打开，菜品=Pad Thai
- **When** 点「🚫 没有了」→ 大字确认 → 确认
- **Then** Order 移除 Pad Thai + toast + 提示是否 AI 推荐替代品

### TC-CP-003: 🚫 没有了 → AI 推荐
- **Given** 确认售罄后提示
- **When** 点"好的"
- **Then** 导航到 Chat，自动发消息"Pad Thai 售罄了，帮我推荐替代品"

### TC-CP-004: 🚫 没有了 → 不需要
- **Given** 确认售罄后提示
- **When** 点"不用了"
- **Then** 关闭面板，留在 Waiter，Pad Thai 已从列表移除

### TC-CP-005: 🔄 换一道 → AI 推荐
- **Given** 沟通面板打开
- **When** 点「🔄 换一道」→ 大字确认 → 确认 → 选"让 AI 推荐"
- **Then** 导航到 Chat，自动发消息

### TC-CP-006: 🔄 换一道 → 自己选
- **Given** 沟通面板打开
- **When** 点「🔄 换一道」→ 确认 → 选"自己选"
- **Then** 导航到 Explore

### TC-CP-007: ➕ 加一份
- **Given** Pad Thai x1 在 Order
- **When** 点「➕ 加一份」→ 大字确认 → 确认
- **Then** Pad Thai 变为 x2，toast 显示 + 面板关闭 + Waiter 刷新数量

### TC-CP-008: ❓ 其他问题
- **Given** 沟通面板打开
- **When** 点「❓ 其他问题」
- **Then** 导航到 Chat，自动发"关于 Pad Thai，我有个问题想问"

### TC-CP-009: 大字确认屏返回后重选
- **Given** 大字确认屏显示（如「没有了」）
- **When** 点「← 返回」回到选项面板，选择不同选项（如「换一道」）
- **Then** 大字确认屏更新为新选项内容，之前选项无残留状态

### TC-CP-010: 部分翻译缺失降级英文
- **Given** detectedLanguage='vi'（越南语），翻译表中无越南语条目
- **When** 沟通面板 / 大字确认屏 / 过敏栏渲染
- **Then** 本地语言列降级为英文显示，不显示空白或报错

---

## 4. 本地语言正确性

### TC-LL-001: 泰语
- **Given** detectedLanguage='th'
- **When** 沟通面板显示
- **Then** 「没有了」下方显示 "ไม่มี"，「换一道」下方 "เปลี่ยน"，等

### TC-LL-002: 日语
- **Given** detectedLanguage='ja'
- **When** 沟通面板显示
- **Then** 显示 "売り切れ" / "変更" / "もう一つ" / "その他"

### TC-LL-003: 大字确认屏语言
- **Given** detectedLanguage='th'，选「没有了」
- **When** 大字确认屏显示
- **Then** 超大字显示泰语 "ผัดไทย ไม่มี" + 英文对照 "Pad Thai - Sold Out"

---

## 5. 导航返回

### TC-NV-001: 沟通面板关闭
- **Given** 沟通面板打开
- **When** 点 × 关闭
- **Then** 回到 Waiter Mode 菜品列表

### TC-NV-002: 大字确认返回
- **Given** 大字确认屏显示
- **When** 点「← 返回」
- **Then** 回到沟通面板选项

### TC-NV-003: 售罄后 Order 变空
- **Given** Order 只有 1 道菜
- **When** 通过沟通面板标记售罄 → 确认 → "不用了"
- **Then** 提示"点菜单已空，需要继续加菜吗？"→ 可选 Chat 或 Explore
